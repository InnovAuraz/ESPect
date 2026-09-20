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
        fill={isActive ? "#00ff9d" : "#1a2634"} 
        style={{ transition: "all 0.5s ease" }}
      />
    );
  });

  return (
    <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#e2e8f0", display: "flex", alignItems: "center", gap: "8px", letterSpacing: "1px" }}>
          <span style={{ color: "#00ff9d", fontSize: "1.2rem" }}>✇</span> DEEP PACKET INSPECTION
        </div>
        <div style={{ fontSize: "0.65rem", background: "rgba(0,255,157,0.1)", color: "#00ff9d", padding: "3px 8px", borderRadius: "3px", border: "1px solid rgba(0,255,157,0.3)", letterSpacing: "1px", fontWeight: "bold" }}>
          ML INFERENCE
        </div>
      </div>

      <div style={{ textAlign: "center", flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "3rem", fontWeight: "900", color: "#00ff9d", textShadow: "0 0 20px rgba(0,255,157,0.5)", textTransform: "uppercase", letterSpacing: "4px" }}>
          {traffic.predicted_type}
        </div>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.5rem", fontFamily: "monospace" }}>
          <span>NEURAL NET CONFIDENCE MAP</span>
          <span style={{ color: "#00ff9d", fontWeight: "bold" }}>{confPct}%</span>
        </div>
        
        {/* Static Mathematical Graph */}
        <div style={{ height: "60px", width: "100%", background: "#06090c", border: "1px solid #1a2634", borderRadius: "4px", position: "relative", overflow: "hidden", display: "flex", alignItems: "flex-end", padding: "5px" }}>
           <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#1a2634 1px, transparent 1px), linear-gradient(90deg, #1a2634 1px, transparent 1px)", backgroundSize: "15px 15px", opacity: 0.2 }} />
           <svg width="100%" height="100%" viewBox="0 0 300 50" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0, left: "5px" }}>
              {bars}
           </svg>
        </div>
      </div>
    </div>
  );
}