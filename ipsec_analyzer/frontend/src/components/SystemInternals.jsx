import React, { useState, useEffect, useRef } from "react";

const h = React.createElement;

// --- Reusable Mini Graph Component (Original Style, Zero-$ Safe) ---
const Sparkline = ({ data, color, height = "40px" }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min === 0 ? 1 : max - min;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((d - min) / range) * 100;
      return String(x) + "," + String(y);
    })
    .join(" ");

  return h(
    "div",
    { style: { height, width: "100%", position: "relative", marginTop: "12px" } },
    h(
      "svg",
      {
        width: "100%",
        height: "100%",
        viewBox: "0 0 100 100",
        preserveAspectRatio: "none",
        style: { overflow: "visible" }
      },
      h("polyline", {
        fill: "rgba(0, 0, 0, 0.45)",
        stroke: "none",
        points: "0,100 " + points + " 100,100"
      }),
      h("polyline", {
        fill: "none",
        stroke: color,
        strokeWidth: "2",
        vectorEffect: "non-scaling-stroke",
        points: points,
        style: { filter: "drop-shadow(0 0 5px " + color + ")" }
      })
    )
  );
};

// --- Reusable Linux Node Card ---
const LinuxNodeCard = ({ role, title, ip, os, kernel, memUsage, color }) =>
  h(
    "div",
    {
      className: "card",
      style: {
        padding: "14px 16px",
        background: "rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderLeft: "3px solid " + color,
        boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
        flexShrink: 0
      }
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "10px"
        }
      },
      h(
        "div",
        null,
        h(
          "div",
          {
            style: {
              fontSize: "10px",
              color: "var(--text-muted)",
              letterSpacing: "1px",
              fontWeight: "700"
            }
          },
          role
        ),
        h(
          "div",
          {
            style: {
              fontSize: "13px",
              fontWeight: "800",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.5px",
              textShadow: "0 0 10px " + color + "60"
            }
          },
          title
        )
      ),
      h(
        "div",
        {
          style: {
            fontSize: "10px",
            color: color,
            fontFamily: "var(--font-mono)",
            border: "1px solid " + color + "40",
            background: "rgba(255,255,255,0.05)",
            padding: "2px 6px",
            borderRadius: "4px",
            boxShadow: "0 0 10px " + color + "20"
          }
        },
        ip
      )
    ),
    h(
      "div",
      {
        style: {
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--text-secondary)",
          display: "flex",
          flexDirection: "column",
          gap: "5px"
        }
      },
      h(
        "div",
        { style: { display: "flex", justifyContent: "space-between" } },
        h("span", { style: { color: "var(--text-muted)" } }, "OS:"),
        h("span", null, os)
      ),
      h(
        "div",
        { style: { display: "flex", justifyContent: "space-between" } },
        h("span", { style: { color: "var(--text-muted)" } }, "KRNL:"),
        h("span", null, kernel)
      ),
      h(
        "div",
        { style: { marginTop: "4px" } },
        h(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
              fontSize: "10px"
            }
          },
          h("span", { style: { color: "var(--text-muted)" } }, "NODE MEMORY"),
          h("span", { style: { color: color, fontWeight: "700" } }, memUsage.toFixed(1) + "%")
        ),
        h(
          "div",
          {
            style: {
              height: "4px",
              width: "100%",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "2px",
              overflow: "hidden"
            }
          },
          h("div", {
            style: {
              width: String(memUsage) + "%",
              height: "100%",
              background: color,
              boxShadow: "0 0 8px " + color,
              transition: "width 0.5s ease"
            }
          })
        )
      )
    )
  );

