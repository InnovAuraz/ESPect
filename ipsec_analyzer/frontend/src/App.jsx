import { useCallback, useEffect, useState } from "react";
import "./App.css";

import {
  checkHealth,
  analyzePcap,
  generateReport,
  fetchCaptureSession,
  startCaptureSession,
  stopCaptureSession,
  downloadCaptureSession,
  runCaptureWorkflowStep,
} from "./services/api";

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

const navItems = [
  { id: "overview", label: "Overview", icon: "◈" },
  { id: "protocol-scan", label: "Protocol scan", icon: "▣" },
  { id: "live-capture", label: "Live capture", icon: "⇄" },
  { id: "risk-findings", label: "Risk findings", icon: "⚑" },
];

function createDefaultWorkflowSteps() {
  return [
    { id: "vm1_ready", title: "VM1 ready", endpoint: "VM1 controller", command: "ip addr && ping -c 1 192.168.160.129", detail: "Check VM1 network state and reachability.", status: "idle", output: "Awaiting validation." },
    { id: "vm2_ready", title: "VM2 ready", endpoint: "VM2 peer", command: "ip addr && ping -c 1 192.168.160.128", detail: "Check VM2 network state and reachability.", status: "idle", output: "Awaiting validation." },
    { id: "config_loaded", title: "Config loaded", endpoint: "Experiment config", command: "python scripts/packet_capture.py config/configuration.yaml 30", detail: "Load and validate the IPsec experiment configuration.", status: "idle", output: "Awaiting config." },
    { id: "ipsec_applied", title: "IPsec applied", endpoint: "StrongSwan", command: "ipsec statusall", detail: "Apply the IPsec SA and confirm the tunnel is active.", status: "idle", output: "Awaiting tunnel status." },
    { id: "capture_started", title: "Capture started", endpoint: "tcpdump", command: "tcpdump -i eth1 -w captures/live_capture.pcap", detail: "Start packet capture before traffic or IKE negotiation begins.", status: "idle", output: "Awaiting capture start." },
    { id: "traffic_generated", title: "Traffic generated", endpoint: "Traffic generator", command: "python scripts/run_agent.py --mode traffic", detail: "Generate encrypted traffic across the active IPsec tunnel.", status: "idle", output: "Awaiting traffic." },
    { id: "capture_stopped", title: "Capture stopped", endpoint: "Controller", command: "pkill -f tcpdump", detail: "Stop packet collection after the capture window is complete.", status: "idle", output: "Awaiting stop." },
    { id: "pcap_validated", title: "PCAP validated", endpoint: "Validator", command: "python -m src.capture.validator", detail: "Validate the capture before analysis or download.", status: "idle", output: "Awaiting validation." },
  ];
}

function createDefaultCaptureSession() {
  return {
    is_running: false,
    session_name: "capture_live_20260918.pcap",
    endpoints: [
      {
        id: "alpha",
        title: "System A",
        status: "Listening",
        ip: "10.10.0.12",
        iface: "eth0",
        filter: "ipsec or esp",
        duration: "00:00:00",
        packets: "0",
        bytes: "0 B",
        mode: "Full trace",
      },
      {
        id: "beta",
        title: "System B",
        status: "Listening",
        ip: "10.10.0.22",
        iface: "ens192",
        filter: "udp port 500 or 4500",
        duration: "00:00:00",
        packets: "0",
        bytes: "0 B",
        mode: "Filtered",
      },
    ],
    telemetry: {
      packets_per_sec: "0",
      bytes_per_sec: "0 B",
      esp_flows: "0",
      alerts: "0",
    },
    log: [
      "Capture workflow ready. Start the VMs to continue.",
      "VM1 and VM2 must be running before the IPsec tunnel can be established.",
    ],
    workflow: {
      steps: createDefaultWorkflowSteps(),
    },
    file: {
      name: "capture_live_20260918.pcap",
      size: "0 MB",
      packets: "0",
    },
  };
}

