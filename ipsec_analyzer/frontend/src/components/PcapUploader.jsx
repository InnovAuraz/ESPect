import { useRef, useState } from "react";
import { formatBytes } from "../utils/format";

export default function PcapUploader({ selectedFile, onFileSelected, onClearFile, onAnalyze, isAnalyzing }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  }

  function handleDragOver(e) { e.preventDefault(); setDragOver(true); }
  function handleDragLeave() { setDragOver(false); }
  function handleClick() { inputRef.current?.click(); }
  function handleChange(e) { if (e.target.files?.[0]) onFileSelected(e.target.files[0]); }

  return (
    <div
      className={`upload-zone ${dragOver ? "drag-over" : ""}`}
      onClick={!selectedFile ? handleClick : undefined}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pcap,.pcapng"
        onChange={handleChange}
        style={{ display: "none" }}
      />

      {!selectedFile ? (
        <>
          <div className="upload-icon">📁</div>
          <div className="upload-title">Drop a PCAP file here, or click to browse</div>
          <div className="upload-hint">Supports .pcap and .pcapng files</div>
        </>
      ) : (
        <>
          <div className="upload-icon">📄</div>
          <div className="upload-title">Ready to analyze</div>
          <div className="upload-file-info">
            <span className="file-badge">
              {selectedFile.name}
              <span className="file-size">{formatBytes(selectedFile.size)}</span>
            </span>
            <button className="btn-analyze" onClick={onAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? "Analyzing…" : "Analyze"}
            </button>
            <button className="btn-clear" onClick={onClearFile}>Clear</button>
          </div>
        </>
      )}
    </div>
  );
}
