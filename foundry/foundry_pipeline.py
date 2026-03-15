"""
AlertEA — Full Foundry Pipeline
=================================
Runs one complete monitoring cycle using all 5 Foundry agents
across the 5 divisions of Kampala, Uganda.
"""

import asyncio
import json
import httpx
import os
from dotenv import load_dotenv
from azure.identity.aio import AzureCliCredential
from agent_framework.azure import AzureAIAgentClient
from azure.communication.sms import SmsClient
from foundry_agents import (
    weather_agent, seismic_agent, flood_agent,
    orchestrator_agent, dispatch_agent,
)

load_dotenv()

# ── Kampala Divisions ──────────────────────────────────────────
MONITORED_ZONES = [
    {"code": "KLA-CEN", "name": "Central",  "country": "Uganda", "lat": 0.3163, "lon": 32.5822},
    {"code": "KLA-KAW", "name": "Kawempe",  "country": "Uganda", "lat": 0.3780, "lon": 32.5617},
    {"code": "KLA-MAK", "name": "Makindye", "country": "Uganda", "lat": 0.2800, "lon": 32.5956},
    {"code": "KLA-NAK", "name": "Nakawa",   "country": "Uganda", "lat": 0.3317, "lon": 32.6317},
    {"code": "KLA-RUB", "name": "Rubaga",   "country": "Uganda", "lat": 0.3050, "lon": 32.5517},
]

SUBSCRIBERS = {
    "KLA-CEN": ["+256700000001", "+256700000002"],
    "KLA-KAW": ["+256700000003", "+256700000004"],
    "KLA-MAK": ["+256700000005"],
    "KLA-NAK": ["+256700000006"],
    "KLA-RUB": ["+256700000007"],
}

ALERT_THRESHOLD = 5.0


# ── Data Fetchers ──────────────────────────────────────────────

async def fetch_weather(zone: dict) -> dict:
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={
                    "lat": zone["lat"], "lon": zone["lon"],
                    "appid": os.environ.get("OPENWEATHER_API_KEY", ""),
                    "units": "metric",
                }, timeout=8,
            )
            d = r.json()
            return {
                "rainfall_mm":    d.get("rain", {}).get("1h", 0.0),
                "wind_speed_kmh": d["wind"]["speed"] * 3.6,
                "humidity_pct":   d["main"]["humidity"],
            }
    except Exception:
        simulated = {
            "KLA-CEN": {"rainfall_mm": 48.2, "wind_speed_kmh": 38.5, "humidity_pct": 92},
            "KLA-KAW": {"rainfall_mm": 61.7, "wind_speed_kmh": 42.0, "humidity_pct": 97},
            "KLA-MAK": {"rainfall_mm": 29.4, "wind_speed_kmh": 25.0, "humidity_pct": 85},
            "KLA-NAK": {"rainfall_mm": 18.6, "wind_speed_kmh": 20.0, "humidity_pct": 78},
            "KLA-RUB": {"rainfall_mm": 35.1, "wind_speed_kmh": 30.0, "humidity_pct": 88},
        }
        return simulated.get(zone["code"], {"rainfall_mm": 2.0, "wind_speed_kmh": 10.0, "humidity_pct": 50})


async def fetch_seismic(zone: dict) -> dict:
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                "https://earthquake.usgs.gov/fdsnws/event/1/query",
                params={
                    "format": "geojson", "latitude": zone["lat"],
                    "longitude": zone["lon"], "maxradiuskm": 500,
                    "minmagnitude": 3.0, "orderby": "time", "limit": 1,
                }, timeout=8,
            )
            features = r.json().get("features", [])
            if features:
                eq = features[0]
                return {
                    "magnitude":   eq["properties"]["mag"],
                    "depth_km":    abs(eq["geometry"]["coordinates"][2]),
                    "distance_km": 250,
                }
    except Exception:
        pass
    return {"magnitude": 0.0, "depth_km": 0.0, "distance_km": 0.0}


def parse_json(text: str) -> dict:
    try:
        start = text.find("{")
        end   = text.rfind("}") + 1
        return json.loads(text[start:end])
    except Exception:
        return {}


# ── Zone Pipeline ──────────────────────────────────────────────

