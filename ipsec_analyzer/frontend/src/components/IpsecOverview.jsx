import { displayText, formatBytes } from "../utils/format";

export default function IpsecOverview({ ipsec }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
           <span className="card-title-icon" style={{ color: "var(--emerald-400)" }}>ℹ️</span>
           Connection Overview
        </span>
      </div>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
    <div style={{ 
      display: "flex", 
      justifyContent: "space-between", 
      paddingBottom: "12px", 
      borderBottom: "1px solid rgba(255,255,255,0.05)" 
    }}>
      <span style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600" }}>{label}</span>
      <span style={{ 
        color: isMuted ? "var(--text-muted)" : "var(--text-primary)", 
        fontFamily: isMuted ? "var(--font-sans)" : "var(--font-mono)", 
        fontStyle: isMuted ? "italic" : "normal",
        fontSize: "13px",
        fontWeight: "500" 
      }}>
        {value}
      </span>
    </div>
  );
}

export { Row as KvRow };