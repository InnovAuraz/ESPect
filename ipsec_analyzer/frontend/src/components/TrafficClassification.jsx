import { displayTrafficType, formatPercent } from "../utils/format";

export default function TrafficClassification({ traffic }) {
  const pct = Math.round(traffic.confidence * 100);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <span className="card-title-icon">📡</span>
          Traffic Classification
        </span>
        <span className="card-badge secure">ML Prediction</span>
      </div>
      <div className="card-body">
        <div className="traffic-result">
          <div className="traffic-type-name">{displayTrafficType(traffic.predicted_type)}</div>
          <div className="confidence-bar-container">
            <div className="confidence-bar-header">
              <span className="confidence-bar-label">Model Confidence</span>
              <span className="confidence-bar-value">{formatPercent(traffic.confidence)}</span>
            </div>
            <div className="confidence-bar">
              <div className="confidence-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
