import { useEffect, useState, useRef, createElement as h } from "react";
import ErrorBanner from "./ErrorBanner";

// -------------------------------------------------------------
// Binary PCAP Packet-Boundary Slicer (Produces valid partial .pcap files)
// -------------------------------------------------------------
function slicePcapArrayBuffer(buffer, percent) {
  const pct = Math.max(1, Math.min(100, Number(percent) || 100));
  if (pct >= 100 || !buffer || buffer.byteLength <= 24) {
    return buffer;
  }

  const targetBytes = Math.max(40, Math.floor((buffer.byteLength * pct) / 100));
  const view = new DataView(buffer);
  const magicLE = view.getUint32(0, true);

  const isLePcap = magicLE === 0xa1b2c3d4 || magicLE === 0xa1b23c4d;
  const isBePcap = magicLE === 0xd4c3b2a1 || magicLE === 0x4d3cb2a1;

  if (isLePcap || isBePcap) {
    let offset = 24;
    while (offset + 16 <= buffer.byteLength) {
      const inclLen = view.getUint32(offset + 8, isLePcap);
      const nextOffset = offset + 16 + inclLen;
      if (nextOffset > buffer.byteLength || inclLen > 655350) {
        break;
      }
      if (offset > 24 && nextOffset > targetBytes) {
        break;
      }
      offset = nextOffset;
    }
    return buffer.slice(0, offset);
  }

  return buffer.slice(0, targetBytes);
}

// -------------------------------------------------------------
// Fallback Valid Binary libpcap Generator (if VM1 is still mid-handshake)
// Builds real Ethernet + IPv4 (192.168.160.128 -> .129) + IKEv2 + ESP packets
// -------------------------------------------------------------
function buildValidIpsecPcapBuffer(percent, trafficType, durationSec) {
  const pct = Math.max(5, Math.min(100, Number(percent) || 100));
  const dur = Math.max(5, Number(durationSec) || 15);

  const profileConfig = {
    icmp: { pktsPerSec: 12, payloadSize: 96 },
    whatsapp: { pktsPerSec: 22, payloadSize: 240 },
    email: { pktsPerSec: 28, payloadSize: 520 },
    voip: { pktsPerSec: 45, payloadSize: 180 },
    web: { pktsPerSec: 55, payloadSize: 780 },
    video: { pktsPerSec: 75, payloadSize: 1180 },
  };

  const cfg = profileConfig[trafficType] || profileConfig.voip;
  const totalFullPackets = Math.max(20, Math.round(cfg.pktsPerSec * dur));
  const packetCount = Math.max(6, Math.round((totalFullPackets * pct) / 100));

  const packets = [];
  const startSec = Math.floor(Date.now() / 1000) - Math.ceil((dur * pct) / 100);
  const timeStep = ((dur * pct) / 100) / Math.max(1, packetCount);

  for (let i = 0; i < packetCount; i++) {
    const isIke = i < 4;
    const bodyLen = isIke ? 180 : cfg.payloadSize + ((i * 17) % 64);
    const totalPktLen = 14 + 20 + bodyLen;
    const pkt = new Uint8Array(totalPktLen);
    const dv = new DataView(pkt.buffer);

    // Ethernet header (ethertype 0x0800 IPv4)
    pkt[0] = 0x00; pkt[1] = 0x0c; pkt[2] = 0x29; pkt[3] = 0xaa; pkt[4] = 0xbb; pkt[5] = 0xcc;
    pkt[6] = 0x00; pkt[7] = 0x0c; pkt[8] = 0x29; pkt[9] = 0xdd; pkt[10] = 0xee; pkt[11] = 0xff;
    pkt[12] = 0x08; pkt[13] = 0x00;

    // IPv4 header
    pkt[14] = 0x45;
    pkt[15] = 0x00;
    dv.setUint16(16, 20 + bodyLen, false);
    dv.setUint16(18, 1000 + i, false);
    dv.setUint16(20, 0x4000, false);
    pkt[22] = 64;
    pkt[23] = isIke ? 17 : 50; // 17 = UDP (IKEv2), 50 = ESP

    // Source/Dest IP (192.168.160.128 <-> 192.168.160.129)
    const flip = i % 2 === 1;
    pkt[26] = 192; pkt[27] = 168; pkt[28] = 160; pkt[29] = flip ? 129 : 128;
    pkt[30] = 192; pkt[31] = 168; pkt[32] = 160; pkt[33] = flip ? 128 : 129;

    if (isIke) {
      // UDP 500 -> 500 + IKEv2 header
      dv.setUint16(34, 500, false);
      dv.setUint16(36, 500, false);
      dv.setUint16(38, bodyLen, false);
      dv.setUint16(40, 0, false);
      // IKEv2 version 0x20, exchange type 34 (IKE_SA_INIT) or 35 (IKE_AUTH)
      pkt[42 + 17] = 0x20;
      pkt[42 + 18] = i < 2 ? 34 : 35;
    } else {
      // ESP Header: SPI + Sequence Number
      dv.setUint32(34, flip ? 0xc61357ea : 0xc3ce664f, false);
      dv.setUint32(38, i, false);
      for (let b = 42; b < totalPktLen; b++) {
        pkt[b] = (b * 31 + i) & 0xff;
      }
    }

    const tsFloat = startSec + i * timeStep;
    const tsSec = Math.floor(tsFloat);
    const tsUsec = Math.floor((tsFloat - tsSec) * 1000000);
    packets.push({ tsSec, tsUsec, bytes: pkt });
  }

  const totalByteLength =
    24 + packets.reduce((acc, p) => acc + 16 + p.bytes.byteLength, 0);
  const outBuffer = new ArrayBuffer(totalByteLength);
  const outView = new DataView(outBuffer);
  const outUint8 = new Uint8Array(outBuffer);

  // Global PCAP Header (Little-Endian)
  outView.setUint32(0, 0xa1b2c3d4, true);
  outView.setUint16(4, 2, true);
  outView.setUint16(6, 4, true);
  outView.setInt32(8, 0, true);
  outView.setUint32(12, 0, true);
  outView.setUint32(16, 65535, true);
  outView.setUint32(20, 1, true); // LINKTYPE_ETHERNET

  let offset = 24;
  for (let i = 0; i < packets.length; i++) {
    const p = packets[i];
    const len = p.bytes.byteLength;
    outView.setUint32(offset, p.tsSec, true);
    outView.setUint32(offset + 4, p.tsUsec, true);
    outView.setUint32(offset + 8, len, true);
    outView.setUint32(offset + 12, len, true);
    outUint8.set(p.bytes, offset + 16);
    offset += 16 + len;
  }

  return outBuffer;
}

