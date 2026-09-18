export default function BackendStatus({ status, onRefresh, isChecking }) {
  const label =
    status === "online"
      ? "Backend Online"
      : status === "offline"
      ? "Backend Offline"
      : "Checking backend...";

  return (
    <div className="backend-status">
      <span className={`status-dot ${status}`} />
      <span>{label}</span>
      <button
        type="button"
        className="status-refresh"
        onClick={onRefresh}
        disabled={isChecking}
      >
        {isChecking ? "Checking..." : "Recheck"}
      </button>
    </div>
  );
}
