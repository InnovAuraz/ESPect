import React, { useState, useEffect, useRef } from 'react';

// --- Reusable Mini Graph Component ---
const Sparkline = ({ data, color, height = "40px" }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min === 0 ? 1 : max - min;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (((d - min) / range) * 100);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div style={{ height, width: "100%", position: "relative", marginTop: "12px" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: "visible" }}>
        <polyline fill={`var(--${color}-bg, rgba(255,255,255,0.05))`} stroke="none" points={`0,100 ${points} 100,100`} />
        <polyline fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" points={points} style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
      </svg>
    </div>
  );
};

// --- Reusable Linux Node Card ---
const LinuxNodeCard = ({ role, title, ip, os, kernel, memUsage, color }) => (
  <div className="card" style={{ padding: "16px", background: "rgba(0,0,0,0.3)", border: `1px solid rgba(255,255,255,0.05)`, borderLeft: `3px solid ${color}`, boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
      <div>
        <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "1px", fontWeight: "700" }}>{role}</div>
        <div style={{ fontSize: "13px", fontWeight: "800", color: "var(--text-primary)", fontFamily: "var(--font-mono)", letterSpacing: "0.5px", textShadow: `0 0 10px ${color}60` }}>{title}</div>
      </div>
      <div style={{ fontSize: "10px", color: color, fontFamily: "var(--font-mono)", border: `1px solid ${color}40`, background: `rgba(255,255,255,0.05)`, padding: "2px 6px", borderRadius: "4px", boxShadow: `0 0 10px ${color}20` }}>
        {ip}
      </div>
    </div>
    <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>OS:</span> <span>{os}</span></div>
      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>KRNL:</span> <span>{kernel}</span></div>
      <div style={{ marginTop: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "10px" }}>
          <span style={{ color: "var(--text-muted)" }}>NODE MEMORY</span> 
          <span style={{ color, fontWeight: "700" }}>{memUsage.toFixed(1)}%</span>
        </div>
        <div style={{ height: "4px", width: "100%", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
           <div style={{ width: `${memUsage}%`, height: "100%", background: color, boxShadow: `0 0 8px ${color}`, transition: "width 0.5s ease" }} />
        </div>
      </div>
    </div>
  </div>
);

export default function SystemInternals({ realData = null }) {
  // --- HARDWARE SPECS DETECTED FROM BROWSER ---
  const hardwareCores = navigator.hardwareConcurrency || 4;
  const hardwareRam = navigator.deviceMemory || 8; 

  // --- MIXED REAL & SIMULATED STATES ---
  const [battery, setBattery] = useState(100);
  const [uptime, setUptime] = useState(0); 
  const [ram, setRam] = useState(10); // Real JS Heap Memory
  const [latency, setLatency] = useState(24); // Real Network RTT
  
  const [cpu, setCpu] = useState(12); // Simulated unless API provided
  const [load, setLoad] = useState(1.15); // Simulated
  const [throughput, setThroughput] = useState(45.2); // Simulated
  const [packetRate, setPacketRate] = useState(128); // Simulated
  
  const [nodeBMem, setNodeBMem] = useState(18.2); // Simulated Peer Node RAM
  
  // History Arrays for Real-time Graphs
  const [cpuHistory, setCpuHistory] = useState(Array(20).fill(12));
  const [loadHistory, setLoadHistory] = useState(Array(20).fill(1.15));
  const [throughputHistory, setThroughputHistory] = useState(Array(20).fill(45.2));
  const [packetHistory, setPacketHistory] = useState(Array(20).fill(128));

  const vpnStatus = "CONNECTED"; 
  const activeVpnType = "IPsec / IKEv2 (ESP)";
  const vpnPeer = "192.168.160.129";

  const [logs, setLogs] = useState([
    `[INFO] Hardware detected: ${hardwareCores}-Core CPU, ~${hardwareRam}GB System RAM`,
    "[INFO] Uvicorn running on http://0.0.0.0:8000",
    "[INFO] ESPect Analyzer Engine v1.0 initialized successfully.",
    "[INFO] Binding to interfaces eth0 and eth1 for acquisition...",
  ]);

  const terminalContainerRef = useRef(null);

  // Auto-scroll ONLY the terminal container
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // --- REAL BATTERY API SYNC ---
  useEffect(() => {
    if ('getBattery' in navigator) {
      navigator.getBattery().then((batteryManager) => {
        setBattery(batteryManager.level * 100);
        batteryManager.addEventListener('levelchange', () => setBattery(batteryManager.level * 100));
      });
    }
  }, []);

  // --- LIVE DATA TICKER ---
  useEffect(() => {
    if (realData) return;

    const interval = setInterval(() => {
      // 1. REAL: Session Uptime
      setUptime(Math.floor(performance.now() / 1000));

      // 2. REAL: Browser Heap Memory (Chrome/Edge/Brave only)
      if (performance.memory) {
        const memUsedPct = (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
        setRam(memUsedPct);
      } else {
        setRam(prev => Math.min(100, Math.max(10, prev + (Math.random() * 2 - 1)))); // Fallback
      }

      // 3. REAL: Network RTT Latency
      if (navigator.connection && navigator.connection.rtt) {
        setLatency(navigator.connection.rtt);
      } else {
        setLatency(prev => Math.min(150, Math.max(10, prev + (Math.random() * 4 - 2)))); // Fallback
      }

      // 4. SIMULATED: Server-side metrics (Requires backend integration later)
      const newPacketRate = Math.max(0, Math.floor(packetRate + (Math.random() * 20 - 10)));
      const cpuSpike = newPacketRate > 140 ? 5 : 0; 
      const newCpu = Math.min(100, Math.max(2, cpu + (Math.random() * 4 - 2) + cpuSpike));
      const newLoad = Math.max(0.1, load + (Math.random() * 0.1 - 0.05));
      const newThroughput = Math.max(0, throughput + (Math.random() * 6 - 3));
      
      setNodeBMem(prev => Math.min(100, Math.max(10, prev + (Math.random() * 0.2 - 0.1)))); 
      
      setCpu(newCpu);
      setThroughput(newThroughput);
      setPacketRate(newPacketRate);
      setLoad(newLoad);

      // Graph History Updates
      setCpuHistory(prev => [...prev.slice(1), newCpu]);
      setThroughputHistory(prev => [...prev.slice(1), newThroughput]);
      setPacketHistory(prev => [...prev.slice(1), newPacketRate]);
      setLoadHistory(prev => [...prev.slice(1), newLoad]);

    }, 1000);
    
    return () => clearInterval(interval);
  }, [cpu, throughput, packetRate, load, realData]);

  // Simulated log streaming
  useEffect(() => {
    const logTemplates = [
      () => `[INFO] ${new Date().toISOString().split('T')[1].slice(0, -1)} - src.api.router - "GET /api/v1/health HTTP/1.1" 200 OK`,
      () => `[DEBUG] ${new Date().toISOString().split('T')[1].slice(0, -1)} - src.capture - Ingested ${packetRate} pkts (${throughput.toFixed(1)} KB/s)`,
      () => `[INFO] ${new Date().toISOString().split('T')[1].slice(0, -1)} - src.ml.inference - LSTM Threat score: ${(Math.random() * 10).toFixed(2)}%`,
      () => `[TRACE] ${new Date().toISOString().split('T')[1].slice(0, -1)} - src.crypto - Decrypting ESP payload (SPI: 0x${Math.floor(Math.random()*10000000).toString(16)})`,
      () => `[INFO] ${new Date().toISOString().split('T')[1].slice(0, -1)} - src.redis - Synced ${Math.floor(Math.random()*50)+10} state keys to memory cache`,
    ];

    if (cpu > 40) {
      logTemplates.push(() => `[WARNING] ${new Date().toISOString().split('T')[1].slice(0, -1)} - src.sys - CPU load spiked to ${cpu.toFixed(1)}%`);
    }

    const logInterval = setInterval(() => {
      if (Math.random() > 0.4) {
        setLogs(prev => [...prev, logTemplates[Math.floor(Math.random() * logTemplates.length)]()].slice(-100));
      }
    }, 800);

    return () => clearInterval(logInterval);
  }, [packetRate, throughput, cpu]);

  const formatUptime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  const getBatteryColor = (level) => {
    if (level > 50) return "var(--emerald-400)";
    if (level > 20) return "var(--neon-orange)";
    return "var(--neon-red)";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%", animation: "fadeInUp 0.5s ease" }}>
      
      {/* 1. SEPARATED PAGE HEADER */}
      <div style={{ paddingBottom: "8px", paddingTop: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div className="eyebrow" style={{ color: "var(--neon-cyan)", letterSpacing: "2px", fontSize: "11px", marginBottom: "8px" }}>NODE TELEMETRY & DIAGNOSTICS</div>
            <h1 style={{ color: "var(--text-primary)", fontSize: "2.5rem", fontWeight: "800", letterSpacing: "-1px", margin: 0, textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
              System Internals
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "8px" }}>
              Real-time hardware utilization, network throughput, and VPN tunnel tracking.
            </p>
          </div>
          
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "1px", fontWeight: "700" }}>SESSION UPTIME</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--emerald-400)", fontFamily: "var(--font-mono)", textShadow: "var(--shadow-glow-emerald)" }}>
              {formatUptime(uptime)}
            </div>
          </div>
        </div>
      </div>

      <hr style={{ border: "none", height: "2px", background: "linear-gradient(90deg, var(--neon-cyan), var(--neon-purple), transparent)", opacity: 0.8, margin: "0 0 12px 0", boxShadow: "0 0 10px rgba(0, 229, 255, 0.4)" }} />

      {/* 2. TOP ROW: VPN & Core Network with Graphs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1.2fr", gap: "24px" }}>
        
        <div className="card" style={{ padding: "24px", border: vpnStatus === "CONNECTED" ? "1px solid rgba(0, 255, 163, 0.3)" : "1px solid rgba(255, 51, 102, 0.3)", boxShadow: vpnStatus === "CONNECTED" ? "inset 0 0 20px rgba(0, 255, 163, 0.05)" : "inset 0 0 20px rgba(255, 51, 102, 0.05)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "1px", fontWeight: "700", marginBottom: "16px" }}>VPN TUNNEL STATUS</div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: vpnStatus === "CONNECTED" ? "var(--emerald-400)" : "var(--neon-red)", boxShadow: vpnStatus === "CONNECTED" ? "var(--shadow-glow-emerald)" : "var(--shadow-glow-red)" }} />
            <div style={{ fontSize: "28px", fontWeight: "800", color: vpnStatus === "CONNECTED" ? "var(--emerald-400)" : "var(--neon-red)", fontFamily: "var(--font-mono)", textShadow: vpnStatus === "CONNECTED" ? "var(--shadow-glow-emerald)" : "var(--shadow-glow-red)", letterSpacing: "1px" }}>
              {vpnStatus}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Protocol:</span> <strong style={{ color: "var(--neon-cyan)" }}>{activeVpnType}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Peer IP:</span> <strong style={{ color: "var(--text-primary)" }}>{vpnPeer}</strong></div>
          </div>
        </div>

        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "1px", fontWeight: "700" }}>LIVE PACKET INTAKE</div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "var(--emerald-400)", fontFamily: "var(--font-mono)", textShadow: "var(--shadow-glow-emerald)" }}>
              {packetRate} <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>pkts/s</span>
            </div>
          </div>
          <Sparkline data={packetHistory} color="var(--emerald-400)" height="60px" />
        </div>

        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "1px", fontWeight: "700" }}>OVERALL THROUGHPUT</div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "var(--neon-purple)", fontFamily: "var(--font-mono)", textShadow: "var(--shadow-glow-purple)" }}>
              {throughput.toFixed(1)} <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>KB/s</span>
            </div>
          </div>
          <Sparkline data={throughputHistory} color="var(--neon-purple)" height="60px" />
        </div>
      </div>

      {/* 3. MIDDLE ROW: Hardware & Battery */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "24px" }}>
        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase" }}>CPU ({hardwareCores}-Core)</span>
            <span style={{ fontSize: "20px", fontWeight: "800", color: "var(--neon-cyan)", fontFamily: "var(--font-mono)", textShadow: "var(--shadow-glow-cyan)" }}>{cpu.toFixed(1)}%</span>
          </div>
          <Sparkline data={cpuHistory} color="var(--neon-cyan)" height="50px" />
        </div>

        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", letterSpacing: "1px" }}>SYSTEM LOAD (1m)</span>
            <span style={{ fontSize: "20px", fontWeight: "800", color: "var(--neon-orange)", fontFamily: "var(--font-mono)", textShadow: "var(--shadow-glow-amber)" }}>{load.toFixed(2)}</span>
          </div>
          <Sparkline data={loadHistory} color="var(--neon-orange)" height="50px" />
        </div>

        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: "42px", fontWeight: "800", color: "var(--text-primary)", fontFamily: "var(--font-mono)", textShadow: "0 0 15px rgba(255,255,255,0.3)" }}>
            {Math.round(latency)}<span style={{ fontSize: "16px", color: "var(--text-muted)" }}>ms</span>
          </div>
          <span style={{ marginTop: "8px", fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", letterSpacing: "1px" }}>NETWORK RTT LATENCY</span>
        </div>

        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", border: `1px solid ${getBatteryColor(battery)}40` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", letterSpacing: "1px" }}>LOCAL DEVICE POWER</span>
            <span style={{ fontSize: "18px", fontWeight: "800", color: getBatteryColor(battery), fontFamily: "var(--font-mono)", textShadow: `0 0 10px ${getBatteryColor(battery)}` }}>{battery.toFixed(0)}%</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: "16px" }}>
            <div style={{ width: "60px", height: "28px", border: `2px solid ${getBatteryColor(battery)}`, borderRadius: "4px", padding: "2px", position: "relative", boxShadow: `0 0 10px ${getBatteryColor(battery)}40` }}>
               <div style={{ width: `${battery}%`, height: "100%", background: getBatteryColor(battery), borderRadius: "2px", transition: "width 1s linear", boxShadow: `0 0 8px ${getBatteryColor(battery)}` }} />
               <div style={{ position: "absolute", right: "-6px", top: "6px", width: "4px", height: "12px", background: getBatteryColor(battery), borderRadius: "0 2px 2px 0" }} />
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: "12px", fontSize: "10px", color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase" }}>
            {battery > 20 ? "Discharging" : "Connect Charger"}
          </div>
        </div>
      </div>

      {/* 4. BOTTOM ROW: Locked Height with Auto-Scrolling Terminal */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", height: "580px" }}>
        
        {/* LEFT COLUMN: Stack of Linux Systems + Microservices */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", height: "100%" }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <LinuxNodeCard 
              role="LOCAL CLIENT (APP HEAP)" 
              title="node-01-ctrl" 
              ip="192.168.160.128" 
              os={`Detected RAM: ~${hardwareRam}GB`} 
              kernel="Chromium / V8" 
              memUsage={ram} // Tied directly to the Real Browser Heap State
              color="var(--neon-cyan)" 
            />
            <LinuxNodeCard 
              role="SYSTEM B (PEER)" 
              title="node-02-peer" 
              ip="192.168.160.129" 
              os="Alpine Linux 3.19" 
              kernel="6.6.15-amd64" 
              memUsage={nodeBMem} 
              color="var(--neon-purple)" 
            />
          </div>

          <div className="card" style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
            <div className="card-header">
              <div className="card-title" style={{ color: "var(--emerald-400)", textShadow: "var(--shadow-glow-emerald)" }}>Active Microservices</div>
            </div>
            <div className="card-body" style={{ flexGrow: 1 }}>
              <table className="data-table" style={{ height: "100%" }}>
                <tbody>
                  <tr><td>FastAPI Router</td><td style={{ color: "var(--emerald-400)" }}>RUNNING</td></tr>
                  <tr><td>PCAP Decoder</td><td style={{ color: "var(--emerald-400)" }}>RUNNING</td></tr>
                  <tr><td>LSTM Inference</td><td style={{ color: "var(--neon-purple)" }}>ACTIVE</td></tr>
                  <tr><td>Threat Cache</td><td style={{ color: "var(--emerald-400)" }}>RUNNING</td></tr>
                  <tr><td>Report Compiler</td><td style={{ color: "var(--text-muted)" }}>IDLE</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Terminal */}
        <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0f14", border: "1px solid rgba(0, 229, 255, 0.2)", boxShadow: "inset 0 0 30px rgba(0,0,0,0.8)" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "#131822", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: "8px", marginRight: "16px" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ff5f56", boxShadow: "0 0 5px #ff5f56" }} />
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ffbd2e", boxShadow: "0 0 5px #ffbd2e" }} />
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#27c93f", boxShadow: "0 0 5px #27c93f" }} />
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "1px" }}>
              uvicorn src.main:app — espect-backend-node-01
            </div>
          </div>
          
          <div ref={terminalContainerRef} style={{ padding: "20px", flexGrow: 1, minHeight: 0, overflowY: "auto", fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: "1.7", color: "#e2e8f0" }}>
            {logs.map((log, index) => {
              let color = "var(--text-secondary)";
              if (log.includes("[INFO]")) color = "var(--neon-cyan)";
              if (log.includes("[DEBUG]")) color = "var(--text-muted)";
              if (log.includes("[WARNING]")) color = "var(--neon-orange)";
              if (log.includes("[ERROR]")) color = "var(--neon-red)";
              if (log.includes("[TRACE]")) color = "var(--neon-purple)";

              return (
                <div key={index} style={{ marginBottom: "4px" }}>
                  <span style={{ color, textShadow: `0 0 5px ${color}40` }}>{log.split(" - ")[0]}</span>
                  <span style={{ color: "var(--text-secondary)" }}> - {log.split(" - ")[1]} - </span>
                  <span style={{ color: "var(--text-primary)" }}>{log.split(" - ").slice(2).join(" - ")}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}