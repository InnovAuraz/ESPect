import React, { useState, useEffect } from "react";

const h = React.createElement;

const PIPELINE_STAGES = [
  "STAGE 01/04 // Parsing libpcap frame headers & timestamps...",
  "STAGE 02/04 // Dissecting RFC 4303 ESP SPIs & IKEv2 payloads...",
  "STAGE 03/04 // Executing Neural Net traffic entropy classification...",
  "STAGE 04/04 // Compiling Zero-Trust Threat Matrix & posture score..."
];

export default function AnalysisLoading() {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIdx((prev) => (prev + 1) % PIPELINE_STAGES.length);
    }, 650);
    return () => clearInterval(timer);
  }, []);

  return h(
    "div",
    {
      className: "loading-overlay card",
      style: {
        position: "relative",
        padding: "36px 28px",
        background: "radial-gradient(circle at 50% 50%, rgba(0, 229, 255, 0.1) 0%, rgba(8, 12, 20, 0.98) 80%)",
        border: "1px solid rgba(0, 229, 255, 0.35)",
        borderRadius: "12px",
        boxShadow: "0 0 30px rgba(0, 229, 255, 0.12), inset 0 0 35px rgba(0, 0, 0, 0.85)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        overflow: "hidden",
        margin: "12px 0"
      }
    },

    // Cyber Grid Background
    h("div", {
      style: {
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(0, 229, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.04) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        pointerEvents: "none"
      }
    }),

    // Dual Counter-Rotating Vector Reactor Spinner
    h(
      "div",
      {
        style: {
          position: "relative",
          width: "84px",
          height: "84px",
          marginBottom: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      },
      h(
        "svg",
        {
          viewBox: "0 0 80 80",
          style: { width: "100%", height: "100%", overflow: "visible" }
        },
        // Outer Cyan Dashed Ring
        h(
          "circle",
          {
            cx: "40",
            cy: "40",
            r: "36",
            fill: "none",
            stroke: "var(--neon-cyan)",
            strokeWidth: "2",
            strokeDasharray: "14, 8",
            style: { filter: "drop-shadow(0 0 8px var(--neon-cyan))" }
          },
          h("animateTransform", {
            attributeName: "transform",
            type: "rotate",
            from: "0 40 40",
            to: "360 40 40",
            dur: "2.4s",
            repeatCount: "indefinite"
          })
        ),
        // Inner Purple Counter-Rotating Ring
        h(
          "circle",
          {
            cx: "40",
            cy: "40",
            r: "26",
            fill: "none",
            stroke: "var(--neon-purple)",
            strokeWidth: "2",
            strokeDasharray: "10, 10",
            style: { filter: "drop-shadow(0 0 8px var(--neon-purple))" }
          },
          h("animateTransform", {
            attributeName: "transform",
            type: "rotate",
            from: "360 40 40",
            to: "0 40 40",
            dur: "1.8s",
            repeatCount: "indefinite"
          })
        ),
        // Core Pulsing Dot
        h(
          "circle",
          {
            cx: "40",
            cy: "40",
            r: "6",
            fill: "var(--emerald-400)",
            style: { filter: "drop-shadow(0 0 10px var(--emerald-400))" }
          },
          h("animate", {
            attributeName: "r",
            values: "4;8;4",
            dur: "1.2s",
            repeatCount: "indefinite"
          })
        )
      )
    ),

    // Eyebrow Badge
    h(
      "div",
      {
        style: {
          fontSize: "10px",
          fontFamily: "var(--font-mono)",
          color: "var(--emerald-400)",
          letterSpacing: "2px",
          fontWeight: "800",
          marginBottom: "6px",
          textShadow: "var(--shadow-glow-emerald)"
        }
      },
      "● DEEP PACKET INSPECTION ENGINE ACTIVE"
    ),

    // Main Loading Text
    h(
      "div",
      {
        className: "loading-text",
        style: {
          fontSize: "18px",
          fontWeight: "800",
          color: "var(--text-primary)",
          marginBottom: "10px",
          letterSpacing: "-0.2px"
        }
      },
      "Analyzing PCAP Capture Stream…"
    ),

    // Cycling Forensic Stage Readout
    h(
      "div",
      {
        style: {
          fontSize: "12px",
          fontFamily: "var(--font-mono)",
          color: "var(--neon-cyan)",
          background: "rgba(0, 0, 0, 0.55)",
          border: "1px solid rgba(0, 229, 255, 0.25)",
          padding: "6px 16px",
          borderRadius: "6px",
          letterSpacing: "0.5px"
        }
      },
      PIPELINE_STAGES[stageIdx]
    )
  );
}