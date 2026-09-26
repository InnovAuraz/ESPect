import React, { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

import {
  checkHealth,
  analyzePcap,
  generateReport,
  fetchCaptureSession,
  startCaptureSession,
  stopCaptureSession,
  downloadCaptureSession,
  analyzeLiveCapture,
} from "./services/api";

import ThreatMatrixView from "./components/ThreatMatrixView";
import ProtocolScanView from "./components/ProtocolScanView";
import Header from "./components/Header";
import PcapUploader from "./components/PcapUploader";
import AnalysisLoading from "./components/AnalysisLoading";
import ErrorBanner from "./components/ErrorBanner";
import StatsRow from "./components/StatsRow";
import SecurityGauge from "./components/SecurityGauge";
import EvidencePosture from "./components/EvidencePosture";
import TrafficClassification from "./components/TrafficClassification";
import ProtocolBreakdown from "./components/ProtocolBreakdown";
import IpsecDetails from "./components/IpsecDetails";
import NetworkAddresses from "./components/NetworkAddresses";
import SecurityFindings from "./components/SecurityFindings";
import ReportButton from "./components/ReportButton";
import EmptyState from "./components/EmptyState";
import LiveCaptureView from "./components/LiveCaptureView";
import StartupGuide from "./components/StartupGuide";
import SystemInternals from "./components/SystemInternals";

const h = React.createElement;

const navItems = [
  { id: "overview", label: "Overview", icon: "◈" },
  { id: "protocol-scan", label: "Protocol scan", icon: "▣" },
  { id: "live-capture", label: "Live capture", icon: "⇄" },
  { id: "risk-findings", label: "Risk findings", icon: "⚑" },
  { id: "startup-guide", label: "Startup Guide", icon: "⎈" },
  { id: "system-internals", label: "System Internals", icon: "⌗" },
];

const viewMeta = {
  "overview": {
    eyebrow: "IPSEC / ENCRYPTED TRAFFIC INTELLIGENCE",
    title: "Analysis Command Center",
    subtitle: "Decode observable VPN behavior, inspect tunnel posture, and preserve the evidence boundary.",
    badge: "CORE ENGINE"
  },
  "protocol-scan": {
    eyebrow: "DEEP PACKET INSPECTION & TOPOLOGY",
    title: "Protocol Scan & Encapsulation",
    subtitle: "Cryptographic tunnel encapsulation, endpoint telemetry, and layer-by-layer protocol distribution.",
    badge: "DPI SCANNER"
  },
  "risk-findings": {
    eyebrow: "VULNERABILITY & ANOMALY AUDIT",
    title: "Threat Matrix & Risk Findings",
    subtitle: "Automated cryptographic weakness detection, cleartext exposure alerts, and security posture scoring.",
    badge: "THREAT ENGINE"
  }
};

function App() {
  const [backendStatus, setBackendStatus] = useState("checking");
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [activeView, setActiveView] = useState("overview");
  const [isRailCollapsed, setIsRailCollapsed] = useState(
    typeof window !== "undefined" && 1200 >= window.innerWidth
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [captureSession, setCaptureSession] = useState(null);
  const [captureError, setCaptureError] = useState(null);
  const [isLoadingCapture, setIsLoadingCapture] = useState(false);
  const [isMutatingCapture, setIsMutatingCapture] = useState(false);

  const autoAnalyzedCapture = useRef(false);
  const captureRunRequested = useRef(false);

  const refreshCaptureSession = useCallback(async () => {
    if (activeView !== "live-capture") return;
    setIsLoadingCapture(true);
    try {
      const session = await fetchCaptureSession();
      setCaptureSession(session);
    } catch (error) {
      window.console?.error?.(error);
    } finally {
      setIsLoadingCapture(false);
    }
  }, [activeView]);

  const refreshBackendStatus = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      await checkHealth();
      setBackendStatus("online");
    } catch {
      setBackendStatus("offline");
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    function handleRailResize() {
      if (1200 >= window.innerWidth) {
        setIsRailCollapsed(true);
      } else {
        setIsRailCollapsed(false);
      }
    }

    handleRailResize();
    window.addEventListener("resize", handleRailResize);
    return () => {
      window.removeEventListener("resize", handleRailResize);
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    checkHealth()
      .then(() => {
        if (!ignore) setBackendStatus("online");
      })
      .catch(() => {
        if (!ignore) setBackendStatus("offline");
      })
      .finally(() => {
        if (!ignore) setIsCheckingHealth(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (activeView !== "live-capture") return undefined;
    const initialRefresh = window.setTimeout(() => {
      void refreshCaptureSession();
    }, 0);
    const intervalId = window.setInterval(() => {
      void refreshCaptureSession();
    }, 2000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(intervalId);
    };
  }, [activeView, refreshCaptureSession]);

  async function handleCaptureAction(action, options = {}) {
    setIsMutatingCapture(true);
    setCaptureError(null);
    try {
      if (action === "start") {
        captureRunRequested.current = true;
        autoAnalyzedCapture.current = false;
        await startCaptureSession(options);
      } else if (action === "stop") {
        await stopCaptureSession();
      }
      await refreshCaptureSession();
    } catch (error) {
      setCaptureError(error.message || "Capture action failed.");
    } finally {
      setIsMutatingCapture(false);
    }
  }

  async function handleDownloadCapture() {
    setIsMutatingCapture(true);
    try {
      const { blob, filename } = await downloadCaptureSession();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsMutatingCapture(false);
    }
  }

  async function handleAnalyzeLiveCapture() {
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    setCaptureError(null);
    setAnalysisError(null);

    try {
      const result = await analyzeLiveCapture();
      const { blob, filename } = await downloadCaptureSession();
      const file = new File([blob], filename, {
        type: "application/vnd.tcpdump.pcap",
      });

      setSelectedFile(file);
      setAnalysisResult(result);
      setActiveView("overview");
    } catch (error) {
      setAnalysisError(error.message || "Live PCAP analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleFileSelected(file) {
    setSelectedFile(file);
    setAnalysisResult(null);
    setAnalysisError(null);
    setReportError(null);
  }

  function handleClearFile() {
    setSelectedFile(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setReportError(null);
  }

  async function handleAnalyze() {
    if (!selectedFile || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    try {
      const result = await analyzePcap(selectedFile);
      setAnalysisResult(result);
    } catch (error) {
      setAnalysisError(error.message || "PCAP analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleDownloadReport() {
    if (!selectedFile || isGeneratingReport) return;
    setIsGeneratingReport(true);
    setReportError(null);
    try {
      const { blob, filename } = await generateReport(selectedFile);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setReportError(error.message || "Report generation failed.");
    } finally {
      setIsGeneratingReport(false);
    }
  }

  const r = analysisResult;
  const currentMeta = viewMeta[activeView] || viewMeta["overview"];
  const isOnline = backendStatus === "online";
  const statusColor = isOnline ? "var(--emerald-400)" : "var(--neon-orange)";
  const statusGlow = isOnline ? "var(--shadow-glow-emerald)" : "var(--shadow-glow-amber)";

  return h(
    "div",
    { className: "app-shell" },

    // SIDEBAR NAVIGATION
    h(
      "aside",
      { className: `command-rail ${sidebarOpen ? "open" : ""}` },
      h(
        "button",
        {
          type: "button",
          className: "rail-mark",
          onClick: () => setSidebarOpen((value) => !value),
          "aria-label": sidebarOpen ? "collapse sidebar" : "Expand sidebar",
        },
        "E"
      ),
      h("div", { className: "rail-brand" }, "ESPECT", h("span", null, "OPS CONSOLE")),
      h(
        "nav",
        { className: "rail-nav", "aria-label": "Primary navigation" },
        ...navItems.map((item) =>
          h(
            "button",
            {
              key: item.id,
              type: "button",
              className: `rail-item ${activeView === item.id ? "active" : ""}`,
              onClick: () => {
                setActiveView(item.id);
                setSidebarOpen(false);
                if (item.id === "live-capture") {
                  void refreshCaptureSession();
                }
              },
            },
            h("span", { className: "rail-item-mark", "aria-hidden": "true" }, item.icon),
            h("span", { className: "rail-item-label" }, item.label)
          )
        )
      ),
      h(
        "div",
        { className: "rail-footer" },
        "PCAP-FIRST",
        h("br"),
        h("span", null, "ANALYSIS NODE 01")
      )
    ),

    // MAIN WORKSPACE
    h(
      "main",
      { className: "workspace" },
      activeView === "live-capture"
        ? h(LiveCaptureView, {
            session: captureSession,
            captureError: captureError,
            isLoading: isLoadingCapture,
            isMutating: isMutatingCapture,
            onStartCapture: (options) => handleCaptureAction("start", options),
            onStopCapture: () => handleCaptureAction("stop"),
            onDownload: handleDownloadCapture,
            onAnalyze: handleAnalyzeLiveCapture,
          })
        : activeView === "startup-guide"
        ? h(StartupGuide)
        : activeView === "system-internals"
        ? h(SystemInternals)
        : h(
            React.Fragment,
            null,
            h(Header, {
              status: backendStatus,
              onRefresh: refreshBackendStatus,
              isChecking: isCheckingHealth,
            }),

            // UPGRADED SYSTEM-INTERNALS STYLE COMMAND HEADER
            h(
              "section",
              {
                style: {
                  position: "relative",
                  padding: "24px 28px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, rgba(13, 19, 29, 0.95) 0%, rgba(8, 12, 20, 0.98) 100%)",
                  border: "1px solid rgba(0, 229, 255, 0.2)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5), inset 0 0 25px rgba(0, 229, 255, 0.05)",
                  overflow: "hidden",
                  marginBottom: "8px"
                }
              },
              // Top Neon Gradient Accent Line
              h("div", {
                style: {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: "linear-gradient(90deg, var(--neon-cyan), var(--neon-purple), var(--emerald-400))",
                  boxShadow: "0 0 12px rgba(0, 229, 255, 0.6)"
                }
              }),

              h(
                "div",
                {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    flexWrap: "wrap",
                    gap: "20px"
                  }
                },
                h(
                  "div",
                  null,
                  h(
                    "div",
                    {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "8px"
                      }
                    },
                    h(
                      "span",
                      {
                        style: {
                          color: "var(--neon-cyan)",
                          letterSpacing: "2px",
                          fontSize: "11px",
                          fontWeight: "700",
                          fontFamily: "var(--font-mono)"
                        }
                      },
                      currentMeta.eyebrow
                    ),
                    h(
                      "span",
                      {
                        style: {
                          fontSize: "9px",
                          fontFamily: "var(--font-mono)",
                          color: "var(--neon-purple)",
                          border: "1px solid rgba(187, 134, 252, 0.35)",
                          background: "rgba(187, 134, 252, 0.08)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          letterSpacing: "1px"
                        }
                      },
                      currentMeta.badge
                    )
                  ),
                  h(
                    "h1",
                    {
                      style: {
                        color: "var(--text-primary)",
                        fontSize: "2.35rem",
                        fontWeight: "800",
                        letterSpacing: "-1px",
                        margin: 0,
                        textShadow: "0 2px 10px rgba(0,0,0,0.6)"
                      }
                    },
                    currentMeta.title
                  ),
                  h(
                    "p",
                    {
                      style: {
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                        marginTop: "8px",
                        marginBottom: 0
                      }
                    },
                    currentMeta.subtitle
                  )
                ),

                // Right-Side Live Node Telemetry Box
                h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: "20px",
                      background: "rgba(0,0,0,0.45)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderLeft: `3px solid ${statusColor}`,
                      padding: "12px 18px",
                      borderRadius: "8px"
                    }
                  },
                  h(
                    "div",
                    { style: { textAlign: "right" } },
                    h(
                      "div",
                      {
                        style: {
                          fontSize: "10px",
                          color: "var(--text-muted)",
                          letterSpacing: "1.5px",
                          fontWeight: "700",
                          fontFamily: "var(--font-mono)",
                          marginBottom: "4px"
                        }
                      },
                      "ANALYZER NODE"
                    ),
                    h(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "8px"
                        }
                      },
                      h("span", {
                        style: {
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: statusColor,
                          boxShadow: statusGlow,
                          display: "inline-block"
                        }
                      }),
                      h(
                        "strong",
                        {
                          style: {
                            fontSize: "18px",
                            fontFamily: "var(--font-mono)",
                            fontWeight: "800",
                            color: statusColor,
                            textShadow: statusGlow,
                            letterSpacing: "1px"
                          }
                        },
                        isOnline ? "READY" : "STANDBY"
                      )
                    )
                  )
                )
              )
            ),

            h(PcapUploader, {
              selectedFile: selectedFile,
              onFileSelected: handleFileSelected,
              onClearFile: handleClearFile,
              onAnalyze: handleAnalyze,
              isAnalyzing: isAnalyzing,
            }),

            isAnalyzing ? h(AnalysisLoading) : null,

            h(ErrorBanner, { message: analysisError }),

            r
              ? h(
                  "div",
                  { className: "dashboard-grid" },
                  activeView === "overview"
                    ? h(
                        React.Fragment,
                        null,
                        h(
                          "div",
                          { className: "full-width" },
                          h(StatsRow, { summary: r.capture_summary, ipsec: r.ipsec })
                        ),
                        h(SecurityGauge, { security: r.security }),
                        h(EvidencePosture, {
                          ipsec: r.ipsec,
                          traffic: r.traffic,
                          findings: r.security.findings,
                        }),
                        h(TrafficClassification, { traffic: r.traffic }),
                        h(
                          "div",
                          { className: "full-width" },
                          h(IpsecDetails, { ipsec: r.ipsec })
                        ),
                        h(
                          "div",
                          { className: "full-width report-section" },
                          h(ReportButton, {
                            onDownload: handleDownloadReport,
                            isGenerating: isGeneratingReport,
                            error: reportError,
                          })
                        )
                      )
                    : null,

                  activeView === "protocol-scan"
                    ? h(
                        "div",
                        { className: "full-width" },
                        h(ProtocolScanView, {
                          summary: r.capture_summary,
                          ipsec: r.ipsec,
                        })
                      )
                    : null,

                  activeView === "risk-findings"
                    ? h(
                        "div",
                        { className: "full-width" },
                        h(ThreatMatrixView, { security: r.security })
                      )
                    : null
                )
              : !isAnalyzing
              ? h(EmptyState, { activeView })
              : null
          )
    )
  );
}

export default App;