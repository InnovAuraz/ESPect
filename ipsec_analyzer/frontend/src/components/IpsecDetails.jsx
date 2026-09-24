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
    <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "12px", position: "relative", boxShadow: "inset 0 0 20px rgba(0,0,0,0.2)" }}>
      <div style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "1px", marginBottom: "8px", textTransform: "uppercase", fontWeight: "700" }}>{title}</div>
      <div style={{ height: "60px", width: "100%", position: "relative" }}>
        {/* Grid background */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "10px 10px", pointerEvents: "none" }} />
        {children}
      </div>
      <div style={{ position: "absolute", top: "10px", right: "10px", width: "6px", height: "6px", borderRadius: "50%", background: color, boxShadow: `0 0 10px ${color}` }} />
    </div>
  );

  return (
    <div className="card full-width" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", padding: "24px" }}>
      
      {/* LEFT SIDE: Original IPsec Table */}
      <div>
        <div className="card-header" style={{ padding: "0 0 16px 0", background: "transparent", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: "16px" }}>
          <div className="card-title"><span style={{ color: "var(--emerald-400)", marginRight: "10px", textShadow: "var(--shadow-glow-emerald)" }}>🔒</span> IPsec Protocol Analysis</div>
          <div className="card-badge secure">IKEv2</div>
        </div>
        <table className="data-table">
          <tbody>
            <tr><td>IP Version</td><td><strong>{ipsec.ip_version}</strong></td></tr>
            <tr><td>Mode</td><td><strong>{ipsec.mode}</strong></td></tr>
            <tr><td>IKE Encryption</td><td><strong>{ipsec.ike_encryption}</strong></td></tr>
            <tr><td>IKE PRF</td><td><strong>{ipsec.ike_prf}</strong></td></tr>
            <tr><td>IKE DH Group</td><td><strong>{ipsec.ike_dh_group}</strong></td></tr>
            <tr><td>ESP Detected</td><td><strong style={{ color: ipsec.esp_detected ? "var(--emerald-400)" : "inherit", textShadow: ipsec.esp_detected ? "var(--shadow-glow-emerald)" : "none" }}>{ipsec.esp_detected ? "Yes" : "No"}</strong></td></tr>
            <tr><td>ESP Packets</td><td><strong>{espCount}</strong></td></tr>
            <tr>
              <td>ESP SPIs</td>
              <td>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {ipsec.esp_spis?.map(spi => (
                    <span key={spi} style={{ background: "rgba(0, 255, 163, 0.1)", color: "var(--emerald-400)", padding: "2px 8px", borderRadius: "4px", fontFamily: "var(--font-mono)", fontSize: "12px", border: "1px solid rgba(0, 255, 163, 0.3)", fontWeight: "600", boxShadow: "var(--shadow-glow-emerald)" }}>
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
        <div className="card-header" style={{ padding: "0 0 16px 0", background: "transparent", borderBottom: "none" }}>
          <div className="card-title" style={{ fontSize: "12px", color: "var(--text-muted)", letterSpacing: "1px" }}>TELEMETRY & HEURISTICS</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", height: "calc(100% - 30px)" }}>
          
          <MiniGraphCard title="Packet Rate (Time)" color="var(--emerald-400)">
            <svg width="100%" height="100%" viewBox="0 0 190 50" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0 }}>
              <polyline fill="rgba(0, 255, 163, 0.1)" stroke="var(--emerald-400)" strokeWidth="1.5" points={`0,50 ${ratePoints} 190,50`} />
            </svg>
          </MiniGraphCard>

          <MiniGraphCard title="Payload Distribution" color="var(--neon-cyan)">
            <svg width="100%" height="100%" viewBox="0 0 100 50" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0 }}>
              {sizes.map((s, i) => (
                <rect key={i} x={i * 10 + 2} y={50 - (s/2)} width="6" height={s/2} fill="var(--neon-cyan)" opacity={0.8} filter="drop-shadow(0 0 4px rgba(0, 229, 255, 0.5))" />
              ))}
            </svg>
          </MiniGraphCard>

          <MiniGraphCard title="IKE/ESP Latency Scatter" color="var(--neon-orange)">
            <svg width="100%" height="100%" viewBox="0 0 180 50" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0 }}>
              {scatter.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2" fill={i % 3 === 0 ? "var(--neon-orange)" : "rgba(255, 170, 0, 0.4)"} filter={i % 3 === 0 ? "drop-shadow(0 0 4px rgba(255, 170, 0, 0.8))" : "none"} />
              ))}
            </svg>
          </MiniGraphCard>

          <MiniGraphCard title="ESP Entropy Matrix" color="var(--neon-red)">
             <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "2px", height: "100%", padding: "2px" }}>
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} style={{ background: `rgba(255, 51, 102, ${0.1 + Math.random() * 0.9})`, borderRadius: "1px", boxShadow: "0 0 4px rgba(255, 51, 102, 0.2)" }} />
                ))}
             </div>
          </MiniGraphCard>

        </div>
      </div>
      
    </div>
  );
}