"""
AlertEA — REST API Server
FastAPI backend exposing agent data to the React dashboard
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from Alert import (
    run_alertea_cycle, WeatherAgent, SeismicAgent,
    FloodRiskAgent, OrchestratorAgent, SeismicReading, MONITORED_ZONES
)

app = FastAPI(title="AlertEA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for latest results
latest_results = {"assessments": [], "alerts": [], "last_run": None}


@app.get("/")
def root():
    return {"service": "AlertEA", "status": "operational", "region": "Kampala, Uganda"}


@app.get("/api/risk-map")
async def get_risk_map():
    """Returns current risk assessment for all zones — powers the dashboard map."""
    weather_agent = WeatherAgent()
    seismic_agent = SeismicAgent()
    flood_agent = FloodRiskAgent()
    orchestrator = OrchestratorAgent()

    weather_readings, seismic_readings = await asyncio.gather(
        weather_agent.scan_all_zones(),
        seismic_agent.scan_all_zones()
    )
    seismic_map = {s.zone_code: s for s in seismic_readings}

    results = []
    for weather in weather_readings:
        seismic = seismic_map.get(weather.zone_code) or SeismicReading(weather.zone_code, weather.zone_name, 0.0, 0.0, 0.0)
        flood_score = flood_agent.assess(weather)
        risk = orchestrator.assess_zone(weather, seismic, flood_score)
        zone_info = next((z for z in MONITORED_ZONES if z["code"] == weather.zone_code), None)
        if zone_info is None:
            continue
        results.append({
            "zone_code": risk.zone_code,
            "zone_name": risk.zone_name,
            "country": zone_info["country"],
            "lat": zone_info["lat"],
            "lon": zone_info["lon"],
            "risk_score": risk.risk_score,
            "risk_level": risk.risk_level,
            "primary_threat": risk.primary_threat,
            "rainfall_mm": weather.rainfall_mm,
            "wind_speed_kmh": weather.wind_speed_kmh,
            "humidity_pct": weather.humidity_pct,
            "seismic_magnitude": seismic.magnitude,
            "recommended_action": risk.recommended_action,
            "confidence_pct": risk.confidence_pct,
            "timestamp": risk.timestamp,
        })

    return {"zones": results, "monitored_count": len(results)}


@app.post("/api/trigger-cycle")
async def trigger_cycle():
    """Manually trigger a full monitoring + alert cycle."""
    events = await run_alertea_cycle(simulate=True)
    return {
        "alerts_dispatched": len(events),
        "events": [
            {
                "zone": e.zone_name,
                "risk_score": e.risk_assessment.risk_score,
                "level": e.risk_assessment.risk_level,
                "status": e.status,
                "message": e.message_body,
            }
            for e in events
        ]
    }


@app.get("/api/zones")
def get_zones():
    return {"zones": MONITORED_ZONES}