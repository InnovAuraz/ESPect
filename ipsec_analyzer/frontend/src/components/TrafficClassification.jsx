import { displayTrafficType, formatPercent } from "../utils/format";

export default function TrafficClassification({ traffic }) {
  const percent = Math.round((traffic.confidence ?? 0) * 100);

  return (
    <div className="panel">
      <div className="panel-title">Traffic Intelligence</div>

      <div className="kv-label" style={{ fontSize: "0.8rem" }}>
        Predicted Traffic
      </div>
      <div className="traffic-predicted">
        {displayTrafficType(traffic.predicted_type)}
      </div>

      <div className="traffic-confidence-label">
        <span>Confidence</span>
        <span>{formatPercent(traffic.confidence)}</span>
      </div>
      <div className="confidence-track">
        <div
          className="confidence-fill"
          style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
        />
      </div>

      <p className="traffic-note">
        This is a machine-learning classification of encrypted traffic
        patterns (packet timing, size, and volume) - not plaintext
        inspection of the connection's contents.
      </p>
    </div>
  );
}
