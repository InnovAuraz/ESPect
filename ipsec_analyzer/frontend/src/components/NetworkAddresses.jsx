import { displayList } from "../utils/format";

export default function NetworkAddresses({ ipsec }) {
  const sources = displayList(ipsec.source_addresses);
  const destinations = displayList(ipsec.destination_addresses);

  return (
    <div className="panel span-2">
      <div className="panel-title">Network Information</div>
      <div className="dashboard-grid" style={{ gap: 24 }}>
        <div>
          <div className="subsection-title">Source Addresses</div>
          <AddressList addresses={sources} />
        </div>
        <div>
          <div className="subsection-title">Destination Addresses</div>
          <AddressList addresses={destinations} />
        </div>
      </div>
    </div>
  );
}

function AddressList({ addresses }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {addresses.map((address) => (
        <span className="mono" key={address} style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
          {address}
        </span>
      ))}
    </div>
  );
}
