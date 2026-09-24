import React from 'react';

export default function SecurityFindings({ findings }) {
  if (!findings || findings.length === 0) return null;

  // Mapped to the new FireBarrier CSS root variables
  const severityStyles = {
    HIGH: { color: "var(--neon-red)", bg: "rgba(255, 51, 102, 0.05)", border: "var(--neon-red)", glow: "inset 20px 0 20px -20px rgba(255,51,102,0.3), 0 4px 15px rgba(255,51,102,0.1)" },
    MEDIUM: { color: "var(--neon-orange)", bg: "rgba(255, 170, 0, 0.05)", border: "var(--neon-orange)", glow: "inset 20px 0 20px -20px rgba(255,170,0,0.3), 0 4px 15px rgba(255,170,0,0.1)" },
    LOW: { color: "var(--neon-cyan)", bg: "rgba(0, 229, 255, 0.05)", border: "var(--neon-cyan)", glow: "inset 20px 0 20px -20px rgba(0,229,255,0.3), 0 4px 15px rgba(0,229,255,0.1)" },
    INFO: { color: "var(--emerald-400)", bg: "rgba(0, 255, 163, 0.05)", border: "var(--emerald-400)", glow: "inset 20px 0 20px -20px rgba(0,255,163,0.2), 0 4px 15px rgba(0,255,163,0.1)" },
  };

  return (
    <div className="card full-width">
      <div className="card-header">
        <div className="card-title">
          <span className="card-title-icon" style={{ color: "var(--neon-orange)" }}>⚠️</span> Security Findings
        </div>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "24px" }}>
        {findings.map((finding, index) => {
          const style = severityStyles[finding.severity] || severityStyles.INFO;
          
          return (
            <div key={index} style={{
              background: "rgba(0,0,0,0.2)",
              border: `1px solid rgba(255,255,255,0.05)`,
              borderLeft: `4px solid ${style.border}`,
              borderRadius: "var(--radius-md)",
              padding: "20px",
              boxShadow: style.glow,
              position: "relative",
              overflow: "hidden",
              transition: "all 0.3s ease"
            }}
            onMouseOver={(e) => { 
              e.currentTarget.style.background = "rgba(255,255,255,0.03)"; 
              e.currentTarget.style.transform = "translateX(4px)"; 
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; 
            }}
            onMouseOut={(e) => { 
              e.currentTarget.style.background = "rgba(0,0,0,0.2)"; 
              e.currentTarget.style.transform = "translateX(0)"; 
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; 
            }}
            >
              {/* Scanline overlay (Cyber aesthetic) */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "100%", background: "linear-gradient(rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%)", backgroundSize: "100% 4px", pointerEvents: "none" }} />
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", position: "relative", zIndex: 1 }}>
                <h4 style={{ margin: 0, color: "var(--text-primary)", fontSize: "14px", fontWeight: "700", letterSpacing: "0.5px" }}>{finding.title}</h4>
                <span style={{ 
                  background: style.bg, 
                  color: style.color, 
                  border: `1px solid ${style.color}`, 
                  padding: "4px 10px", 
                  borderRadius: "20px", 
                  fontSize: "10px", 
                  fontWeight: "800", 
                  letterSpacing: "1px",
                  boxShadow: `0 0 10px ${style.color}40`
                }}>
                  {finding.severity}
                </span>
              </div>
              
              <p style={{ margin: "0 0 16px 0", color: "var(--text-secondary)", fontSize: "12px", lineHeight: "1.6" }}>
                {finding.description}
              </p>
              
              <div style={{ background: "rgba(0,0,0,0.3)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", position: "relative", zIndex: 1 }}>
                <div style={{ marginBottom: "8px" }}>
                  <span style={{ color: "var(--neon-purple)" }}>&gt;_ SOURCE:</span> {finding.source} <span style={{ color: "var(--text-muted)", margin: "0 10px" }}>|</span> 
                  <span style={{ color: "var(--neon-purple)" }}>CONFIDENCE:</span> {Math.round(finding.confidence * 100)}%
                </div>
                {finding.evidence && (
                  <div style={{ marginBottom: "8px" }}>
                    <span style={{ color: "var(--neon-orange)" }}>&gt;_ EVIDENCE:</span> <span style={{ color: "var(--text-secondary)" }}>{finding.evidence}</span>
                  </div>
                )}
                <div>
                  <span style={{ color: "var(--emerald-400)" }}>&gt;_ RECOMMENDATION:</span> <span style={{ color: "var(--emerald-400)", fontWeight: "600", fontStyle: "italic" }}>{finding.recommendation}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}