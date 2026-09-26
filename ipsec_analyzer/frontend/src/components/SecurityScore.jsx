import React from "react";

const h = React.createElement;

const STATUS_COPY = {
  SECURE: "No significant issues were found in this capture. Tunnel encapsulation and key exchange parameters meet zero-trust baselines.",
  WARNING: "Some configuration details could not be fully verified. Review IKE negotiation visibility or auxiliary cleartext flows.",
  CRITICAL: "Significant security issues were detected. Unencrypted payload streams or cryptographic weaknesses require immediate remediation.",
};

export default function SecurityScore({ security }) {
  if (!security) return null;

  const score = Math.min(Math.max(security.score ?? 0, 0), 100);
  const status = security.status || "WARNING";

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const strokeColor =
    status === "SECURE"
      ? "var(--emerald-400)"
      : status === "CRITICAL"
      ? "var(--neon-red)"
      : "var(--neon-orange)";

  const badgeClass =
    status === "SECURE"
      ? "secure"
      : status === "CRITICAL"
      ? "critical"
      : "warning";

  return h(
    "div",
    {
      className: "card",
      style: {
        border: "1px solid rgba(0, 229, 255, 0.2)",
        boxShadow: "inset 0 0 30px rgba(0,0,0,0.65)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden"
      }
    },

    // 1. CARD HEADER
    h(
      "div",
      {
        className: "card-header",
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "18px 22px",
          background: "rgba(13, 19, 29, 0.9)",
          borderBottom: "1px solid rgba(255,255,255,0.06)"
        }
      },
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "12px" } },
        h(
          "div",
          {
            style: {
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "rgba(0,0,0,0.45)",
              border: `1px solid ${strokeColor}50`,
              boxShadow: `0 0 12px ${strokeColor}25`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }
          },
          h(
            "svg",
            { viewBox: "0 0 24 24", style: { width: "18px", height: "18px" } },
            h("path", {
              d: "M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z",
              fill: "none",
              stroke: strokeColor,
              strokeWidth: "2",
              strokeLinejoin: "round"
            }),
            h("circle", {
              cx: "12",
              cy: "12",
              r: "2.5",
              fill: strokeColor
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
                color: "var(--neon-cyan)",
                letterSpacing: "1.5px",
                fontWeight: "700"
              }
            },
            "CRYPTOGRAPHIC POSTURE // AUDIT"
          ),
          h(
            "span",
            {
              className: "card-title",
              style: {
                fontSize: "16px",
                fontWeight: "800",
                color: "var(--text-primary)"
              }
            },
            "Security Score"
          )
        )
      ),

      h(
        "span",
        {
          className: `card-badge ${badgeClass}`,
          style: {
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            fontWeight: "800",
            letterSpacing: "1px",
            color: strokeColor,
            background: "rgba(0,0,0,0.45)",
            border: `1px solid ${strokeColor}50`,
            padding: "4px 10px",
            borderRadius: "20px",
            boxShadow: `0 0 10px ${strokeColor}25`
          }
        },
        `● ${status}`
      )
    ),

    // 2. CARD BODY
    h(
      "div",
      {
        className: "card-body",
        style: {
          display: "flex",
          alignItems: "center",
          gap: "24px",
          padding: "22px",
          flexWrap: "wrap"
        }
      },

      // Dual-Ring Score Gauge
      h(
        "div",
        {
          className: "score-ring-wrap",
          style: {
            position: "relative",
            width: "136px",
            height: "136px",
            flexShrink: 0,
            filter: `drop-shadow(0 0 12px ${strokeColor}35)`
          }
        },
        h(
          "svg",
          {
            width: "136",
            height: "136",
            viewBox: "0 0 136 136"
          },
          // Outer Rotating Dashed Ring
          h(
            "circle",
            {
              cx: "68",
              cy: "68",
              r: "62",
              fill: "none",
              stroke: "rgba(0, 229, 255, 0.2)",
              strokeWidth: "1",
              strokeDasharray: "4, 6"
            },
            h("animateTransform", {
              attributeName: "transform",
              type: "rotate",
              from: "0 68 68",
              to: "360 68 68",
              dur: "20s",
              repeatCount: "indefinite"
            })
          ),
          // Inner Track
          h("circle", {
            cx: "68",
            cy: "68",
            r: radius,
            fill: "rgba(0,0,0,0.4)",
            stroke: "rgba(255,255,255,0.07)",
            strokeWidth: "9"
          }),
          // Active Score Ring
          h("circle", {
            cx: "68",
            cy: "68",
            r: radius,
            fill: "none",
            stroke: strokeColor,
            strokeWidth: "9",
            strokeLinecap: "round",
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transform: "rotate(-90 68 68)",
            style: { transition: "stroke-dashoffset 0.6s ease" }
          })
        ),
        h(
          "div",
          {
            style: {
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center"
            }
          },
          h(
            "span",
            {
              style: {
                fontSize: "34px",
                fontWeight: "900",
                fontFamily: "var(--font-mono)",
                color: strokeColor,
                textShadow: `0 0 12px ${strokeColor}80`,
                lineHeight: "1"
              }
            },
            score
          ),
          h(
            "span",
            {
              style: {
                fontSize: "10px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                marginTop: "4px",
                letterSpacing: "1px"
              }
            },
            "/ 100"
          )
        )
      ),

      // Right-Side Telemetry Copy
      h(
        "div",
        {
          className: "score-copy",
          style: {
            flex: 1,
            minWidth: "180px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }
        },
        h(
          "div",
          {
            style: {
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              letterSpacing: "1px",
              fontWeight: "700"
            }
          },
          "POSTURE VERDICT"
        ),
        h(
          "p",
          {
            style: {
              color: "var(--text-secondary)",
              fontSize: "13px",
              margin: 0,
              lineHeight: "1.6"
            }
          },
          STATUS_COPY[status] || "Security status could not be classified."
        ),

        // Mini Progress Bar
        h(
          "div",
          { style: { marginTop: "4px" } },
          h(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                marginBottom: "4px"
              }
            },
            h("span", { style: { color: "var(--text-muted)" } }, "TUNNEL INTEGRITY INDEX"),
            h("span", { style: { color: strokeColor, fontWeight: "700" } }, `${score}%`)
          ),
          h(
            "div",
            {
              style: {
                width: "100%",
                height: "5px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: "3px",
                overflow: "hidden"
              }
            },
            h("div", {
              style: {
                width: `${score}%`,
                height: "100%",
                background: strokeColor,
                boxShadow: `0 0 8px ${strokeColor}`
              }
            })
          )
        )
      )
    )
  );
}