function LiveCaptureView({
  session,
  isMutating,
  onStartCapture,
  onStopCapture,
  onDownload,
  onRunWorkflowStep,
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!session || !session.is_running) return undefined;

    const intervalId = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 1200);

    return () => window.clearInterval(intervalId);
  }, [session]);

  const activeSession = session || createDefaultCaptureSession();

  const endpoints = activeSession.endpoints || [];
  const telemetry = activeSession.telemetry || {};
  const logEntries = activeSession.log || [];
  const fileMeta = activeSession.file || {};
  const workflowSteps = activeSession.workflow?.steps || createDefaultWorkflowSteps();

  const packetsPerSec = Number(String(telemetry.packets_per_sec || "0").replace(/[,\sMB]/g, "")) || 0;
  const currentPackets = Math.max(3600, packetsPerSec + (tick % 8) * 140);
  const currentBytes = `${(1.2 + (tick % 7) * 0.18).toFixed(2)} MB`;
  const currentFlows = Number(telemetry.esp_flows || 0) + (tick % 5);
  const currentAlerts = Number(telemetry.alerts || 0) + (tick % 3 === 0 ? 1 : 0);
  const chartLevels = [
    28 + (tick % 4) * 6,
    36 + (tick % 5) * 7,
    42 + (tick % 6) * 7,
    58 + (tick % 4) * 8,
    72 + (tick % 5) * 7,
    68 + (tick % 6) * 8,
    88 + (tick % 4) * 6,
    100,
    84 + (tick % 5) * 7,
    72 + (tick % 4) * 6,
    56 + (tick % 5) * 7,
    42 + (tick % 4) * 6,
  ];

  return (
    <div className="live-capture-view">
      <div className="capture-header">
        <div>
          <div className="eyebrow">LIVE / CAPTURE SESSION</div>
          <h2>Dual-endpoint packet acquisition</h2>
        </div>
        <div className="capture-actions">
          <button
            type="button"
            className="btn-capture"
            onClick={activeSession.is_running ? onStopCapture : onStartCapture}
            disabled={isMutating}
          >
            {activeSession.is_running ? "Stop capture" : "Start capture"}
          </button>
          <button type="button" className="btn-secondary" onClick={onDownload} disabled={isMutating}>
            Download .pcap
          </button>
        </div>
      </div>

      <div className="capture-grid">
        {endpoints.map((endpoint) => (
          <div className="capture-card" key={endpoint.id}>
            <div className="capture-card-header">
              <div>
                <div className="system-tag">{endpoint.title}</div>
                <h3>{endpoint.title}</h3>
              </div>
              <span className={`status-pill ${endpoint.status === "Capturing" ? "capturing" : "idle"}`}>
                {endpoint.status}
              </span>
            </div>

            <div className="field-grid">
              <div className="field-item">
                <label>Interface</label>
                <strong>{endpoint.iface}</strong>
              </div>
              <div className="field-item">
                <label>Source IP</label>
                <strong>{endpoint.ip}</strong>
              </div>
              <div className="field-item">
                <label>Capture mode</label>
                <strong>{endpoint.mode}</strong>
              </div>
              <div className="field-item">
                <label>Duration</label>
                <strong>{endpoint.duration}</strong>
              </div>
              <div className="field-item full">
                <label>Filter</label>
                <strong>{endpoint.filter}</strong>
              </div>
              <div className="field-item full">
                <label>Packet target</label>
                <strong>{endpoint.packets} packets / auto-save</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="workflow-card">
        <div className="card-header">
          <div className="card-title">Capture workflow</div>
          <div className="card-badge secure">EXECUTION ORDER</div>
        </div>
        <div className="workflow-steps">
          {workflowSteps.map((step) => {
            const isRunning = step.status === "running";
            const isDone = step.status === "done";
            const isFailed = step.status === "failed";

            return (
              <div key={step.id} className={`workflow-step ${step.status}`}>
                <div className="workflow-step-main">
                  <div className={`workflow-status ${step.status}`} aria-label={step.status}>
                    {isRunning ? "●" : isDone ? "✓" : isFailed ? "!" : "○"}
                  </div>
                  <div className="workflow-copy">
                    <div className="workflow-step-title-row">
                      <span className="workflow-step-title">{step.title}</span>
                      <span className="workflow-step-endpoint">{step.endpoint}</span>
                    </div>
                    <div className="workflow-step-command">{step.command || "Awaiting command"}</div>
                    <div className="workflow-step-detail">{step.detail || "Awaiting description."}</div>
                    <div className="workflow-step-output">{step.output || "Waiting for result..."}</div>
                  </div>
                </div>

                <div className="workflow-step-actions">
                  {isRunning ? (
                    <span className="workflow-loading-inline"><span className="mini-spinner" /> Running</span>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary workflow-button"
                      onClick={() => onRunWorkflowStep(step.id)}
                      disabled={isMutating}
                    >
                      {isDone ? "Completed" : isFailed ? "Retry" : "Run step"}
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
          <div className="card-title">Live traffic telemetry</div>
          <div className="card-badge secure">{activeSession.is_running ? "ACTIVE" : "STANDBY"}</div>
        </div>

        <div className="metric-grid">
          <div className="metric-box">
            <span>Packets / sec</span>
            <strong>{activeSession.is_running ? currentPackets.toLocaleString() : telemetry.packets_per_sec || "0"}</strong>
          </div>
          <div className="metric-box">
            <span>Bytes / sec</span>
            <strong>{activeSession.is_running ? currentBytes : telemetry.bytes_per_sec || "0 B"}</strong>
          </div>
          <div className="metric-box">
            <span>ESP flows</span>
            <strong>{activeSession.is_running ? currentFlows : telemetry.esp_flows || "0"}</strong>
          </div>
          <div className="metric-box">
            <span>Alerts</span>
            <strong>{String(activeSession.is_running ? currentAlerts : telemetry.alerts || 0).padStart(2, "0")}</strong>
          </div>
        </div>

        <div className="chart-wrap" aria-label="Traffic chart">
          <div className="chart-bars">
            {chartLevels.map((level, index) => (
              <span key={index} style={{ height: `${activeSession.is_running ? level : Math.max(level - 24, 18)}%` }} />
            ))}
          </div>
        </div>
      </div>

      <div className="capture-bottom-row">
        <div className="capture-log card">
          <div className="card-header">
            <div className="card-title">Session log</div>
            <div className="card-badge warning">{activeSession.is_running ? "LIVE" : "IDLE"}</div>
          </div>
          <ul className="log-list">
            {logEntries.map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))}
          </ul>
        </div>

        <div className="capture-summary card">
          <div className="card-header">
            <div className="card-title">Acquired file</div>
            <div className="card-badge secure">{activeSession.is_running ? "SAVING" : "SAVED"}</div>
          </div>
          <div className="summary-box">
            <div className="summary-icon">▣</div>
            <div>
              <strong>{fileMeta.name || "capture_live_20260918.pcap"}</strong>
              <span>{fileMeta.size || "1.8 MB"} • {fileMeta.packets || "20,412"} packets</span>
            </div>
          </div>
          <div className="summary-actions">
            <button type="button" className="btn-secondary" onClick={onDownload}>Export report</button>
            <button type="button" className="btn-capture" onClick={activeSession.is_running ? onStopCapture : onStartCapture} disabled={isMutating}>
              {activeSession.is_running ? "Stop session" : "Save session"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [isLoadingCapture, setIsLoadingCapture] = useState(false);
  const [isMutatingCapture, setIsMutatingCapture] = useState(false);

  const refreshCaptureSession = useCallback(async () => {
    if (activeView !== "live-capture") return;
    setIsLoadingCapture(true);
    try {
      const session = await fetchCaptureSession();
      setCaptureSession(session);
    } catch (error) {
      setCaptureSession(createDefaultCaptureSession());
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

  async function handleCaptureAction(action) {
    setIsMutatingCapture(true);
    try {
      if (action === "start") {
        await startCaptureSession();
      } else if (action === "stop") {
        await stopCaptureSession();
      }
      await refreshCaptureSession();
    } finally {
      setIsMutatingCapture(false);
    }
  }

  async function handleRunWorkflowStep(stepId) {
    setIsMutatingCapture(true);
    try {
      const session = await runCaptureWorkflowStep(stepId);
      setCaptureSession(session);
    } catch (error) {
      window.console?.error?.(error);
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
            isLoading={isLoadingCapture}
            isMutating={isMutatingCapture}
            onStartCapture={() => handleCaptureAction("start")}
            onStopCapture={() => handleCaptureAction("stop")}
            onDownload={handleDownloadCapture}
            onRunWorkflowStep={handleRunWorkflowStep}
          />
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
              <>
                <StatsRow summary={r.capture_summary} ipsec={r.ipsec} />

                <div className="dashboard-grid">
                  <SecurityGauge security={r.security} />
                  <EvidencePosture ipsec={r.ipsec} traffic={r.traffic} findings={r.security.findings} />
                  <TrafficClassification traffic={r.traffic} />

                  {r.capture_summary?.protocol_counts && (
                    <ProtocolBreakdown protocols={r.capture_summary.protocol_counts} total={r.capture_summary.total_packets} />
                  )}

                  <IpsecDetails ipsec={r.ipsec} />
                  <div className="full-width"><NetworkAddresses ipsec={r.ipsec} /></div>
                  <div className="full-width"><SecurityFindings findings={r.security.findings} /></div>
                  <div className="full-width report-section">
                    <ReportButton onDownload={handleDownloadReport} isGenerating={isGeneratingReport} error={reportError} />
                  </div>
                </div>
              </>
            ) : (
              !isAnalyzing && <EmptyState />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
