export default function AnalysisLoading() {
  return (
    <div className="loading-overlay">
      <div className="loading-spinner" />
      <div className="loading-text">Analyzing PCAP capture…</div>
    </div>
  );
}
