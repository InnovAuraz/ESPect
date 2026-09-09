export default function Header({ status, onRefresh, isChecking }) {
  const label = isChecking ? "Connecting…" : status === "online" ? "Online" : "Offline";
  const dotClass = isChecking ? "checking" : status === "online" ? "online" : "offline";

  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-logo">E</div>
        <div>
          <div className="header-title">ESPect</div>
          <div className="header-subtitle">IPsec Protocol Analyzer</div>
        </div>
      </div>
      <button className="header-status" onClick={onRefresh} title="Click to refresh">
        <span className={`status-dot ${dotClass}`} />
        {label}
      </button>
    </header>
  );
}
