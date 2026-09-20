import React from 'react';
import SecurityFindings from './SecurityFindings';

export default function ThreatMatrixView({ security }) {
  if (!security) return null;

  const { score, status, findings } = security;
  
  // Mathematical logic for the SOC Dashboard
  const defcon = score > 90 ? 5 : score > 75 ? 4 : score > 50 ? 3 : score > 25 ? 2 : 1;
  const globalColor = score > 90 ? "#00ff9d" : score > 70 ? "#ffa502" : "#ff4757";
  
  const high = findings.filter(f => f.severity === 'HIGH').length;
  const med = findings.filter(f => f.severity === 'MEDIUM').length;
  const lowInfo = findings.filter(f => f.severity === 'LOW' || f.severity === 'INFO').length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", width: "100%" }}>
      
      {/* Top SOC Dashboard */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        
        {/* Left: DEFCON & Integrity Stats */}
        <div className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: globalColor, boxShadow: `0 0 15px ${globalColor}` }} />
          
          <div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", letterSpacing: "2px", fontFamily: "monospace", marginBottom: "0.5rem" }}>GLOBAL THREAT POSTURE</div>
            <div style={{ fontSize: "3.5rem", fontWeight: "900", color: globalColor, fontFamily: "monospace", textShadow: `0 0 20px ${globalColor}40` }}>
              DEFCON {defcon}
            </div>
            <div style={{ fontSize: "1.2rem", color: "#e2e8f0", letterSpacing: "1px", textTransform: "uppercase", marginTop: "-5px" }}>
              SYSTEM STATUS: {status}
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
             <div style={{ flex: 1, background: "#06090c", border: "1px solid #1a2634", padding: "1rem", borderRadius: "4px", textAlign: "center" }}>
               <div style={{ fontSize: "2rem", color: "#ff4757", fontWeight: "bold", fontFamily: "monospace" }}>{high}</div>
               <div style={{ fontSize: "0.6rem", color: "#64748b", letterSpacing: "1px" }}>CRITICAL / HIGH</div>
             </div>
             <div style={{ flex: 1, background: "#06090c", border: "1px solid #1a2634", padding: "1rem", borderRadius: "4px", textAlign: "center" }}>
               <div style={{ fontSize: "2rem", color: "#ffa502", fontWeight: "bold", fontFamily: "monospace" }}>{med}</div>
               <div style={{ fontSize: "0.6rem", color: "#64748b", letterSpacing: "1px" }}>ELEVATED / MED</div>
             </div>
             <div style={{ flex: 1, background: "#06090c", border: "1px solid #1a2634", padding: "1rem", borderRadius: "4px", textAlign: "center" }}>
               <div style={{ fontSize: "2rem", color: "#00ff9d", fontWeight: "bold", fontFamily: "monospace" }}>{lowInfo}</div>
               <div style={{ fontSize: "0.6rem", color: "#64748b", letterSpacing: "1px" }}>LOW / INFO</div>
             </div>
          </div>
        </div>

        {/* Right: Animated Attack Surface Radar */}
        <div className="card" style={{ padding: "1.5rem", position: "relative" }}>
          <div style={{ fontSize: "0.8rem", color: "#64748b", letterSpacing: "2px", fontFamily: "monospace", position: "absolute", top: "1.5rem", left: "1.5rem", zIndex: 10 }}>ATTACK SURFACE RADAR</div>
          
          <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%", maxHeight: "250px", display: "block", margin: "0 auto" }}>
            {/* Radar Grid */}
            <circle cx="100" cy="100" r="80" fill="none" stroke="#1a2634" strokeWidth="1" />
            <circle cx="100" cy="100" r="55" fill="none" stroke="#1a2634" strokeWidth="1" />
            <circle cx="100" cy="100" r="30" fill="none" stroke="#1a2634" strokeWidth="1" />
            <line x1="20" y1="100" x2="180" y2="100" stroke="#1a2634" strokeWidth="1" />
            <line x1="100" y1="20" x2="100" y2="180" stroke="#1a2634" strokeWidth="1" />
            
            {/* Radar Sweep Animation */}
            <path d="M100,100 L100,20 A80,80 0 0,1 180,100 Z" fill="url(#radarSweep)">
              <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="4s" repeatCount="indefinite" />
            </path>
            <defs>
              <linearGradient id="radarSweep" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={`${globalColor}40`} />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>

            {/* Plotting actual findings as animated blips on the radar */}
            {findings.map((f, i) => {
               const angle = (i * (360 / findings.length)) * (Math.PI / 180);
               const dist = f.severity === 'HIGH' ? 25 : f.severity === 'MEDIUM' ? 50 : 75; // High threats are closer to the core
               const x = 100 + dist * Math.cos(angle);
               const y = 100 + dist * Math.sin(angle);
               const color = f.severity === 'HIGH' ? '#ff4757' : f.severity === 'MEDIUM' ? '#ffa502' : '#00ff9d';
               
               return (
                 <circle key={i} cx={x} cy={y} r="3" fill={color} filter={`drop-shadow(0 0 6px ${color})`}>
                    <animate attributeName="opacity" values="0;1;0;1;1" dur="3s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
                 </circle>
               );
            })}
          </svg>
        </div>
      </div>

      {/* The Upgraded Security Findings List you already have */}
      <SecurityFindings findings={findings} />
    </div>
  );
}