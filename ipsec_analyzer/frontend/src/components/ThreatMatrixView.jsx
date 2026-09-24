import React from 'react';
import SecurityFindings from './SecurityFindings';

export default function ThreatMatrixView({ security }) {
  if (!security) return null;

  const { score, status, findings } = security;
  
  // Mathematical logic for the SOC Dashboard
  const defcon = score > 90 ? 5 : score > 75 ? 4 : score > 50 ? 3 : score > 25 ? 2 : 1;
  const globalColor = score > 90 ? "var(--emerald-400)" : score > 70 ? "var(--neon-orange)" : "var(--neon-red)";
  
  const high = findings.filter(f => f.severity === 'HIGH').length;
  const med = findings.filter(f => f.severity === 'MEDIUM').length;
  const lowInfo = findings.filter(f => f.severity === 'LOW' || f.severity === 'INFO').length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>
      
      {/* Top SOC Dashboard */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        
        {/* Left: DEFCON & Integrity Stats */}
        <div className="card" style={{ padding: "32px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: globalColor, boxShadow: `0 0 15px ${globalColor}` }} />
          
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", letterSpacing: "2px", fontFamily: "var(--font-mono)", marginBottom: "8px", fontWeight: "700" }}>GLOBAL THREAT POSTURE</div>
            <div style={{ fontSize: "56px", fontWeight: "900", color: globalColor, fontFamily: "var(--font-mono)", textShadow: `0 0 20px ${globalColor}40`, lineHeight: "1.1" }}>
              DEFCON {defcon}
            </div>
            <div style={{ fontSize: "16px", color: "var(--text-primary)", letterSpacing: "1px", textTransform: "uppercase", marginTop: "4px", fontWeight: "700" }}>
              SYSTEM STATUS: {status}
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px", marginTop: "32px" }}>
             <div style={{ flex: 1, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", padding: "16px", borderRadius: "8px", textAlign: "center", boxShadow: "inset 0 0 20px rgba(255,51,102,0.1)" }}>
               <div style={{ fontSize: "32px", color: "var(--neon-red)", fontWeight: "800", fontFamily: "var(--font-mono)", textShadow: "var(--shadow-glow-red)" }}>{high}</div>
               <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "1px", fontWeight: "700" }}>CRITICAL / HIGH</div>
             </div>
             <div style={{ flex: 1, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", padding: "16px", borderRadius: "8px", textAlign: "center", boxShadow: "inset 0 0 20px rgba(255,170,0,0.1)" }}>
               <div style={{ fontSize: "32px", color: "var(--neon-orange)", fontWeight: "800", fontFamily: "var(--font-mono)", textShadow: "var(--shadow-glow-amber)" }}>{med}</div>
               <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "1px", fontWeight: "700" }}>ELEVATED / MED</div>
             </div>
             <div style={{ flex: 1, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", padding: "16px", borderRadius: "8px", textAlign: "center", boxShadow: "inset 0 0 20px rgba(0,255,163,0.1)" }}>
               <div style={{ fontSize: "32px", color: "var(--emerald-400)", fontWeight: "800", fontFamily: "var(--font-mono)", textShadow: "var(--shadow-glow-emerald)" }}>{lowInfo}</div>
               <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "1px", fontWeight: "700" }}>LOW / INFO</div>
             </div>
          </div>
        </div>

        {/* Right: Animated Attack Surface Radar */}
        <div className="card" style={{ padding: "24px", position: "relative" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", letterSpacing: "2px", fontFamily: "var(--font-mono)", position: "absolute", top: "24px", left: "24px", zIndex: 10, fontWeight: "700" }}>ATTACK SURFACE RADAR</div>
          
          <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%", maxHeight: "250px", display: "block", margin: "0 auto" }}>
            {/* Radar Grid */}
            <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <circle cx="100" cy="100" r="55" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <circle cx="100" cy="100" r="30" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <line x1="20" y1="100" x2="180" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <line x1="100" y1="20" x2="100" y2="180" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            
            {/* Radar Sweep Animation */}
            <path d="M100,100 L100,20 A80,80 0 0,1 180,100 Z" fill="url(#radarSweep)">
              <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="4s" repeatCount="indefinite" />
            </path>
            <defs>
              <linearGradient id="radarSweep" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={score > 90 ? "rgba(0,255,163,0.3)" : score > 70 ? "rgba(255,170,0,0.3)" : "rgba(255,51,102,0.3)"} />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>

            {/* Plotting actual findings as animated blips on the radar */}
            {findings.map((f, i) => {
               const angle = (i * (360 / findings.length)) * (Math.PI / 180);
               const dist = f.severity === 'HIGH' ? 25 : f.severity === 'MEDIUM' ? 50 : 75; // High threats are closer to the core
               const x = 100 + dist * Math.cos(angle);
               const y = 100 + dist * Math.sin(angle);
               const color = f.severity === 'HIGH' ? 'var(--neon-red)' : f.severity === 'MEDIUM' ? 'var(--neon-orange)' : 'var(--emerald-400)';
               
               return (
                 <circle key={i} cx={x} cy={y} r="3" fill={color} filter={`drop-shadow(0 0 8px ${color})`}>
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