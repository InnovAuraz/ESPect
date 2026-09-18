import { formatBytes } from "../utils/format";

export default function StatsRow({ summary, ipsec }) {
  if (!summary) return null;

  const stats = [
    { label: "Total Packets", value: summary.total_packets.toLocaleString(), sub: `${summary.packets_per_second} pkt/s` },
    { label: "ESP Packets", value: ipsec.esp_packet_count.toLocaleString(), sub: `${((ipsec.esp_packet_count / summary.total_packets) * 100).toFixed(1)}% of total`, accent: "emerald" },
    { label: "Total Bytes", value: formatBytes(summary.total_bytes), sub: `${summary.bytes_per_second > 0 ? formatBytes(summary.bytes_per_second) + "/s" : "—"}` },
    { label: "Duration", value: summary.capture_duration > 0 ? `${summary.capture_duration.toFixed(2)}s` : "< 1s", sub: `Avg ${formatBytes(summary.mean_packet_size)}/pkt` },
    { label: "Unique SPIs", value: ipsec.esp_spis.length, sub: "Security Param Indexes", accent: "amber" },
    { label: "Endpoints", value: ipsec.source_addresses.length + ipsec.destination_addresses.length, sub: `${ipsec.ip_version ?? "Unknown"} detected` },
  ];

  return (
    <div className="stats-row">
      {stats.map((s, i) => (
        <div key={i} className={`stat-card ${s.accent ? `stat-accent-${s.accent}` : ""}`}>
          <div className="stat-label">{s.label}</div>
          <div className={`stat-value ${typeof s.value === "string" && s.value.includes(".") ? "mono" : ""}`}>{s.value}</div>
          {s.sub && <div className="stat-sub">{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}
