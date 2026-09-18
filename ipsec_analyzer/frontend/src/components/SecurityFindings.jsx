export default function SecurityFindings({ findings }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <span className="card-title-icon">⚠️</span>
          Security Findings
        </span>
      </div>
      <div className="card-body">
        {findings.length === 0 ? (
          <div className="no-findings">✓ No security issues detected</div>
        ) : (
          <div className="findings-list">
            {findings.map((f, i) => (
              <div key={i} className={`finding-item severity-${f.severity.toLowerCase()}`}>
                <div className="finding-header">
                  <span className="finding-title">{f.title}</span>
                  <span className={`severity-tag ${f.severity.toLowerCase()}`}>{f.severity}</span>
                </div>
                <div className="finding-desc">{f.description}</div>
                {f.recommendation && (
                  <div className="finding-rec">→ {f.recommendation}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