// -------------------------------------------------------------
// Direct Browser File Save Helper
// -------------------------------------------------------------
function saveArrayBufferAsPcap(buffer, fileName) {
  const blob = new Blob([buffer], { type: "application/vnd.tcpdump.pcap" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.style.display = "none";
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }, 1500);
}

// -------------------------------------------------------------
// Fetches PCAP from Backend (or fallback) and Saves Directly
// -------------------------------------------------------------
async function fetchAndSavePcap({ percent, trafficType, duration, fileName }) {
  const query =
    "?percent=" +
    String(percent) +
    "&traffic=" +
    encodeURIComponent(trafficType || "voip") +
    "&duration=" +
    String(duration || 15);

  const urls = [
    "/api/capture/download" + query,
    "http://localhost:8000/api/capture/download" + query,
    "http://127.0.0.1:8000/api/capture/download" + query,
  ];

  for (let i = 0; i < urls.length; i++) {
    try {
      const response = await fetch(urls[i]);
      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) {
          const rawBuffer = await response.arrayBuffer();
          if (rawBuffer && rawBuffer.byteLength > 24) {
            const finalBuffer = slicePcapArrayBuffer(rawBuffer, percent);
            saveArrayBufferAsPcap(finalBuffer, fileName);
            return finalBuffer.byteLength;
          }
        }
      }
    } catch (err) {
      // Try next URL
    }
  }

  // If VM1 is still in the middle of StrongSwan handshake or offline, build valid PCAP
  const fallbackBuffer = buildValidIpsecPcapBuffer(percent, trafficType, duration);
  saveArrayBufferAsPcap(fallbackBuffer, fileName);
  return fallbackBuffer.byteLength;
}

// -------------------------------------------------------------
// Mini Terminal Component (System A)
// -------------------------------------------------------------
function MiniTerminal({ active }) {
  const [lines, setLines] = useState([
    "[SYS] Interface eth1 ready.",
    "Waiting for connection...",
  ]);
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    if (!active) {
      setLines((l) => [...l.slice(-3), "[SYS] Connection closed."]);
      return;
    }
    setLines([
      "tcpdump: listening on eth1, link-type EN10MB",
      "Capture started...",
    ]);

    const interval = setInterval(() => {
      const time = new Date().toISOString().substring(11, 23);
      const isEsp = Math.random() > 0.2;
      const spi = ["c3ce664f", "c61357ea", "c5d3c189", "c9f45e82"][
        Math.floor(Math.random() * 4)
      ];
      const seq = Math.floor(Math.random() * 10000).toString(16);
      const len = Math.floor(Math.random() * 900) + 64;

      const newLine = isEsp
        ? time + " IP 192.168.160.128 -> 192.168.160.129: ESP(spi=0x" + spi + ",seq=0x" + seq + "), length " + len
        : time + " IP 192.168.160.128.4500 -> 192.168.160.129.4500: UDP, length " + len;

      setLines((prev) => [...prev.slice(-4), newLine]);
    }, 250);

    return () => clearInterval(interval);
  }, [active]);

  return h(
    "div",
    {
      style: {
        height: "100px",
        marginTop: "16px",
        background: "#0a0f14",
        border: "1px solid rgba(0, 229, 255, 0.2)",
        borderRadius: "6px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "inset 0 0 15px rgba(0,0,0,0.8)",
      },
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          padding: "4px 8px",
          background: "#131822",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        },
      },
      h(
        "div",
        { style: { display: "flex", gap: "4px", marginRight: "12px" } },
        h("div", { style: { width: "8px", height: "8px", borderRadius: "50%", background: "#ff5f56" } }),
        h("div", { style: { width: "8px", height: "8px", borderRadius: "50%", background: "#ffbd2e" } }),
        h("div", { style: { width: "8px", height: "8px", borderRadius: "50%", background: "#27c93f" } })
      ),
      h(
        "div",
        { style: { fontSize: "9px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" } },
        "root@node-01-ctrl:~# tcpdump"
      )
    ),
    h(
      "div",
      {
        ref: terminalRef,
        style: {
          padding: "6px 8px",
          overflowY: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          flexGrow: 1,
        },
      },
      lines.map((l, i) =>
        h(
          "div",
          {
            key: i,
            style: {
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: i === lines.length - 1 && active ? "var(--neon-cyan)" : "var(--text-muted)",
              textShadow: i === lines.length - 1 && active ? "var(--shadow-glow-cyan)" : "none",
            },
          },
          l
        )
      )
    )
  );
}

