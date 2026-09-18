import { useCallback, useEffect, useState } from "react";
import "./App.css";

import { checkHealth, analyzePcap, generateReport } from "./services/api";

import Header from "./components/Header";
import PcapUploader from "./components/PcapUploader";
import AnalysisLoading from "./components/AnalysisLoading";
import ErrorBanner from "./components/ErrorBanner";
import StatsRow from "./components/StatsRow";
import SecurityGauge from "./components/SecurityGauge";
import TrafficClassification from "./components/TrafficClassification";
import ProtocolBreakdown from "./components/ProtocolBreakdown";
import IpsecDetails from "./components/IpsecDetails";
import NetworkAddresses from "./components/NetworkAddresses";
import SecurityFindings from "./components/SecurityFindings";
import ReportButton from "./components/ReportButton";
import EmptyState from "./components/EmptyState";

function App() {
  const [backendStatus, setBackendStatus] = useState("checking");
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState(null);

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
      <Header
        status={backendStatus}
        onRefresh={refreshBackendStatus}
        isChecking={isCheckingHealth}
      />

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
          <StatsRow
            summary={r.capture_summary}
            ipsec={r.ipsec}
          />

          <div className="dashboard-grid">
            <SecurityGauge security={r.security} />
            <TrafficClassification traffic={r.traffic} />

            {r.capture_summary?.protocol_counts && (
              <ProtocolBreakdown
                protocols={r.capture_summary.protocol_counts}
                total={r.capture_summary.total_packets}
              />
            )}

            <IpsecDetails ipsec={r.ipsec} />

            <div className="full-width">
              <NetworkAddresses ipsec={r.ipsec} />
            </div>

            <div className="full-width">
              <SecurityFindings findings={r.security.findings} />
            </div>

            <div className="full-width report-section">
              <ReportButton
                onDownload={handleDownloadReport}
                isGenerating={isGeneratingReport}
                error={reportError}
              />
            </div>
          </div>
        </>
      ) : (
        !isAnalyzing && <EmptyState />
      )}
    </div>
  );
}

export default App;
