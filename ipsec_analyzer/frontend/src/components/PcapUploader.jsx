import { useRef, useState } from "react";
import { UploadIcon } from "./Icons";

const ACCEPTED_EXTENSIONS = [".pcap", ".pcapng"];

function hasAcceptedExtension(filename) {
  const lower = filename.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export default function PcapUploader({
  selectedFile,
  onFileSelected,
  onClearFile,
  onAnalyze,
  isAnalyzing,
}) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState(null);

  function handleFiles(fileList) {
    const file = fileList?.[0];
    if (!file) return;

    if (!hasAcceptedExtension(file.name)) {
      setValidationError(
        "Unsupported file type. Please choose a .pcap or .pcapng file."
      );
      return;
    }

    setValidationError(null);
    onFileSelected(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    handleFiles(event.dataTransfer.files);
  }

  return (
    <div className="panel">
      <div className="panel-title">PCAP Upload</div>

      <label
        className={`uploader-drop${dragActive ? " drag-active" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <div className="uploader-icon">
          <UploadIcon />
        </div>
        <div className="uploader-primary">
          Drop PCAP file here, or{" "}
          <strong style={{ color: "var(--accent)" }}>choose a file</strong>
        </div>
        <div className="uploader-secondary">.pcap / .pcapng</div>
        <input
          ref={inputRef}
          type="file"
          accept=".pcap,.pcapng"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </label>

      {validationError && (
        <div style={{ marginTop: 10, fontSize: "0.8rem", color: "var(--status-critical)" }}>
          {validationError}
        </div>
      )}

      {selectedFile && (
        <div className="uploader-selected">
          <span className="uploader-selected-name">{selectedFile.name}</span>
          <button
            type="button"
            className="uploader-clear"
            title="Remove file"
            onClick={() => {
              onClearFile();
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            &times;
          </button>
        </div>
      )}

      <div className="uploader-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!selectedFile || isAnalyzing}
          onClick={onAnalyze}
        >
          {isAnalyzing && <span className="spinner" />}
          {isAnalyzing ? "Analyzing..." : "Analyze PCAP"}
        </button>
      </div>
    </div>
  );
}
