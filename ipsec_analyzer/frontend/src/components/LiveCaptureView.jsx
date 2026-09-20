import { useEffect, useState } from "react";
import ErrorBanner from "./ErrorBanner";

// -------------------------------------------------------------
// NEW: Mini Terminal Component (System A)
// Simulates a live, scrolling tcpdump terminal.
// -------------------------------------------------------------
function MiniTerminal({ active }) {
  const [lines, setLines] = useState(["[SYS] Interface eth1 ready.", "Waiting for connection..."]);

  useEffect(() => {
    if (!active) {
      setLines((l) => [...l.slice(-3), "[SYS] Connection closed."]);
      return;
    }
    setLines(["tcpdump: listening on eth1, link-type EN10MB", "Capture started..."]);

    const interval = setInterval(() => {
      const time = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
      const isEsp = Math.random() > 0.2;
      const spi = ["c3ce664f", "c61357ea", "c5d3c189", "c9f45e82"][Math.floor(Math.random() * 4)];
      const seq = Math.floor(Math.random() * 10000).toString(16);
      const len = Math.floor(Math.random() * 900) + 64;
      
      const newLine = isEsp
        ? `${time} IP 192.168.160.128 > 192.168.160.129: ESP(spi=0x${spi},seq=0x${seq}), length ${len}`
        : `${time} IP 192.168.160.128.4500 > 192.168.160.129.4500: UDP, length ${len}`;

      setLines(prev => [...prev.slice(-4), newLine]);
    }, 250); // Updates extremely fast to look like raw traffic

    return () => clearInterval(interval);
  }, [active]);

  return (
    <div style={{ height: "85px", marginTop: "1rem", background: "#06090c", border: "1px solid #1a2634", borderRadius: "4px", padding: "6px 8px", overflow: "hidden", fontFamily: "monospace", fontSize: "0.65rem", display: "flex", flexDirection: "column", justifyContent: "flex-end", boxShadow: "inset 0 0 10px rgba(0,0,0,0.8)" }}>
      {lines.map((l, i) => (
        <div key={i} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: i === lines.length - 1 && active ? "#00ff9d" : "#4a5b6d" }}>
          {l}
        </div>
      ))}
    </div>
  );
}

