export default function ProtocolBreakdown({ protocols, total }) {
  if (!protocols || total === 0) return null;

  const sorted = Object.entries(protocols).sort((a, b) => b[1] - a[1]);

  function protoClass(name) {
    const n = name.toUpperCase();
    if (n === "ESP") return "proto-esp";
    if (n === "UDP") return "proto-udp";
    if (n === "TCP") return "proto-tcp";
    if (n.includes("ICMP")) return "proto-icmp";
    return "proto-other";
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <span className="card-title-icon">📊</span>
          Protocol Distribution
        </span>
      </div>
      <div className="card-body">
        <div className="protocol-bars">
          {sorted.map(([name, count]) => (
            <div className="protocol-bar-row" key={name}>
              <span className="protocol-bar-name">{name}</span>
              <div className="protocol-bar-track">
                <div
                  className={`protocol-bar-fill ${protoClass(name)}`}
                  style={{ width: `${(count / total) * 100}%` }}
                />
              </div>
              <span className="protocol-bar-count">
                {count} ({((count / total) * 100).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
