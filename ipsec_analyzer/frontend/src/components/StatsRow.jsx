import React from 'react';

export default function StatsRow({ summary, ipsec }) {
  if (!summary) return null;

  const espPackets = ipsec?.esp_packet_count || 0;
  const espPct = summary.total_packets > 0 ? ((espPackets / summary.total_packets) * 100).toFixed(1) : 0;

  const StatCard = ({ title, value, sub, hex }) => (
    <div style={{ background: "#0a0f14", border: "1px solid #1a2634", padding: "1.5rem", borderRadius: "6px", position: "relative", overflow: "hidden", boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)" }}>
      {/* Decorative tech accents */}
      <div style={{ position: "absolute", top: "10px", right: "10px", fontSize: "0.55rem", color: "#1a2634", fontFamily: "monospace", fontWeight: "bold" }}>{hex}</div>
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "30%", height: "2px", background: "#00ff9d", opacity: 0.3 }} />
      
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", letterSpacing: "1.5px", marginBottom: "0.5rem", fontWeight: "bold" }}>{title}</div>
      <div style={{ fontSize: "2.2rem", color: "#e2e8f0", fontWeight: "900", fontFamily: "monospace", textShadow: "0 0 10px rgba(255,255,255,0.1)" }}>{value}</div>
      
      <div style={{ marginTop: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <span style={{ fontSize: "0.75rem", color: "#64748b", fontFamily: "monospace" }}>{sub}</span>
        <button 
          onClick={() => alert(`Fetching deep-dive telemetry for ${title}... (SIH Mock)`)}
          style={{ background: "transparent", border: "1px solid #334155", color: "#00ff9d", fontSize: "0.6rem", padding: "3px 8px", cursor: "pointer", borderRadius: "3px", fontFamily: "monospace", textTransform: "uppercase", transition: "all 0.2s" }}
          onMouseOver={(e) => { e.target.style.background = "rgba(0,255,157,0.1)"; e.target.style.borderColor = "#00ff9d"; }}
          onMouseOut={(e) => { e.target.style.background = "transparent"; e.target.style.borderColor = "#334155"; }}
        >
          Get Details
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
      <StatCard title="TOTAL PACKETS" value={summary.total_packets.toLocaleString()} sub={`${summary.packets_per_second} pkt/s`} hex="0x1A4F" />
      <StatCard title="ESP PACKETS" value={espPackets.toLocaleString()} sub={`${espPct}% of total`} hex="0x2B9C" />
      <StatCard title="DATA VOLUME" value={`${(summary.total_bytes / 1024).toFixed(1)} KB`} sub={`${(summary.bytes_per_second / 1024).toFixed(1)} KB/s`} hex="0x3C22" />
      <StatCard title="DURATION" value={`${summary.capture_duration}s`} sub={`Avg ${summary.mean_packet_size} B/pkt`} hex="0x4D81" />
    </div>
  );
}