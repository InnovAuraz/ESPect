import React from 'react';

const h = React.createElement;

export default function ReportButton({ onDownload, isGenerating, error }) {
  const pills = [
    "✓ RFC 4303 ESP DISSECTION",
    "✓ ML TRAFFIC ENTROPY",
    "✓ ZERO-TRUST RISK MATRIX"
  ];

  return h(
    'div',
    {
      style: {
        marginTop: "16px",
        padding: "28px 32px",
        background: "radial-gradient(circle at 85% 50%, rgba(187, 134, 252, 0.12) 0%, rgba(10, 15, 22, 0.96) 75%)",
        border: "1px solid rgba(187, 134, 252, 0.3)",
        borderRadius: "12px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5), inset 0 0 25px rgba(187, 134, 252, 0.06)"
      }
    },

    // Left Neon Accent Bar
    h('div', {
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "4px",
        height: "100%",
        background: "var(--neon-purple)",
        boxShadow: "0 0 15px var(--neon-purple)"
      }
    }),

    // Cyber Grid Overlay
    h('div', {
      style: {
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(187, 134, 252, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(187, 134, 252, 0.03) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        pointerEvents: "none"
      }
    }),

    // Background Tech Watermark
    h(
      'div',
      {
        style: {
          position: "absolute",
          right: "-10px",
          top: "-25px",
          fontSize: "9rem",
          fontWeight: "900",
          color: "var(--neon-purple)",
          opacity: 0.035,
          fontFamily: "var(--font-mono)",
          userSelect: "none",
          pointerEvents: "none",
          zIndex: 0
        }
      },
      "PDF"
    ),

    // Main Content Row
    h(
      'div',
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
          position: "relative",
          zIndex: 1
        }
      },
      h(
        'div',
        null,
        h(
          'div',
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "6px"
            }
          },
          h('span', {
            style: {
              display: "inline-block",
              width: "8px",
              height: "8px",
              background: "var(--neon-purple)",
              borderRadius: "50%",
              boxShadow: "0 0 8px var(--neon-purple)"
            }
          }),
          h(
            'span',
            {
              style: {
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                color: "var(--neon-purple)",
                letterSpacing: "2px",
                fontWeight: "700"
              }
            },
            "FORENSIC DOSSIER COMPILER // SIH-2026"
          )
        ),

        h(
          'h3',
          {
            style: {
              margin: "0 0 8px 0",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              fontSize: "22px",
              fontWeight: "800",
              letterSpacing: "1px",
              textTransform: "uppercase"
            }
          },
          "Executive Intelligence Brief"
        ),

        h(
          'p',
          {
            style: {
              margin: "0 0 14px 0",
              color: "var(--text-secondary)",
              fontSize: "13px"
            }
          },
          "Generate a cryptographically signed PDF evidence report containing full tunnel telemetry and security posture findings."
        ),

        // Included Modules Pills
        h(
          'div',
          { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
          ...pills.map((pill, i) =>
            h(
              'span',
              {
                key: i,
                style: {
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-secondary)",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "3px 10px",
                  borderRadius: "4px",
                  letterSpacing: "0.5px"
                }
              },
              pill
            )
          )
        )
      ),

      // Action Button
      h(
        'button',
        {
          type: "button",
          onClick: onDownload,
          disabled: isGenerating,
          style: {
            background: isGenerating
              ? "rgba(0,0,0,0.6)"
              : "rgba(187, 134, 252, 0.14)",
            border: "1.5px solid var(--neon-purple)",
            color: "#e9d5ff",
            padding: "16px 28px",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            fontWeight: "800",
            letterSpacing: "1.5px",
            cursor: isGenerating ? "wait" : "pointer",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            boxShadow: isGenerating ? "none" : "var(--shadow-glow-purple)",
            transition: "all 0.2s ease-in-out",
            borderRadius: "8px"
          },
          onMouseOver: (e) => {
            if (!isGenerating) {
              e.currentTarget.style.background = "var(--neon-purple)";
              e.currentTarget.style.color = "#090514";
              e.currentTarget.style.transform = "translateY(-2px)";
            }
          },
          onMouseOut: (e) => {
            if (!isGenerating) {
              e.currentTarget.style.background = "rgba(187, 134, 252, 0.14)";
              e.currentTarget.style.color = "#e9d5ff";
              e.currentTarget.style.transform = "translateY(0)";
            }
          }
        },
        isGenerating
          ? h(
              React.Fragment,
              null,
              h('span', {
                className: "mini-spinner",
                style: {
                  borderColor: "var(--neon-purple)",
                  borderRightColor: "transparent"
                }
              }),
              "COMPILING DOSSIER..."
            )
          : h(
              React.Fragment,
              null,
              h(
                'svg',
                { viewBox: "0 0 24 24", style: { width: "18px", height: "18px" } },
                h('path', {
                  d: "M12 4V16M12 16L7 11M12 16L17 11M4 20H20",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2.5",
                  strokeLinecap: "round",
                  strokeLinejoin: "round"
                })
              ),
              "EXTRACT SECURE PDF"
            )
      )
    ),

    // Error Banner (if any)
    error
      ? h(
          'div',
          {
            className: "error-banner",
            style: { marginTop: "16px", marginBottom: "0", position: "relative", zIndex: 1 }
          },
          `[SYSTEM ERROR]: ${error}`
        )
      : null
  );
}