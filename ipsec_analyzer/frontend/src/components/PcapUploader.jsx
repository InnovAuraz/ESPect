import React, { useRef, useState } from "react";

const h = React.createElement;

export default function PcapUploader({
  selectedFile,
  onFileSelected,
  onClearFile,
  onAnalyze,
  isAnalyzing,
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  }

  function formatSize(bytes) {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb > 1024) {
      return `${(kb / 1024).toFixed(2)} MB`;
    }
    return `${kb.toFixed(1)} KB`;
  }

  return h(
    "div",
    {
      className: "card",
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      onClick: () => {
        if (!selectedFile && fileInputRef.current) {
          fileInputRef.current.click();
        }
      },
      style: {
        position: "relative",
        padding: selectedFile ? "22px 28px" : "36px 24px",
        background: isDragging
          ? "radial-gradient(circle at 50% 50%, rgba(0, 229, 255, 0.14) 0%, rgba(10, 15, 24, 0.96) 100%)"
          : "radial-gradient(circle at 50% 50%, rgba(16, 24, 39, 0.85) 0%, rgba(8, 12, 18, 0.96) 100%)",
        border: selectedFile
          ? "1px solid rgba(0, 255, 163, 0.4)"
          : isDragging
          ? "1.5px dashed var(--neon-cyan)"
          : "1px dashed rgba(0, 229, 255, 0.35)",
        borderRadius: "12px",
        boxShadow: selectedFile
          ? "0 0 25px rgba(0, 255, 163, 0.1), inset 0 0 25px rgba(0, 255, 163, 0.05)"
          : "inset 0 0 30px rgba(0, 0, 0, 0.75)",
        cursor: selectedFile ? "default" : "pointer",
        transition: "all 0.25s ease",
        overflow: "hidden"
      }
    },

    // Hidden File Input
    h("input", {
      ref: fileInputRef,
      type: "file",
      accept: ".pcap,.pcapng,.cap",
      onChange: handleFileChange,
      style: { display: "none" }
    }),

    // Cyber Grid Background
    h("div", {
      style: {
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(0, 229, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.03) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
        pointerEvents: "none"
      }
    }),

    // HUD Corner Labels
    h(
      "div",
      {
        style: {
          position: "absolute",
          top: "10px",
          left: "16px",
          fontSize: "10px",
          fontFamily: "var(--font-mono)",
          color: "var(--text-muted)",
          letterSpacing: "1px"
        }
      },
      "INGESTION BAY // PCAP-ACQ-01"
    ),
    h(
      "div",
      {
        style: {
          position: "absolute",
          top: "10px",
          right: "16px",
          fontSize: "10px",
          fontFamily: "var(--font-mono)",
          color: selectedFile ? "var(--emerald-400)" : "var(--neon-cyan)",
          letterSpacing: "1px"
        }
      },
      selectedFile ? "● EVIDENCE LOCKED" : "● READY FOR STREAM"
    ),

    !selectedFile
      ? // EMPTY DROPZONE VIEW (Replaces Yellow Folder Emoji)
        h(
          "div",
          {
            style: {
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center"
            }
          },
          h(
            "div",
            {
              style: {
                width: "68px",
                height: "68px",
                borderRadius: "16px",
                background: "rgba(0, 229, 255, 0.08)",
                border: "1px solid rgba(0, 229, 255, 0.35)",
                boxShadow: "0 0 20px rgba(0, 229, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px"
              }
            },
            h(
              "svg",
              { viewBox: "0 0 48 48", style: { width: "34px", height: "34px" } },
              h("path", {
                d: "M24 32V14M24 14L17 21M24 14L31 21",
                fill: "none",
                stroke: "var(--neon-cyan)",
                strokeWidth: "3",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                filter: "drop-shadow(0 0 6px var(--neon-cyan))"
              }),
              h("path", {
                d: "M10 30V36C10 37.1046 10.8954 38 12 38H36C37.1046 38 38 37.1046 38 36V30",
                fill: "none",
                stroke: "var(--emerald-400)",
                strokeWidth: "2.5",
                strokeLinecap: "round"
              })
            )
          ),
          h(
            "div",
            {
              style: {
                fontSize: "18px",
                fontWeight: "800",
                color: "var(--text-primary)",
                marginBottom: "6px"
              }
            },
            "Drop a PCAP evidence file here, or click to browse"
          ),
          h(
            "div",
            {
              style: {
                fontSize: "13px",
                color: "var(--text-secondary)",
                marginBottom: "16px"
              }
            },
            "Supports .pcap and .pcapng packet capture archives for deep IPsec/ESP inspection"
          ),
          h(
            "div",
            {
              style: {
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                justifyContent: "center"
              }
            },
            ...["PCAP / PCAPNG", "IKEv2 / ISAKMP", "ESP IPPROTO-50", "SHA-256 EVIDENCE"].map(
              (tag, i) =>
                h(
                  "span",
                  {
                    key: i,
                    style: {
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--neon-cyan)",
                      background: "rgba(0, 229, 255, 0.06)",
                      border: "1px solid rgba(0, 229, 255, 0.25)",
                      padding: "3px 10px",
                      borderRadius: "4px",
                      letterSpacing: "0.8px"
                    }
                  },
                  tag
                )
            )
          )
        )
      : // LOADED EVIDENCE CARTRIDGE VIEW
        h(
          "div",
          {
            style: {
              position: "relative",
              zIndex: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
              marginTop: "10px"
            }
          },
          h(
            "div",
            { style: { display: "flex", alignItems: "center", gap: "16px" } },
            h(
              "div",
              {
                style: {
                  width: "48px",
                  height: "48px",
                  borderRadius: "10px",
                  background: "rgba(0, 255, 163, 0.1)",
                  border: "1px solid var(--emerald-400)",
                  boxShadow: "var(--shadow-glow-emerald)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontWeight: "800",
                  fontSize: "12px",
                  color: "var(--emerald-400)"
                }
              },
              "PCAP"
            ),
            h(
              "div",
              null,
              h(
                "div",
                {
                  style: {
                    fontSize: "10px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--emerald-400)",
                    letterSpacing: "1.5px",
                    fontWeight: "700",
                    marginBottom: "2px"
                  }
                },
                "EVIDENCE CARTRIDGE MOUNTED"
              ),
              h(
                "div",
                {
                  style: {
                    fontSize: "16px",
                    fontWeight: "800",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)"
                  }
                },
                selectedFile.name
              ),
              h(
                "div",
                {
                  style: {
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    marginTop: "2px"
                  }
                },
                `Size: ${formatSize(selectedFile.size)} • Ready for DPI & ML Inference`
              )
            )
          ),

          h(
            "div",
            { style: { display: "flex", alignItems: "center", gap: "12px" } },
            h(
              "button",
              {
                type: "button",
                onClick: (e) => {
                  e.stopPropagation();
                  onClearFile();
                },
                disabled: isAnalyzing,
                style: {
                  padding: "10px 16px",
                  borderRadius: "6px",
                  background: "rgba(255, 51, 102, 0.1)",
                  border: "1px solid rgba(255, 51, 102, 0.4)",
                  color: "var(--neon-red)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: isAnalyzing ? "not-allowed" : "pointer",
                  letterSpacing: "0.8px"
                }
              },
              "EJECT FILE"
            ),
            h(
              "button",
              {
                type: "button",
                onClick: (e) => {
                  e.stopPropagation();
                  onAnalyze();
                },
                disabled: isAnalyzing,
                style: {
                  padding: "10px 22px",
                  borderRadius: "6px",
                  background: "var(--emerald-400)",
                  border: "1px solid var(--emerald-400)",
                  color: "#04110b",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  fontWeight: "800",
                  cursor: isAnalyzing ? "not-allowed" : "pointer",
                  boxShadow: "var(--shadow-glow-emerald)",
                  letterSpacing: "1px"
                }
              },
              isAnalyzing ? "ANALYZING STREAM..." : "⚡ RUN DEEP INSPECTION"
            )
          )
        )
  );
}