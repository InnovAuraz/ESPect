import { DownloadIcon } from "./Icons";

export default function ReportButton({ onDownload, isGenerating, error }) {
  return (
    <div className="panel span-2 report-panel">
      <div>
        <div className="report-copy-title">PDF Security Report</div>
        <div className="report-copy-desc">
          Generate a downloadable ESPect assessment report for this capture.
        </div>
        {error && (
          <div style={{ marginTop: 8, fontSize: "0.8rem", color: "var(--status-critical)" }}>
            {error}
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn btn-primary"
        onClick={onDownload}
        disabled={isGenerating}
      >
        {isGenerating ? <span className="spinner" /> : <DownloadIcon />}
        {isGenerating ? "Generating..." : "Download PDF Report"}
      </button>
    </div>
  );
}
