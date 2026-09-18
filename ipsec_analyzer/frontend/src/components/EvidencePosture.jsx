function EvidenceRow({ label, value, tone }) {
  return (
    <div className="evidence-row">
      <span className={`evidence-dot ${tone}`} />
      <span className="evidence-label">{label}</span>
      <strong className="evidence-value">{value}</strong>
    </div>
  );
}

export default function EvidencePosture({ ipsec, traffic, findings }) {
  const observed = [
    ipsec.ike_detected,
    ipsec.esp_detected,
    ipsec.ike_version,
    ipsec.ike_encryption,
    ipsec.ike_dh_group,
    ipsec.mode,
  ].filter(Boolean).length;

  const unavailable = findings.filter(
    (finding) => finding.source === "not_observed"
  ).length;

  return (
    <div className="card evidence-card">
      <div className="card-header">
        <span className="card-title">
          <span className="card-title-icon">◈</span>
          Evidence Posture
        </span>
        <span className="card-badge secure">Traceable result</span>
      </div>
      <div className="card-body">
        <p className="evidence-intro">
          Every conclusion is separated by how the capture supports it.
        </p>
        <div className="evidence-list">
          <EvidenceRow label="Observed from PCAP" value={`${observed} facts`} tone="observed" />
          <EvidenceRow label="ML traffic inference" value={`${Math.round((traffic.confidence ?? 0) * 100)}%`} tone="inferred" />
          <EvidenceRow label="Not observable here" value={`${unavailable} fields`} tone="unknown" />
        </div>
        <div className="evidence-note">
          Encrypted Child-SA parameters are reported as unavailable unless the capture exposes them.
        </div>
      </div>
    </div>
  );
}