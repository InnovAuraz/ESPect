import { displayText, displayList } from "../utils/format";
import { KvRow } from "./IpsecOverview";

export default function IkeConfiguration({ ipsec }) {
  const exchangeTypes = displayList(ipsec.ike_exchange_types, null);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <span className="card-title-icon" style={{ color: "var(--neon-orange)", textShadow: "var(--shadow-glow-amber)" }}>⚙️</span>
          IKE Configuration
        </span>
      </div>
      <div className="card-body">
        <div className="kv-list" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <KvRow label="Encryption" value={displayText(ipsec.ike_encryption)} />
          <KvRow label="Integrity" value={displayText(ipsec.ike_integrity)} />
          <KvRow label="PRF" value={displayText(ipsec.ike_prf)} />
          <KvRow label="DH Group" value={displayText(ipsec.ike_dh_group)} />
          <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600" }}>Exchange Types</span>
            {exchangeTypes ? (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                {exchangeTypes.map((type) => (
                  <span key={type} style={{ background: "rgba(255, 170, 0, 0.1)", color: "var(--neon-orange)", padding: "2px 8px", borderRadius: "4px", fontFamily: "var(--font-mono)", fontSize: "12px", border: "1px solid rgba(255, 170, 0, 0.3)", fontWeight: "600", boxShadow: "var(--shadow-glow-amber)" }}>
                    {type}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)", fontStyle: "italic", fontSize: "13px", fontWeight: "500" }}>None detected</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}