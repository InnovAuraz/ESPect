import React from "react";

export default function TrafficClassification({ traffic }) {
  if (!traffic) return null;

  const confPct = Math.round(traffic.confidence * 100);

  // Generate a static "Neural Activation" bell curve based on confidence
  const bars = Array.from({ length: 40 }).map((_, i) => {
    const isActive = (i / 40) * 100 <= confPct;
    // Mathematical bell curve calculation
    const height = 5 + 40 * Math.exp(-Math.pow(i - 20, 2) / 80);
    return (
      <rect 
        key={i} 
        x={i * 7.5} 
        y={50 - height} 
        width="4" 
        height={height} 
        fill={isActive ? "var(--neon-purple)" : "rgba(255,255,255,0.05)"} 
        style={{ transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
      />
    );
  });

  return (
    <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", letterSpacing: "1px" }}>
          <span style={{ color: "var(--neon-purple)", fontSize: "18px" }}>✇</span> DEEP PACKET INSPECTION
        </div>
        <div style={{ 
          fontSize: "10px", 
          background: "rgba(157, 78, 221, 0.1)", 
          color: "var(--neon-purple)", 
          padding: "4px 12px", 
          borderRadius: "20px", 
          border: "1px solid rgba(157, 78, 221, 0.3)", 
          letterSpacing: "1px", 
          fontWeight: "800",
          boxShadow: "var(--shadow-glow-purple)"
        }}>
          ML INFERENCE
        </div>
      </div>

      <div style={{ textAlign: "center", flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ 
          fontSize: "clamp(32px, 4vw, 48px)", 
          fontWeight: "900", 
          color: "var(--neon-cyan)", 
          textShadow: "var(--shadow-glow-cyan)", 
          textTransform: "uppercase", 
          letterSpacing: "4px" 
        }}>
          {traffic.predicted_type}
        </div>
      </div>

      <div style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px", fontFamily: "var(--font-mono)", fontWeight: "700" }}>
          <span style={{ letterSpacing: "1px" }}>NEURAL NET CONFIDENCE MAP</span>
          <span style={{ color: "var(--neon-purple)", fontWeight: "800", textShadow: "var(--shadow-glow-purple)" }}>{confPct}%</span>
        </div>
        
        {/* Static Mathematical Graph */}
        <div style={{ 
          height: "70px", 
          width: "100%", 
          background: "rgba(0,0,0,0.3)", 
          border: "1px solid rgba(255,255,255,0.05)", 
          borderRadius: "8px", 
          position: "relative", 
          overflow: "hidden", 
          display: "flex", 
          alignItems: "flex-end", 
          padding: "5px", 
          boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)" 
        }}>
           <div style={{ 
             position: "absolute", 
             inset: 0, 
             backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", 
             backgroundSize: "15px 15px", 
             pointerEvents: "none" 
           }} />
           <svg width="100%" height="100%" viewBox="0 0 300 50" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0, left: "5px", right: "5px", width: "calc(100% - 10px)" }}>
              {bars}
           </svg>
        </div>
      </div>
    </div>
  );
}