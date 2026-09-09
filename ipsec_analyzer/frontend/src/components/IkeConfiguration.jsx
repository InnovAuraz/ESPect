import { displayText, displayList } from "../utils/format";
import { KvRow } from "./IpsecOverview";

export default function IkeConfiguration({ ipsec }) {
  const exchangeTypes = displayList(ipsec.ike_exchange_types, null);

  return (
    <div className="panel">
      <div className="panel-title">IKE Configuration</div>
      <div className="kv-list">
        <KvRow label="Encryption" value={displayText(ipsec.ike_encryption)} />
        <KvRow label="Integrity" value={displayText(ipsec.ike_integrity)} />
        <KvRow label="PRF" value={displayText(ipsec.ike_prf)} />
        <KvRow label="DH Group" value={displayText(ipsec.ike_dh_group)} />
        <div className="kv-row">
          <span className="kv-label">Exchange Types</span>
          {exchangeTypes ? (
            <span className="kv-value chip-list">
              {exchangeTypes.map((type) => (
                <span className="chip" key={type}>
                  {type}
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
