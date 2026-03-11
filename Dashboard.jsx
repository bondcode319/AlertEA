import { useState, useEffect, useRef } from "react";

// ─── Simulated live data (replace with API calls in production) ───
const ZONES = [
  {
    code: "UG-KLA", name: "Kampala", country: "Uganda",
    lat: 0.35, lon: 32.58, risk_score: 8.7, risk_level: "CRITICAL",
    primary_threat: "Flooding", rainfall_mm: 52.4, wind_speed_kmh: 45.2,
    humidity_pct: 94, seismic_magnitude: 0, confidence_pct: 89,
    recommended_action: "IMMEDIATE EVACUATION. Move to high ground NOW.",
  },
  {
    code: "KE-NBI", name: "Nairobi", country: "Kenya",
    lat: -1.29, lon: 36.82, risk_score: 4.2, risk_level: "MEDIUM",
    primary_threat: "Flooding", rainfall_mm: 18.1, wind_speed_kmh: 22.0,
    humidity_pct: 71, seismic_magnitude: 0, confidence_pct: 76,
    recommended_action: "Prepare emergency kits. Stay informed via AlertEA.",
  },
  {
    code: "TZ-DAR", name: "Dar es Salaam", country: "Tanzania",
    lat: -6.79, lon: 39.21, risk_score: 3.1, risk_level: "MEDIUM",
    primary_threat: "Flooding", rainfall_mm: 9.2, wind_speed_kmh: 15.0,
    humidity_pct: 65, seismic_magnitude: 0, confidence_pct: 72,
    recommended_action: "Monitor situation. No immediate action required.",
  },
  {
    code: "RW-KGL", name: "Kigali", country: "Rwanda",
    lat: -1.97, lon: 30.10, risk_score: 1.5, risk_level: "LOW",
    primary_threat: "None", rainfall_mm: 1.0, wind_speed_kmh: 10.0,
    humidity_pct: 55, seismic_magnitude: 3.2, confidence_pct: 91,
    recommended_action: "Monitor situation. No immediate action required.",
  },
  {
    code: "ET-ADD", name: "Addis Ababa", country: "Ethiopia",
    lat: 9.03, lon: 38.75, risk_score: 1.1, risk_level: "LOW",
    primary_threat: "None", rainfall_mm: 0, wind_speed_kmh: 8.0,
    humidity_pct: 30, seismic_magnitude: 0, confidence_pct: 88,
    recommended_action: "Monitor situation. No immediate action required.",
  },
];

const ALERT_LOG = [
  { time: "14:32:07", zone: "Kampala", level: "CRITICAL", msg: "SMS dispatched to 847 subscribers", type: "sms" },
  { time: "14:32:03", zone: "Kampala", level: "CRITICAL", msg: "Risk score 8.7 — CRITICAL threshold crossed", type: "alert" },
  { time: "14:31:58", zone: "Kampala", level: "CRITICAL", msg: "FloodRiskAgent: 52.4mm/hr detected", type: "data" },
  { time: "14:31:55", zone: "Nairobi", level: "MEDIUM", msg: "Risk score 4.2 — MEDIUM threshold", type: "alert" },
  { time: "14:31:52", zone: "All Zones", level: "INFO", msg: "Monitoring cycle #47 initiated", type: "system" },
  { time: "14:26:07", zone: "Kampala", level: "HIGH", msg: "SMS dispatched to 847 subscribers", type: "sms" },
  { time: "14:20:01", zone: "All Zones", level: "INFO", msg: "Monitoring cycle #46 initiated", type: "system" },
];

const RISK_COLORS = {
  CRITICAL: { bg: "#ff1744", light: "#ff174420", text: "#ff1744", glow: "0 0 20px #ff174460" },
  HIGH:     { bg: "#ff6d00", light: "#ff6d0020", text: "#ff6d00", glow: "0 0 20px #ff6d0060" },
  MEDIUM:   { bg: "#ffd600", light: "#ffd60020", text: "#ffd600", glow: "0 0 20px #ffd60060" },
  LOW:      { bg: "#00e676", light: "#00e67620", text: "#00e676", glow: "0 0 20px #00e67660" },
};

