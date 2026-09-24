import { useCallback, useEffect, useRef, useState } from "react";
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

// NEW IMPORTS
import StartupGuide from "./components/StartupGuide";
import SystemInternals from "./components/SystemInternals";

const navItems = [
  { id: "overview", label: "Overview", icon: "◈" },
  { id: "protocol-scan", label: "Protocol scan", icon: "▣" },
  { id: "live-capture", label: "Live capture", icon: "⇄" },
  { id: "risk-findings", label: "Risk findings", icon: "⚑" },
  { id: "startup-guide", label: "Startup Guide", icon: "⎈" },
  { id: "system-internals", label: "System Internals", icon: "⌗" },
];

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
    let ignore = false;
    checkHealth()
      .then(() => { if (!ignore) setBackendStatus("online"); })
      .catch(() => { if (!ignore) setBackendStatus("offline"); })
      .finally(() => { if (!ignore) setIsCheckingHealth(false); });
    return () => { ignore = true; };
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

  useEffect(() => {
    if (
      activeView !== "live-capture" ||
      !captureRunRequested.current ||
      captureSession?.capture_status !== "completed" ||
      autoAnalyzedCapture.current
    ) {
      return undefined;
    }

    autoAnalyzedCapture.current = true;
    let cancelled = false;

    async function analyzeCompletedCapture() {
      setIsAnalyzing(true);
      setCaptureError(null);
      try {
        const result = await analyzeLiveCapture();
        if (cancelled) return;

        const { blob, filename } = await downloadCaptureSession();
        const file = new File([blob], filename, { type: "application/vnd.tcpdump.pcap" });
        
        setSelectedFile(file);
        setAnalysisResult(result);
        setActiveView("overview");
      } catch (error) {
        if (!cancelled) {
          autoAnalyzedCapture.current = false;
          setCaptureError(error.message || "Automatic PCAP analysis failed.");
        }
      } finally {
        if (!cancelled) setIsAnalyzing(false);
      }
    }

    void analyzeCompletedCapture();
    return () => {
      cancelled = true;
    };
  }, [activeView, captureSession?.capture_status]);

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

  return (
    <div className="app-shell">
      <aside className="command-rail">
        <div className="rail-mark">E</div>
        <div className="rail-brand">ESPECT<span>OPS CONSOLE</span></div>
        <nav className="rail-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rail-item ${activeView === item.id ? "active" : ""}`}
              onClick={() => {
                setActiveView(item.id);
                if (item.id === "live-capture") {
                  void refreshCaptureSession();
                }
              }}
            >
              <span className="rail-item-mark" aria-hidden="true">{item.icon}</span>
              <span className="rail-item-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="rail-footer">PCAP-FIRST<br /><span>ANALYSIS NODE 01</span></div>
      </aside>

      <main className="workspace">
        {activeView === "live-capture" ? (
          <LiveCaptureView
            session={captureSession}
            captureError={captureError}
            isLoading={isLoadingCapture}
            isMutating={isMutatingCapture}
            onStartCapture={(options) => handleCaptureAction("start", options)}
            onStopCapture={() => handleCaptureAction("stop")}
            onDownload={handleDownloadCapture}
          />
        ) : activeView === "startup-guide" ? (
          <StartupGuide />
        ) : activeView === "system-internals" ? (
          <SystemInternals />
        ) : (
          <>
            <Header
              status={backendStatus}
              onRefresh={refreshBackendStatus}
              isChecking={isCheckingHealth}
            />

            <section className="mission-bar">
              <div>
                <div className="eyebrow">IPSEC / ENCRYPTED TRAFFIC INTELLIGENCE</div>
                <h1>Analysis command center</h1>
                <p>Decode observable VPN behavior. Preserve the evidence boundary.</p>
              </div>
              <div className="mission-state">
                <span className={`status-dot ${backendStatus === "online" ? "online" : "checking"}`} />
                <span>ANALYZER NODE</span>
                <strong>{backendStatus === "online" ? "READY" : "STANDBY"}</strong>
              </div>
            </section>

            <PcapUploader
              selectedFile={selectedFile}
              onFileSelected={handleFileSelected}
              onClearFile={handleClearFile}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
            />

            {isAnalyzing && <AnalysisLoading />}

            <ErrorBanner message={analysisError} />

            {r ? (
              <div className="dashboard-grid">
                
                {activeView === "overview" && (
                  <>
                    <div className="full-width"><StatsRow summary={r.capture_summary} ipsec={r.ipsec} /></div>
                    <SecurityGauge security={r.security} />
                    <EvidencePosture ipsec={r.ipsec} traffic={r.traffic} findings={r.security.findings} />
                    <TrafficClassification traffic={r.traffic} />
                    <div className="full-width"><IpsecDetails ipsec={r.ipsec} /></div>
                    <div className="full-width report-section">
                      <ReportButton onDownload={handleDownloadReport} isGenerating={isGeneratingReport} error={reportError} />
                    </div>
                  </>
                )}

                {activeView === "protocol-scan" && (
                  <div className="full-width">
                    <ProtocolScanView summary={r.capture_summary} ipsec={r.ipsec} />
                  </div>
                )}

                {activeView === "risk-findings" && (
                  <div className="full-width">
                    <ThreatMatrixView security={r.security} />
                  </div>
                )}

              </div>
            ) : (
              !isAnalyzing && activeView !== "overview" && <EmptyState />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;