async def run_zone(zone: dict, credential) -> dict:
    print(f"\n📍 Processing {zone['name']} division...")

    weather, seismic = await asyncio.gather(
        fetch_weather(zone), fetch_seismic(zone)
    )

    # Agent 1 — WeatherAgent
    w_resp = await weather_agent(credential).run(
        f"Division: {zone['name']} ({zone['code']})\n"
        f"Rainfall: {weather['rainfall_mm']}mm/hr | "
        f"Wind: {weather['wind_speed_kmh']}km/h | "
        f"Humidity: {weather['humidity_pct']}%\n"
        f"Return JSON: {{rainfall_risk, wind_risk, summary}}"
    )
    w = parse_json(w_resp.text)
    print(f"  WeatherAgent    → rainfall_risk: {w.get('rainfall_risk', 0)}")

    # Agent 2 — SeismicAgent
    s_resp = await seismic_agent(credential).run(
        f"Division: {zone['name']}\n"
        f"Magnitude: {seismic['magnitude']} | "
        f"Depth: {seismic['depth_km']}km | "
        f"Distance: {seismic['distance_km']}km\n"
        f"Return JSON: {{seismic_risk, magnitude, depth_km, summary}}"
    )
    s = parse_json(s_resp.text)
    print(f"  SeismicAgent    → seismic_risk: {s.get('seismic_risk', 0)}")

    # Agent 3 — FloodRiskAgent
    f_resp = await flood_agent(credential).run(
        f"Division: {zone['name']} (code: {zone['code']})\n"
        f"Rainfall: {weather['rainfall_mm']}mm/hr\n"
        f"Return JSON: {{flood_risk, terrain_vulnerability, summary}}"
    )
    f = parse_json(f_resp.text)
    print(f"  FloodRiskAgent  → flood_risk: {f.get('flood_risk', 0)}")

    # Agent 4 — OrchestratorAgent
    o_resp = await orchestrator_agent(credential).run(
        f"Division: {zone['name']}\n"
        f"flood_risk: {f.get('flood_risk', 0)} | "
        f"seismic_risk: {s.get('seismic_risk', 0)} | "
        f"wind_risk: {w.get('wind_risk', 0)}\n"
        f"Return JSON: {{composite_score, risk_level, primary_threat, recommended_action, confidence_pct}}"
    )
    o = parse_json(o_resp.text)
    composite = o.get("composite_score", 0)
    print(f"  Orchestrator    → score: {composite} | {o.get('risk_level')}")

    # Agent 5 — AlertDispatchAgent (only if above threshold)
    sms_sent    = []
    sms_message = ""

    if composite >= ALERT_THRESHOLD:
        d_resp = await dispatch_agent(credential).run(
            f"Division: {zone['name']}, {zone['country']}\n"
            f"Risk: {o.get('risk_level')} | Score: {composite}/10\n"
            f"Threat: {o.get('primary_threat')} | "
            f"Action: {o.get('recommended_action')}\n"
            f"Write the SMS alert now."
        )
        sms_message = d_resp.text.strip()
        print(f"  DispatchAgent   → {len(sms_message)} chars drafted")

        subscribers = SUBSCRIBERS.get(zone["code"], [])
        conn_str    = os.environ.get("AZURE_COMMS_CONNECTION_STRING", "")

        if conn_str and "<your-key>" not in conn_str and subscribers:
            sms_client = SmsClient.from_connection_string(conn_str)
            for number in subscribers:
                sms_client.send(
                    from_=os.environ.get("AZURE_SENDER_PHONE"),
                    to=[number],
                    message=sms_message,
                    enable_delivery_report=True,
                )
            sms_sent = subscribers
            print(f"  ✅ SMS sent to {len(subscribers)} subscriber(s)")
        else:
            print(f"  📱 [SIMULATED] → {subscribers}\n     {sms_message}")

    return {
        "zone":               zone["name"],
        "zone_code":          zone["code"],
        "composite_score":    composite,
        "risk_level":         o.get("risk_level", "UNKNOWN"),
        "primary_threat":     o.get("primary_threat", ""),
        "recommended_action": o.get("recommended_action", ""),
        "confidence_pct":     o.get("confidence_pct", 0),
        "sms_sent_to":        sms_sent,
        "sms_message":        sms_message,
    }


# ── Main Pipeline ──────────────────────────────────────────────

async def run_pipeline():
    print("\n" + "=" * 58)
    print("  AlertEA — Kampala Divisions Foundry Pipeline")
    print("=" * 58)

    credential = AzureCliCredential()

    results = await asyncio.gather(*[
        run_zone(z, credential) for z in MONITORED_ZONES
    ])

    print("\n" + "=" * 58)
    print("  CYCLE COMPLETE — KAMPALA SUMMARY")
    print("=" * 58)
    alerts = 0
    for r in results:
        flag = "🚨" if r["risk_level"] in ("CRITICAL", "HIGH") else "  "
        print(f"  {flag} {r['zone']:10s} → {r['risk_level']:8s} ({r['composite_score']}/10)")
        if r["sms_sent_to"]:
            alerts += 1
    print(f"\n  {alerts} division(s) received SMS alerts.\n")
    return results


if __name__ == "__main__":
    asyncio.run(run_pipeline())
