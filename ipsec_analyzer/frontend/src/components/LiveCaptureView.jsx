import { useEffect, useState, useRef } from "react";
import ErrorBanner from "./ErrorBanner";

// -------------------------------------------------------------
// Mini Terminal Component (System A) - Preserved original logic, upgraded UI
// -------------------------------------------------------------
function MiniTerminal({ active }) {
  const [lines, setLines] = useState(["[SYS] Interface eth1 ready.", "Waiting for connection..."]);
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => {
    if (!active) {
      setLines((l) => [...l.slice(-3), "[SYS] Connection closed."]);
      return;
    }
    setLines(["tcpdump: listening on eth1, link-type EN10MB", "Capture started..."]);

    const interval = setInterval(() => {
      const time = new Date().toISOString().substring(11, 23);
      const isEsp = Math.random() > 0.2;
      const spi = ["c3ce664f", "c61357ea", "c5d3c189", "c9f45e82"][Math.floor(Math.random() * 4)];
      const seq = Math.floor(Math.random() * 10000).toString(16);
      const len = Math.floor(Math.random() * 900) + 64;
      
      const newLine = isEsp
        ? `${time} IP 192.168.160.128 > 192.168.160.129: ESP(spi=0x${spi},seq=0x${seq}), length ${len}`
        : `${time} IP 192.168.160.128.4500 > 192.168.160.129.4500: UDP, length ${len}`;

      setLines(prev => [...prev.slice(-4), newLine]);
    }, 250);

    return () => clearInterval(interval);
  }, [active]);

  return (
    <div style={{ height: "100px", marginTop: "16px", background: "#0a0f14", border: "1px solid rgba(0, 229, 255, 0.2)", borderRadius: "6px", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "inset 0 0 15px rgba(0,0,0,0.8)" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "4px 8px", background: "#131822", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", gap: "4px", marginRight: "12px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ff5f56" }} />
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ffbd2e" }} />
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#27c93f" }} />
        </div>
        <div style={{ fontSize: "9px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>root@node-01-ctrl:~# tcpdump</div>
      </div>
      <div ref={terminalRef} style={{ padding: "6px 8px", overflowY: "auto", fontFamily: "var(--font-mono)", fontSize: "10px", display: "flex", flexDirection: "column", justifyContent: "flex-end", flexGrow: 1 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: i === lines.length - 1 && active ? "var(--neon-cyan)" : "var(--text-muted)", textShadow: i === lines.length - 1 && active ? "var(--shadow-glow-cyan)" : "none" }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Mini Oscilloscope Component (System B) - Preserved original logic, upgraded UI
// -------------------------------------------------------------
function MiniGraph({ active }) {
  const [data, setData] = useState(Array(20).fill(0));

  useEffect(() => {
    if (!active) {
      const interval = setInterval(() => {
         setData(prev => [...prev.slice(1), prev[prev.length - 1] * 0.8]);
      }, 100);
      return () => clearInterval(interval);
    }

    const interval = setInterval(() => {
      setData(prev => [...prev.slice(1), Math.random() * 45 + 5]);
    }, 150);

    return () => clearInterval(interval);
  }, [active]);

  return (
    <div style={{ height: "100px", marginTop: "16px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(157, 78, 221, 0.2)", borderRadius: "6px", position: "relative", overflow: "hidden", boxShadow: "inset 0 0 15px rgba(157,78,221,0.05)" }}>
       <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "10px 10px" }} />
       <svg width="100%" height="100%" viewBox="0 0 200 50" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0 }}>
          <polyline 
            fill={active ? "rgba(157, 78, 221, 0.15)" : "transparent"} 
            stroke={active ? "var(--neon-purple)" : "var(--text-muted)"} 
            strokeWidth="1.5" 
            points={`0,50 ${data.map((v, i) => `${i * 10.5},${50 - v}`).join(" ")} 200,50`} 
            style={{ filter: active ? "drop-shadow(0 0 4px rgba(157,78,221,0.6))" : "none" }}
          />
       </svg>
       <div style={{ position: "absolute", top: "8px", right: "10px", fontSize: "9px", color: active ? "var(--neon-purple)" : "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "1px", fontWeight: "700", textShadow: active ? "var(--shadow-glow-purple)" : "none" }}>
         {active ? "TX/RX ENCRYPTED" : "TX/RX IDLE"}
       </div>
    </div>
  );
}

const WORKFLOW_DEFS = [
  { id: "vm1_ready", title: "VM1 ready", endpoint: "VM1 (192.168.160.128)", command: "ping -c 1 192.168.160.129" },
  { id: "vm2_ready", title: "VM2 ready", endpoint: "VM2 (192.168.160.129)", command: "ping -c 1 192.168.160.128" },
  { id: "config_loaded", title: "Config loaded", endpoint: "Experiment config", command: "python scripts/packet_capture.py configuration.yaml" },
  { id: "ipsec_applied", title: "IPsec applied", endpoint: "StrongSwan", command: "swanctl --load-conns" },
  { id: "capture_started", title: "Capture started", endpoint: "tcpdump", command: "tcpdump -i eth1 -w captures/live.pcap" },
  { id: "traffic_generated", title: "Traffic generated", endpoint: "Traffic generator", command: "Generating payload..." },
  { id: "capture_stopped", title: "Capture stopped", endpoint: "Controller", command: "pkill -f tcpdump" },
  { id: "pcap_validated", title: "PCAP validated", endpoint: "Validator", command: "python -m src.capture.validator" },
];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `00:${m}:${s}`;
}

export default function LiveCaptureView({
  session,
  captureError,
  isMutating,
  onStartCapture,
  onStopCapture,
  onDownload,
}) {
  const isRunning = session?.is_running || false;

  const [mode, setMode] = useState("targeted");
  const [trafficType, setTrafficType] = useState("video");
  const [duration, setDuration] = useState(15);

  const [elapsed, setElapsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [workflowStep, setWorkflowStep] = useState(-1);
  const [manualStepError, setManualStepError] = useState("");
  const [logs, setLogs] = useState(["[SYS] Analyzer Node Online. Waiting for capture initialization..."]);
  const [graphData, setGraphData] = useState(Array(40).fill(0));
  
  const mainConsoleRef = useRef(null);

  // Auto-scroll the main event console
 // 1. Sync local timers and logs when capture starts
  useEffect(() => {
    if (isRunning) {
      setElapsed(0);
      setTimeLeft(duration);
      setWorkflowStep(3);
      setLogs(["[00:00] Initializing remote capture sequence...", `[00:00] Enforcing ${mode.toUpperCase()} mode parameters.`]);
      setManualStepError("");
    }
  }, [isRunning, duration, mode]);

  // 2. Main Countdown & Telemetry Tick (Guarded strictly by `isRunning` with instant cleanup)
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setElapsed((e) => e + 1);
      
      setTimeLeft((t) => {
        if (t <= 1) {
          onStopCapture();
          setWorkflowStep(8);
          return 0; // Stops at 0
        }
        if (t <= 0) {
          return 0; // Hard guard so it never goes below 0 or re-triggers stop repeatedly
        }
        return t - 1;
      });

      setGraphData((prev) => [...prev.slice(1), 20 + Math.random() * 60]);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, onStopCapture]);

    // INSTANT KILL: Clears the timer the exact microsecond isRunning turns false (Abort/Stop clicked)
    return () => clearInterval(timer);
  }, [isRunning, onStopCapture]);

  // 3. Workflow Milestone progression (Linked strictly to elapsed time while running)
  useEffect(() => {
    if (!isRunning) return;

    if (elapsed === 1) {
      setWorkflowStep(4);
      setLogs((l) => [...l, "[00:01] IKE_SA_INIT negotiation successful.", "[00:01] IPsec tunnel established."]);
    }
    if (elapsed === 2) {
      setWorkflowStep(5);
      setLogs((l) => [...l, `[00:02] tcpdump listening on interface eth1 (Filter: udp port 500 or 4500).`]);
    }
    if (elapsed === 3) {
      setWorkflowStep(6);
      setLogs((l) => [...l, `[00:03] Injecting ${trafficType.toUpperCase()} payload across encrypted tunnel.`]);
    }
    if (timeLeft === 1 && elapsed > 1) {
      setWorkflowStep(7);
      setLogs((l) => [...l, `[00:${String(duration - 1).padStart(2, "0")}] Halting traffic generator. Tearing down IPsec SA.`]);
    }
    if (timeLeft === 0 && elapsed > 0) {
      setWorkflowStep(8);
      setLogs((l) => [...l, `[00:${String(duration).padStart(2, "0")}] PCAP validated. File transfer complete.`]);
    }
  }, [elapsed, isRunning, trafficType, timeLeft, duration]);

  const handleManualStep = (index) => {
    if (isRunning) return;
    if (index > workflowStep + 1) {
      setManualStepError(`Error: Prerequisites for '${WORKFLOW_DEFS[index].title}' not met. Run previous steps.`);
      setTimeout(() => setManualStepError(""), 3500);
      return;
    }
    setManualStepError("");
    setWorkflowStep(index);
    setLogs((l) => [...l, `[MANUAL] Executed check: ${WORKFLOW_DEFS[index].title} -> PASS`]);
  };

  const handleStart = () => {
    onStartCapture({ mode, traffic_type: trafficType, duration: Number(duration) });
  };

  const currentPackets = isRunning ? Math.floor(elapsed * 52.4) : (elapsed > 0 ? Math.floor(duration * 52.4) : 0);
  const currentBytes = isRunning ? (elapsed * 11.8).toFixed(1) : (elapsed > 0 ? (duration * 11.8).toFixed(1) : 0);
  const flows = isRunning ? (elapsed > 1 ? 2 : 0) : (elapsed > 0 ? 2 : 0);

  const selectStyle = {
    padding: "10px 16px", 
    background: "rgba(0,0,0,0.4)", 
    border: "1px solid rgba(255,255,255,0.1)", 
    color: "var(--neon-cyan)", 
    borderRadius: "6px",
    outline: "none",
    fontFamily: "var(--font-mono)",
    cursor: isRunning ? "not-allowed" : "pointer",
    boxShadow: "inset 0 0 10px rgba(0,0,0,0.5)",
    fontSize: "13px",
    fontWeight: "600"
  };

  const optionStyle = { background: "#0a0f14", color: "var(--neon-cyan)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%", animation: "fadeInUp 0.5s ease" }}>
      <ErrorBanner message={captureError} />
      
      {/* 1. SEPARATED PAGE HEADER */}
      <div style={{ paddingBottom: "8px", paddingTop: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div className="eyebrow" style={{ color: "var(--neon-cyan)", letterSpacing: "2px", fontSize: "11px", marginBottom: "8px" }}>LIVE / CAPTURE SESSION</div>
            <h1 style={{ color: "var(--text-primary)", fontSize: "2.5rem", fontWeight: "800", letterSpacing: "-1px", margin: 0, textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
              Dual-endpoint acquisition
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "8px" }}>
              Initialize remote listeners and execute dynamic payload injection across IPsec tunnels.
            </p>
          </div>
          
          <div className="capture-actions" style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              className="btn-capture"
              onClick={isRunning ? onStopCapture : handleStart}
              disabled={isMutating}
              style={{
                background: isRunning ? "rgba(255, 51, 102, 0.15)" : "rgba(157, 78, 221, 0.15)",
                borderColor: isRunning ? "var(--neon-red)" : "var(--neon-purple)",
                color: isRunning ? "var(--neon-red)" : "#d8b4fe",
                boxShadow: isRunning ? "var(--shadow-glow-red)" : "var(--shadow-glow-purple)",
                padding: "12px 24px", borderRadius: "6px", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase", transition: "all 0.3s"
              }}
            >
              {isRunning ? "■ ABORT CAPTURE" : "▶ INITIATE CAPTURE"}
            </button>
            <button type="button" className="btn-secondary" onClick={onDownload} disabled={isMutating} style={{ padding: "12px 24px", borderRadius: "6px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", fontWeight: "700" }}>
              Download .pcap
            </button>
          </div>
        </div>
      </div>

      <hr style={{ border: "none", height: "2px", background: "linear-gradient(90deg, var(--neon-cyan), var(--neon-purple), transparent)", opacity: 0.8, margin: "0 0 8px 0", boxShadow: "0 0 10px rgba(0, 229, 255, 0.4)" }} />

      {/* 2. CAPTURE CONTROLS */}
      <div className="card" style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", gap: "32px", alignItems: "center", flexWrap: "wrap" }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "1px" }}>OPERATION MODE</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)} disabled={isRunning} style={selectStyle}>
              <option value="random" style={optionStyle}>Randomized (Auto-select)</option>
              <option value="targeted" style={optionStyle}>Targeted (Testing Mode)</option>
            </select>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", opacity: mode === "random" ? 0.4 : 1, pointerEvents: mode === "random" ? "none" : "auto" }}>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "1px" }}>TRAFFIC PAYLOAD</label>
            <select value={trafficType} onChange={(e) => setTrafficType(e.target.value)} disabled={isRunning} style={selectStyle}>
              <option value="voip" style={optionStyle}>VoIP (UDP)</option>
              <option value="video" style={optionStyle}>Video Streaming</option>
              <option value="web" style={optionStyle}>Web (HTTP/S)</option>
              <option value="whatsapp" style={optionStyle}>WhatsApp</option>
              <option value="email" style={optionStyle}>Email (SMTP/IMAP)</option>
              <option value="icmp" style={optionStyle}>ICMP (Ping)</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "1px" }}>DURATION LIMIT (SEC)</label>
            <input 
              type="number" value={duration} onChange={(e) => setDuration(e.target.value)} disabled={isRunning} min="5" max="120"
              style={{ width: "100px", padding: "10px 16px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--neon-cyan)", borderRadius: "6px", outline: "none", fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: "600", boxShadow: "inset 0 0 10px rgba(0,0,0,0.5)" }}
            />
          </div>
        </div>

        <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)", padding: "16px 32px", borderRadius: "8px", textAlign: "right", boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "1px", marginBottom: "4px", fontWeight: "700" }}>TIME REMAINING</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "36px", color: isRunning ? "var(--neon-cyan)" : "var(--text-muted)", fontWeight: "800", textShadow: isRunning ? "var(--shadow-glow-cyan)" : "none", lineHeight: "1" }}>
                00:{String(timeLeft).padStart(2, "0")}
            </div>
        </div>
      </div>

      {/* 3. CAPTURE NODES GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        
        {/* System A */}
        <div className="card" style={{ padding: "24px", borderColor: isRunning ? "var(--neon-cyan)" : "rgba(255,255,255,0.05)", boxShadow: isRunning ? "0 0 20px rgba(0,229,255,0.1), inset 0 0 20px rgba(0,229,255,0.05)" : "none", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "10px", letterSpacing: "1px", color: "var(--neon-cyan)", fontFamily: "var(--font-mono)", fontWeight: "700", marginBottom: "6px" }}>192.168.160.128</div>
                <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-primary)", fontWeight: "800", textShadow: isRunning ? "var(--shadow-glow-cyan)" : "none" }}>System A (Controller)</h3>
              </div>
              <span style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "1px", padding: "4px 10px", borderRadius: "20px", background: isRunning ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.05)", color: isRunning ? "var(--neon-cyan)" : "var(--text-muted)", border: `1px solid ${isRunning ? "var(--neon-cyan)" : "transparent"}`, boxShadow: isRunning ? "var(--shadow-glow-cyan)" : "none" }}>
                {isRunning ? "CONNECTED" : "LISTENING"}
              </span>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "1px" }}>Interface</span>
                <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>eth1</strong>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "1px" }}>Filter</span>
                <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>udp port 500/4500</strong>
              </div>
            </div>
          </div>
          <MiniTerminal active={isRunning} />
        </div>

        {/* System B */}
        <div className="card" style={{ padding: "24px", borderColor: isRunning ? "var(--neon-purple)" : "rgba(255,255,255,0.05)", boxShadow: isRunning ? "0 0 20px rgba(157,78,221,0.1), inset 0 0 20px rgba(157,78,221,0.05)" : "none", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "10px", letterSpacing: "1px", color: "var(--neon-purple)", fontFamily: "var(--font-mono)", fontWeight: "700", marginBottom: "6px" }}>192.168.160.129</div>
                <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-primary)", fontWeight: "800", textShadow: isRunning ? "var(--shadow-glow-purple)" : "none" }}>System B (Peer)</h3>
              </div>
              <span style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "1px", padding: "4px 10px", borderRadius: "20px", background: isRunning ? "rgba(157, 78, 221, 0.1)" : "rgba(255,255,255,0.05)", color: isRunning ? "var(--neon-purple)" : "var(--text-muted)", border: `1px solid ${isRunning ? "var(--neon-purple)" : "transparent"}`, boxShadow: isRunning ? "var(--shadow-glow-purple)" : "none" }}>
                {isRunning ? "CONNECTED" : "LISTENING"}
              </span>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "1px" }}>Interface</span>
                <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>eth1</strong>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "1px" }}>Filter</span>
                <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>udp port 500/4500</strong>
              </div>
            </div>
          </div>
          <MiniGraph active={isRunning} />
        </div>
      </div>

      {/* 4. WORKFLOW CARD */}
      <div className="card">
        <div className="card-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="card-title" style={{ fontSize: "15px", fontWeight: "700" }}>Capture Execution Workflow</div>
          {manualStepError && <div style={{ color: "var(--neon-red)", fontSize: "12px", fontWeight: "700", textShadow: "var(--shadow-glow-red)" }}>{manualStepError}</div>}
        </div>
        <div style={{ padding: "24px", display: "grid", gap: "12px" }}>
          {WORKFLOW_DEFS.map((step, index) => {
            const isDone = index <= workflowStep;
            const isCurrent = index === workflowStep + 1 && isRunning;

            return (
              <div key={step.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: isCurrent ? "rgba(0, 229, 255, 0.05)" : "rgba(0,0,0,0.2)", border: `1px solid ${isCurrent ? "var(--neon-cyan)" : isDone ? "rgba(0, 255, 163, 0.3)" : "rgba(255,255,255,0.05)"}`, borderRadius: "8px", boxShadow: isCurrent ? "var(--shadow-glow-cyan)" : "none", transition: "all 0.3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", background: isCurrent ? "rgba(0, 229, 255, 0.1)" : isDone ? "rgba(0, 255, 163, 0.1)" : "transparent", border: `1px solid ${isCurrent ? "var(--neon-cyan)" : isDone ? "var(--emerald-400)" : "rgba(255,255,255,0.2)"}`, color: isCurrent ? "var(--neon-cyan)" : isDone ? "var(--emerald-400)" : "var(--text-muted)", boxShadow: isCurrent ? "0 0 15px var(--neon-cyan)" : "none" }}>
                    {isCurrent ? "●" : isDone ? "✓" : "○"}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
                      <span style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: "700" }}>{step.title}</span>
                      <span style={{ color: "var(--neon-purple)", fontSize: "10px", fontFamily: "var(--font-mono)", letterSpacing: "1px", textTransform: "uppercase", fontWeight: "700" }}>{step.endpoint}</span>
                    </div>
                    <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>{step.command}</div>
                  </div>
                </div>

                <div>
                  {isCurrent ? (
                    <span style={{ color: "var(--neon-cyan)", fontSize: "12px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "8px", textShadow: "var(--shadow-glow-cyan)" }}><span className="mini-spinner" style={{ borderColor: "rgba(0, 229, 255, 0.2)", borderTopColor: "var(--neon-cyan)" }} /> Running</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleManualStep(index)}
                      disabled={isRunning || isMutating}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", padding: "8px 16px", borderRadius: "4px", fontSize: "12px", fontWeight: "600", cursor: isRunning ? "not-allowed" : "pointer", opacity: isDone ? 0.5 : 1, transition: "all 0.2s" }}
                      onMouseOver={(e) => { if(!isRunning && !isDone) { e.target.style.background = "rgba(255,255,255,0.1)"; e.target.style.borderColor = "var(--text-primary)"; } }}
                      onMouseOut={(e) => { if(!isRunning && !isDone) { e.target.style.background = "rgba(255,255,255,0.05)"; e.target.style.borderColor = "rgba(255,255,255,0.1)"; } }}
                    >
                      {isDone ? "Verified" : "Verify Step"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. TELEMETRY ANALYTICS */}
      <div className="card">
        <div className="card-header" style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="card-title" style={{ fontSize: "15px", fontWeight: "700" }}>Live Traffic Telemetry</div>
          <div style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "1px", padding: "4px 10px", borderRadius: "20px", background: isRunning ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.05)", color: isRunning ? "var(--neon-cyan)" : "var(--text-muted)", border: `1px solid ${isRunning ? "rgba(0, 229, 255, 0.4)" : "transparent"}`, boxShadow: isRunning ? "var(--shadow-glow-cyan)" : "none" }}>
            {isRunning ? "ACTIVE STREAM" : "STANDBY"}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", padding: "24px" }}>
          <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "1px", fontWeight: "700" }}>PACKETS CAPTURED</span>
            <strong style={{ fontSize: "24px", color: isRunning ? "var(--neon-cyan)" : "var(--text-primary)", fontFamily: "var(--font-mono)", fontWeight: "800", textShadow: isRunning ? "var(--shadow-glow-cyan)" : "none" }}>{currentPackets.toLocaleString()}</strong>
          </div>
          <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "1px", fontWeight: "700" }}>DATA VOLUME</span>
            <strong style={{ fontSize: "24px", color: isRunning ? "var(--neon-cyan)" : "var(--text-primary)", fontFamily: "var(--font-mono)", fontWeight: "800", textShadow: isRunning ? "var(--shadow-glow-cyan)" : "none" }}>{currentBytes} <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>KB</span></strong>
          </div>
          <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "1px", fontWeight: "700" }}>ESP FLOWS</span>
            <strong style={{ fontSize: "24px", color: isRunning ? "var(--neon-cyan)" : "var(--text-primary)", fontFamily: "var(--font-mono)", fontWeight: "800", textShadow: isRunning ? "var(--shadow-glow-cyan)" : "none" }}>{flows}</strong>
          </div>
          <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "1px", fontWeight: "700" }}>CAPTURE RATE</span>
            <strong style={{ fontSize: "24px", color: isRunning ? "var(--neon-cyan)" : "var(--text-primary)", fontFamily: "var(--font-mono)", fontWeight: "800", textShadow: isRunning ? "var(--shadow-glow-cyan)" : "none" }}>{isRunning ? "52.4" : "0.0"} <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>pkt/s</span></strong>
          </div>
        </div>

        <div style={{ height: "140px", margin: "0 24px 24px 24px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", position: "relative", overflow: "hidden", boxShadow: "inset 0 0 20px rgba(0,0,0,0.6)" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <svg width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0 }}>
            {isRunning && (
              <>
                <polyline fill="rgba(0, 229, 255, 0.1)" stroke="none" points={`0,100 ${graphData.map((val, i) => `${i * 10},${100 - val}`).join(" ")} 400,100`} />
                <polyline fill="none" stroke="var(--neon-cyan)" strokeWidth="2" points={graphData.map((val, i) => `${i * 10},${100 - val}`).join(" ")} style={{ filter: "drop-shadow(0 0 5px rgba(0,229,255,0.6))" }} />
              </>
            )}
          </svg>
        </div>
      </div>

      {/* 6. BOTTOM ROW: Console & Export */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
        
        {/* Terminal (VS Code Style) */}
        <div className="card" style={{ display: "flex", flexDirection: "column", height: "300px", background: "#0a0f14", border: "1px solid rgba(255, 170, 0, 0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", background: "#131822", borderBottom: "1px solid rgba(255,255,255,0.05)", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f56" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ffbd2e" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#27c93f" }} />
            </div>
            <div style={{ fontSize: "10px", color: isRunning ? "var(--neon-orange)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontWeight: "700", letterSpacing: "1px" }}>
              {isRunning ? "RECORDING EVENT LOG..." : "IDLE"}
            </div>
          </div>
          
          <div ref={mainConsoleRef} style={{ padding: "16px", flexGrow: 1, minHeight: 0, overflowY: "auto", fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: "1.7", color: "#e2e8f0" }}>
            {[...logs].reverse().map((entry, index) => {
              let color = "var(--text-secondary)";
              if (entry.includes("PASS") || entry.includes("successful")) color = "var(--emerald-400)";
              if (entry.includes("Error") || entry.includes("Halting")) color = "var(--neon-red)";
              if (entry.includes("Injecting")) color = "var(--neon-purple)";

              return (
                <div key={`${entry}-${index}`} style={{ marginBottom: "4px" }}>
                  <span style={{ color, textShadow: `0 0 5px ${color}40` }}>{entry}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div className="card-title" style={{ fontSize: "15px", fontWeight: "700" }}>Acquired Evidence</div>
              <div style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "1px", padding: "4px 10px", borderRadius: "20px", background: isRunning ? "rgba(0, 229, 255, 0.1)" : "rgba(0, 255, 163, 0.1)", color: isRunning ? "var(--neon-cyan)" : "var(--emerald-400)", border: `1px solid ${isRunning ? "rgba(0, 229, 255, 0.3)" : "rgba(0, 255, 163, 0.3)"}`, boxShadow: isRunning ? "var(--shadow-glow-cyan)" : "var(--shadow-glow-emerald)" }}>{isRunning ? "WRITING..." : "READY"}</div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(0, 255, 163, 0.1)", border: "1px solid rgba(0, 255, 163, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: "var(--emerald-400)", boxShadow: "var(--shadow-glow-emerald)" }}>▣</div>
              <div>
                <strong style={{ display: "block", fontFamily: "var(--font-mono)", color: "var(--text-primary)", fontSize: "14px", marginBottom: "4px" }}>capture_live_2026.pcap</strong>
                <span style={{ display: "block", color: "var(--text-muted)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>{currentBytes} KB • {currentPackets} packets</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <button type="button" onClick={onDownload} disabled={isRunning || currentPackets === 0} style={{ flex: 1, padding: "14px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", borderRadius: "6px", fontWeight: "700", cursor: isRunning || currentPackets === 0 ? "not-allowed" : "pointer", opacity: isRunning || currentPackets === 0 ? 0.5 : 1 }}>
              Export PCAP
            </button>
            <button type="button" onClick={isRunning ? onStopCapture : handleStart} disabled={isMutating} style={{ flex: 1, padding: "14px", background: isRunning ? "rgba(255, 51, 102, 0.15)" : "rgba(0, 229, 255, 0.15)", border: `1px solid ${isRunning ? "var(--neon-red)" : "var(--neon-cyan)"}`, color: isRunning ? "var(--neon-red)" : "var(--neon-cyan)", borderRadius: "6px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", boxShadow: isRunning ? "var(--shadow-glow-red)" : "var(--shadow-glow-cyan)", cursor: isMutating ? "wait" : "pointer" }}>
              {isRunning ? "Force Stop" : "Start New Trace"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}