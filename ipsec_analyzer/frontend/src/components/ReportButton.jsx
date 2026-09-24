import React from 'react';

export default function ReportButton({ onDownload, isGenerating, error }) {
  return (
    <div style={{ 
      marginTop: "16px", 
      padding: "32px", 
      background: "rgba(0,0,0,0.3)", 
      border: "1px solid rgba(255,255,255,0.05)", 
      borderRadius: "var(--radius-lg)", 
      position: "relative", 
      overflow: "hidden",
      boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)"
    }}>
      {/* Neon Accent Bar */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: "var(--neon-purple)", boxShadow: "0 0 15px var(--neon-purple)" }} />
      
      {/* Background Tech Watermark */}
      <div style={{ position: "absolute", right: "-20px", top: "-20px", fontSize: "10rem", color: "var(--neon-purple)", opacity: 0.03, fontFamily: "var(--font-mono)", userSelect: "none", zIndex: 0 }}>
        PDF
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
        <div>
          <h3 style={{ margin: "0 0 8px 0", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "20px", letterSpacing: "2px", textTransform: "uppercase" }}>
            Executive Intelligence Brief
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ display: "inline-block", width: "8px", height: "8px", background: "var(--neon-purple)", borderRadius: "50%", boxShadow: "0 0 8px var(--neon-purple)" }} />
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "12px", fontFamily: "var(--font-mono)", fontWeight: "600" }}>
              Generate cryptographically signed SIH analysis report
            </p>
          </div>
        </div>
        
        <button
          onClick={onDownload}
          disabled={isGenerating}
          style={{
            background: isGenerating ? "rgba(0,0,0,0.5)" : "rgba(157, 78, 221, 0.1)",
            border: "1px solid var(--neon-purple)",
            color: "#d8b4fe",
            padding: "16px 32px",
            fontFamily: "var(--font-mono)",
            fontSize: "14px",
            fontWeight: "700",
            letterSpacing: "2px",
            cursor: isGenerating ? "wait" : "pointer",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            boxShadow: isGenerating ? "none" : "var(--shadow-glow-purple)",
            transition: "all 0.2s ease-in-out",
            borderRadius: "var(--radius-md)"
          }}
          onMouseOver={(e) => { if(!isGenerating) { e.target.style.background = "var(--neon-purple)"; e.target.style.color = "white"; e.target.style.transform = "translateY(-2px)"; } }}
          onMouseOut={(e) => { if(!isGenerating) { e.target.style.background = "rgba(157, 78, 221, 0.1)"; e.target.style.color = "#d8b4fe"; e.target.style.transform = "translateY(0)"; } }}
        >
          {isGenerating ? (
            <><span className="mini-spinner" style={{ borderColor: "var(--neon-purple)", borderRightColor: "transparent" }} /> COMPILING DATA...</>
          ) : (
            <>⬇ EXTRACT SECURE PDF</>
          )}
        </button>
      </div>
      
      {error && (
        <div className="error-banner" style={{ marginTop: "16px", marginBottom: "0" }}>
          [SYSTEM ERROR]: {error}
        </div>
      )}
    </div>
  );
}