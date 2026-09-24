import React from 'react';

export default function StartupGuide() {
  const GuideStep = ({ num, title, children, glowColor }) => (
    <div className="card" style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: glowColor, boxShadow: `0 0 15px ${glowColor}` }} />
      <div className="card-header" style={{ padding: "16px 24px" }}>
        <div className="card-title">
          <span style={{ color: glowColor, fontFamily: "var(--font-mono)", fontSize: "18px", marginRight: "10px", textShadow: `0 0 10px ${glowColor}80` }}>0{num}</span>
          {title}
        </div>
      </div>
      <div className="card-body" style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.7" }}>
        {children}
      </div>
    </div>
  );

  const TerminalBlock = ({ code }) => (
    <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", padding: "16px", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--neon-cyan)", margin: "12px 0", boxShadow: "inset 0 0 15px rgba(0,229,255,0.05)" }}>
      <span style={{ color: "var(--text-muted)", marginRight: "12px", userSelect: "none" }}>root@espect:~#</span>
      {code}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%", animation: "fadeInUp 0.5s ease" }}>
      <div className="mission-bar" style={{ marginTop: 0 }}>
        <div>
          <div className="eyebrow">DOCUMENTATION & ONBOARDING</div>
          <h1>Analyzer Startup Guide</h1>
          <p>System architecture, node configuration, and operational protocols for SIH 2026.</p>
        </div>
        <div className="mission-state">
          <span className="status-dot online" />
          <span>DOCS VERSION</span>
          <strong style={{ color: "var(--neon-cyan)" }}>v1.0.0-SIH</strong>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
        <GuideStep num="1" title="Environment Initialization" glowColor="var(--neon-cyan)">
          <p>The ESPect Analyzer requires a Python 3.10+ environment with specific cryptographic and ML dependencies to decode IPsec/ESP payloads.</p>
          <TerminalBlock code="python -m venv venv && source venv/bin/activate" />
          <TerminalBlock code="pip install -r requirements.txt" />
        </GuideStep>

        <GuideStep num="2" title="Packet Acquisition Protocol" glowColor="var(--neon-purple)">
          <p>To analyze traffic, you must capture the VPN tunnel negotiation (IKEv2) and the subsequent encrypted payload (ESP) on UDP ports 500 and 4500.</p>
          <TerminalBlock code="tcpdump -i eth0 -n -w capture.pcap udp port 500 or udp port 4500" />
          <p style={{ marginTop: "12px", fontSize: "12px", color: "var(--text-muted)" }}>* Ensure you run tcpdump with elevated privileges to bind to the network interface.</p>
        </GuideStep>

        <GuideStep num="3" title="Igniting the AI Analysis Engine" glowColor="var(--emerald-400)">
          <p>Once the PCAP is acquired, start the FastAPI backend. The deep packet inspection (DPI) and neural network classifiers will automatically spin up on worker threads.</p>
          <TerminalBlock code="uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload" />
          <p style={{ marginTop: "12px", color: "var(--emerald-400)", fontWeight: "600", fontStyle: "italic" }}>The frontend UI will automatically connect once the socket is established.</p>
        </GuideStep>
      </div>
    </div>
  );
}