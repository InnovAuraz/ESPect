import { displayText, displayBoolean, displayList, formatSpi } from "../utils/format";
import { KvRow } from "./IpsecOverview";

export default function EspInformation({ ipsec }) {
  const spis = displayList(ipsec.esp_spis, null);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <span className="card-title-icon" style={{ color: "var(--neon-cyan)", textShadow: "var(--shadow-glow-cyan)" }}>ℹ️</span>
          ESP Information
        </span>
      </div>
      <div className="card-body">
        <div className="kv-list" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <KvRow label="ESP Encryption" value={displayText(ipsec.esp_encryption)} />
          <KvRow label="ESP Integrity" value={displayText(ipsec.esp_integrity)} />
          <KvRow label="PFS" value={displayBoolean(ipsec.esp_pfs)} />
          <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600" }}>SPIs</span>
            {spis ? (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                {spis.map((spi) => (
                  <span key={spi} title={String(spi)} style={{ background: "rgba(0, 229, 255, 0.1)", color: "var(--neon-cyan)", padding: "2px 8px", borderRadius: "4px", fontFamily: "var(--font-mono)", fontSize: "12px", border: "1px solid rgba(0, 229, 255, 0.3)", fontWeight: "600", boxShadow: "var(--shadow-glow-cyan)" }}>
                    {formatSpi(spi)}
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