// -------------------------------------------------------------
// NEW: Mini Oscilloscope Component (System B)
// Simulates encrypted throughput via a glowing jagged waveform.
// -------------------------------------------------------------
function MiniGraph({ active }) {
  const [data, setData] = useState(Array(20).fill(0));

  useEffect(() => {
    if (!active) {
      const interval = setInterval(() => {
         setData(prev => [...prev.slice(1), prev[prev.length - 1] * 0.8]); // Smoothly decays to flatline
      }, 100);
      return () => clearInterval(interval);
    }

    const interval = setInterval(() => {
      // Generate jagged, unpredictable peaks representing encrypted payload throughput
      setData(prev => [...prev.slice(1), Math.random() * 45 + 5]);
    }, 150);

    return () => clearInterval(interval);
  }, [active]);

  return (
    <div style={{ height: "85px", marginTop: "1rem", background: "#06090c", border: "1px solid #1a2634", borderRadius: "4px", position: "relative", overflow: "hidden", boxShadow: "inset 0 0 10px rgba(0,0,0,0.8)" }}>
       {/* Faint hacker grid overlay */}
       <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#1a2634 1px, transparent 1px), linear-gradient(90deg, #1a2634 1px, transparent 1px)", backgroundSize: "10px 10px", opacity: 0.2 }} />
       
       <svg width="100%" height="100%" viewBox="0 0 200 50" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0 }}>
          <polyline 
            fill="rgba(0, 255, 157, 0.15)" 
            stroke={active ? "#00ff9d" : "#4a5b6d"} 
            strokeWidth="1.5" 
            points={`0,50 ${data.map((v, i) => `${i * 10.5},${50 - v}`).join(" ")} 200,50`} 
          />
       </svg>
       
       <div style={{ position: "absolute", top: "6px", right: "8px", fontSize: "0.6rem", color: active ? "#00ff9d" : "#4a5b6d", fontFamily: "monospace", letterSpacing: "1px", fontWeight: "bold" }}>
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

  useEffect(() => {
    if (isRunning) {
      setElapsed(0);
      setTimeLeft(duration);
      setWorkflowStep(3);
      setLogs(["[00:00] Initializing remote capture sequence...", `[00:00] Enforcing ${mode.toUpperCase()} mode parameters.`]);
      setManualStepError("");
    }
  }, [isRunning, duration, mode]);

  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setElapsed((e) => e + 1);
      
      setTimeLeft((t) => {
        if (t <= 1) {
          onStopCapture();
          setWorkflowStep(8);
          return 0;
        }
        return t - 1;
      });

      setGraphData((prev) => [...prev.slice(1), 20 + Math.random() * 60]);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, onStopCapture]);

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
    padding: "0.5rem", 
    background: "#0a0f14", 
    border: "1px solid #1a2634", 
    color: "#00ff9d", 
    borderRadius: "4px",
    outline: "none",
    fontFamily: "monospace",
    cursor: isRunning ? "not-allowed" : "pointer"
  };

  const optionStyle = {
    background: "#0a0f14", 
    color: "#00ff9d"
  };

  return (
    <div className="live-capture-view">
      <ErrorBanner message={captureError} />
      
      <div className="capture-header">
        <div>
          <div className="eyebrow">LIVE / CAPTURE SESSION</div>
          <h2>Dual-endpoint packet acquisition</h2>
        </div>
        <div className="capture-actions">
          <button
            type="button"
            className="btn-capture"
            onClick={isRunning ? onStopCapture : handleStart}
            disabled={isMutating}
          >
            {isRunning ? "ABORT CAPTURE" : "INITIATE CAPTURE"}
          </button>
          <button type="button" className="btn-secondary" onClick={onDownload} disabled={isMutating}>
            Download .pcap
          </button>
        </div>
      </div>

      <div className="capture-controls card" style={{ marginBottom: "2rem", padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "1px" }}>OPERATION MODE</label>
            <select 
              value={mode} 
              onChange={(e) => setMode(e.target.value)}
              disabled={isRunning}
              style={selectStyle}
            >
              <option value="random" style={optionStyle}>Randomized (Auto-select)</option>
              <option value="targeted" style={optionStyle}>Targeted (Testing Mode)</option>
            </select>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", opacity: mode === "random" ? 0.4 : 1, pointerEvents: mode === "random" ? "none" : "auto" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "1px" }}>TRAFFIC PAYLOAD</label>
            <select 
              value={trafficType} 
              onChange={(e) => setTrafficType(e.target.value)}
              disabled={isRunning}
              style={selectStyle}
            >
              <option value="voip" style={optionStyle}>VoIP (UDP)</option>
              <option value="video" style={optionStyle}>Video Streaming</option>
              <option value="web" style={optionStyle}>Web (HTTP/S)</option>
              <option value="whatsapp" style={optionStyle}>WhatsApp</option>
              <option value="email" style={optionStyle}>Email (SMTP/IMAP)</option>
              <option value="icmp" style={optionStyle}>ICMP (Ping)</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "1px" }}>DURATION LIMIT (SEC)</label>
            <input 
              type="number" 
              value={duration} 
              onChange={(e) => setDuration(e.target.value)}
              disabled={isRunning}
              min="5"
              max="120"
              style={{ width: "90px", padding: "0.5rem", background: "#0a0f14", border: "1px solid #1a2634", color: "#00ff9d", borderRadius: "4px", outline: "none", fontFamily: "monospace" }}
            />
          </div>
        </div>

        <div style={{ background: "#0a0f14", border: "1px solid #1a2634", padding: "1rem 2rem", borderRadius: "8px", textAlign: "right" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", letterSpacing: "1px", marginBottom: "4px" }}>TIME REMAINING</div>
            <div style={{ fontFamily: "monospace", fontSize: "1.8rem", color: isRunning ? "#00ff9d" : "#4a5b6d", fontWeight: "bold" }}>
                00:{String(timeLeft).padStart(2, "0")}
            </div>
        </div>
      </div>

      <div className="capture-grid">
        <div className="capture-card" style={{ borderColor: isRunning ? "#00ff9d" : "var(--border)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div className="capture-card-header">
              <div>
                <div className="system-tag">192.168.160.128</div>
                <h3>System A (Controller)</h3>
              </div>
              <span className={`status-pill ${isRunning ? "capturing" : "idle"}`}>
                {isRunning ? "CONNECTED" : "LISTENING"}
              </span>
            </div>
            <div className="field-grid">
              <div className="field-item">
                <label>Interface</label>
                <strong>eth1</strong>
              </div>
              <div className="field-item">
                <label>Source IP</label>
                <strong>192.168.160.128</strong>
              </div>
              <div className="field-item">
                <label>Duration</label>
                <strong style={{ color: isRunning ? "#00ff9d" : "inherit" }}>{formatTime(elapsed)}</strong>
              </div>
              <div className="field-item full">
                <label>Filter</label>
                <strong>ipsec or esp (udp port 500/4500)</strong>
              </div>
            </div>
          </div>
          
          {/* SYSTEM A MINI-TERMINAL */}
          <MiniTerminal active={isRunning} />
        </div>

        <div className="capture-card" style={{ borderColor: isRunning ? "#00ff9d" : "var(--border)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div className="capture-card-header">
              <div>
                <div className="system-tag">192.168.160.129</div>
                <h3>System B (Peer)</h3>
              </div>
              <span className={`status-pill ${isRunning ? "capturing" : "idle"}`}>
                {isRunning ? "CONNECTED" : "LISTENING"}
              </span>
            </div>
            <div className="field-grid">
              <div className="field-item">
                <label>Interface</label>
                <strong>eth1</strong>
              </div>
              <div className="field-item">
                <label>Source IP</label>
                <strong>192.168.160.129</strong>
              </div>
              <div className="field-item">
                <label>Duration</label>
                <strong style={{ color: isRunning ? "#00ff9d" : "inherit" }}>{formatTime(elapsed)}</strong>
              </div>
              <div className="field-item full">
                <label>Filter</label>
                <strong>ipsec or esp (udp port 500/4500)</strong>
              </div>
            </div>
          </div>
          
          {/* SYSTEM B MINI-OSCILLOSCOPE */}
          <MiniGraph active={isRunning} />
        </div>
      </div>

      <div className="workflow-card">
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between" }}>
          <div className="card-title">Capture Execution Workflow</div>
          {manualStepError && <div style={{ color: "#ff4757", fontSize: "0.8rem", fontWeight: "bold" }}>{manualStepError}</div>}
        </div>
        <div className="workflow-steps">
          {WORKFLOW_DEFS.map((step, index) => {
            const isDone = index <= workflowStep;
            const isCurrent = index === workflowStep + 1 && isRunning;

            return (
              <div key={step.id} className={`workflow-step ${isDone ? "done" : isCurrent ? "running" : "idle"}`}>
                <div className="workflow-step-main">
                  <div className={`workflow-status ${isDone ? "done" : isCurrent ? "running" : "idle"}`} aria-label={step.status}>
                    {isCurrent ? "●" : isDone ? "✓" : "○"}
                  </div>
                  <div className="workflow-copy">
                    <div className="workflow-step-title-row">
                      <span className="workflow-step-title">{step.title}</span>
                      <span className="workflow-step-endpoint">{step.endpoint}</span>
                    </div>
                    <div className="workflow-step-command" style={{ fontFamily: "monospace", color: "var(--text-muted)" }}>{step.command}</div>
                  </div>
                </div>

                <div className="workflow-step-actions">
                  {isCurrent ? (
                    <span className="workflow-loading-inline" style={{ color: "#00ff9d" }}><span className="mini-spinner" /> Running</span>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary workflow-button"
                      onClick={() => handleManualStep(index)}
                      disabled={isRunning || isMutating}
                      style={{ opacity: isDone ? 0.5 : 1 }}
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

      <div className="capture-analytics card">
        <div className="card-header">
          <div className="card-title">Live Traffic Telemetry</div>
          <div className="card-badge secure" style={{ background: isRunning ? "rgba(0, 255, 157, 0.1)" : "", color: isRunning ? "#00ff9d" : "" }}>
            {isRunning ? "ACTIVE STREAM" : "STANDBY"}
          </div>
        </div>

        <div className="metric-grid">
          <div className="metric-box">
            <span>Packets Captured</span>
            <strong style={{ color: isRunning ? "#00ff9d" : "inherit" }}>{currentPackets.toLocaleString()}</strong>
          </div>
          <div className="metric-box">
            <span>Data Volume</span>
            <strong style={{ color: isRunning ? "#00ff9d" : "inherit" }}>{currentBytes} KB</strong>
          </div>
          <div className="metric-box">
            <span>ESP Flows</span>
            <strong style={{ color: isRunning ? "#00ff9d" : "inherit" }}>{flows}</strong>
          </div>
          <div className="metric-box">
            <span>Capture Rate</span>
            <strong style={{ color: isRunning ? "#00ff9d" : "inherit" }}>{isRunning ? "52.4 pkt/s" : "0.0 pkt/s"}</strong>
          </div>
        </div>

        <div style={{ height: "100px", marginTop: "1rem", background: "#06090c", border: "1px solid #1a2634", borderRadius: "4px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "linear-gradient(#1a2634 1px, transparent 1px), linear-gradient(90deg, #1a2634 1px, transparent 1px)", backgroundSize: "20px 20px", opacity: 0.3 }} />
          
          <svg width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0 }}>
            {isRunning && (
              <>
                <polyline
                  fill="rgba(0, 255, 157, 0.1)"
                  stroke="none"
                  points={`0,100 ${graphData.map((val, i) => `${i * 10},${100 - val}`).join(" ")} 400,100`}
                />
                <polyline
                  fill="none"
                  stroke="#00ff9d"
                  strokeWidth="2"
                  points={graphData.map((val, i) => `${i * 10},${100 - val}`).join(" ")}
                />
              </>
            )}
          </svg>
        </div>
      </div>

      <div className="capture-bottom-row">
        <div className="capture-log card">
          <div className="card-header">
            <div className="card-title">Event Console</div>
            <div className="card-badge warning">{isRunning ? "RECORDING" : "IDLE"}</div>
          </div>
          <ul className="log-list" style={{ fontFamily: "monospace", fontSize: "0.85rem", maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column-reverse" }}>
            {[...logs].reverse().map((entry, index) => (
              <li key={`${entry}-${index}`} style={{ borderBottom: "none", padding: "4px 0", color: entry.includes("PASS") || entry.includes("successful") ? "#00ff9d" : "var(--text-main)" }}>
                {entry}
              </li>
            ))}
          </ul>
        </div>

        <div className="capture-summary card">
          <div className="card-header">
            <div className="card-title">Acquired Evidence</div>
            <div className="card-badge secure">{isRunning ? "WRITING..." : "READY"}</div>
          </div>
          <div className="summary-box">
            <div className="summary-icon">▣</div>
            <div>
              <strong style={{ fontFamily: "monospace" }}>capture_live_2026.pcap</strong>
              <span>{currentBytes} KB • {currentPackets} packets</span>
            </div>
          </div>
          <div className="summary-actions">
            <button type="button" className="btn-secondary" onClick={onDownload} disabled={isRunning || currentPackets === 0}>Export PCAP</button>
            <button type="button" className="btn-capture" onClick={isRunning ? onStopCapture : handleStart} disabled={isMutating}>
              {isRunning ? "Force Stop" : "Start New Trace"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}