import { CheckIcon } from "./Icons";

export default function SecurityFindings({ findings }) {
  return (
    <div className="panel span-2">
      <div className="panel-title">Security Findings</div>

      {(!findings || findings.length === 0) ? (
        <div className="findings-empty">
          <CheckIcon />
          No security findings detected.
        </div>
      ) : (
        <div className="findings-list">
          {findings.map((finding, index) => (
            <div
              className={`finding-card ${finding.severity}`}
              key={`${finding.title}-${index}`}
            >
              <span className={`finding-severity ${finding.severity}`}>
                {finding.severity}
              </span>
              <div className="finding-title">{finding.title}</div>
              <div className="finding-description">{finding.description}</div>
              {finding.recommendation && (
                <>
                  <div className="finding-recommendation-label">
                    Recommendation
                  </div>
                  <div className="finding-recommendation">
                    {finding.recommendation}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
