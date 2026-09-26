import React from "react";

const h = React.createElement;

export default function ErrorBanner({ message }) {
  if (!message) return null;

  return h(
    "div",
    {
      className: "error-banner",
      style: {
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: "16px 20px",
        borderRadius: "10px",
        background: "radial-gradient(circle at 0% 50%, rgba(255, 51, 102, 0.16) 0%, rgba(12, 10, 16, 0.96) 75%)",
        border: "1px solid rgba(255, 51, 102, 0.4)",
        borderLeft: "4px solid var(--neon-red)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(255, 51, 102, 0.08)",
        overflow: "hidden",
        margin: "8px 0"
      }
    },

    // Left Icon + Diagnostic Copy
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: "14px" } },
      h(
        "div",
        {
          style: {
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "rgba(255, 51, 102, 0.12)",
            border: "1px solid rgba(255, 51, 102, 0.45)",
            boxShadow: "var(--shadow-glow-red)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }
        },
        h(
          "svg",
          { viewBox: "0 0 24 24", style: { width: "18px", height: "18px" } },
          h("path", {
            d: "M12 3L2 20H22L12 3Z",
            fill: "none",
            stroke: "var(--neon-red)",
            strokeWidth: "2",
            strokeLinejoin: "round"
          }),
          h("line", {
            x1: "12",
            y1: "10",
            x2: "12",
            y2: "14",
            stroke: "var(--neon-red)",
            strokeWidth: "2",
            strokeLinecap: "round"
          }),
          h("circle", {
            cx: "12",
            cy: "17",
            r: "1",
            fill: "var(--neon-red)"
          })
        )
      ),
      h(
        "div",
        null,
        h(
          "div",
          {
            style: {
              fontSize: "9px",
              fontFamily: "var(--font-mono)",
              color: "var(--neon-red)",
              letterSpacing: "1.5px",
              fontWeight: "800",
              marginBottom: "2px"
            }
          },
          "CRITICAL EXCEPTION // ENGINE FAULT"
        ),
        h(
          "div",
          {
            style: {
              fontSize: "13px",
              fontFamily: "var(--font-mono)",
              color: "var(--text-primary)",
              fontWeight: "600"
            }
          },
          message
        )
      )
    ),

    // Right Fault Code Badge
    h(
      "span",
      {
        style: {
          fontSize: "10px",
          fontFamily: "var(--font-mono)",
          fontWeight: "800",
          color: "var(--neon-red)",
          background: "rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(255, 51, 102, 0.35)",
          padding: "4px 10px",
          borderRadius: "4px",
          letterSpacing: "1px",
          flexShrink: 0
        }
      },
      "ERR_PIPELINE"
    )
  );
}