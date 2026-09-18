export default function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">🔒</div>
      <div className="empty-title">No analysis yet</div>
      <div className="empty-desc">
        Upload a PCAP file to analyze IPsec VPN traffic, classify encrypted protocols, and assess security posture.
      </div>
    </div>
  );
}
