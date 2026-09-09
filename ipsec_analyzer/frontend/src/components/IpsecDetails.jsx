import { displayText, displayBoolean, displayList, formatBytes, formatSpi } from "../utils/format";

export default function IpsecDetails({ ipsec }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <span className="card-title-icon">🔐</span>
          IPsec Protocol Analysis
        </span>
        <span className={`card-badge ${ipsec.ike_detected ? "secure" : "warning"}`}>
          {ipsec.ike_detected ? displayText(ipsec.ike_version, "IKE") : "IKE Not Detected"}
        </span>
      </div>
      <div className="card-body">
        <table className="data-table">
          <tbody>
            <tr>
              <td>IP Version</td>
              <td>{displayText(ipsec.ip_version, "—")}</td>
            </tr>
            <tr>
              <td>Mode</td>
              <td>{displayText(ipsec.mode, "—")}</td>
            </tr>
            <tr>
              <td>IKE Encryption</td>
              <td>{val(ipsec.ike_encryption)}</td>
            </tr>
            <tr>
              <td>IKE Integrity</td>
              <td>{val(ipsec.ike_integrity)}</td>
            </tr>
            <tr>
              <td>IKE PRF</td>
              <td>{val(ipsec.ike_prf)}</td>
            </tr>
            <tr>
              <td>IKE DH Group</td>
              <td>{val(ipsec.ike_dh_group)}</td>
            </tr>
            <tr>
              <td>IKE Exchange Types</td>
              <td>{displayList(ipsec.ike_exchange_types).join(", ")}</td>
            </tr>
            <tr>
              <td>ESP Detected</td>
              <td>{displayBoolean(ipsec.esp_detected)}</td>
            </tr>
            <tr>
              <td>ESP Packets / Bytes</td>
              <td>{ipsec.esp_packet_count.toLocaleString()} / {formatBytes(ipsec.esp_bytes)}</td>
            </tr>
            <tr>
              <td>ESP Encryption</td>
              <td>{val(ipsec.esp_encryption)}</td>
            </tr>
            <tr>
              <td>ESP Integrity</td>
              <td>{val(ipsec.esp_integrity)}</td>
            </tr>
            <tr>
              <td>Perfect Forward Secrecy</td>
              <td>{val(ipsec.esp_pfs)}</td>
            </tr>
            {ipsec.esp_spis.length > 0 && (
              <tr>
                <td>ESP SPIs</td>
                <td>
                  <div className="spi-list">
                    {ipsec.esp_spis.map((spi, i) => (
                      <span className="spi-tag" key={i}>{formatSpi(spi)}</span>
                    ))}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function val(v) {
  if (v === null || v === undefined) {
    return <span className="null-value">Not observable (encrypted)</span>;
  }
  return String(v);
}
