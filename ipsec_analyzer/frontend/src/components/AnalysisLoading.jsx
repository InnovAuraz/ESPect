const STEPS = [
  "Detecting IPsec protocol",
  "Extracting traffic characteristics",
  "Classifying encrypted traffic",
  "Assessing security",
];

export default function AnalysisLoading() {
  return (
    <div className="analysis-loading">
      <div className="analysis-loading-title">
        <span className="spinner" />
        Analyzing PCAP...
      </div>
      {STEPS.map((step) => (
        <div className="analysis-loading-step" key={step}>
          {step}
        </div>
      ))}
    </div>
  );
}