const LOG_COLORS = {
  sms: "#00b4d8", alert: "#ff1744", data: "#7b2fff", system: "#546e7a", INFO: "#546e7a",
};

// ─── Map Component ───
function EastAfricaMap({ zones, selectedZone, onSelectZone }) {
  // Simplified SVG map of East Africa region
  const mapBounds = { minLon: 28, maxLon: 44, minLat: -12, maxLat: 15 };
  const W = 420, H = 340;

  function project(lat, lon) {
    const x = ((lon - mapBounds.minLon) / (mapBounds.maxLon - mapBounds.minLon)) * W;
    const y = ((mapBounds.maxLat - lat) / (mapBounds.maxLat - mapBounds.minLat)) * H;
    return { x, y };
  }

  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <svg width={W} height={H} style={{ position: "absolute", top: 0, left: 0 }}>
        {/* Map background */}
        <defs>
          <radialGradient id="mapGrad" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#1a2744" />
            <stop offset="100%" stopColor="#0d1527" />
          </radialGradient>
          {zones.map(z => (
            <radialGradient key={z.code} id={`glow-${z.code}`} cx="50%" cy="50%">
              <stop offset="0%" stopColor={RISK_COLORS[z.risk_level].bg} stopOpacity="0.6" />
              <stop offset="100%" stopColor={RISK_COLORS[z.risk_level].bg} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>
        <rect width={W} height={H} fill="url(#mapGrad)" rx="12" />

        {/* Grid lines */}
        {[...Array(8)].map((_, i) => (
          <line key={`v${i}`} x1={i * (W / 7)} y1={0} x2={i * (W / 7)} y2={H}
            stroke="#ffffff08" strokeWidth="1" />
        ))}
        {[...Array(6)].map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * (H / 5)} x2={W} y2={i * (H / 5)}
            stroke="#ffffff08" strokeWidth="1" />
        ))}

        {/* Zone glow circles */}
        {zones.map(z => {
          const { x, y } = project(z.lat, z.lon);
          const r = 30 + z.risk_score * 4;
          return (
            <circle key={`glow-${z.code}`} cx={x} cy={y} r={r}
              fill={`url(#glow-${z.code})`} />
          );
        })}

        {/* Zone markers */}
        {zones.map(z => {
          const { x, y } = project(z.lat, z.lon);
          const color = RISK_COLORS[z.risk_level].bg;
          const isSelected = selectedZone?.code === z.code;
          return (
            <g key={z.code} style={{ cursor: "pointer" }}
              onClick={() => onSelectZone(z)}>
              {isSelected && (
                <circle cx={x} cy={y} r={22} fill="none"
                  stroke={color} strokeWidth="2" strokeDasharray="4,3" opacity="0.9">
                  <animateTransform attributeName="transform" type="rotate"
                    from={`0 ${x} ${y}`} to={`360 ${x} ${y}`} dur="4s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={x} cy={y} r={14} fill={`${color}22`} stroke={color}
                strokeWidth="1.5" />
              <circle cx={x} cy={y} r={6} fill={color}>
                {z.risk_level === "CRITICAL" && (
                  <animate attributeName="r" values="5;8;5" dur="1.2s" repeatCount="indefinite" />
                )}
              </circle>
              <text x={x} y={y - 20} textAnchor="middle" fill="white"
                fontSize="11" fontFamily="'Space Mono', monospace" fontWeight="600">
                {z.name}
              </text>
              <text x={x} y={y + 26} textAnchor="middle"
                fill={color} fontSize="10" fontFamily="monospace">
                {z.risk_score.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Main Dashboard ───
export default function AlertEADashboard() {
  const [selectedZone, setSelectedZone] = useState(ZONES[0]);
  const [tick, setTick] = useState(0);
  const [cycleRunning, setCycleRunning] = useState(false);
  const [lastCycle, setLastCycle] = useState("14:32:07 UTC");
  const logRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  function triggerCycle() {
    setCycleRunning(true);
    setTimeout(() => {
      setCycleRunning(false);
      const now = new Date();
      setLastCycle(`${now.getUTCHours().toString().padStart(2,"0")}:${now.getUTCMinutes().toString().padStart(2,"0")}:${now.getUTCSeconds().toString().padStart(2,"0")} UTC`);
    }, 2800);
  }

  const criticalZones = ZONES.filter(z => z.risk_level === "CRITICAL" || z.risk_level === "HIGH");
  const c = RISK_COLORS[selectedZone.risk_level];

  return (
    <div style={{
      background: "#080f1e",
      minHeight: "100vh",
      fontFamily: "'Space Mono', 'Courier New', monospace",
      color: "#e0e8ff",
      padding: "0",
      overflow: "hidden",
    }}>
      {/* Import font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Barlow+Condensed:wght@300;500;700;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d1527; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes scan {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Top Bar ── */}
      <div style={{
        background: "#0a1628",
        borderBottom: "1px solid #1e3a5f",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "linear-gradient(135deg, #0077ff, #00b4d8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>🌍</div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 900, letterSpacing: 3, color: "#00b4d8" }}>
              ALERTEA
            </div>
            <div style={{ fontSize: 9, color: "#546e7a", letterSpacing: 2 }}>
              EAST AFRICA DISASTER INTELLIGENCE PLATFORM
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "#546e7a", letterSpacing: 1 }}>ZONES MONITORED</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#00b4d8" }}>5</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "#546e7a", letterSpacing: 1 }}>ACTIVE ALERTS</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#ff1744" }}>
              {criticalZones.length}
              <span style={{ animation: "blink 1s ease-in-out infinite", display: "inline-block", marginLeft: 4, fontSize: 10 }}>●</span>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "#546e7a", letterSpacing: 1 }}>SMS SENT TODAY</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#00e676" }}>1,694</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "#546e7a", letterSpacing: 1 }}>LAST CYCLE</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7b2fff" }}>{lastCycle}</div>
          </div>
          <button
            onClick={triggerCycle}
            disabled={cycleRunning}
            style={{
              background: cycleRunning ? "#1e3a5f" : "linear-gradient(135deg, #0077ff, #7b2fff)",
              border: "none", borderRadius: 6, color: "white",
              padding: "8px 16px", fontSize: 10, fontFamily: "inherit",
              letterSpacing: 1, cursor: cycleRunning ? "wait" : "pointer",
              fontWeight: 700, transition: "all 0.2s",
            }}>
            {cycleRunning ? "⟳ SCANNING..." : "▶ RUN CYCLE"}
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ display: "flex", height: "calc(100vh - 62px)" }}>

        {/* Left: Zone List */}
        <div style={{
          width: 220, background: "#0a1628",
          borderRight: "1px solid #1e3a5f", overflowY: "auto", flexShrink: 0,
        }}>
          <div style={{ padding: "12px 16px 8px", fontSize: 9, color: "#546e7a", letterSpacing: 2 }}>
            MONITORED ZONES
          </div>
          {ZONES.map(z => {
            const c = RISK_COLORS[z.risk_level];
            const isActive = selectedZone?.code === z.code;
            return (
              <div key={z.code}
                onClick={() => setSelectedZone(z)}
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  background: isActive ? `${c.bg}15` : "transparent",
                  borderLeft: isActive ? `3px solid ${c.bg}` : "3px solid transparent",
                  transition: "all 0.2s",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>
                      {z.name}
                    </div>
                    <div style={{ fontSize: 9, color: "#546e7a", marginTop: 2 }}>{z.country}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      fontSize: 18, fontWeight: 700, color: c.bg,
                      fontFamily: "'Barlow Condensed', sans-serif",
                    }}>{z.risk_score.toFixed(1)}</div>
                    <div style={{
                      fontSize: 8, color: c.bg, letterSpacing: 1,
                      ...(z.risk_level === "CRITICAL" ? { animation: "blink 1s ease-in-out infinite" } : {})
                    }}>{z.risk_level}</div>
                  </div>
                </div>
                {/* Mini bar */}
                <div style={{ marginTop: 6, height: 2, background: "#1e3a5f", borderRadius: 1 }}>
                  <div style={{
                    height: "100%", borderRadius: 1,
                    width: `${z.risk_score * 10}%`,
                    background: c.bg,
                    transition: "width 1s ease",
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Center: Map + Detail */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Critical Banner */}
          {criticalZones.length > 0 && (
            <div style={{
              background: `${RISK_COLORS.CRITICAL.bg}20`,
              borderBottom: `1px solid ${RISK_COLORS.CRITICAL.bg}40`,
              padding: "8px 20px",
              display: "flex", alignItems: "center", gap: 12,
              animation: "blink 2s ease-in-out infinite",
            }}>
              <span style={{ fontSize: 14 }}>🚨</span>
              <span style={{ fontSize: 11, color: "#ff1744", fontWeight: 700, letterSpacing: 1 }}>
                CRITICAL ALERT: {criticalZones.map(z => z.name).join(", ")} — Immediate action required
              </span>
            </div>
          )}

          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            {/* Map */}
            <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{
                background: "#0d1527", borderRadius: 12,
                border: "1px solid #1e3a5f", padding: 16, flex: 1,
                display: "flex", flexDirection: "column",
              }}>
                <div style={{ fontSize: 9, color: "#546e7a", letterSpacing: 2, marginBottom: 12 }}>
                  LIVE THREAT MAP — EAST AFRICA
                </div>
                <div style={{ display: "flex", justifyContent: "center", flex: 1, alignItems: "center" }}>
                  <EastAfricaMap zones={ZONES} selectedZone={selectedZone} onSelectZone={setSelectedZone} />
                </div>
                {/* Legend */}
                <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center" }}>
                  {Object.entries(RISK_COLORS).map(([level, c]) => (
                    <div key={level} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.bg }} />
                      <span style={{ fontSize: 9, color: "#546e7a" }}>{level}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Zone Detail Panel */}
            {selectedZone && (
              <div style={{
                width: 280, background: "#0a1628",
                borderLeft: "1px solid #1e3a5f", padding: 20,
                overflowY: "auto", flexShrink: 0,
                animation: "fadeSlideIn 0.3s ease",
              }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, color: "#546e7a", letterSpacing: 2 }}>SELECTED ZONE</div>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 28, fontWeight: 900, letterSpacing: 2,
                    color: "#e0e8ff", lineHeight: 1,
                  }}>{selectedZone.name}</div>
                  <div style={{ fontSize: 11, color: "#546e7a" }}>{selectedZone.country}</div>
                </div>

                {/* Risk Score */}
                <div style={{
                  background: c.light, border: `1px solid ${c.bg}40`,
                  borderRadius: 10, padding: 16, marginBottom: 16,
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 9, color: c.text, letterSpacing: 2, marginBottom: 4 }}>RISK SCORE</div>
                  <div style={{
                    fontSize: 52, fontWeight: 900, color: c.bg,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    lineHeight: 1, textShadow: c.glow,
                  }}>
                    {selectedZone.risk_score.toFixed(1)}
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: c.bg,
                    letterSpacing: 3, marginTop: 4,
                    ...(selectedZone.risk_level === "CRITICAL" ? { animation: "blink 1s ease-in-out infinite" } : {})
                  }}>
                    {selectedZone.risk_level}
                  </div>
                </div>

                {/* Metrics */}
                {[
                  { label: "PRIMARY THREAT", value: selectedZone.primary_threat, unit: "" },
                  { label: "RAINFALL", value: selectedZone.rainfall_mm, unit: " mm/hr" },
                  { label: "WIND SPEED", value: selectedZone.wind_speed_kmh, unit: " km/h" },
                  { label: "HUMIDITY", value: selectedZone.humidity_pct, unit: "%" },
                  { label: "SEISMIC", value: selectedZone.seismic_magnitude || "None", unit: selectedZone.seismic_magnitude ? " Mw" : "" },
                  { label: "CONFIDENCE", value: selectedZone.confidence_pct, unit: "%" },
                ].map(m => (
                  <div key={m.label} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "8px 0", borderBottom: "1px solid #1e3a5f0",
                  }}>
                    <span style={{ fontSize: 9, color: "#546e7a", letterSpacing: 1 }}>{m.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#e0e8ff" }}>
                      {m.value}{m.unit}
                    </span>
                  </div>
                ))}

                {/* Recommended Action */}
                <div style={{
                  marginTop: 16, background: `${c.bg}15`,
                  border: `1px solid ${c.bg}30`, borderRadius: 8, padding: 12,
                }}>
                  <div style={{ fontSize: 9, color: "#546e7a", letterSpacing: 1, marginBottom: 6 }}>
                    RECOMMENDED ACTION
                  </div>
                  <div style={{ fontSize: 11, color: c.text, lineHeight: 1.5 }}>
                    {selectedZone.recommended_action}
                  </div>
                </div>

                {/* SMS Status */}
                {(selectedZone.risk_level === "CRITICAL" || selectedZone.risk_level === "HIGH") && (
                  <div style={{
                    marginTop: 12, background: "#00b4d820",
                    border: "1px solid #00b4d840", borderRadius: 8, padding: 12,
                  }}>
                    <div style={{ fontSize: 9, color: "#00b4d8", letterSpacing: 1, marginBottom: 4 }}>
                      📱 SMS ALERTS DISPATCHED
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#00b4d8",
                      fontFamily: "'Barlow Condensed', sans-serif" }}>
                      847 subscribers
                    </div>
                    <div style={{ fontSize: 9, color: "#546e7a", marginTop: 2 }}>
                      via Azure Communication Services
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Alert Log */}
        <div style={{
          width: 280, background: "#0a1628",
          borderLeft: "1px solid #1e3a5f", display: "flex", flexDirection: "column", flexShrink: 0,
        }}>
          <div style={{ padding: "16px 16px 8px", fontSize: 9, color: "#546e7a", letterSpacing: 2, borderBottom: "1px solid #1e3a5f" }}>
            LIVE ALERT LOG
            <span style={{ float: "right", color: "#00e676", animation: "blink 1.5s ease-in-out infinite" }}>● LIVE</span>
          </div>
          <div ref={logRef} style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {ALERT_LOG.map((log, i) => (
              <div key={i} style={{
                padding: "10px 16px",
                borderBottom: "1px solid #1e3a5f20",
                animation: `fadeSlideIn 0.3s ease ${i * 0.05}s both`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 9, color: LOG_COLORS[log.type] || "#546e7a" }}>
                    {log.type === "sms" ? "📱" : log.type === "alert" ? "⚠️" : log.type === "data" ? "📡" : "⚙️"} {log.zone}
                  </span>
                  <span style={{ fontSize: 9, color: "#546e7a" }}>{log.time}</span>
                </div>
                <div style={{ fontSize: 10, color: "#8899aa", lineHeight: 1.4 }}>{log.msg}</div>
              </div>
            ))}
          </div>

          {/* Agent Status */}
          <div style={{ borderTop: "1px solid #1e3a5f", padding: "12px 16px" }}>
            <div style={{ fontSize: 9, color: "#546e7a", letterSpacing: 2, marginBottom: 10 }}>AGENT STATUS</div>
            {[
              { name: "WeatherAgent", status: "ACTIVE", color: "#00e676" },
              { name: "SeismicAgent", status: "ACTIVE", color: "#00e676" },
              { name: "FloodRiskAgent", status: "ACTIVE", color: "#00e676" },
              { name: "OrchestratorAgent", status: "ACTIVE", color: "#00e676" },
              { name: "AlertDispatchAgent", status: cycleRunning ? "RUNNING" : "STANDBY", color: cycleRunning ? "#ffd600" : "#00b4d8" },
            ].map(a => (
              <div key={a.name} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 6,
              }}>
                <span style={{ fontSize: 9, color: "#8899aa" }}>{a.name}</span>
                <span style={{
                  fontSize: 8, color: a.color, letterSpacing: 1,
                  ...(a.status === "RUNNING" ? { animation: "blink 0.7s ease-in-out infinite" } : {})
                }}>● {a.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}