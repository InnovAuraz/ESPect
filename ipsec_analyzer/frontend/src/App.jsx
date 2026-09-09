import { useCallback, useEffect, useState } from "react";
import "./App.css";

import { checkHealth, analyzePcap, generateReport } from "./services/api";

import Header from "./components/Header";
import PcapUploader from "./components/PcapUploader";
import AnalysisLoading from "./components/AnalysisLoading";
import ErrorBanner from "./components/ErrorBanner";
import IpsecOverview from "./components/IpsecOverview";
import IkeConfiguration from "./components/IkeConfiguration";
import EspInformation from "./components/EspInformation";
import NetworkAddresses from "./components/NetworkAddresses";
import TrafficClassification from "./components/TrafficClassification";
import SecurityScore from "./components/SecurityScore";
import SecurityFindings from "./components/SecurityFindings";
import ReportButton from "./components/ReportButton";
import EmptyState from "./components/EmptyState";

function App() {
  const [backendStatus, setBackendStatus] = useState("checking");
  // true initially because the mount effect below starts a health
  // check immediately - avoids a synchronous setState() in the effect.
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);

  const [selectedFile, setSelectedFile] = useState(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState(null);

  // Manual "Recheck" trigger - a plain event handler, not effect-driven.
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

  // Initial check on mount. Kept separate from refreshBackendStatus
  // (rather than calling it from here) and guarded with an `ignore`
  // flag, per React's effect-cleanup guidance for data fetching.
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

      {analysisResult ? (
        <>
          <div className="dashboard-grid">
            <TrafficClassification traffic={analysisResult.traffic} />
            <SecurityScore security={analysisResult.security} />

            <IpsecOverview ipsec={analysisResult.ipsec} />
            <IkeConfiguration ipsec={analysisResult.ipsec} />
            <EspInformation ipsec={analysisResult.ipsec} />

            <NetworkAddresses ipsec={analysisResult.ipsec} />

            <SecurityFindings findings={analysisResult.security.findings} />

            <ReportButton
              onDownload={handleDownloadReport}
              isGenerating={isGeneratingReport}
              error={reportError}
            />
          </div>
        </>
      ) : (
        !isAnalyzing && <EmptyState />
      )}
    </div>
  );
}

export default App;
