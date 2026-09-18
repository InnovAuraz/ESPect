export default function ReportButton({ onDownload, isGenerating, error }) {
  return (
    <>
      <button className="btn-report" onClick={onDownload} disabled={isGenerating}>
        📄 {isGenerating ? "Generating Report…" : "Download PDF Report"}
      </button>
      {error && <span style={{ color: "var(--rose-400)", fontSize: 13 }}>{error}</span>}
    </>
  );
}
