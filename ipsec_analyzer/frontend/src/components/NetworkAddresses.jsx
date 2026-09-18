import { displayList } from "../utils/format";

export default function NetworkAddresses({ ipsec }) {
  const sources = displayList(ipsec.source_addresses);
  const destinations = displayList(ipsec.destination_addresses);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <span className="card-title-icon">🌐</span>
          Network Endpoints
        </span>
        <span className="card-badge secure">{ipsec.ip_version ?? "—"}</span>
      </div>
      <div className="card-body">
        <div className="address-grid">
          <div>
            <div className="address-group-label">Source Addresses</div>
            {sources.map((addr, i) => (
              <span className="address-tag" key={i}>{addr}</span>
            ))}
          </div>
          <div>
            <div className="address-group-label">Destination Addresses</div>
            {destinations.map((addr, i) => (
              <span className="address-tag" key={i}>{addr}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
