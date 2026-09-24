const STATUS_COPY = {
  SECURE: "No significant issues were found in this capture.",
  WARNING: "Some configuration details could not be fully verified.",
  CRITICAL: "Significant security issues were detected.",
};

export default function SecurityScore({ security }) {
  const score = Math.min(Math.max(security.score ?? 0, 0), 100);
  const status = security.status || "WARNING";

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  const strokeColor = 
    status === "SECURE" ? "var(--emerald-400)" : 
    status === "CRITICAL" ? "var(--neon-red)" : 
    "var(--neon-orange)";

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Security Score</span>
      </div>
      <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div className="score-ring-wrap" style={{ position: 'relative', width: '128px', height: '128px', filter: `drop-shadow(0 0 10px ${strokeColor}40)` }}>
          <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="64" cy="64" r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="10"
            />
            <circle
              cx="64" cy="64" r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '32px', fontWeight: '800', color: strokeColor, textShadow: `0 0 10px ${strokeColor}`, lineHeight: '1' }}>{score}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>/ 100</span>
          </div>
        </div>

        <div className="score-copy">
          <span className={`card-badge ${status === "SECURE" ? "secure" : status === "CRITICAL" ? "critical" : "warning"}`} style={{ display: 'inline-block', marginBottom: '8px' }}>
            {status}
          </span>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, lineHeight: '1.5' }}>
            {STATUS_COPY[status] || "Security status could not be classified."}
          </p>
        </div>
      </div>
    </div>
  );
}