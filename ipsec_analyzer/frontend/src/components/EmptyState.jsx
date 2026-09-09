import { EmptyIcon } from "./Icons";

export default function EmptyState() {
  return (
    <div className="panel">
      <div className="empty-state">
        <div className="empty-state-icon">
          <EmptyIcon />
        </div>
        <div className="empty-state-title">No analysis yet</div>
        <p className="empty-state-desc">
          Select a .pcap or .pcapng capture above and run an analysis to see
          IPsec configuration, traffic classification, and a security
          assessment here.
        </p>
      </div>
    </div>
  );
}
