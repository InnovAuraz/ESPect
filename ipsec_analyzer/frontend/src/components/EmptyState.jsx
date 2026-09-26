import React from "react";

const h = React.createElement;

export default function EmptyState({ activeView = "overview" }) {
  const modules = [
    {
      code: "MOD-01 // DPI",
      title: "RFC 4303 ESP Dissection",
      desc: "Extracts SPIs, sequence numbers, and IKEv2 negotiation payloads without breaking tunnel integrity.",
      color: "var(--neon-cyan)"
    },
    {
      code: "MOD-02 // ML-SOC",
      title: "Encrypted Traffic Intelligence",
      desc: "Classifies behavioral flow entropy and identifies cleartext protocol leaks across endpoints.",
      color: "var(--neon-purple)"
    },
    {
      code: "MOD-03 // AUDIT",
      title: "Zero-Trust Risk Matrix",
      desc: "Scores cryptographic posture and compiles forensic PDF evidence reports.",
      color: "var(--emerald-400)"
    }
  ];

  return h(
    "div",
    {
      className: "card",
      style: {
        padding: "36px 28px",
        background: "radial-gradient(circle at 50% 0%, rgba(0, 229, 255, 0.06) 0%, rgba(10, 15, 22, 0.96) 70%)",
        border: "1px solid rgba(255, 255, 255, 0.07)",
        boxShadow: "inset 0 0 40px rgba(0,0,0,0.8)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        marginTop: "8px"
      }
    },

    // Subtle Cyber Grid Overlay
    h("div", {
      style: {
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(0, 229, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.03) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        pointerEvents: "none"
      }
    }),

    // Cyber-Vault Vector Lock Graphic (Replaces Emoji Lock)
    h(
      "div",
      {
        style: {
          position: "relative",
          width: "88px",
          height: "88px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "18px",
          borderRadius: "50%",
          background: "rgba(0, 229, 255, 0.05)",
          border: "1px solid rgba(0, 229, 255, 0.25)",
          boxShadow: "0 0 25px rgba(0, 229, 255, 0.15), inset 0 0 15px rgba(0, 229, 255, 0.1)"
        }
      },
      h(
        "svg",
        {
          viewBox: "0 0 64 64",
          style: { width: "46px", height: "46px", overflow: "visible" }
        },
        // Outer Pulsing Ring
        h(
          "circle",
          {
            cx: "32",
            cy: "32",
            r: "30",
            fill: "none",
            stroke: "var(--neon-cyan)",
            strokeWidth: "1",
            strokeDasharray: "6, 4",
            strokeOpacity: "0.5"
          },
          h("animateTransform", {
            attributeName: "transform",
            type: "rotate",
            from: "0 32 32",
            to: "360 32 32",
            dur: "18s",
            repeatCount: "indefinite"
          })
        ),
        // Padlock Shackle
        h("path", {
          d: "M22 28V20C22 14.477 26.477 10 32 10C37.523 10 42 14.477 42 20V28",
          fill: "none",
          stroke: "var(--neon-cyan)",
          strokeWidth: "3",
          strokeLinecap: "round",
          filter: "drop-shadow(0 0 6px var(--neon-cyan))"
        }),
        // Padlock Body
        h("rect", {
          x: "16",
          y: "28",
          width: "32",
          height: "24",
          rx: "5",
          fill: "#0d1520",
          stroke: "var(--emerald-400)",
          strokeWidth: "2",
          filter: "drop-shadow(0 0 10px rgba(0, 255, 163, 0.35))"
        }),
        // Keyhole Core
        h("circle", {
          cx: "32",
          cy: "38",
          r: "3",
          fill: "var(--emerald-400)"
        }),
        h("line", {
          x1: "32",
          y1: "41",
          x2: "32",
          y2: "46",
          stroke: "var(--emerald-400)",
          strokeWidth: "2.5",
          strokeLinecap: "round"
        })
      )
    ),

    // Status Pill
    h(
      "div",
      {
        style: {
          fontSize: "10px",
          fontFamily: "var(--font-mono)",
          color: "var(--neon-cyan)",
          letterSpacing: "2px",
          fontWeight: "700",
          background: "rgba(0, 229, 255, 0.08)",
          border: "1px solid rgba(0, 229, 255, 0.3)",
          padding: "4px 12px",
          borderRadius: "20px",
          marginBottom: "12px",
          boxShadow: "0 0 12px rgba(0, 229, 255, 0.15)"
        }
      },
      `TELEMETRY VAULT STANDBY // ${activeView.toUpperCase()}`
    ),

    h(
      "h3",
      {
        style: {
          color: "var(--text-primary)",
          fontSize: "20px",
          fontWeight: "800",
          margin: "0 0 8px 0",
          letterSpacing: "-0.3px"
        }
      },
      "Awaiting Packet Capture Ingestion"
    ),

    h(
      "p",
      {
        style: {
          color: "var(--text-secondary)",
          fontSize: "13px",
          maxWidth: "540px",
          margin: "0 0 28px 0",
          lineHeight: "1.6"
        }
      },
      "Load a .pcap or .pcapng evidence file above—or switch to Live Capture—to unlock real-time IPsec tunnel topology, SPI dissection, and threat scoring."
    ),

    // 3-Column Preview Modules
    h(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          width: "100%",
          position: "relative",
          zIndex: 1
        }
      },
      ...modules.map((m, idx) =>
        h(
          "div",
          {
            key: idx,
            style: {
              textAlign: "left",
              padding: "16px",
              background: "rgba(0, 0, 0, 0.45)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderLeft: `3px solid ${m.color}`,
              borderRadius: "8px",
              boxShadow: "inset 0 0 15px rgba(0,0,0,0.5)"
            }
          },
          h(
            "div",
            {
              style: {
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                color: m.color,
                letterSpacing: "1px",
                fontWeight: "700",
                marginBottom: "6px"
              }
            },
            m.code
          ),
          h(
            "div",
            {
              style: {
                fontSize: "14px",
                fontWeight: "800",
                color: "var(--text-primary)",
                marginBottom: "6px"
              }
            },
            m.title
          ),
          h(
            "div",
            {
              style: {
                fontSize: "12px",
                color: "var(--text-secondary)",
                lineHeight: "1.5"
              }
            },
            m.desc
          )
        )
      )
    )
  );
}