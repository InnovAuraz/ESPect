export default function SecurityGauge({ security }) {
  const { score, status, findings } = security;
  const circumference = 2 * Math.PI * 56;
  const offset = circumference - (score / 100) * circumference;

  const color =
    status === "SECURE" ? "var(--emerald-400)" :
    status === "WARNING" ? "var(--neon-orange)" :
    "var(--neon-red)";

  const statusLabel =
    status === "SECURE" ? "Secure" :
    status === "WARNING" ? "Warning" :
    "Critical";

  const badgeClass =
    status === "SECURE" ? "secure" :
    status === "WARNING" ? "warning" :
    "critical";

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <span className="card-title-icon" style={{ color: color, textShadow: `0 0 10px ${color}` }}>🛡️</span>
          Security Assessment
        </span>
        <span className={`card-badge ${badgeClass}`}>{statusLabel}</span>
      </div>
      <div className="card-body">
        <div className="security-gauge">
          <div className="gauge-ring">
            <svg viewBox="0 0 120 120">
              <circle className="gauge-track" cx="60" cy="60" r="56" />
              <circle
                className="gauge-fill"
                cx="60" cy="60" r="56"
                stroke={color}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="gauge-score">
              <span className="gauge-score-number" style={{ color: color, textShadow: `0 0 15px ${color}60` }}>{score}</span>
              <span className="gauge-score-label">out of 100</span>
            </div>
          </div>
          <div className="gauge-status" style={{ color: color, textShadow: `0 0 10px ${color}80` }}>
            {findings.length} finding{findings.length !== 1 ? "s" : ""} detected
          </div>
        </div>
      </div>
    </div>
  );
}