import React from 'react';

export default function SecurityFindings({ findings }) {
  if (!findings || findings.length === 0) return null;

  const severityStyles = {
    HIGH: { color: "#ff4757", bg: "rgba(255, 71, 87, 0.05)", border: "#ff4757", glow: "0 0 15px rgba(255,71,87,0.3)" },
    MEDIUM: { color: "#ffa502", bg: "rgba(255, 165, 2, 0.05)", border: "#ffa502", glow: "0 0 15px rgba(255,165,2,0.2)" },
    LOW: { color: "#1e90ff", bg: "rgba(30, 144, 255, 0.05)", border: "#1e90ff", glow: "0 0 15px rgba(30,144,255,0.2)" },
    INFO: { color: "#00ff9d", bg: "rgba(0, 255, 157, 0.05)", border: "#00ff9d", glow: "0 0 15px rgba(0,255,157,0.2)" },
  };

  return (
    <div className="card full-width">
      <div className="card-header">
        <div className="card-title">
          <span style={{ color: "#ffa502", marginRight: "10px" }}>⚠️</span> Security Findings
        </div>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem", padding: "1.5rem" }}>
        {findings.map((finding, index) => {
          const style = severityStyles[finding.severity] || severityStyles.INFO;
          
          return (
            <div key={index} style={{
              background: "#0a0f14",
              border: `1px solid #1a2634`,
              borderLeft: `4px solid ${style.border}`,
              borderRadius: "6px",
              padding: "1.2rem",
              boxShadow: style.glow,
              position: "relative",
              overflow: "hidden"
            }}>
              {/* Scanline overlay */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "100%", background: "linear-gradient(rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%)", backgroundSize: "100% 4px", pointerEvents: "none" }} />
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.8rem", position: "relative", zIndex: 1 }}>
                <h4 style={{ margin: 0, color: "#e2e8f0", fontSize: "1.05rem", letterSpacing: "0.5px" }}>{finding.title}</h4>
                <span style={{ 
                  background: style.bg, 
                  color: style.color, 
                  border: `1px solid ${style.color}`, 
                  padding: "2px 8px", 
                  borderRadius: "4px", 
                  fontSize: "0.7rem", 
                  fontWeight: "bold", 
                  letterSpacing: "1px" 
                }}>
                  {finding.severity}
                </span>
              </div>
              
              <p style={{ margin: "0 0 1rem 0", color: "#94a3b8", fontSize: "0.9rem", lineHeight: "1.5" }}>
                {finding.description}
              </p>
              
              <div style={{ background: "#06090c", padding: "1rem", borderRadius: "4px", border: "1px solid #1a2634", fontFamily: "monospace", fontSize: "0.8rem", color: "#64748b", position: "relative", zIndex: 1 }}>
                <div style={{ marginBottom: "0.5rem" }}>
                  <span style={{ color: "#3b82f6" }}>&gt;_ SOURCE:</span> {finding.source} <span style={{ color: "#64748b", margin: "0 10px" }}>|</span> 
                  <span style={{ color: "#3b82f6" }}>CONFIDENCE:</span> {Math.round(finding.confidence * 100)}%
                </div>
                {finding.evidence && (
                  <div style={{ marginBottom: "0.5rem" }}>
                    <span style={{ color: "#f59e0b" }}>&gt;_ EVIDENCE:</span> {finding.evidence}
                  </div>
                )}
                <div style={{ color: "#00ff9d" }}>
                  <span style={{ color: "#00ff9d" }}>&gt;_ RECOMMENDATION:</span> {finding.recommendation}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}