export default function SystemInternals({ realData = null }) {
  // --- HARDWARE SPECS DETECTED FROM BROWSER ---
  const hardwareCores = navigator.hardwareConcurrency || 4;
  const hardwareRam = navigator.deviceMemory || 8;

  // --- MIXED REAL & SIMULATED STATES ---
  const [battery, setBattery] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  const [uptime, setUptime] = useState(0);
  const [ram, setRam] = useState(10); // Real JS Heap Memory
  const [latency, setLatency] = useState(24); // Real Network RTT

  const [cpu, setCpu] = useState(12); // Simulated unless API provided
  const [load, setLoad] = useState(1.15); // Simulated
  const [throughput, setThroughput] = useState(45.2); // Simulated
  const [packetRate, setPacketRate] = useState(128); // Simulated

  const [nodeBMem, setNodeBMem] = useState(18.2); // Simulated Peer Node RAM
  const [isStreamPaused, setIsStreamPaused] = useState(false);

  // History Arrays for Real-time Graphs
  const [cpuHistory, setCpuHistory] = useState(Array(20).fill(12));
  const [loadHistory, setLoadHistory] = useState(Array(20).fill(1.15));
  const [throughputHistory, setThroughputHistory] = useState(Array(20).fill(45.2));
  const [packetHistory, setPacketHistory] = useState(Array(20).fill(128));

  const vpnStatus = "CONNECTED";
  const activeVpnType = "IPsec / IKEv2 (ESP)";
  const vpnPeer = "192.168.160.129";

  const [logs, setLogs] = useState([
    "[INFO] 00:00:00.000 - src.sys.hw - Hardware detected: " +
      String(hardwareCores) +
      "-Core CPU, ~" +
      String(hardwareRam) +
      "GB System RAM",
    "[INFO] 00:00:00.015 - src.asgi - Uvicorn running on http://0.0.0.0:8000",
    "[INFO] 00:00:00.042 - src.engine - ESPect Analyzer Engine v1.0 initialized successfully.",
    "[INFO] 00:00:00.088 - src.capture - Binding to interfaces eth0 and eth1 for acquisition..."
  ]);

  const terminalContainerRef = useRef(null);

  // Auto-scroll ONLY the terminal container
  useEffect(() => {
    if (terminalContainerRef.current && !isStreamPaused) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs, isStreamPaused]);

  // --- REAL BATTERY API SYNC ---
  useEffect(() => {
    if ("getBattery" in navigator) {
      navigator.getBattery().then((batteryManager) => {
        setBattery(batteryManager.level * 100);
        setIsCharging(Boolean(batteryManager.charging));
        batteryManager.addEventListener("levelchange", () =>
          setBattery(batteryManager.level * 100)
        );
        batteryManager.addEventListener("chargingchange", () =>
          setIsCharging(Boolean(batteryManager.charging))
        );
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
        const memUsedPct =
          (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
        setRam(memUsedPct);
      } else {
        setRam((prev) => Math.min(100, Math.max(10, prev + (Math.random() * 2 - 1))));
      }

      // 3. REAL: Network RTT Latency
      if (navigator.connection && navigator.connection.rtt) {
        setLatency(navigator.connection.rtt);
      } else {
        setLatency((prev) => Math.min(150, Math.max(10, prev + (Math.random() * 4 - 2))));
      }

      // 4. SIMULATED: Server-side metrics
      const newPacketRate = Math.max(0, Math.floor(packetRate + (Math.random() * 20 - 10)));
      const cpuSpike = newPacketRate > 140 ? 5 : 0;
      const newCpu = Math.min(100, Math.max(2, cpu + (Math.random() * 4 - 2) + cpuSpike));
      const newLoad = Math.max(0.1, load + (Math.random() * 0.1 - 0.05));
      const newThroughput = Math.max(0, throughput + (Math.random() * 6 - 3));

      setNodeBMem((prev) => Math.min(100, Math.max(10, prev + (Math.random() * 0.2 - 0.1))));

      setCpu(newCpu);
      setThroughput(newThroughput);
      setPacketRate(newPacketRate);
      setLoad(newLoad);

      // Graph History Updates
      setCpuHistory((prev) => [...prev.slice(1), newCpu]);
      setThroughputHistory((prev) => [...prev.slice(1), newThroughput]);
      setPacketHistory((prev) => [...prev.slice(1), newPacketRate]);
      setLoadHistory((prev) => [...prev.slice(1), newLoad]);
    }, 1000);

    return () => clearInterval(interval);
  }, [cpu, throughput, packetRate, load, realData]);

  // Simulated log streaming (No LSTM — uses real ESPect DPI & Flow Classifier modules)
  useEffect(() => {
    if (isStreamPaused) return;

    const getNowTime = () => new Date().toISOString().split("T")[1].slice(0, -1);

    const logTemplates = [
      () =>
        "[INFO] " +
        getNowTime() +
        ' - src.api.router - "GET /api/v1/health HTTP/1.1" 200 OK',
      () =>
        "[DEBUG] " +
        getNowTime() +
        " - src.capture - Ingested " +
        String(packetRate) +
        " pkts (" +
        throughput.toFixed(1) +
        " KB/s)",
      () =>
        "[INFO] " +
        getNowTime() +
        " - src.ml.classifier - Flow profile classified (Confidence: " +
        (91 + Math.random() * 7).toFixed(1) +
        "%)",
      () =>
        "[TRACE] " +
        getNowTime() +
        " - src.dpi.esp - Verified ESP sequence continuity (SPI: 0x" +
        Math.floor(Math.random() * 10000000).toString(16) +
        ")",
      () =>
        "[INFO] " +
        getNowTime() +
        " - src.state.cache - Synced " +
        String(Math.floor(Math.random() * 50) + 10) +
        " SA flow keys to memory table"
    ];

    if (cpu > 40) {
      logTemplates.push(
        () =>
          "[WARNING] " +
          getNowTime() +
          " - src.sys - CPU load spiked to " +
          cpu.toFixed(1) +
          "%"
      );
    }

    const logInterval = setInterval(() => {
      if (Math.random() > 0.4) {
        setLogs((prev) =>
          [...prev, logTemplates[Math.floor(Math.random() * logTemplates.length)]()].slice(-100)
        );
      }
    }, 800);

    return () => clearInterval(logInterval);
  }, [packetRate, throughput, cpu, isStreamPaused]);

  const formatUptime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return (
      hours.toString().padStart(2, "0") +
      "h " +
      minutes.toString().padStart(2, "0") +
      "m " +
      seconds.toString().padStart(2, "0") +
      "s"
    );
  };

  const getBatteryColor = (level) => {
    if (level > 50) return "var(--emerald-400)";
    if (level > 20) return "var(--neon-orange)";
    return "var(--neon-red)";
  };

  const batColor = getBatteryColor(battery);

  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        width: "100%",
        animation: "fadeInUp 0.5s ease"
      }
    },

    // Lock Sidebar so it never scrolls out of view
    h(
      "style",
      null,
      ".command-rail { position: sticky !important; top: 0 !important; height: 100vh !important; align-self: flex-start !important; }"
    ),

    // 1. SEPARATED PAGE HEADER
    h(
      "div",
      { style: { paddingBottom: "4px", paddingTop: "8px" } },
      h(
        "div",
        { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end" } },
        h(
          "div",
          null,
          h(
            "div",
            {
              className: "eyebrow",
              style: {
                color: "var(--neon-cyan)",
                letterSpacing: "2px",
                fontSize: "11px",
                marginBottom: "6px"
              }
            },
            "NODE TELEMETRY & DIAGNOSTICS"
          ),
          h(
            "h1",
            {
              style: {
                color: "var(--text-primary)",
                fontSize: "2.4rem",
                fontWeight: "800",
                letterSpacing: "-1px",
                margin: 0,
                textShadow: "0 2px 10px rgba(0,0,0,0.5)"
              }
            },
            "System Internals"
          ),
          h(
            "p",
            { style: { color: "var(--text-secondary)", fontSize: "14px", marginTop: "6px", marginBottom: 0 } },
            "Real-time hardware utilization, network throughput, and VPN tunnel tracking."
          )
        ),
        h(
          "div",
          { style: { textAlign: "right" } },
          h(
            "div",
            {
              style: {
                fontSize: "11px",
                color: "var(--text-muted)",
                letterSpacing: "1px",
                fontWeight: "700"
              }
            },
            "SESSION UPTIME"
          ),
          h(
            "div",
            {
              style: {
                fontSize: "24px",
                fontWeight: "800",
                color: "var(--emerald-400)",
                fontFamily: "var(--font-mono)",
                textShadow: "var(--shadow-glow-emerald)"
              }
            },
            formatUptime(uptime)
          )
        )
      )
    ),

    h("hr", {
      style: {
        border: "none",
        height: "2px",
        background: "linear-gradient(90deg, var(--neon-cyan), var(--neon-purple), transparent)",
        opacity: 0.8,
        margin: "0 0 4px 0",
        boxShadow: "0 0 10px rgba(0, 229, 255, 0.4)"
      }
    }),

    // 2. TOP ROW: VPN & Core Network with Original Sparkline Graphs
    h(
      "div",
      { style: { display: "grid", gridTemplateColumns: "1fr 1.2fr 1.2fr", gap: "20px" } },

      // VPN Tunnel Status
      h(
        "div",
        {
          className: "card",
          style: {
            padding: "22px",
            border:
              vpnStatus === "CONNECTED"
                ? "1px solid rgba(0, 255, 163, 0.3)"
                : "1px solid rgba(255, 51, 102, 0.3)",
            boxShadow:
              vpnStatus === "CONNECTED"
                ? "inset 0 0 20px rgba(0, 255, 163, 0.05)"
                : "inset 0 0 20px rgba(255, 51, 102, 0.05)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center"
          }
        },
        h(
          "div",
          {
            style: {
              fontSize: "11px",
              color: "var(--text-muted)",
              letterSpacing: "1px",
              fontWeight: "700",
              marginBottom: "14px"
            }
          },
          "VPN TUNNEL STATUS"
        ),
        h(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "14px"
            }
          },
          h("div", {
            style: {
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: vpnStatus === "CONNECTED" ? "var(--emerald-400)" : "var(--neon-red)",
              boxShadow:
                vpnStatus === "CONNECTED"
                  ? "var(--shadow-glow-emerald)"
                  : "var(--shadow-glow-red)"
            }
          }),
          h(
            "div",
            {
              style: {
                fontSize: "28px",
                fontWeight: "800",
                color: vpnStatus === "CONNECTED" ? "var(--emerald-400)" : "var(--neon-red)",
                fontFamily: "var(--font-mono)",
                textShadow:
                  vpnStatus === "CONNECTED"
                    ? "var(--shadow-glow-emerald)"
                    : "var(--shadow-glow-red)",
                letterSpacing: "1px"
              }
            },
            vpnStatus
          )
        ),
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              fontSize: "13px",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)"
            }
          },
          h(
            "div",
            { style: { display: "flex", justifyContent: "space-between" } },
            h("span", null, "Protocol:"),
            h("strong", { style: { color: "var(--neon-cyan)" } }, activeVpnType)
          ),
          h(
            "div",
            { style: { display: "flex", justifyContent: "space-between" } },
            h("span", null, "Peer IP:"),
            h("strong", { style: { color: "var(--text-primary)" } }, vpnPeer)
          )
        )
      ),

      // Live Packet Intake
      h(
        "div",
        {
          className: "card",
          style: {
            padding: "22px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }
        },
        h(
          "div",
          { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } },
          h(
            "div",
            {
              style: {
                fontSize: "11px",
                color: "var(--text-muted)",
                letterSpacing: "1px",
                fontWeight: "700"
              }
            },
            "LIVE PACKET INTAKE"
          ),
          h(
            "div",
            {
              style: {
                fontSize: "28px",
                fontWeight: "800",
                color: "var(--emerald-400)",
                fontFamily: "var(--font-mono)",
                textShadow: "var(--shadow-glow-emerald)"
              }
            },
            packetRate,
            " ",
            h(
              "span",
              { style: { fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" } },
              "pkts/s"
            )
          )
        ),
        h(Sparkline, { data: packetHistory, color: "var(--emerald-400)", height: "56px" })
      ),

      // Overall Throughput
      h(
        "div",
        {
          className: "card",
          style: {
            padding: "22px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }
        },
        h(
          "div",
          { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } },
          h(
            "div",
            {
              style: {
                fontSize: "11px",
                color: "var(--text-muted)",
                letterSpacing: "1px",
                fontWeight: "700"
              }
            },
            "OVERALL THROUGHPUT"
          ),
          h(
            "div",
            {
              style: {
                fontSize: "28px",
                fontWeight: "800",
                color: "var(--neon-purple)",
                fontFamily: "var(--font-mono)",
                textShadow: "var(--shadow-glow-purple)"
              }
            },
            throughput.toFixed(1),
            " ",
            h(
              "span",
              { style: { fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" } },
              "KB/s"
            )
          )
        ),
        h(Sparkline, { data: throughputHistory, color: "var(--neon-purple)", height: "56px" })
      )
    ),

    // 3. MIDDLE ROW: Hardware & Battery
    h(
      "div",
      { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "20px" } },

      // CPU Card
      h(
        "div",
        {
          className: "card",
          style: {
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }
        },
        h(
          "div",
          { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
          h(
            "span",
            {
              style: {
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--text-muted)",
                letterSpacing: "1px",
                textTransform: "uppercase"
              }
            },
            "CPU (" + String(hardwareCores) + "-Core)"
          ),
          h(
            "span",
            {
              style: {
                fontSize: "20px",
                fontWeight: "800",
                color: "var(--neon-cyan)",
                fontFamily: "var(--font-mono)",
                textShadow: "var(--shadow-glow-cyan)"
              }
            },
            cpu.toFixed(1) + "%"
          )
        ),
        h(Sparkline, { data: cpuHistory, color: "var(--neon-cyan)", height: "46px" })
      ),

      // System Load Card
      h(
        "div",
        {
          className: "card",
          style: {
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }
        },
        h(
          "div",
          { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
          h(
            "span",
            {
              style: {
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--text-muted)",
                letterSpacing: "1px"
              }
            },
            "SYSTEM LOAD (1m)"
          ),
          h(
            "span",
            {
              style: {
                fontSize: "20px",
                fontWeight: "800",
                color: "var(--neon-orange)",
                fontFamily: "var(--font-mono)",
                textShadow: "var(--shadow-glow-amber)"
              }
            },
            load.toFixed(2)
          )
        ),
        h(Sparkline, { data: loadHistory, color: "var(--neon-orange)", height: "46px" })
      ),

      // Network RTT Latency
      h(
        "div",
        {
          className: "card",
          style: {
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
          }
        },
        h(
          "div",
          {
            style: {
              fontSize: "40px",
              fontWeight: "800",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              textShadow: "0 0 15px rgba(255,255,255,0.3)"
            }
          },
          Math.round(latency),
          h("span", { style: { fontSize: "16px", color: "var(--text-muted)" } }, "ms")
        ),
        h(
          "span",
          {
            style: {
              marginTop: "6px",
              fontSize: "11px",
              fontWeight: "700",
              color: "var(--text-muted)",
              letterSpacing: "1px"
            }
          },
          "NETWORK RTT LATENCY"
        )
      ),

      // Local Device Power
      h(
        "div",
        {
          className: "card",
          style: {
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "1px solid " + batColor + "40"
          }
        },
        h(
          "div",
          { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
          h(
            "span",
            {
              style: {
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--text-muted)",
                letterSpacing: "1px"
              }
            },
            "LOCAL DEVICE POWER"
          ),
          h(
            "span",
            {
              style: {
                fontSize: "18px",
                fontWeight: "800",
                color: batColor,
                fontFamily: "var(--font-mono)",
                textShadow: "0 0 10px " + batColor
              }
            },
            battery.toFixed(0) + "%"
          )
        ),
        h(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "12px"
            }
          },
          h(
            "div",
            {
              style: {
                width: "60px",
                height: "26px",
                border: "2px solid " + batColor,
                borderRadius: "4px",
                padding: "2px",
                position: "relative",
                boxShadow: "0 0 10px " + batColor + "40"
              }
            },
            h("div", {
              style: {
                width: String(battery) + "%",
                height: "100%",
                background: batColor,
                borderRadius: "2px",
                transition: "width 1s linear",
                boxShadow: "0 0 8px " + batColor
              }
            }),
            h("div", {
              style: {
                position: "absolute",
                right: "-6px",
                top: "5px",
                width: "4px",
                height: "12px",
                background: batColor,
                borderRadius: "0 2px 2px 0"
              }
            })
          )
        ),
        h(
          "div",
          {
            style: {
              textAlign: "center",
              marginTop: "10px",
              fontSize: "10px",
              color: isCharging ? "var(--emerald-400)" : "var(--text-muted)",
              letterSpacing: "1px",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono)",
              fontWeight: "700"
            }
          },
          isCharging
            ? "⚡ AC Power Charging"
            : battery > 20
            ? "Discharging"
            : "Connect Charger"
        )
      )
    ),

    // 4. BOTTOM ROW: Strictly Locked Height (minHeight: 0 prevents grid stretch)
    h(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: "20px",
          height: "480px",
          maxHeight: "480px",
          minHeight: 0
        }
      },

      // LEFT COLUMN: Stack of Linux Systems + Microservices
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            height: "100%",
            minHeight: 0,
            overflow: "hidden"
          }
        },
        h(LinuxNodeCard, {
          role: "LOCAL CLIENT (APP HEAP)",
          title: "node-01-ctrl",
          ip: "192.168.160.128",
          os: "Detected RAM: ~" + String(hardwareRam) + "GB",
          kernel: "Chromium / V8",
          memUsage: ram,
          color: "var(--neon-cyan)"
        }),
        h(LinuxNodeCard, {
          role: "SYSTEM B (PEER)",
          title: "node-02-peer",
          ip: "192.168.160.129",
          os: "Alpine Linux 3.19",
          kernel: "6.6.15-amd64",
          memUsage: nodeBMem,
          color: "var(--neon-purple)"
        }),

        h(
          "div",
          {
            className: "card",
            style: {
              flexGrow: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }
          },
          h(
            "div",
            { className: "card-header", style: { padding: "12px 18px" } },
            h(
              "div",
              {
                className: "card-title",
                style: {
                  color: "var(--emerald-400)",
                  textShadow: "var(--shadow-glow-emerald)",
                  fontSize: "13px"
                }
              },
              "Active Microservices"
            )
          ),
          h(
            "div",
            { className: "card-body", style: { flexGrow: 1, padding: "8px 18px", overflowY: "auto" } },
            h(
              "table",
              { className: "data-table", style: { height: "100%", fontSize: "12px" } },
              h(
                "tbody",
                null,
                h(
                  "tr",
                  null,
                  h("td", null, "FastAPI Router"),
                  h("td", { style: { color: "var(--emerald-400)", fontWeight: "700" } }, "RUNNING")
                ),
                h(
                  "tr",
                  null,
                  h("td", null, "PCAP Decoder"),
                  h("td", { style: { color: "var(--emerald-400)", fontWeight: "700" } }, "RUNNING")
                ),
                h(
                  "tr",
                  null,
                  h("td", null, "ML Flow Classifier"),
                  h("td", { style: { color: "var(--neon-purple)", fontWeight: "700" } }, "ACTIVE")
                ),
                h(
                  "tr",
                  null,
                  h("td", null, "IKE/ESP Dissector"),
                  h("td", { style: { color: "var(--emerald-400)", fontWeight: "700" } }, "RUNNING")
                ),
                h(
                  "tr",
                  null,
                  h("td", null, "Report Compiler"),
                  h("td", { style: { color: "var(--text-muted)" } }, "IDLE")
                )
              )
            )
          )
        )
      ),

      // RIGHT COLUMN: Terminal (Strictly Contained Scroll)
      h(
        "div",
        {
          className: "card",
          style: {
            display: "flex",
            flexDirection: "column",
            height: "100%",
            maxHeight: "480px",
            minHeight: 0,
            background: "#0a0f14",
            border: "1px solid rgba(0, 229, 255, 0.2)",
            boxShadow: "inset 0 0 30px rgba(0,0,0,0.8)",
            overflow: "hidden"
          }
        },
        h(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              background: "#131822",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              flexShrink: 0
            }
          },
          h(
            "div",
            { style: { display: "flex", alignItems: "center" } },
            h(
              "div",
              { style: { display: "flex", gap: "8px", marginRight: "14px" } },
              h("div", {
                style: {
                  width: "11px",
                  height: "11px",
                  borderRadius: "50%",
                  background: "#ff5f56",
                  boxShadow: "0 0 5px #ff5f56"
                }
              }),
              h("div", {
                style: {
                  width: "11px",
                  height: "11px",
                  borderRadius: "50%",
                  background: "#ffbd2e",
                  boxShadow: "0 0 5px #ffbd2e"
                }
              }),
              h("div", {
                style: {
                  width: "11px",
                  height: "11px",
                  borderRadius: "50%",
                  background: "#27c93f",
                  boxShadow: "0 0 5px #27c93f"
                }
              })
            ),
            h(
              "div",
              {
                style: {
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.8px"
                }
              },
              "uvicorn src.main:app — espect-backend-node-01"
            )
          ),

          h(
            "div",
            { style: { display: "flex", gap: "8px" } },
            h(
              "button",
              {
                type: "button",
                onClick: () => setIsStreamPaused((p) => !p),
                style: {
                  background: isStreamPaused
                    ? "rgba(255, 170, 0, 0.15)"
                    : "rgba(255,255,255,0.04)",
                  border: isStreamPaused
                    ? "1px solid var(--neon-orange)"
                    : "1px solid rgba(255,255,255,0.1)",
                  color: isStreamPaused ? "var(--neon-orange)" : "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "9.5px",
                  fontWeight: "700",
                  padding: "3px 9px",
                  borderRadius: "4px",
                  cursor: "pointer"
                }
              },
              isStreamPaused ? "▶ RESUME" : "❚❚ PAUSE"
            ),
            h(
              "button",
              {
                type: "button",
                onClick: () =>
                  setLogs([
                    "[INFO] 00:00:00.000 - src.console - Terminal buffer cleared by operator."
                  ]),
                style: {
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "9.5px",
                  fontWeight: "700",
                  padding: "3px 9px",
                  borderRadius: "4px",
                  cursor: "pointer"
                }
              },
              "CLEAR"
            )
          )
        ),

        // Terminal Stream Body
        h(
          "div",
          {
            ref: terminalContainerRef,
            style: {
              padding: "14px 16px",
              flexGrow: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              fontFamily: "var(--font-mono)",
              fontSize: "11.5px",
              lineHeight: "1.55",
              color: "#e2e8f0"
            }
          },
          ...logs.map((log, index) => {
            let color = "var(--text-secondary)";
            if (log.includes("[INFO]")) color = "var(--neon-cyan)";
            if (log.includes("[DEBUG]")) color = "var(--text-muted)";
            if (log.includes("[WARNING]")) color = "var(--neon-orange)";
            if (log.includes("[ERROR]")) color = "var(--neon-red)";
            if (log.includes("[TRACE]")) color = "var(--neon-purple)";

            const parts = log.split(" - ");

            return h(
              "div",
              {
                key: index,
                style: {
                  marginBottom: "3px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }
              },
              parts.length >= 3
                ? h(
                    React.Fragment,
                    null,
                    h(
                      "span",
                      { style: { color: color, textShadow: "0 0 5px " + color + "40" } },
                      parts[0]
                    ),
                    h(
                      "span",
                      { style: { color: "var(--text-secondary)" } },
                      " - " + parts[1] + " - "
                    ),
                    h(
                      "span",
                      { style: { color: "var(--text-primary)" } },
                      parts.slice(2).join(" - ")
                    )
                  )
                : h(
                    "span",
                    { style: { color: color, textShadow: "0 0 5px " + color + "40" } },
                    log
                  )
            );
          })
        )
      )
    )
  );
}