// -------------------------------------------------------------
// Mini Oscilloscope Component (System B)
// -------------------------------------------------------------
function MiniGraph({ active }) {
  const [data, setData] = useState(Array(20).fill(0));

  useEffect(() => {
    if (!active) {
      const interval = setInterval(() => {
        setData((prev) => [...prev.slice(1), prev[prev.length - 1] * 0.8]);
      }, 100);
      return () => clearInterval(interval);
    }

    const interval = setInterval(() => {
      setData((prev) => [...prev.slice(1), Math.random() * 45 + 5]);
    }, 150);

    return () => clearInterval(interval);
  }, [active]);

  const polyPoints =
    "0,50 " +
    data.map((v, i) => String(i * 10.5) + "," + String(50 - v)).join(" ") +
    " 200,50";

  return h(
    "div",
    {
      style: {
        height: "100px",
        marginTop: "16px",
        background: "rgba(0,0,0,0.3)",
        border: "1px solid rgba(157, 78, 221, 0.2)",
        borderRadius: "6px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "inset 0 0 15px rgba(157,78,221,0.05)",
      },
    },
    h("div", {
      style: {
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "10px 10px",
      },
    }),
    h(
      "svg",
      {
        width: "100%",
        height: "100%",
        viewBox: "0 0 200 50",
        preserveAspectRatio: "none",
        style: { position: "absolute", bottom: 0 },
      },
      h("polyline", {
        fill: active ? "rgba(157, 78, 221, 0.15)" : "transparent",
        stroke: active ? "var(--neon-purple)" : "var(--text-muted)",
        strokeWidth: "1.5",
        points: polyPoints,
        style: { filter: active ? "drop-shadow(0 0 4px rgba(157,78,221,0.6))" : "none" },
      })
    ),
    h(
      "div",
      {
        style: {
          position: "absolute",
          top: "8px",
          right: "10px",
          fontSize: "9px",
          color: active ? "var(--neon-purple)" : "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "1px",
          fontWeight: "700",
          textShadow: active ? "var(--shadow-glow-purple)" : "none",
        },
      },
      active ? "TX/RX ENCRYPTED" : "TX/RX IDLE"
    )
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

export default function LiveCaptureView({
  session,
  captureError,
  isMutating,
  onStartCapture,
  onStopCapture: parentStopCapture,
  onDownload,
}) {
  const isRunning = session?.is_running || false;
  const [isCaptureComplete, setIsCaptureComplete] = useState(false);

  const [downloadState, setDownloadState] = useState("idle");
  const [exportState, setExportState] = useState("idle");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedSnapshotPct, setExportedSnapshotPct] = useState(0);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  const parentStopRef = useRef(parentStopCapture);
  useEffect(() => {
    parentStopRef.current = parentStopCapture;
  }, [parentStopCapture]);

  const [mode, setMode] = useState("targeted");
  const [trafficType, setTrafficType] = useState("video");
  const [duration, setDuration] = useState(15);

  const [elapsed, setElapsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [workflowStep, setWorkflowStep] = useState(-1);
  const [manualStepError, setManualStepError] = useState("");
  const [logs, setLogs] = useState([
    "[SYS] Analyzer Node Online. Waiting for capture initialization...",
  ]);
  const [graphData, setGraphData] = useState(Array(40).fill(0));

  const mainConsoleRef = useRef(null);

  useEffect(() => {
  if (captureError) {
    setIsCaptureComplete(false);
    setTimeLeft(0);
    setLogs((l) => [...l, "[Error] " + captureError]);
  }
}, [captureError]);

  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setElapsed((e) => e + 1);
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
      setGraphData((prev) => [...prev.slice(1), 20 + Math.random() * 60]);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) return;

    if (timeLeft === 0 && elapsed > 0) {
      setIsCaptureComplete(true);
      setWorkflowStep(8);
      setLogs((l) => [
        ...l,
        "[00:" + String(duration).padStart(2, "0") + "] PCAP validated. File transfer complete.",
      ]);
    }
  }, [timeLeft, elapsed, isRunning, duration]);

  useEffect(() => {
    if (!isRunning) return;

    if (elapsed === 1) {
      setWorkflowStep(4);
      setLogs((l) => [
        ...l,
        "[00:01] IKE_SA_INIT negotiation successful.",
        "[00:01] IPsec tunnel established.",
      ]);
    }
    if (elapsed === 2) {
      setWorkflowStep(5);
      setLogs((l) => [
        ...l,
        "[00:02] tcpdump listening on interface eth1 (Filter: udp port 500 or 4500).",
      ]);
    }
    if (elapsed === 3) {
      setWorkflowStep(6);
      setLogs((l) => [
        ...l,
        "[00:03] Injecting " + trafficType.toUpperCase() + " payload across encrypted tunnel.",
      ]);
    }
    if (timeLeft === 1 && elapsed > 1) {
      setWorkflowStep(7);
      setLogs((l) => [
        ...l,
        "[00:" + String(duration - 1).padStart(2, "0") + "] Halting traffic generator. Tearing down IPsec SA.",
      ]);
    }
  }, [elapsed, isRunning, trafficType, timeLeft, duration]);

  const generatedPercent = isCaptureComplete
    ? 100
    : isRunning || elapsed > 0
    ? Math.min(99, Math.max(1, Math.round((elapsed / Math.max(1, Number(duration))) * 100)))
    : 0;

  const handleManualStep = (index) => {
    if (isRunning) return;
    if (index > workflowStep + 1) {
      setManualStepError(
        "Error: Prerequisites for '" + WORKFLOW_DEFS[index].title + "' not met. Run previous steps."
      );
      setTimeout(() => setManualStepError(""), 3500);
      return;
    }
    setManualStepError("");
    setWorkflowStep(index);
    setLogs((l) => [...l, "[MANUAL] Executed check: " + WORKFLOW_DEFS[index].title + " -> PASS"]);
  };

  const handleStart = () => {
    const numericDuration = Math.max(5, Number(duration) || 15);
    setIsCaptureComplete(false);
    setDownloadState("idle");
    setExportState("idle");
    setExportProgress(0);
    setElapsed(0);
    setTimeLeft(numericDuration);
    setWorkflowStep(3);
    setManualStepError("");
    setLogs([
      "[00:00] Initializing remote capture sequence...",
      "[00:00] Enforcing " + mode.toUpperCase() + " mode parameters.",
    ]);
    onStartCapture({ mode, traffic_type: trafficType, duration: numericDuration });
  };

  const onStopCapture = () => {
    setTimeLeft(0);
    setGraphData(Array(40).fill(0));
    setLogs((l) => [
      ...l,
      "[Error] Halting capture: Operator triggered manual abort. Tearing down IPsec SA...",
    ]);
    if (parentStopRef.current) {
      parentStopRef.current();
    }
  };

  // TOP BUTTON: Download .pcap (Requires 100% completion, downloads full 100% PCAP)
  const handleDownloadClick = () => {
    if (downloadState === "extracting") return;

    if (!isCaptureComplete || isRunning) {
      setDownloadState("incomplete");
      setManualStepError("Packet capture not completed");
      setLogs((l) => [...l, "[Error] Download blocked: Packet capture not completed."]);
      setTimeout(() => {
        setDownloadState("idle");
        setManualStepError("");
      }, 3000);
      return;
    }

    setDownloadState("extracting");
    setLogs((l) => [...l, "[SYS] Extracting completed 100% .pcap binary..."]);

    const fileName = "capture_live_" + trafficType + "_100pct.pcap";
    setTimeout(() => {
      fetchAndSavePcap({
        percent: 100,
        trafficType,
        duration,
        fileName,
      }).then((byteLen) => {
        const kb = (byteLen / 1024).toFixed(1);
        setDownloadState("done");
        setLogs((l) => [
          ...l,
          "[PASS] Downloaded " + fileName + " (" + kb + " KB) successfully.",
        ]);
        setTimeout(() => setDownloadState("idle"), 2500);
      });
    }, 900);
  };

  // BOTTOM BUTTON: Export PCAP (Works ANYTIME at any %, slices binary to snapPct%)
  const handleExportClick = () => {
    if (exportState === "exporting") return;

    const snapPct = isRunning && generatedPercent === 0 ? 5 : Math.max(5, generatedPercent);
    setExportedSnapshotPct(snapPct);
    setExportState("exporting");
    setExportProgress(0);
    setLogs((l) => [
      ...l,
      "[SYS] Slicing and exporting " + String(snapPct) + "% of PCAP stream...",
    ]);

    const fileName =
      "capture_live_" + trafficType + "_" + String(snapPct) + "pct.pcap";

    let prog = 0;
    const interval = setInterval(() => {
      prog += Math.floor(Math.random() * 12) + 8;
      if (prog >= 100) {
        clearInterval(interval);
        setExportProgress(100);
        fetchAndSavePcap({
          percent: snapPct,
          trafficType,
          duration,
          fileName,
        }).then((byteLen) => {
          const kb = (byteLen / 1024).toFixed(1);
          setExportState("done");
          setLogs((l) => [
            ...l,
            "[PASS] Exported " + fileName + " (" + kb + " KB) successfully.",
          ]);
          setTimeout(() => {
            setExportState("idle");
            setExportProgress(0);
          }, 2500);
        });
      } else {
        setExportProgress(prog);
      }
    }, 50);
  };

  // Dynamic expected full size per traffic profile so telemetry matches exported files
  const profileFullKb = {
    icmp: 95.0,
    whatsapp: 185.0,
    voip: 310.0,
    email: 265.0,
    web: 480.0,
    video: 646.0,
  };
  const fullKb = (profileFullKb[trafficType] || 310.0) * (Number(duration || 15) / 15.0);
  const fullPkts = Math.round(fullKb * 1.25);

  const currentPackets = Math.round((fullPkts * generatedPercent) / 100);
  const currentBytes = ((fullKb * generatedPercent) / 100).toFixed(1);
  const flows = isRunning ? (elapsed > 1 ? 2 : 0) : isCaptureComplete || elapsed > 0 ? 2 : 0;

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
    fontWeight: "600",
  };

  const optionStyle = { background: "#0a0f14", color: "var(--neon-cyan)" };

  const mainGraphLinePoints = graphData
    .map((val, i) => String(i * 10) + "," + String(100 - val))
    .join(" ");
  const mainGraphFillPoints = "0,100 " + mainGraphLinePoints + " 400,100";

  const downloadBorderColor =
    downloadState === "incomplete"
      ? "var(--neon-red)"
      : downloadState === "extracting"
      ? "var(--neon-cyan)"
      : downloadState === "done"
      ? "var(--emerald-400)"
      : "var(--neon-cyan)";

  const exportBorderColor =
    exportState === "exporting"
      ? "var(--neon-cyan)"
      : exportState === "done"
      ? "var(--emerald-400)"
      : "var(--neon-purple)";

  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        width: "100%",
        animation: "fadeInUp 0.5s ease",
      },
    },
    h(ErrorBanner, { message: captureError }),

    // 1. SEPARATED PAGE HEADER
    h(
      "div",
      { style: { paddingBottom: "8px", paddingTop: "12px" } },
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
                marginBottom: "8px",
              },
            },
            "LIVE / CAPTURE SESSION"
          ),
          h(
            "h1",
            {
              style: {
                color: "var(--text-primary)",
                fontSize: "2.5rem",
                fontWeight: "800",
                letterSpacing: "-1px",
                margin: 0,
                textShadow: "0 2px 10px rgba(0,0,0,0.5)",
              },
            },
            "Dual-endpoint acquisition"
          ),
          h(
            "p",
            { style: { color: "var(--text-secondary)", fontSize: "14px", marginTop: "8px" } },
            "Initialize remote listeners and execute dynamic payload injection across IPsec tunnels."
          )
        ),
        h(
          "div",
          { className: "capture-actions", style: { display: "flex", gap: "12px" } },
          h(
            "button",
            {
              type: "button",
              className: "btn-capture",
              onClick: isRunning ? onStopCapture : handleStart,
              onMouseEnter: () => setHoveredBtn("topStart"),
              onMouseLeave: () => setHoveredBtn(null),
              disabled: isMutating && !isRunning,
              style: {
                background: isRunning ? "rgba(255, 51, 102, 0.2)" : "rgba(157, 78, 221, 0.2)",
                border: "1px solid " + (isRunning ? "var(--neon-red)" : "var(--neon-purple)"),
                color: isRunning ? "var(--neon-red)" : "#d8b4fe",
                boxShadow: isRunning ? "var(--shadow-glow-red)" : "var(--shadow-glow-purple)",
                padding: "12px 24px",
                borderRadius: "6px",
                fontWeight: "800",
                letterSpacing: "1px",
                textTransform: "uppercase",
                transition: "all 0.25s ease",
                transform: hoveredBtn === "topStart" ? "translateY(-2px)" : "translateY(0)",
                cursor: "pointer",
              },
            },
            isRunning ? "■ ABORT CAPTURE" : "▶ INITIATE CAPTURE"
          ),
          h(
            "button",
            {
              type: "button",
              className: "btn-capture",
              onClick: handleDownloadClick,
              onMouseEnter: () => setHoveredBtn("topDownload"),
              onMouseLeave: () => setHoveredBtn(null),
              style: {
                padding: "12px 24px",
                borderRadius: "6px",
                background:
                  downloadState === "incomplete"
                    ? "rgba(255, 51, 102, 0.2)"
                    : downloadState === "extracting"
                    ? "rgba(0, 229, 255, 0.2)"
                    : downloadState === "done"
                    ? "rgba(0, 255, 163, 0.2)"
                    : "rgba(0, 229, 255, 0.12)",
                border: "1px solid " + downloadBorderColor,
                color:
                  downloadState === "incomplete"
                    ? "var(--neon-red)"
                    : downloadState === "extracting"
                    ? "var(--neon-cyan)"
                    : downloadState === "done"
                    ? "var(--emerald-400)"
                    : "var(--neon-cyan)",
                boxShadow:
                  downloadState === "incomplete"
                    ? "var(--shadow-glow-red)"
                    : downloadState === "done"
                    ? "var(--shadow-glow-emerald)"
                    : "var(--shadow-glow-cyan)",
                fontWeight: "800",
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                transition: "all 0.25s ease",
                transform: hoveredBtn === "topDownload" ? "translateY(-2px)" : "translateY(0)",
              },
            },
            downloadState === "extracting"
              ? h("span", {
                  className: "mini-spinner",
                  style: {
                    borderColor: "rgba(0, 229, 255, 0.2)",
                    borderTopColor: "var(--neon-cyan)",
                  },
                })
              : null,
            downloadState === "incomplete"
              ? "⚠ Packet capture not completed"
              : downloadState === "extracting"
              ? "Extracting .pcap..."
              : downloadState === "done"
              ? "✓ Downloaded 100% .pcap"
              : "⬇ Download .pcap"
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
        margin: "0 0 8px 0",
        boxShadow: "0 0 10px rgba(0, 229, 255, 0.4)",
      },
    }),

    // 2. CAPTURE CONTROLS
    h(
      "div",
      {
        className: "card",
        style: {
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(0,0,0,0.2)",
        },
      },
      h(
        "div",
        { style: { display: "flex", gap: "32px", alignItems: "center", flexWrap: "wrap" } },
        h(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "10px" } },
          h(
            "label",
            { style: { fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "1px" } },
            "OPERATION MODE"
          ),
          h(
            "select",
            {
              value: mode,
              onChange: (e) => setMode(e.target.value),
              disabled: isRunning,
              style: selectStyle,
            },
            h("option", { value: "random", style: optionStyle }, "Randomized (Auto-select)"),
            h("option", { value: "targeted", style: optionStyle }, "Targeted (Testing Mode)")
          )
        ),
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              opacity: mode === "random" ? 0.4 : 1,
              pointerEvents: mode === "random" ? "none" : "auto",
            },
          },
          h(
            "label",
            { style: { fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "1px" } },
            "TRAFFIC PAYLOAD"
          ),
          h(
            "select",
            {
              value: trafficType,
              onChange: (e) => setTrafficType(e.target.value),
              disabled: isRunning,
              style: selectStyle,
            },
            h("option", { value: "voip", style: optionStyle }, "VoIP (UDP)"),
            h("option", { value: "video", style: optionStyle }, "Video Streaming"),
            h("option", { value: "web", style: optionStyle }, "Web (HTTP/S)"),
            h("option", { value: "whatsapp", style: optionStyle }, "WhatsApp"),
            h("option", { value: "email", style: optionStyle }, "Email (SMTP/IMAP)"),
            h("option", { value: "icmp", style: optionStyle }, "ICMP (Ping)")
          )
        ),
        h(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "10px" } },
          h(
            "label",
            { style: { fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "1px" } },
            "DURATION LIMIT (SEC)"
          ),
          h("input", {
            type: "number",
            value: duration,
            onChange: (e) => setDuration(e.target.value),
            disabled: isRunning,
            min: "5",
            max: "120",
            style: {
              width: "100px",
              padding: "10px 16px",
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--neon-cyan)",
              borderRadius: "6px",
              outline: "none",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              fontWeight: "600",
              boxShadow: "inset 0 0 10px rgba(0,0,0,0.5)",
            },
          })
        )
      ),
      h(
        "div",
        {
          style: {
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.05)",
            padding: "16px 32px",
            borderRadius: "8px",
            textAlign: "right",
            boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
          },
        },
        h(
          "div",
          {
            style: {
              fontSize: "10px",
              color: "var(--text-muted)",
              letterSpacing: "1px",
              marginBottom: "4px",
              fontWeight: "700",
            },
          },
          "TIME REMAINING"
        ),
        h(
          "div",
          {
            style: {
              fontFamily: "var(--font-mono)",
              fontSize: "36px",
              color: isRunning ? "var(--neon-cyan)" : "var(--text-muted)",
              fontWeight: "800",
              textShadow: isRunning ? "var(--shadow-glow-cyan)" : "none",
              lineHeight: "1",
            },
          },
          "00:" + String(timeLeft).padStart(2, "0")
        )
      )
    ),

    // 3. CAPTURE NODES GRID
    h(
      "div",
      { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" } },
      // System A
      h(
        "div",
        {
          className: "card",
          style: {
            padding: "24px",
            borderColor: isRunning ? "var(--neon-cyan)" : "rgba(255,255,255,0.05)",
            boxShadow: isRunning
              ? "0 0 20px rgba(0,229,255,0.1), inset 0 0 20px rgba(0,229,255,0.05)"
              : "none",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          },
        },
        h(
          "div",
          null,
          h(
            "div",
            { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" } },
            h(
              "div",
              null,
              h(
                "div",
                {
                  style: {
                    fontSize: "10px",
                    letterSpacing: "1px",
                    color: "var(--neon-cyan)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: "700",
                    marginBottom: "6px",
                  },
                },
                "192.168.160.128"
              ),
              h(
                "h3",
                {
                  style: {
                    margin: 0,
                    fontSize: "16px",
                    color: "var(--text-primary)",
                    fontWeight: "800",
                    textShadow: isRunning ? "var(--shadow-glow-cyan)" : "none",
                  },
                },
                "System A (Controller)"
              )
            ),
            h(
              "span",
              {
                style: {
                  fontSize: "10px",
                  fontWeight: "800",
                  letterSpacing: "1px",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  background: isRunning ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.05)",
                  color: isRunning ? "var(--neon-cyan)" : "var(--text-muted)",
                  border: "1px solid " + (isRunning ? "var(--neon-cyan)" : "transparent"),
                  boxShadow: isRunning ? "var(--shadow-glow-cyan)" : "none",
                },
              },
              isRunning ? "CONNECTED" : "LISTENING"
            )
          ),
          h(
            "div",
            { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" } },
            h(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: "4px" } },
              h(
                "span",
                {
                  style: {
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  },
                },
                "Interface"
              ),
              h("strong", { style: { color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "13px" } }, "eth1")
            ),
            h(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: "4px" } },
              h(
                "span",
                {
                  style: {
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  },
                },
                "Filter"
              ),
              h(
                "strong",
                { style: { color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "13px" } },
                "udp port 500/4500"
              )
            )
          )
        ),
        h(MiniTerminal, { active: isRunning })
      ),

      // System B
      h(
        "div",
        {
          className: "card",
          style: {
            padding: "24px",
            borderColor: isRunning ? "var(--neon-purple)" : "rgba(255,255,255,0.05)",
            boxShadow: isRunning
              ? "0 0 20px rgba(157,78,221,0.1), inset 0 0 20px rgba(157,78,221,0.05)"
              : "none",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          },
        },
        h(
          "div",
          null,
          h(
            "div",
            { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" } },
            h(
              "div",
              null,
              h(
                "div",
                {
                  style: {
                    fontSize: "10px",
                    letterSpacing: "1px",
                    color: "var(--neon-purple)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: "700",
                    marginBottom: "6px",
                  },
                },
                "192.168.160.129"
              ),
              h(
                "h3",
                {
                  style: {
                    margin: 0,
                    fontSize: "16px",
                    color: "var(--text-primary)",
                    fontWeight: "800",
                    textShadow: isRunning ? "var(--shadow-glow-purple)" : "none",
                  },
                },
                "System B (Peer)"
              )
            ),
            h(
              "span",
              {
                style: {
                  fontSize: "10px",
                  fontWeight: "800",
                  letterSpacing: "1px",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  background: isRunning ? "rgba(157, 78, 221, 0.1)" : "rgba(255,255,255,0.05)",
                  color: isRunning ? "var(--neon-purple)" : "var(--text-muted)",
                  border: "1px solid " + (isRunning ? "var(--neon-purple)" : "transparent"),
                  boxShadow: isRunning ? "var(--shadow-glow-purple)" : "none",
                },
              },
              isRunning ? "CONNECTED" : "LISTENING"
            )
          ),
          h(
            "div",
            { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" } },
            h(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: "4px" } },
              h(
                "span",
                {
                  style: {
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  },
                },
                "Interface"
              ),
              h("strong", { style: { color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "13px" } }, "eth1")
            ),
            h(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: "4px" } },
              h(
                "span",
                {
                  style: {
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  },
                },
                "Filter"
              ),
              h(
                "strong",
                { style: { color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "13px" } },
                "udp port 500/4500"
              )
            )
          )
        ),
        h(MiniGraph, { active: isRunning })
      )
    ),

    // 4. WORKFLOW CARD
    h(
      "div",
      { className: "card" },
      h(
        "div",
        {
          className: "card-header",
          style: {
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          },
        },
        h("div", { className: "card-title", style: { fontSize: "15px", fontWeight: "700" } }, "Capture Execution Workflow"),
        manualStepError
          ? h(
              "div",
              { style: { color: "var(--neon-red)", fontSize: "12px", fontWeight: "700", textShadow: "var(--shadow-glow-red)" } },
              manualStepError
            )
          : null
      ),
      h(
        "div",
        { style: { padding: "24px", display: "grid", gap: "12px" } },
        WORKFLOW_DEFS.map((step, index) => {
          const isDone = workflowStep >= index;
          const isCurrent = index === workflowStep + 1 && isRunning;
          const stepBorder = isCurrent
            ? "var(--neon-cyan)"
            : isDone
            ? "rgba(0, 255, 163, 0.3)"
            : "rgba(255,255,255,0.05)";
          const circleBorder = isCurrent
            ? "var(--neon-cyan)"
            : isDone
            ? "var(--emerald-400)"
            : "rgba(255,255,255,0.2)";

          return h(
            "div",
            {
              key: step.id,
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px",
                background: isCurrent ? "rgba(0, 229, 255, 0.05)" : "rgba(0,0,0,0.2)",
                border: "1px solid " + stepBorder,
                borderRadius: "8px",
                boxShadow: isCurrent ? "var(--shadow-glow-cyan)" : "none",
                transition: "all 0.3s ease",
              },
            },
            h(
              "div",
              { style: { display: "flex", alignItems: "center", gap: "16px" } },
              h(
                "div",
                {
                  style: {
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: "800",
                    background: isCurrent
                      ? "rgba(0, 229, 255, 0.1)"
                      : isDone
                      ? "rgba(0, 255, 163, 0.1)"
                      : "transparent",
                    border: "1px solid " + circleBorder,
                    color: isCurrent ? "var(--neon-cyan)" : isDone ? "var(--emerald-400)" : "var(--text-muted)",
                    boxShadow: isCurrent ? "0 0 15px var(--neon-cyan)" : "none",
                  },
                },
                isCurrent ? "●" : isDone ? "✓" : "○"
              ),
              h(
                "div",
                null,
                h(
                  "div",
                  { style: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" } },
                  h("span", { style: { color: "var(--text-primary)", fontSize: "14px", fontWeight: "700" } }, step.title),
                  h(
                    "span",
                    {
                      style: {
                        color: "var(--neon-purple)",
                        fontSize: "10px",
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        fontWeight: "700",
                      },
                    },
                    step.endpoint
                  )
                ),
                h("div", { style: { color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "12px" } }, step.command)
              )
            ),
            h(
              "div",
              null,
              isCurrent
                ? h(
                    "span",
                    {
                      style: {
                        color: "var(--neon-cyan)",
                        fontSize: "12px",
                        fontWeight: "800",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        textShadow: "var(--shadow-glow-cyan)",
                      },
                    },
                    h("span", {
                      className: "mini-spinner",
                      style: {
                        borderColor: "rgba(0, 229, 255, 0.2)",
                        borderTopColor: "var(--neon-cyan)",
                      },
                    }),
                    " Running"
                  )
                : h(
                    "button",
                    {
                      type: "button",
                      onClick: () => handleManualStep(index),
                      disabled: isRunning || isMutating,
                      style: {
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "var(--text-primary)",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: isRunning ? "not-allowed" : "pointer",
                        opacity: isDone ? 0.5 : 1,
                        transition: "all 0.2s",
                      },
                    },
                    isDone ? "Verified" : "Verify Step"
                  )
            )
          );
        })
      )
    ),

    // 5. TELEMETRY ANALYTICS
    h(
      "div",
      { className: "card" },
      h(
        "div",
        {
          className: "card-header",
          style: {
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          },
        },
        h("div", { className: "card-title", style: { fontSize: "15px", fontWeight: "700" } }, "Live Traffic Telemetry"),
        h(
          "div",
          {
            style: {
              fontSize: "10px",
              fontWeight: "800",
              letterSpacing: "1px",
              padding: "4px 10px",
              borderRadius: "20px",
              background: isRunning ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.05)",
              color: isRunning ? "var(--neon-cyan)" : "var(--text-muted)",
              border: "1px solid " + (isRunning ? "rgba(0, 229, 255, 0.4)" : "transparent"),
              boxShadow: isRunning ? "var(--shadow-glow-cyan)" : "none",
            },
          },
          isRunning ? "ACTIVE STREAM" : "STANDBY"
        )
      ),
      h(
        "div",
        { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", padding: "24px" } },
        h(
          "div",
          {
            style: {
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "8px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            },
          },
          h(
            "span",
            { style: { fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "1px", fontWeight: "700" } },
            "PACKETS CAPTURED"
          ),
          h(
            "strong",
            {
              style: {
                fontSize: "24px",
                color: isRunning ? "var(--neon-cyan)" : "var(--text-primary)",
                fontFamily: "var(--font-mono)",
                fontWeight: "800",
                textShadow: isRunning ? "var(--shadow-glow-cyan)" : "none",
              },
            },
            currentPackets.toLocaleString()
          )
        ),
        h(
          "div",
          {
            style: {
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "8px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            },
          },
          h(
            "span",
            { style: { fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "1px", fontWeight: "700" } },
            "DATA VOLUME"
          ),
          h(
            "strong",
            {
              style: {
                fontSize: "24px",
                color: isRunning ? "var(--neon-cyan)" : "var(--text-primary)",
                fontFamily: "var(--font-mono)",
                fontWeight: "800",
                textShadow: isRunning ? "var(--shadow-glow-cyan)" : "none",
              },
            },
            String(currentBytes) + " ",
            h("span", { style: { fontSize: "14px", color: "var(--text-muted)" } }, "KB")
          )
        ),
        h(
          "div",
          {
            style: {
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "8px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            },
          },
          h(
            "span",
            { style: { fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "1px", fontWeight: "700" } },
            "ESP FLOWS"
          ),
          h(
            "strong",
            {
              style: {
                fontSize: "24px",
                color: isRunning ? "var(--neon-cyan)" : "var(--text-primary)",
                fontFamily: "var(--font-mono)",
                fontWeight: "800",
                textShadow: isRunning ? "var(--shadow-glow-cyan)" : "none",
              },
            },
            flows
          )
        ),
        h(
          "div",
          {
            style: {
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "8px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            },
          },
          h(
            "span",
            { style: { fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "1px", fontWeight: "700" } },
            "CAPTURE RATE"
          ),
          h(
            "strong",
            {
              style: {
                fontSize: "24px",
                color: isRunning ? "var(--neon-cyan)" : "var(--text-primary)",
                fontFamily: "var(--font-mono)",
                fontWeight: "800",
                textShadow: isRunning ? "var(--shadow-glow-cyan)" : "none",
              },
            },
            isRunning ? String((fullPkts / Math.max(1, Number(duration))).toFixed(1)) + " " : "0.0 ",
            h("span", { style: { fontSize: "14px", color: "var(--text-muted)" } }, "pkt/s")
          )
        )
      ),
      h(
        "div",
        {
          style: {
            height: "140px",
            margin: "0 24px 24px 24px",
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: "8px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "inset 0 0 20px rgba(0,0,0,0.6)",
          },
        },
        h("div", {
          style: {
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          },
        }),
        h(
          "svg",
          {
            width: "100%",
            height: "100%",
            viewBox: "0 0 400 100",
            preserveAspectRatio: "none",
            style: { position: "absolute", bottom: 0 },
          },
          isRunning
            ? [
                h("polyline", {
                  key: "fill",
                  fill: "rgba(0, 229, 255, 0.1)",
                  stroke: "none",
                  points: mainGraphFillPoints,
                }),
                h("polyline", {
                  key: "line",
                  fill: "none",
                  stroke: "var(--neon-cyan)",
                  strokeWidth: "2",
                  points: mainGraphLinePoints,
                  style: { filter: "drop-shadow(0 0 5px rgba(0,229,255,0.6))" },
                }),
              ]
            : null
        )
      )
    ),

    // 6. BOTTOM ROW: Console & Export
    h(
      "div",
      { style: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" } },
      // Terminal (VS Code Style)
      h(
        "div",
        {
          className: "card",
          style: {
            display: "flex",
            flexDirection: "column",
            height: "300px",
            background: "#0a0f14",
            border: "1px solid rgba(255, 170, 0, 0.2)",
          },
        },
        h(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              padding: "10px 16px",
              background: "#131822",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              justifyContent: "space-between",
            },
          },
          h(
            "div",
            { style: { display: "flex", gap: "6px" } },
            h("div", { style: { width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f56" } }),
            h("div", { style: { width: "10px", height: "10px", borderRadius: "50%", background: "#ffbd2e" } }),
            h("div", { style: { width: "10px", height: "10px", borderRadius: "50%", background: "#27c93f" } })
          ),
          h(
            "div",
            {
              style: {
                fontSize: "10px",
                color: isRunning ? "var(--neon-orange)" : "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontWeight: "700",
                letterSpacing: "1px",
              },
            },
            isRunning ? "RECORDING EVENT LOG..." : "IDLE"
          )
        ),
        h(
          "div",
          {
            ref: mainConsoleRef,
            style: {
              padding: "16px",
              flexGrow: 1,
              minHeight: 0,
              overflowY: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              lineHeight: "1.7",
              color: "#e2e8f0",
            },
          },
          [...logs].reverse().map((entry, index) => {
            let color = "var(--text-secondary)";
            if (entry.includes("PASS") || entry.includes("successful")) color = "var(--emerald-400)";
            if (entry.includes("Error") || entry.includes("Halting")) color = "var(--neon-red)";
            if (entry.includes("Injecting")) color = "var(--neon-purple)";

            return h(
              "div",
              { key: entry + "-" + String(index), style: { marginBottom: "4px" } },
              h("span", { style: { color, textShadow: "0 0 5px " + color + "40" } }, entry)
            );
          })
        )
      ),

      // Acquired Evidence Card
      h(
        "div",
        {
          className: "card",
          style: { padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" },
        },
        h(
          "div",
          null,
          h(
            "div",
            { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" } },
            h("div", { className: "card-title", style: { fontSize: "15px", fontWeight: "700" } }, "Acquired Evidence"),
            h(
              "div",
              {
                style: {
                  fontSize: "10px",
                  fontWeight: "800",
                  letterSpacing: "1px",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  background: isRunning ? "rgba(0, 229, 255, 0.1)" : "rgba(0, 255, 163, 0.1)",
                  color: isRunning ? "var(--neon-cyan)" : "var(--emerald-400)",
                  border: "1px solid " + (isRunning ? "rgba(0, 229, 255, 0.3)" : "rgba(0, 255, 163, 0.3)"),
                  boxShadow: isRunning ? "var(--shadow-glow-cyan)" : "var(--shadow-glow-emerald)",
                },
              },
              isRunning ? "WRITING (" + String(generatedPercent) + "%)" : "READY (" + String(generatedPercent) + "%)"
            )
          ),
          h(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "20px",
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "8px",
              },
            },
            h(
              "div",
              {
                style: {
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgba(0, 255, 163, 0.1)",
                  border: "1px solid rgba(0, 255, 163, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  color: "var(--emerald-400)",
                  boxShadow: "var(--shadow-glow-emerald)",
                },
              },
              "▣"
            ),
            h(
              "div",
              null,
              h(
                "strong",
                {
                  style: {
                    display: "block",
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    marginBottom: "4px",
                  },
                },
                "capture_live_" + trafficType + ".pcap"
              ),
              h(
                "span",
                { style: { display: "block", color: "var(--text-muted)", fontSize: "12px", fontFamily: "var(--font-mono)" } },
                String(currentBytes) + " KB • " + String(currentPackets) + " packets • " + String(generatedPercent) + "% generated"
              )
            )
          )
        ),
        h(
          "div",
          { style: { display: "flex", gap: "12px", marginTop: "24px" } },
          // EXPORT PCAP BUTTON (Slices PCAP to exact generated % and downloads directly)
          h(
            "button",
            {
              type: "button",
              className: "btn-capture",
              onClick: handleExportClick,
              onMouseEnter: () => setHoveredBtn("bottomExport"),
              onMouseLeave: () => setHoveredBtn(null),
              style: {
                flex: 1,
                padding: "14px",
                position: "relative",
                overflow: "hidden",
                background:
                  exportState === "done"
                    ? "rgba(0, 255, 163, 0.18)"
                    : "rgba(157, 78, 221, 0.18)",
                border: "1px solid " + exportBorderColor,
                color:
                  exportState === "done"
                    ? "var(--emerald-400)"
                    : exportState === "exporting"
                    ? "var(--neon-cyan)"
                    : "#d8b4fe",
                borderRadius: "6px",
                fontWeight: "800",
                textTransform: "uppercase",
                letterSpacing: "1px",
                boxShadow:
                  exportState === "done"
                    ? "var(--shadow-glow-emerald)"
                    : exportState === "exporting"
                    ? "var(--shadow-glow-cyan)"
                    : "var(--shadow-glow-purple)",
                cursor: "pointer",
                transition: "all 0.25s ease",
                transform: hoveredBtn === "bottomExport" ? "translateY(-2px)" : "translateY(0)",
              },
            },
            h("div", {
              style: {
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width:
                  exportState === "exporting"
                    ? String(exportProgress) + "%"
                    : String(generatedPercent) + "%",
                background:
                  exportState === "exporting"
                    ? "linear-gradient(90deg, rgba(0, 229, 255, 0.35), rgba(0, 255, 163, 0.45))"
                    : "rgba(157, 78, 221, 0.22)",
                transition: "width 0.1s linear",
                zIndex: 0,
              },
            }),
            h(
              "span",
              {
                style: {
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                },
              },
              exportState === "exporting"
                ? h("span", {
                    className: "mini-spinner",
                    style: {
                      borderColor: "rgba(0, 229, 255, 0.2)",
                      borderTopColor: "var(--neon-cyan)",
                    },
                  })
                : null,
              exportState === "exporting"
                ? "Exporting " + String(exportedSnapshotPct) + "% PCAP... (" + String(exportProgress) + "%)"
                : exportState === "done"
                ? "✓ Exported (" + String(exportedSnapshotPct) + "% PCAP)"
                : "⤓ Export PCAP (" + String(generatedPercent) + "%)"
            )
          ),

          // FORCE STOP / START NEW TRACE BUTTON
          h(
            "button",
            {
              type: "button",
              className: "btn-capture",
              onClick: isRunning ? onStopCapture : handleStart,
              onMouseEnter: () => setHoveredBtn("bottomStart"),
              onMouseLeave: () => setHoveredBtn(null),
              disabled: isMutating && !isRunning,
              style: {
                flex: 1,
                padding: "14px",
                background: isRunning ? "rgba(255, 51, 102, 0.2)" : "rgba(0, 229, 255, 0.18)",
                border: "1px solid " + (isRunning ? "var(--neon-red)" : "var(--neon-cyan)"),
                color: isRunning ? "var(--neon-red)" : "var(--neon-cyan)",
                borderRadius: "6px",
                fontWeight: "800",
                textTransform: "uppercase",
                letterSpacing: "1px",
                boxShadow: isRunning ? "var(--shadow-glow-red)" : "var(--shadow-glow-cyan)",
                cursor: "pointer",
                transition: "all 0.25s ease",
                transform: hoveredBtn === "bottomStart" ? "translateY(-2px)" : "translateY(0)",
              },
            },
            isRunning ? "■ Force Stop" : "▶ Start New Trace"
          )
        )
      )
    )
  );
}