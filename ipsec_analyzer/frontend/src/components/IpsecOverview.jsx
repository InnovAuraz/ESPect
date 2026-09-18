import { displayText, formatBytes } from "../utils/format";

export default function IpsecOverview({ ipsec }) {
  return (
    <div className="panel">
      <div className="panel-title">Connection Overview</div>
      <div className="kv-list">
        <Row label="IP Version" value={displayText(ipsec.ip_version, "Unknown")} />
        <Row label="IKE Detected" value={ipsec.ike_detected ? "Yes" : "No"} />
        <Row label="IKE Version" value={displayText(ipsec.ike_version, "Not detected")} />
        <Row label="IPsec Mode" value={displayText(ipsec.mode, "Unknown")} />
        <Row label="ESP Detected" value={ipsec.esp_detected ? "Yes" : "No"} />
        <Row label="ESP Packet Count" value={ipsec.esp_packet_count} />
        <Row label="ESP Bytes" value={formatBytes(ipsec.esp_bytes)} />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  const isMuted = value === "Unknown" || value === "Not detected";
  return (
    <div className="kv-row">
      <span className="kv-label">{label}</span>
      <span className={`kv-value${isMuted ? " muted" : ""}`}>{value}</span>
    </div>
  );
}

export { Row as KvRow };
