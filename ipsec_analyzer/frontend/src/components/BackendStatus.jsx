import React from "react";

const h = React.createElement;

export default function BackendStatus({ status, onRefresh, isChecking }) {
  const isOnline = status === "online";
  const isOffline = status === "offline";

  const label = isChecking
    ? "PROBING SOCKET..."
    : isOnline
    ? "BACKEND ONLINE"
    : isOffline
    ? "BACKEND OFFLINE"
    : "CHECKING BACKEND...";

  const stateColor = isChecking
    ? "var(--neon-orange)"
    : isOnline
    ? "var(--emerald-400)"
    : "var(--neon-red)";

  const stateGlow = isChecking
    ? "var(--shadow-glow-amber)"
    : isOnline
    ? "var(--shadow-glow-emerald)"
    : "var(--shadow-glow-red)";

  return h(
    "div",
    {
      className: "backend-status",
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: "14px",
        padding: "8px 14px",
        borderRadius: "8px",
        background: "rgba(10, 15, 22, 0.85)",
        border: "1px solid rgba(255, 255, 255, 0.07)",
        borderLeft: `3px solid ${stateColor}`,
        boxShadow: "inset 0 0 15px rgba(0, 0, 0, 0.6)"
      }
    },
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: "8px" } },
      h("span", {
        className: `status-dot ${status}`,
        style: {
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: stateColor,
          boxShadow: stateGlow,
          display: "inline-block"
        }
      }),
      h(
        "span",
        {
          style: {
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            fontWeight: "800",
            color: stateColor,
            letterSpacing: "1px",
            textShadow: stateGlow
          }
        },
        label
      )
    ),
    h(
      "button",
      {
        type: "button",
        className: "status-refresh",
        onClick: onRefresh,
        disabled: isChecking,
        style: {
          padding: "4px 10px",
          borderRadius: "4px",
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(0, 229, 255, 0.3)",
          color: "var(--neon-cyan)",
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          fontWeight: "700",
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          cursor: isChecking ? "wait" : "pointer",
          transition: "all 0.2s ease"
        }
      },
      isChecking ? "SYNCING..." : "↻ RECHECK"
    )
  );
}