import React from 'react';

export default function StatsRow({ summary, ipsec }) {
  if (!summary) return null;

  const espPackets = ipsec?.esp_packet_count || 0;
  const espPct = summary.total_packets > 0 ? ((espPackets / summary.total_packets) * 100).toFixed(1) : 0;

  const StatCard = ({ title, value, sub, hex, colorVar }) => (
    <div className="stat-card" style={{ borderBottom: `3px solid ${colorVar}` }}>
      {/* Decorative tech accents */}
      <div style={{ position: "absolute", top: "16px", right: "16px", fontSize: "0.6rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontWeight: "bold", opacity: 0.5 }}>
        {hex}
      </div>
      
      <div className="stat-label" style={{ color: "var(--text-secondary)" }}>{title}</div>
      <div className="stat-value mono" style={{ color: colorVar, textShadow: `0 0 15px ${colorVar}40` }}>
        {value}
      </div>
      
      <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <span className="stat-sub" style={{ color: colorVar, opacity: 0.8 }}>{sub}</span>
        <button 
          onClick={() => alert(`Fetching deep-dive telemetry for ${title}... (SIH Mock)`)}
          style={{ 
            background: "rgba(255,255,255,0.03)", 
            border: `1px solid ${colorVar}40`, 
            color: colorVar, 
            fontSize: "0.65rem", 
            padding: "4px 10px", 
            cursor: "pointer", 
            borderRadius: "4px", 
            fontFamily: "var(--font-mono)", 
            textTransform: "uppercase", 
            transition: "all 0.2s" 
          }}
          onMouseOver={(e) => { 
            e.target.style.background = `${colorVar}20`; 
            e.target.style.borderColor = colorVar; 
            e.target.style.boxShadow = `0 0 10px ${colorVar}40`;
          }}
          onMouseOut={(e) => { 
            e.target.style.background = "rgba(255,255,255,0.03)"; 
            e.target.style.borderColor = `${colorVar}40`; 
            e.target.style.boxShadow = "none";
          }}
        >
          Get Details
        </button>
      </div>
    </div>
  );

  return (
    <div className="stats-row">
      <StatCard 
        title="TOTAL PACKETS" 
        value={summary.total_packets.toLocaleString()} 
        sub={`${summary.packets_per_second} pkt/s`} 
        hex="0x1A4F" 
        colorVar="var(--neon-cyan)" 
      />
      <StatCard 
        title="ESP PACKETS" 
        value={espPackets.toLocaleString()} 
        sub={`${espPct}% of total`} 
        hex="0x2B9C" 
        colorVar="var(--neon-purple)" 
      />
      <StatCard 
        title="DATA VOLUME" 
        value={`${(summary.total_bytes / 1024).toFixed(1)} KB`} 
        sub={`${(summary.bytes_per_second / 1024).toFixed(1)} KB/s`} 
        hex="0x3C22" 
        colorVar="var(--emerald-400)" 
      />
      <StatCard 
        title="DURATION" 
        value={`${summary.capture_duration}s`} 
        sub={`Avg ${summary.mean_packet_size} B/pkt`} 
        hex="0x4D81" 
        colorVar="var(--neon-orange)" 
      />
    </div>
  );
}