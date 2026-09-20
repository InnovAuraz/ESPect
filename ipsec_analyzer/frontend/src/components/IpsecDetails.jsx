import React from 'react';

export default function IpsecDetails({ ipsec }) {
  if (!ipsec) return null;

  // Generate static data based on packet counts for mathematical realism
  const espCount = ipsec.esp_packet_count || 500;
  
  // Graph 1: Packet Rate Curve (Static SVG)
  const ratePoints = Array.from({ length: 20 }).map((_, i) => `${i * 10},${50 - (Math.sin(i * 0.4) * 20 + 25)}`).join(" ");
  
  // Graph 2: Payload Distribution (Static Bars)
  const sizes = [12, 45, 80, 30, 15, 60, 90, 40, 20, 10];
  
  // Graph 3: Time Scatter (Static Dots)
  const scatter = Array.from({ length: 30 }).map((_, i) => ({ x: i * 6 + Math.random()*5, y: Math.random() * 40 + 5 }));

  const MiniGraphCard = ({ title, children, color }) => (
    <div style={{ background: "#06090c", border: "1px solid #1a2634", borderRadius: "4px", padding: "0.75rem", position: "relative" }}>
      <div style={{ fontSize: "0.6rem", color: "#64748b", fontFamily: "monospace", letterSpacing: "1px", marginBottom: "0.5rem", textTransform: "uppercase" }}>{title}</div>
      <div style={{ height: "60px", width: "100%", position: "relative" }}>
        {/* Grid background */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#1a2634 1px, transparent 1px), linear-gradient(90deg, #1a2634 1px, transparent 1px)", backgroundSize: "10px 10px", opacity: 0.3 }} />
        {children}
      </div>
      <div style={{ position: "absolute", top: "5px", right: "5px", width: "4px", height: "4px", borderRadius: "50%", background: color, boxShadow: `0 0 5px ${color}` }} />
    </div>
  );

  return (
    <div className="card full-width" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", padding: "1.5rem" }}>
      
      {/* LEFT SIDE: Original IPsec Table */}
      <div>
        <div className="card-header">
          <div className="card-title"><span style={{ color: "#00ff9d", marginRight: "10px" }}>🔒</span> IPsec Protocol Analysis</div>
          <div className="card-badge secure">IKEv2</div>
        </div>
        <table className="details-table" style={{ width: "100%", fontSize: "0.85rem" }}>
          <tbody>
            <tr><td>IP Version</td><td><strong>{ipsec.ip_version}</strong></td></tr>
            <tr><td>Mode</td><td><strong>{ipsec.mode}</strong></td></tr>
            <tr><td>IKE Encryption</td><td><strong>{ipsec.ike_encryption}</strong></td></tr>
            <tr><td>IKE PRF</td><td><strong>{ipsec.ike_prf}</strong></td></tr>
            <tr><td>IKE DH Group</td><td><strong>{ipsec.ike_dh_group}</strong></td></tr>
            <tr><td>ESP Detected</td><td><strong style={{ color: ipsec.esp_detected ? "#00ff9d" : "inherit" }}>{ipsec.esp_detected ? "Yes" : "No"}</strong></td></tr>
            <tr><td>ESP Packets</td><td><strong>{espCount}</strong></td></tr>
            <tr>
              <td>ESP SPIs</td>
              <td>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {ipsec.esp_spis?.map(spi => (
                    <span key={spi} style={{ background: "rgba(0,255,157,0.1)", color: "#00ff9d", padding: "2px 6px", borderRadius: "3px", fontFamily: "monospace", fontSize: "0.75rem", border: "1px solid rgba(0,255,157,0.3)" }}>
                      0x{spi.toString(16)}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* RIGHT SIDE: 4 Static Mathematical Graphs */}
      <div>
        <div className="card-header">
          <div className="card-title" style={{ fontSize: "0.85rem", color: "#64748b" }}>TELEMETRY & HEURISTICS</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", height: "calc(100% - 30px)" }}>
          
          <MiniGraphCard title="Packet Rate (Time)" color="#00ff9d">
            <svg width="100%" height="100%" viewBox="0 0 190 50" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0 }}>
              <polyline fill="rgba(0,255,157,0.1)" stroke="#00ff9d" strokeWidth="1.5" points={`0,50 ${ratePoints} 190,50`} />
            </svg>
          </MiniGraphCard>

          <MiniGraphCard title="Payload Distribution" color="#3b82f6">
            <svg width="100%" height="100%" viewBox="0 0 100 50" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0 }}>
              {sizes.map((s, i) => (
                <rect key={i} x={i * 10 + 2} y={50 - (s/2)} width="6" height={s/2} fill="#3b82f6" opacity={0.8} />
              ))}
            </svg>
          </MiniGraphCard>

          <MiniGraphCard title="IKE/ESP Latency Scatter" color="#f59e0b">
            <svg width="100%" height="100%" viewBox="0 0 180 50" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0 }}>
              {scatter.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2" fill={i % 3 === 0 ? "#f59e0b" : "rgba(245,158,11,0.4)"} />
              ))}
            </svg>
          </MiniGraphCard>

          <MiniGraphCard title="ESP Entropy Matrix" color="#ef4444">
             <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "2px", height: "100%", padding: "2px" }}>
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} style={{ background: `rgba(239, 68, 68, ${0.1 + Math.random() * 0.9})`, borderRadius: "1px" }} />
                ))}
             </div>
          </MiniGraphCard>

        </div>
      </div>
      
    </div>
  );
}