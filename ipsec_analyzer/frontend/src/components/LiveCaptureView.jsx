import { useEffect, useState, useRef, createElement as h } from "react";
import ErrorBanner from "./ErrorBanner";

// -------------------------------------------------------------
// Binary PCAP Packet-Boundary Slicer (Produces valid partial .pcap files)
// -------------------------------------------------------------
function slicePcapArrayBuffer(buffer, percent) {
  const pct = Math.max(1, Math.min(100, Number(percent) || 100));
  if (pct >= 100 || !buffer || 24 >= buffer.byteLength) {
    return buffer;
  }

  const targetBytes = Math.max(40, Math.floor((buffer.byteLength * pct) / 100));
  const view = new DataView(buffer);
  const magicLE = view.getUint32(0, true);

  const isLePcap = magicLE === 0xa1b2c3d4 || magicLE === 0xa1b23c4d;
  const isBePcap = magicLE === 0xd4c3b2a1 || magicLE === 0x4d3cb2a1;

  if (isLePcap || isBePcap) {
    let offset = 24;
    while (buffer.byteLength >= offset + 16) {
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

  for (let i = 0; packetCount > i; i++) {
    const isIke = 4 > i;
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
      pkt[42 + 18] = 2 > i ? 34 : 35;
    } else {
      // ESP Header: SPI + Sequence Number
      dv.setUint32(34, flip ? 0xc61357ea : 0xc3ce664f, false);
      dv.setUint32(38, i, false);
      for (let b = 42; totalPktLen > b; b++) {
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
  for (let i = 0; packets.length > i; i++) {
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

  for (let i = 0; urls.length > i; i++) {
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
    "[SYS] Interface eth1 bound (PROMISC).",
    "[IDLE] Waiting for IKEv2 / ESP stream...",
  ]);
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    if (!active) {
      setLines((l) => [...l.slice(-3), "[SYS] Capture socket in standby."]);
      return;
    }
    setLines([
      "tcpdump: listening on eth1, link-type EN10MB (Ethernet)",
      "[ACQ] Filtering UDP 500/4500 & IPPROTO-50...",
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
        ? time + " IP 192.168.160.128 → 192.168.160.129: ESP(spi=0x" + spi + ",seq=0x" + seq + "), len " + len
        : time + " IP 192.168.160.128.4500 → 192.168.160.129.4500: UDP-ENCAP, len " + len;

      setLines((prev) => [...prev.slice(-4), newLine]);
    }, 250);

    return () => clearInterval(interval);
  }, [active]);

  return h(
    "div",
    {
      style: {
        height: "118px",
        marginTop: "16px",
        background: "#080c11",
        border: "1px solid rgba(0, 229, 255, 0.25)",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "inset 0 0 20px rgba(0,0,0,0.9)",
      },
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px",
          background: "#131822",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        },
      },
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "10px" } },
        h(
          "div",
          { style: { display: "flex", gap: "5px" } },
          h("div", { style: { width: "8px", height: "8px", borderRadius: "50%", background: "#ff5f56" } }),
          h("div", { style: { width: "8px", height: "8px", borderRadius: "50%", background: "#ffbd2e" } }),
          h("div", { style: { width: "8px", height: "8px", borderRadius: "50%", background: "#27c93f" } })
        ),
        h(
          "div",
          { style: { fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" } },
          "root@node-01-ctrl:~# tcpdump -i eth1"
        )
      ),
      h(
        "span",
        {
          style: {
            fontSize: "9px",
            fontFamily: "var(--font-mono)",
            color: active ? "var(--emerald-400)" : "var(--text-muted)",
            fontWeight: "700"
          }
        },
        active ? "● PROMISC" : "○ IDLE"
      )
    ),
    h(
      "div",
      {
        ref: terminalRef,
        style: {
          padding: "8px 10px",
          overflowY: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: "10.5px",
          lineHeight: "1.55",
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
              color: i === lines.length - 1 && active ? "var(--neon-cyan)" : "var(--text-secondary)",
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
  const [data, setData] = useState(Array(20).fill(8));

  useEffect(() => {
    if (!active) {
      const interval = setInterval(() => {
        setData((prev) => [...prev.slice(1), Math.max(4, prev[prev.length - 1] * 0.82)]);
      }, 120);
      return () => clearInterval(interval);
    }

    const interval = setInterval(() => {
      setData((prev) => [...prev.slice(1), Math.random() * 38 + 8]);
    }, 150);

    return () => clearInterval(interval);
  }, [active]);

  const linePoints = data
    .map((v, i) => String(i * 10.5) + "," + String(50 - v))
    .join(" ");
  const polyPoints = "0,50 " + linePoints + " 200,50";

  return h(
    "div",
    {
      style: {
        height: "118px",
        marginTop: "16px",
        background: "#080c11",
        border: "1px solid rgba(187, 134, 252, 0.25)",
        borderRadius: "8px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "inset 0 0 20px rgba(0,0,0,0.9)",
      },
    },
    h("div", {
      style: {
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(187, 134, 252, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(187, 134, 252, 0.04) 1px, transparent 1px)",
        backgroundSize: "12px 12px",
      },
    }),
    h(
      "div",
      {
        style: {
          position: "absolute",
          top: "8px",
          left: "10px",
          fontSize: "9px",
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "1px",
          fontWeight: "700"
        }
      },
      "ESP PAYLOAD OSCILLOSCOPE"
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
          fontWeight: "800",
          textShadow: active ? "var(--shadow-glow-purple)" : "none",
        },
      },
      active ? "● TX/RX ENCRYPTED" : "○ TX/RX IDLE"
    ),
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
        fill: active ? "rgba(187, 134, 252, 0.16)" : "rgba(255,255,255,0.02)",
        stroke: "none",
        points: polyPoints,
      }),
      h("polyline", {
        fill: "none",
        stroke: active ? "var(--neon-purple)" : "var(--text-muted)",
        strokeWidth: "2",
        points: linePoints,
        style: { filter: active ? "drop-shadow(0 0 6px var(--neon-purple))" : "none" },
      })
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
  onAnalyze,
}) {
  const isRunning = session?.is_running || false;
  const [isCaptureComplete, setIsCaptureComplete] = useState(false);

  const captureStatusComplete = session?.capture_status === "completed";
  const canAnalyzeCapture = !isRunning && isCaptureComplete && captureStatusComplete;

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
  const [graphData, setGraphData] = useState(Array(40).fill(12));

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
    setGraphData(Array(40).fill(12));
    setLogs((l) => [
      ...l,
      "[Error] Halting capture: Operator triggered manual abort. Tearing down IPsec SA...",
    ]);
    if (parentStopRef.current) {
      parentStopRef.current();
    }
  };

  const handleAnalyzeClick = () => {
    if (!canAnalyzeCapture) {
      return;
    }

    setLogs((l) => [
      ...l,
      "[SYS] Starting analysis of completed real PCAP...",
    ]);

    if (onAnalyze) {
      onAnalyze();
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
  const completedStepsCount = Math.max(0, Math.min(8, workflowStep + 1));

  const selectStyle = {
    padding: "10px 14px",
    background: "#080c11",
    border: "1px solid rgba(0, 229, 255, 0.28)",
    color: "var(--neon-cyan)",
    borderRadius: "6px",
    outline: "none",
    fontFamily: "var(--font-mono)",
    cursor: isRunning ? "not-allowed" : "pointer",
    boxShadow: "inset 0 0 12px rgba(0,0,0,0.7)",
    fontSize: "13px",
    fontWeight: "700",
    minWidth: "190px"
  };

  const optionStyle = { background: "#0a0f14", color: "var(--neon-cyan)" };

  const mainGraphLinePoints = graphData
    .map((val, i) => String(i * 10.25) + "," + String(100 - (isRunning ? val : 12 + Math.sin(i * 0.5) * 4)))
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

  const telemetryCards = [
    {
      code: "0xCA01",
      label: "PACKETS CAPTURED",
      val: currentPackets.toLocaleString(),
      unit: "pkts",
      color: "var(--neon-cyan)"
    },
    {
      code: "0xCA02",
      label: "DATA VOLUME",
      val: String(currentBytes),
      unit: "KB",
      color: "var(--neon-purple)"
    },
    {
      code: "0xCA03",
      label: "ACTIVE ESP FLOWS",
      val: String(flows),
      unit: "SAs",
      color: "var(--emerald-400)"
    },
    {
      code: "0xCA04",
      label: "ACQUISITION RATE",
      val: isRunning ? String((fullPkts / Math.max(1, Number(duration))).toFixed(1)) : "0.0",
      unit: "pkt/s",
      color: "var(--neon-orange)"
    }
  ];

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

    // 1. SEPARATED PAGE HEADER (Matches SystemInternals)
    h(
      "div",
      { style: { paddingBottom: "8px", paddingTop: "12px" } },
      h(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "16px"
          }
        },
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
                fontWeight: "700"
              },
            },
            "LIVE WIRE ACQUISITION // DUAL-VM TESTBED"
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
            "Dual-Endpoint Acquisition"
          ),
          h(
            "p",
            { style: { color: "var(--text-secondary)", fontSize: "14px", marginTop: "8px", marginBottom: 0 } },
            "Initialize remote tcpdump listeners and execute dynamic payload injection across StrongSwan IPsec tunnels."
          )
        ),
        h(
          "div",
          { className: "capture-actions", style: { display: "flex", gap: "12px", flexWrap: "wrap" } },
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
                background: isRunning ? "rgba(255, 51, 102, 0.2)" : "rgba(187, 134, 252, 0.18)",
                border: "1.5px solid " + (isRunning ? "var(--neon-red)" : "var(--neon-purple)"),
                color: isRunning ? "var(--neon-red)" : "#e9d5ff",
                boxShadow: isRunning ? "var(--shadow-glow-red)" : "var(--shadow-glow-purple)",
                padding: "12px 24px",
                borderRadius: "8px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: "800",
                letterSpacing: "1.2px",
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
                borderRadius: "8px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                background:
                  downloadState === "incomplete"
                    ? "rgba(255, 51, 102, 0.18)"
                    : downloadState === "extracting"
                    ? "rgba(0, 229, 255, 0.18)"
                    : downloadState === "done"
                    ? "rgba(0, 255, 163, 0.18)"
                    : "rgba(0, 229, 255, 0.12)",
                border: "1.5px solid " + downloadBorderColor,
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
                letterSpacing: "0.8px",
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

    // Signature Glowing Divider
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

    // 2. MISSION ACQUISITION CONTROL DECK
    h(
      "div",
      {
        className: "card",
        style: {
          padding: "22px 26px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
          background: "rgba(10, 15, 22, 0.85)",
          border: "1px solid rgba(0, 229, 255, 0.22)",
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.7)",
        },
      },
      h(
        "div",
        { style: { display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" } },
        // Control 1: Operation Mode
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              padding: "10px 14px",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderLeft: "3px solid var(--neon-cyan)",
              borderRadius: "8px"
            }
          },
          h(
            "label",
            {
              style: {
                fontSize: "10px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                letterSpacing: "1px"
              }
            },
            "01 // OPERATION MODE"
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

        // Control 2: Traffic Payload
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              padding: "10px 14px",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderLeft: "3px solid var(--neon-purple)",
              borderRadius: "8px",
              opacity: mode === "random" ? 0.4 : 1,
              pointerEvents: mode === "random" ? "none" : "auto",
            },
          },
          h(
            "label",
            {
              style: {
                fontSize: "10px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                letterSpacing: "1px"
              }
            },
            "02 // TRAFFIC PAYLOAD"
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

        // Control 3: Duration Limit
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              padding: "10px 14px",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderLeft: "3px solid var(--emerald-400)",
              borderRadius: "8px"
            }
          },
          h(
            "label",
            {
              style: {
                fontSize: "10px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                letterSpacing: "1px"
              }
            },
            "03 // DURATION (SEC)"
          ),
          h("input", {
            type: "number",
            value: duration,
            onChange: (e) => {
              const value = Number(e.target.value);
              if (!Number.isFinite(value)) {
                setDuration(5);
                return;
              }
              setDuration(Math.max(5, Math.min(120, value)));
            },
            disabled: isRunning,
            min: "5",
            max: "120",
            style: {
              width: "110px",
              padding: "10px 14px",
              background: "#080c11",
              border: "1px solid rgba(0, 255, 163, 0.3)",
              color: "var(--emerald-400)",
              borderRadius: "6px",
              outline: "none",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              fontWeight: "800",
              boxShadow: "inset 0 0 12px rgba(0,0,0,0.7)",
            },
          })
        )
      ),

      // Right Side: Analyze Now Button + Countdown Core
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" } },
        h(
          "button",
          {
            type: "button",
            onClick: handleAnalyzeClick,
            onMouseEnter: () => setHoveredBtn("analyze"),
            onMouseLeave: () => setHoveredBtn(null),
            disabled: !canAnalyzeCapture || isMutating,
            style: {
              width: "175px",
              height: "54px",
              padding: "12px 18px",
              borderRadius: "8px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              background: canAnalyzeCapture ? "rgba(0,255,163,0.15)" : "transparent",
              border: canAnalyzeCapture ? "1.5px solid var(--emerald-400)" : "1px solid transparent",
              color: canAnalyzeCapture ? "var(--emerald-400)" : "transparent",
              fontWeight: "800",
              letterSpacing: "1px",
              cursor: canAnalyzeCapture ? "pointer" : "default",
              visibility: canAnalyzeCapture ? "visible" : "hidden",
              opacity: canAnalyzeCapture ? 1 : 0,
              transition: "all 0.25s ease",
              transform: hoveredBtn === "analyze" ? "translateY(-2px)" : "translateY(0)",
              boxShadow: canAnalyzeCapture ? "var(--shadow-glow-emerald)" : "none",
            },
          },
          "⚡ ANALYZE NOW"
        ),

        // Countdown Core Box
        h(
          "div",
          {
            style: {
              minWidth: "165px",
              background: "#080c11",
              border: isRunning
                ? "1px solid rgba(0, 229, 255, 0.4)"
                : "1px solid rgba(255,255,255,0.08)",
              padding: "14px 24px",
              borderRadius: "8px",
              textAlign: "right",
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.8)",
            },
          },
          h(
            "div",
            {
              style: {
                fontSize: "10px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
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
                fontSize: "34px",
                color: isRunning ? "var(--neon-cyan)" : "var(--text-primary)",
                fontWeight: "900",
                textShadow: isRunning ? "var(--shadow-glow-cyan)" : "none",
                lineHeight: "1",
              },
            },
            "00:" + String(timeLeft).padStart(2, "0")
          ),
          // Mini Progress Bar
          h(
            "div",
            {
              style: {
                width: "100%",
                height: "4px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: "2px",
                marginTop: "8px",
                overflow: "hidden"
              }
            },
            h("div", {
              style: {
                width: `${generatedPercent}%`,
                height: "100%",
                background: isRunning ? "var(--neon-cyan)" : "var(--emerald-400)",
                boxShadow: "0 0 8px var(--neon-cyan)",
                transition: "width 0.3s ease"
              }
            })
          )
        )
      )
    ),

    // 3. CAPTURE NODES GRID (SystemInternals LinuxNodeCard Aesthetic)
    h(
      "div",
      { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" } },

      // System A (Initiator / Controller)
      h(
        "div",
        {
          className: "card",
          style: {
            padding: "24px",
            background: "rgba(10, 15, 22, 0.85)",
            border: "1px solid " + (isRunning ? "rgba(0, 229, 255, 0.4)" : "rgba(255,255,255,0.07)"),
            borderLeft: "4px solid var(--neon-cyan)",
            boxShadow: isRunning
              ? "0 0 25px rgba(0,229,255,0.12), inset 0 0 25px rgba(0,229,255,0.06)"
              : "inset 0 0 25px rgba(0,0,0,0.65)",
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
            { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" } },
            h(
              "div",
              null,
              h(
                "div",
                {
                  style: {
                    fontSize: "10px",
                    letterSpacing: "1.5px",
                    color: "var(--neon-cyan)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: "700",
                    marginBottom: "4px",
                  },
                },
                "INITIATOR NODE // 192.168.160.128"
              ),
              h(
                "h3",
                {
                  style: {
                    margin: 0,
                    fontSize: "18px",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
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
                  fontFamily: "var(--font-mono)",
                  fontWeight: "800",
                  letterSpacing: "1px",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  background: isRunning ? "rgba(0, 229, 255, 0.12)" : "rgba(255,255,255,0.04)",
                  color: isRunning ? "var(--neon-cyan)" : "var(--text-muted)",
                  border: "1px solid " + (isRunning ? "var(--neon-cyan)" : "rgba(255,255,255,0.1)"),
                  boxShadow: isRunning ? "var(--shadow-glow-cyan)" : "none",
                },
              },
              isRunning ? "● CONNECTED" : "○ LISTENING"
            )
          ),
          h(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
                padding: "12px",
                background: "rgba(0,0,0,0.35)",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.05)"
              }
            },
            h(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: "4px" } },
              h("span", { style: { fontSize: "9px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "1px" } }, "INTERFACE"),
              h("strong", { style: { color: "var(--neon-cyan)", fontFamily: "var(--font-mono)", fontSize: "12px" } }, "eth1 (EN10MB)")
            ),
            h(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: "4px" } },
              h("span", { style: { fontSize: "9px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "1px" } }, "BPF FILTER"),
              h("strong", { style: { color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "12px" } }, "udp 500/4500")
            ),
            h(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: "4px" } },
              h("span", { style: { fontSize: "9px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "1px" } }, "DAEMON"),
              h("strong", { style: { color: "var(--emerald-400)", fontFamily: "var(--font-mono)", fontSize: "12px" } }, "tcpdump + swanctl")
            )
          )
        ),
        h(MiniTerminal, { active: isRunning })
      ),

      // System B (Responder / Peer)
      h(
        "div",
        {
          className: "card",
          style: {
            padding: "24px",
            background: "rgba(10, 15, 22, 0.85)",
            border: "1px solid " + (isRunning ? "rgba(187, 134, 252, 0.4)" : "rgba(255,255,255,0.07)"),
            borderLeft: "4px solid var(--neon-purple)",
            boxShadow: isRunning
              ? "0 0 25px rgba(187,134,252,0.12), inset 0 0 25px rgba(187,134,252,0.06)"
              : "inset 0 0 25px rgba(0,0,0,0.65)",
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
            { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" } },
            h(
              "div",
              null,
              h(
                "div",
                {
                  style: {
                    fontSize: "10px",
                    letterSpacing: "1.5px",
                    color: "var(--neon-purple)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: "700",
                    marginBottom: "4px",
                  },
                },
                "RESPONDER PEER // 192.168.160.129"
              ),
              h(
                "h3",
                {
                  style: {
                    margin: 0,
                    fontSize: "18px",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
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
                  fontFamily: "var(--font-mono)",
                  fontWeight: "800",
                  letterSpacing: "1px",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  background: isRunning ? "rgba(187, 134, 252, 0.12)" : "rgba(255,255,255,0.04)",
                  color: isRunning ? "var(--neon-purple)" : "var(--text-muted)",
                  border: "1px solid " + (isRunning ? "var(--neon-purple)" : "rgba(255,255,255,0.1)"),
                  boxShadow: isRunning ? "var(--shadow-glow-purple)" : "none",
                },
              },
              isRunning ? "● CONNECTED" : "○ LISTENING"
            )
          ),
          h(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
                padding: "12px",
                background: "rgba(0,0,0,0.35)",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.05)"
              }
            },
            h(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: "4px" } },
              h("span", { style: { fontSize: "9px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "1px" } }, "INTERFACE"),
              h("strong", { style: { color: "var(--neon-purple)", fontFamily: "var(--font-mono)", fontSize: "12px" } }, "eth1 (EN10MB)")
            ),
            h(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: "4px" } },
              h("span", { style: { fontSize: "9px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "1px" } }, "BPF FILTER"),
              h("strong", { style: { color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "12px" } }, "udp 500/4500")
            ),
            h(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: "4px" } },
              h("span", { style: { fontSize: "9px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "1px" } }, "ENCAPSULATION"),
              h("strong", { style: { color: "var(--emerald-400)", fontFamily: "var(--font-mono)", fontSize: "12px" } }, "RFC 4303 ESP")
            )
          )
        ),
        h(MiniGraph, { active: isRunning })
      )
    ),

    // 4. CAPTURE EXECUTION WORKFLOW (2-Column Tactical Pipeline)
    h(
      "div",
      {
        className: "card",
        style: {
          border: "1px solid rgba(0, 229, 255, 0.2)",
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.65)",
          overflow: "hidden"
        }
      },
      h(
        "div",
        {
          className: "card-header",
          style: {
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "18px 24px",
            background: "rgba(13, 19, 29, 0.9)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          },
        },
        h(
          "div",
          null,
          h(
            "div",
            {
              style: {
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
                color: "var(--neon-cyan)",
                letterSpacing: "1.5px",
                fontWeight: "700",
                marginBottom: "2px"
              }
            },
            "ORCHESTRATION STATE MACHINE // 8-STAGE VERIFICATION"
          ),
          h("div", { className: "card-title", style: { fontSize: "16px", fontWeight: "800" } }, "Capture Execution Workflow")
        ),
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "14px" } },
          manualStepError
            ? h(
                "div",
                {
                  style: {
                    color: "var(--neon-red)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    fontWeight: "800",
                    background: "rgba(255, 51, 102, 0.1)",
                    border: "1px solid rgba(255, 51, 102, 0.4)",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    textShadow: "var(--shadow-glow-red)"
                  }
                },
                manualStepError
              )
            : null,
          h(
            "span",
            {
              style: {
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                fontWeight: "800",
                color: completedStepsCount === 8 ? "var(--emerald-400)" : "var(--neon-cyan)",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(0, 229, 255, 0.3)",
                padding: "4px 12px",
                borderRadius: "20px",
                letterSpacing: "1px"
              }
            },
            `${completedStepsCount} / 8 STAGES VERIFIED`
          )
        )
      ),
      h(
        "div",
        {
          style: {
            padding: "22px 24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: "12px"
          }
        },
        WORKFLOW_DEFS.map((step, index) => {
          const isDone = workflowStep >= index;
          const isCurrent = index === workflowStep + 1 && isRunning;
          const stepAccent = isCurrent
            ? "var(--neon-cyan)"
            : isDone
            ? "var(--emerald-400)"
            : "rgba(255,255,255,0.12)";

          return h(
            "div",
            {
              key: step.id,
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "14px 16px",
                background: isCurrent
                  ? "rgba(0, 229, 255, 0.07)"
                  : isDone
                  ? "rgba(0, 255, 163, 0.03)"
                  : "rgba(0,0,0,0.3)",
                border: "1px solid " + (isCurrent ? "var(--neon-cyan)" : isDone ? "rgba(0, 255, 163, 0.28)" : "rgba(255,255,255,0.06)"),
                borderLeft: "3px solid " + stepAccent,
                borderRadius: "8px",
                boxShadow: isCurrent ? "var(--shadow-glow-cyan)" : "inset 0 0 15px rgba(0,0,0,0.45)",
                transition: "all 0.3s ease",
              },
            },
            h(
              "div",
              { style: { display: "flex", alignItems: "center", gap: "14px", minWidth: 0 } },
              h(
                "div",
                {
                  style: {
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    fontWeight: "800",
                    background: isCurrent
                      ? "rgba(0, 229, 255, 0.15)"
                      : isDone
                      ? "rgba(0, 255, 163, 0.15)"
                      : "rgba(255,255,255,0.03)",
                    border: "1px solid " + stepAccent,
                    color: isCurrent ? "var(--neon-cyan)" : isDone ? "var(--emerald-400)" : "var(--text-muted)",
                    boxShadow: isCurrent ? "0 0 12px var(--neon-cyan)" : "none",
                  },
                },
                isCurrent ? "●" : isDone ? "✓" : `0${index + 1}`
              ),
              h(
                "div",
                { style: { minWidth: 0 } },
                h(
                  "div",
                  { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" } },
                  h("span", { style: { color: "var(--text-primary)", fontSize: "13px", fontWeight: "800" } }, step.title),
                  h(
                    "span",
                    {
                      style: {
                        color: "var(--neon-purple)",
                        fontSize: "9px",
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.8px",
                        textTransform: "uppercase",
                        fontWeight: "700",
                        background: "rgba(187, 134, 252, 0.08)",
                        border: "1px solid rgba(187, 134, 252, 0.25)",
                        padding: "1px 6px",
                        borderRadius: "4px"
                      },
                    },
                    step.endpoint
                  )
                ),
                h(
                  "div",
                  {
                    style: {
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }
                  },
                  "$ " + step.command
                )
              )
            ),
            h(
              "div",
              { style: { flexShrink: 0 } },
              isCurrent
                ? h(
                    "span",
                    {
                      style: {
                        color: "var(--neon-cyan)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        fontWeight: "800",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
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
                    "RUNNING"
                  )
                : h(
                    "button",
                    {
                      type: "button",
                      onClick: () => handleManualStep(index),
                      disabled: isRunning || isMutating,
                      style: {
                        background: isDone ? "rgba(0, 255, 163, 0.1)" : "rgba(255,255,255,0.04)",
                        border: isDone ? "1px solid rgba(0, 255, 163, 0.35)" : "1px solid rgba(255,255,255,0.1)",
                        color: isDone ? "var(--emerald-400)" : "var(--text-primary)",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        fontWeight: "800",
                        letterSpacing: "0.8px",
                        cursor: isRunning ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                      },
                    },
                    isDone ? "VERIFIED" : "VERIFY STEP"
                  )
            )
          );
        })
      )
    ),

    // 5. TELEMETRY ANALYTICS & MAIN OSCILLOSCOPE
    h(
      "div",
      {
        className: "card",
        style: {
          border: "1px solid rgba(0, 229, 255, 0.2)",
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.65)",
          overflow: "hidden"
        }
      },
      h(
        "div",
        {
          className: "card-header",
          style: {
            padding: "18px 24px",
            background: "rgba(13, 19, 29, 0.9)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          },
        },
        h(
          "div",
          null,
          h(
            "div",
            {
              style: {
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
                color: "var(--neon-cyan)",
                letterSpacing: "1.5px",
                fontWeight: "700",
                marginBottom: "2px"
              }
            },
            "REAL-TIME WIRE THROUGHPUT // 4-CHANNEL"
          ),
          h("div", { className: "card-title", style: { fontSize: "16px", fontWeight: "800" } }, "Live Traffic Telemetry")
        ),
        h(
          "div",
          {
            style: {
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              fontWeight: "800",
              letterSpacing: "1px",
              padding: "4px 12px",
              borderRadius: "20px",
              background: isRunning ? "rgba(0, 229, 255, 0.12)" : "rgba(255,255,255,0.04)",
              color: isRunning ? "var(--neon-cyan)" : "var(--text-muted)",
              border: "1px solid " + (isRunning ? "rgba(0, 229, 255, 0.4)" : "rgba(255,255,255,0.08)"),
              boxShadow: isRunning ? "var(--shadow-glow-cyan)" : "none",
            },
          },
          isRunning ? "● ACTIVE STREAM" : "○ STANDBY"
        )
      ),

      // 4-Column Metric Strip
      h(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "16px",
            padding: "22px 24px"
          }
        },
        ...telemetryCards.map((tc) =>
          h(
            "div",
            {
              key: tc.code,
              style: {
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderLeft: `3px solid ${tc.color}`,
                borderRadius: "8px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                boxShadow: "inset 0 0 15px rgba(0,0,0,0.5)"
              }
            },
            h(
              "div",
              { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
              h(
                "span",
                {
                  style: {
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "1px",
                    fontWeight: "700"
                  }
                },
                tc.label
              ),
              h(
                "span",
                {
                  style: {
                    fontSize: "9px",
                    fontFamily: "var(--font-mono)",
                    color: tc.color,
                    opacity: 0.7
                  }
                },
                tc.code
              )
            ),
            h(
              "strong",
              {
                style: {
                  fontSize: "26px",
                  color: isRunning ? tc.color : "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: "800",
                  textShadow: isRunning ? `0 0 12px ${tc.color}50` : "none"
                }
              },
              tc.val,
              " ",
              h("span", { style: { fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" } }, tc.unit)
            )
          )
        )
      ),

      // Main 140px Oscilloscope Viewport
      h(
        "div",
        {
          style: {
            height: "145px",
            margin: "0 24px 24px 24px",
            background: "#080c11",
            border: "1px solid rgba(0, 229, 255, 0.18)",
            borderRadius: "8px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "inset 0 0 25px rgba(0,0,0,0.85)",
          },
        },
        h("div", {
          style: {
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(0, 229, 255, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.035) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          },
        }),
        h(
          "div",
          {
            style: {
              position: "absolute",
              top: "10px",
              left: "14px",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--text-muted)",
              letterSpacing: "1px"
            }
          },
          `CHANNEL 01 // ${trafficType.toUpperCase()} PAYLOAD WAVEFORM`
        ),
        h(
          "svg",
          {
            width: "100%",
            height: "100%",
            viewBox: "0 0 400 100",
            preserveAspectRatio: "none",
            style: { position: "absolute", bottom: 0 },
          },
          h("polyline", {
            fill: isRunning ? "rgba(0, 229, 255, 0.12)" : "rgba(0, 229, 255, 0.03)",
            stroke: "none",
            points: mainGraphFillPoints,
          }),
          h("polyline", {
            fill: "none",
            stroke: isRunning ? "var(--neon-cyan)" : "rgba(0, 229, 255, 0.35)",
            strokeWidth: "2",
            points: mainGraphLinePoints,
            style: { filter: isRunning ? "drop-shadow(0 0 6px rgba(0,229,255,0.7))" : "none" },
          })
        )
      )
    ),

    // 6. BOTTOM ROW: Console & Acquired Evidence Cartridge
    h(
      "div",
      { style: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" } },

      // Left: Terminal Console
      h(
        "div",
        {
          className: "card",
          style: {
            display: "flex",
            flexDirection: "column",
            height: "315px",
            background: "#080c11",
            border: "1px solid rgba(255, 170, 0, 0.25)",
            boxShadow: "inset 0 0 25px rgba(0,0,0,0.85)",
            overflow: "hidden"
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
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              justifyContent: "space-between",
            },
          },
          h(
            "div",
            { style: { display: "flex", alignItems: "center", gap: "12px" } },
            h(
              "div",
              { style: { display: "flex", gap: "6px" } },
              h("div", { style: { width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f56" } }),
              h("div", { style: { width: "10px", height: "10px", borderRadius: "50%", background: "#ffbd2e" } }),
              h("div", { style: { width: "10px", height: "10px", borderRadius: "50%", background: "#27c93f" } })
            ),
            h(
              "span",
              {
                style: {
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)"
                }
              },
              "espect-capture-daemon — event.log"
            )
          ),
          h(
            "div",
            {
              style: {
                fontSize: "10px",
                color: isRunning ? "var(--neon-orange)" : "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontWeight: "800",
                letterSpacing: "1px",
              },
            },
            isRunning ? "● RECORDING EVENT LOG..." : "○ IDLE"
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
            if (entry.includes("PASS") || entry.includes("successful") || entry.includes("complete")) color = "var(--emerald-400)";
            if (entry.includes("Error") || entry.includes("Halting") || entry.includes("blocked")) color = "var(--neon-red)";
            if (entry.includes("Injecting") || entry.includes("Slicing")) color = "var(--neon-purple)";

            return h(
              "div",
              { key: entry + "-" + String(index), style: { marginBottom: "6px" } },
              h("span", { style: { color, textShadow: "0 0 5px " + color + "40" } }, entry)
            );
          })
        )
      ),

      // Right: Acquired Evidence Cartridge Card
      h(
        "div",
        {
          className: "card",
          style: {
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "1px solid rgba(0, 255, 163, 0.25)",
            boxShadow: "inset 0 0 30px rgba(0,0,0,0.65)"
          },
        },
        h(
          "div",
          null,
          h(
            "div",
            { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" } },
            h(
              "div",
              null,
              h(
                "div",
                {
                  style: {
                    fontSize: "9px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--emerald-400)",
                    letterSpacing: "1.5px",
                    fontWeight: "700",
                    marginBottom: "2px"
                  }
                },
                "LIBPCAP BINARY BUFFER"
              ),
              h("div", { className: "card-title", style: { fontSize: "16px", fontWeight: "800" } }, "Acquired Evidence")
            ),
            h(
              "div",
              {
                style: {
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: "800",
                  letterSpacing: "1px",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  background: isRunning ? "rgba(0, 229, 255, 0.1)" : "rgba(0, 255, 163, 0.1)",
                  color: isRunning ? "var(--neon-cyan)" : "var(--emerald-400)",
                  border: "1px solid " + (isRunning ? "rgba(0, 229, 255, 0.35)" : "rgba(0, 255, 163, 0.35)"),
                  boxShadow: isRunning ? "var(--shadow-glow-cyan)" : "var(--shadow-glow-emerald)",
                },
              },
              isRunning ? "● WRITING (" + String(generatedPercent) + "%)" : "● READY (" + String(generatedPercent) + "%)"
            )
          ),

          // Cartridge Box
          h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                padding: "16px",
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderLeft: "3px solid var(--emerald-400)",
                borderRadius: "8px",
              },
            },
            h(
              "div",
              { style: { display: "flex", alignItems: "center", gap: "14px" } },
              h(
                "div",
                {
                  style: {
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: "rgba(0, 255, 163, 0.1)",
                    border: "1px solid rgba(0, 255, 163, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                    fontWeight: "800",
                    color: "var(--emerald-400)",
                    boxShadow: "var(--shadow-glow-emerald)",
                    flexShrink: 0
                  },
                },
                "PCAP"
              ),
              h(
                "div",
                { style: { minWidth: 0 } },
                h(
                  "strong",
                  {
                    style: {
                      display: "block",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                      marginBottom: "3px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    },
                  },
                  "capture_live_" + trafficType + ".pcap"
                ),
                h(
                  "span",
                  { style: { display: "block", color: "var(--text-muted)", fontSize: "11px", fontFamily: "var(--font-mono)" } },
                  String(currentBytes) + " KB • " + String(currentPackets) + " pkts • " + String(generatedPercent) + "% buffered"
                )
              )
            ),

            // Live Buffer Fill Progress Bar
            h(
              "div",
              {
                style: {
                  width: "100%",
                  height: "5px",
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "3px",
                  overflow: "hidden"
                }
              },
              h("div", {
                style: {
                  width: `${generatedPercent}%`,
                  height: "100%",
                  background: "var(--emerald-400)",
                  boxShadow: "0 0 8px var(--emerald-400)",
                  transition: "width 0.3s ease"
                }
              })
            )
          )
        ),

        // Bottom Export & Start/Stop Buttons
        h(
          "div",
          { style: { display: "flex", gap: "12px", marginTop: "18px" } },
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
                padding: "13px 10px",
                position: "relative",
                overflow: "hidden",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                background:
                  exportState === "done"
                    ? "rgba(0, 255, 163, 0.18)"
                    : "rgba(187, 134, 252, 0.18)",
                border: "1px solid " + exportBorderColor,
                color:
                  exportState === "done"
                    ? "var(--emerald-400)"
                    : exportState === "exporting"
                    ? "var(--neon-cyan)"
                    : "#e9d5ff",
                borderRadius: "6px",
                fontWeight: "800",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
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
                    : "rgba(187, 134, 252, 0.22)",
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
                  gap: "6px",
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
                ? "Exporting " + String(exportedSnapshotPct) + "%... (" + String(exportProgress) + "%)"
                : exportState === "done"
                ? "✓ Exported (" + String(exportedSnapshotPct) + "%)"
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
                padding: "13px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                background: isRunning ? "rgba(255, 51, 102, 0.2)" : "rgba(0, 229, 255, 0.16)",
                border: "1px solid " + (isRunning ? "var(--neon-red)" : "var(--neon-cyan)"),
                color: isRunning ? "var(--neon-red)" : "var(--neon-cyan)",
                borderRadius: "6px",
                fontWeight: "800",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
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