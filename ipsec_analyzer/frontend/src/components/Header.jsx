import React from "react";

const h = React.createElement;

export default function Header({ status, onRefresh, isChecking }) {
  const label = isChecking
    ? "SYNCING SOCKET…"
    : status === "online"
    ? "ONLINE"
    : "OFFLINE";

  const dotClass = isChecking
    ? "checking"
    : status === "online"
    ? "online"
    : "offline";

  const statusColor = isChecking
    ? "var(--neon-orange)"
    : status === "online"
    ? "var(--emerald-400)"
    : "var(--neon-red)";

  const statusGlow = isChecking
    ? "var(--shadow-glow-amber)"
    : status === "online"
    ? "var(--shadow-glow-emerald)"
    : "var(--shadow-glow-red)";

  return h(
    "header",
    {
      className: "header",
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 20px",
        background: "rgba(10, 15, 22, 0.85)",
        border: "1px solid rgba(255, 255, 255, 0.07)",
        borderRadius: "10px",
        boxShadow: "inset 0 0 25px rgba(0, 0, 0, 0.65)",
        marginBottom: "8px",
        flexWrap: "wrap",
        gap: "12px"
      }
    },

    // Left Brand & Telemetry Tag
    h(
      "div",
      {
        className: "header-brand",
        style: { display: "flex", alignItems: "center", gap: "14px" }
      },
      h(
        "div",
        {
          className: "header-logo",
          style: {
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, var(--emerald-400), var(--neon-cyan))",
            color: "#04120c",
            fontWeight: "900",
            fontSize: "18px",
            fontFamily: "var(--font-mono)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 18px rgba(0, 229, 255, 0.35)"
          }
        },
        "E"
      ),
      h(
        "div",
        null,
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "10px" } },
          h(
            "span",
            {
              className: "header-title",
              style: {
                fontSize: "18px",
                fontWeight: "800",
                color: "var(--text-primary)",
                letterSpacing: "-0.3px"
              }
            },
            "ESPect"
          ),
          h(
            "span",
            {
              style: {
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
                color: "var(--neon-cyan)",
                background: "rgba(0, 229, 255, 0.08)",
                border: "1px solid rgba(0, 229, 255, 0.3)",
                padding: "2px 8px",
                borderRadius: "4px",
                letterSpacing: "1px",
                fontWeight: "700"
              }
            },
            "RFC 4303 // DPI"
          )
        ),
        h(
          "div",
          {
            className: "header-subtitle",
            style: {
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              letterSpacing: "1.5px",
              fontWeight: "700",
              marginTop: "2px"
            }
          },
          "IPSEC PROTOCOL ANALYZER"
        )
      )
    ),

    // Right Socket Status Button
    h(
      "button",
      {
        type: "button",
        className: "header-status",
        onClick: onRefresh,
        title: "Click to refresh backend health status",
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          padding: "8px 16px",
          borderRadius: "20px",
          background: "rgba(0, 0, 0, 0.55)",
          border: `1px solid ${statusColor}50`,
          color: statusColor,
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          fontWeight: "800",
          letterSpacing: "1.2px",
          cursor: "pointer",
          boxShadow: `0 0 15px ${statusColor}20`,
          transition: "all 0.2s ease"
        }
      },
      h("span", {
        className: `status-dot ${dotClass}`,
        style: {
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: statusColor,
          boxShadow: statusGlow,
          display: "inline-block"
        }
      }),
      h("span", null, label),
      h(
        "span",
        {
          style: {
            fontSize: "11px",
            color: "var(--text-muted)",
            marginLeft: "2px"
          }
        },
        "↻"
      )
    )
  );
}