import { displayText, displayBoolean, displayList, formatSpi } from "../utils/format";
import { KvRow } from "./IpsecOverview";

export default function EspInformation({ ipsec }) {
  const spis = displayList(ipsec.esp_spis, null);

  return (
    <div className="panel">
      <div className="panel-title">ESP Information</div>
      <div className="kv-list">
        <KvRow label="ESP Encryption" value={displayText(ipsec.esp_encryption)} />
        <KvRow label="ESP Integrity" value={displayText(ipsec.esp_integrity)} />
        <KvRow label="PFS" value={displayBoolean(ipsec.esp_pfs)} />
        <div className="kv-row">
          <span className="kv-label">SPIs</span>
          {spis ? (
            <span className="kv-value chip-list">
              {spis.map((spi) => (
                <span className="chip mono" key={spi} title={String(spi)}>
                  {formatSpi(spi)}
                </span>
              ))}
            </span>
          ) : (
            <span className="kv-value muted">None detected</span>
          )}
        </div>
      </div>
    </div>
  );
}
