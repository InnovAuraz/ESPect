import { ShieldIcon } from "./Icons";
import BackendStatus from "./BackendStatus";

export default function Header({ status, onRefresh, isChecking }) {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-mark">
          <ShieldIcon />
        </div>
        <div>
          <h1 className="header-title">ESPect</h1>
          <p className="header-subtitle">
            AI-Powered IPsec VPN Protocol Analyzer
          </p>
        </div>
      </div>

      <BackendStatus
        status={status}
        onRefresh={onRefresh}
        isChecking={isChecking}
      />
    </header>
  );
}
