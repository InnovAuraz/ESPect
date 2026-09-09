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
  const strokeColor = `var(--status-${
    status === "SECURE" ? "secure" : status === "CRITICAL" ? "critical" : "warning"
  })`;

  return (
    <div className="panel">
      <div className="panel-title">Security Score</div>
      <div className="score-panel">
        <div className="score-ring-wrap">
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth="10"
            />
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          <div className="score-ring-value">
            <span className="score-ring-number">{score}</span>
            <span className="score-ring-max">/ 100</span>
          </div>
        </div>

        <div className="score-copy">
          <span className={`status-badge ${status}`}>{status}</span>
          <p className="score-copy-desc">
            {STATUS_COPY[status] || "Security status could not be classified."}
          </p>
        </div>
      </div>
    </div>
  );
}
