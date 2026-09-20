import React from 'react';

export default function ReportButton({ onDownload, isGenerating, error }) {
  return (
    <div style={{ 
      marginTop: "2rem", 
      padding: "2rem", 
      background: "linear-gradient(90deg, #0a0f14 0%, #06090c 100%)", 
      border: "1px solid #1a2634", 
      borderRadius: "8px", 
      position: "relative", 
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
    }}>
      {/* Neon Accent Bar */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: "#00ff9d", boxShadow: "0 0 15px #00ff9d" }} />
      
      {/* Background Tech Watermark */}
      <div style={{ position: "absolute", right: "-20px", top: "-20px", fontSize: "10rem", color: "#1a2634", opacity: 0.3, fontFamily: "monospace", userSelect: "none", zIndex: 0 }}>
        PDF
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
        <div>
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#e2e8f0", fontFamily: "monospace", fontSize: "1.3rem", letterSpacing: "2px", textTransform: "uppercase" }}>
            Executive Intelligence Brief
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ display: "inline-block", width: "8px", height: "8px", background: "#00ff9d", borderRadius: "50%", boxShadow: "0 0 8px #00ff9d" }} />
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem", fontFamily: "monospace" }}>
              Generate cryptographically signed SIH analysis report
            </p>
          </div>
        </div>
        
        <button
          onClick={onDownload}
          disabled={isGenerating}
          style={{
            background: isGenerating ? "#1a2634" : "rgba(0, 255, 157, 0.05)",
            border: "1px solid #00ff9d",
            color: "#00ff9d",
            padding: "1rem 2.5rem",
            fontFamily: "monospace",
            fontSize: "1.1rem",
            fontWeight: "bold",
            letterSpacing: "2px",
            cursor: isGenerating ? "wait" : "pointer",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            boxShadow: isGenerating ? "none" : "0 0 20px rgba(0, 255, 157, 0.2)",
            transition: "all 0.2s ease-in-out",
            borderRadius: "4px"
          }}
          onMouseOver={(e) => { if(!isGenerating) { e.target.style.background = "rgba(0,255,157,0.15)"; e.target.style.transform = "translateY(-2px)"; } }}
          onMouseOut={(e) => { if(!isGenerating) { e.target.style.background = "rgba(0,255,157,0.05)"; e.target.style.transform = "translateY(0)"; } }}
        >
          {isGenerating ? (
            <><span className="mini-spinner" style={{ borderColor: "#00ff9d", borderRightColor: "transparent" }} /> COMPILING DATA...</>
          ) : (
            <>⬇ EXTRACT SECURE PDF</>
          )}
        </button>
      </div>
      
      {error && (
        <div style={{ color: "#ff4757", marginTop: "1rem", fontFamily: "monospace", fontSize: "0.85rem", background: "rgba(255,71,87,0.1)", padding: "8px", borderLeft: "3px solid #ff4757" }}>
          [SYSTEM ERROR]: {error}
        </div>
      )}
    </div>
  );
}