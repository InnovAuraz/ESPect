import React from 'react';

const h = React.createElement;

export default function SecurityGauge({ security }) {
  if (!security) return null;

  const { score = 0, status = "UNKNOWN", findings = [] } = security;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;

  const color =
    status === "SECURE"
      ? "var(--emerald-400)"
      : status === "WARNING"
      ? "var(--neon-orange)"
      : "var(--neon-red)";

  const statusLabel =
    status === "SECURE"
      ? "SECURE"
      : status === "WARNING"
      ? "WARNING"
      : "CRITICAL";

  const badgeClass =
    status === "SECURE"
      ? "secure"
      : status === "WARNING"
      ? "warning"
      : "critical";

  const highCount = findings.filter(f => f.severity === "HIGH").length;
  const medCount = findings.filter(f => f.severity === "MEDIUM").length;
  const lowCount = findings.filter(f => f.severity === "LOW" || f.severity === "INFO").length;

  return h(
    'div',
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
      'div',
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
        'div',
        { style: { display: "flex", alignItems: "center", gap: "12px" } },
        // Vector Shield Icon (Replaces Shield Emoji)
        h(
          'div',
          {
            style: {
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "rgba(0,0,0,0.45)",
              border: `1px solid ${color}50`,
              boxShadow: `0 0 12px ${color}25`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }
          },
          h(
            'svg',
            { viewBox: "0 0 24 24", style: { width: "18px", height: "18px" } },
            h('path', {
              d: "M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z",
              fill: "none",
              stroke: color,
              strokeWidth: "2",
              strokeLinejoin: "round"
            }),
            h('path', {
              d: "M9 12L11 14L15 10",
              fill: "none",
              stroke: color,
              strokeWidth: "2",
              strokeLinecap: "round",
              strokeLinejoin: "round"
            })
          )
        ),
        h(
          'div',
          null,
          h(
            'div',
            {
              style: {
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
                color: "var(--neon-cyan)",
                letterSpacing: "1.5px",
                fontWeight: "700"
              }
            },
            "POSTURE RATING // ZERO-TRUST"
          ),
          h(
            'div',
            {
              className: "card-title",
              style: {
                fontSize: "16px",
                fontWeight: "800",
                color: "var(--text-primary)",
                marginTop: "2px"
              }
            },
            "Security Assessment"
          )
        )
      ),

      h(
        'span',
        {
          className: `card-badge ${badgeClass}`,
          style: {
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            fontWeight: "800",
            letterSpacing: "1px",
            color: color,
            background: "rgba(0,0,0,0.5)",
            border: `1px solid ${color}50`,
            padding: "4px 10px",
            borderRadius: "20px",
            boxShadow: `0 0 12px ${color}25`
          }
        },
        `● ${statusLabel}`
      )
    ),

    // 2. CARD BODY: REACTOR GAUGE + BREAKDOWN
    h(
      'div',
      {
        className: "card-body",
        style: {
          padding: "22px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "18px",
          flexGrow: 1
        }
      },

      // Reactor Ring Container
      h(
        'div',
        {
          className: "security-gauge",
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%"
          }
        },
        h(
          'div',
          {
            className: "gauge-ring",
            style: {
              position: "relative",
              width: "165px",
              height: "165px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }
          },
          h(
            'svg',
            {
              viewBox: "0 0 140 140",
              style: { width: "100%", height: "100%", overflow: "visible" }
            },
            // Outer Rotating Dashed Telemetry Ring
            h(
              'circle',
              {
                cx: "70",
                cy: "70",
                r: "64",
                fill: "none",
                stroke: "rgba(0, 229, 255, 0.22)",
                strokeWidth: "1",
                strokeDasharray: "4, 6"
              },
              h('animateTransform', {
                attributeName: "transform",
                type: "rotate",
                from: "0 70 70",
                to: "360 70 70",
                dur: "24s",
                repeatCount: "indefinite"
              })
            ),
            // Inner Background Track
            h('circle', {
              className: "gauge-track",
              cx: "70",
              cy: "70",
              r: "52",
              fill: "rgba(0,0,0,0.4)",
              stroke: "rgba(255,255,255,0.08)",
              strokeWidth: "8"
            }),
            // Glowing Score Arc
            h('circle', {
              className: "gauge-fill",
              cx: "70",
              cy: "70",
              r: "52",
              fill: "none",
              stroke: color,
              strokeWidth: "8",
              strokeLinecap: "round",
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              transform: "rotate(-90 70 70)",
              style: {
                filter: `drop-shadow(0 0 8px ${color})`,
                transition: "stroke-dashoffset 0.8s ease"
              }
            })
          ),

          // Center Score Readout
          h(
            'div',
            {
              className: "gauge-score",
              style: {
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center"
              }
            },
            h(
              'span',
              {
                className: "gauge-score-number",
                style: {
                  fontSize: "38px",
                  fontWeight: "900",
                  fontFamily: "var(--font-mono)",
                  color: color,
                  textShadow: `0 0 18px ${color}60`,
                  lineHeight: "1"
                }
              },
              score
            ),
            h(
              'span',
              {
                className: "gauge-score-label",
                style: {
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                  letterSpacing: "1px",
                  marginTop: "4px"
                }
              },
              "SCORE / 100"
            )
          )
        ),

        h(
          'div',
          {
            className: "gauge-status",
            style: {
              marginTop: "12px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              fontWeight: "700",
              color: color,
              textShadow: `0 0 10px ${color}60`,
              letterSpacing: "0.5px"
            }
          },
          `${findings.length} security finding${findings.length !== 1 ? "s" : ""} flagged`
        )
      ),

      // Bottom 3-Column Mini Severity Strip
      h(
        'div',
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
            width: "100%",
            paddingTop: "12px",
            borderTop: "1px solid rgba(255,255,255,0.06)"
          }
        },
        h(
          'div',
          {
            style: {
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255, 51, 102, 0.2)",
              borderRadius: "6px",
              padding: "8px",
              textAlign: "center"
            }
          },
          h(
            'div',
            {
              style: {
                fontSize: "16px",
                fontFamily: "var(--font-mono)",
                fontWeight: "800",
                color: "var(--neon-red)"
              }
            },
            highCount
          ),
          h(
            'div',
            {
              style: {
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)"
              }
            },
            "HIGH"
          )
        ),
        h(
          'div',
          {
            style: {
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255, 170, 0, 0.2)",
              borderRadius: "6px",
              padding: "8px",
              textAlign: "center"
            }
          },
          h(
            'div',
            {
              style: {
                fontSize: "16px",
                fontFamily: "var(--font-mono)",
                fontWeight: "800",
                color: "var(--neon-orange)"
              }
            },
            medCount
          ),
          h(
            'div',
            {
              style: {
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)"
              }
            },
            "MED"
          )
        ),
        h(
          'div',
          {
            style: {
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(0, 255, 163, 0.2)",
              borderRadius: "6px",
              padding: "8px",
              textAlign: "center"
            }
          },
          h(
            'div',
            {
              style: {
                fontSize: "16px",
                fontFamily: "var(--font-mono)",
                fontWeight: "800",
                color: "var(--emerald-400)"
              }
            },
            lowCount
          ),
          h(
            'div',
            {
              style: {
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)"
              }
            },
            "LOW/INFO"
          )
        )
      )
    )
  );
}