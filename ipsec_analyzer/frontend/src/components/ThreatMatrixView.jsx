import React from 'react';
import SecurityFindings from './SecurityFindings';

const h = React.createElement;

export default function ThreatMatrixView({ security }) {
  if (!security) return null;

  const { score = 0, status = "UNKNOWN", findings = [] } = security;

  // Mathematical logic for the SOC Dashboard (preserved intact)
  const defcon = score > 90 ? 5 : score > 75 ? 4 : score > 50 ? 3 : score > 25 ? 2 : 1;
  const globalColor = score > 90 ? "var(--emerald-400)" : score > 70 ? "var(--neon-orange)" : "var(--neon-red)";
  const globalGlow = score > 90 ? "var(--shadow-glow-emerald)" : score > 70 ? "var(--shadow-glow-amber)" : "var(--shadow-glow-red)";
  const sweepRgba = score > 90 ? "rgba(0, 255, 163, 0.32)" : score > 70 ? "rgba(255, 170, 0, 0.32)" : "rgba(255, 51, 102, 0.35)";

  const high = findings.filter(f => f.severity === 'HIGH').length;
  const med = findings.filter(f => f.severity === 'MEDIUM').length;
  const lowInfo = findings.filter(f => f.severity === 'LOW' || f.severity === 'INFO').length;
  const totalFindings = Math.max(findings.length, 1);

  const defconLevels = [
    { level: 5, label: "DEFCON 5", desc: "NOMINAL", color: "var(--emerald-400)" },
    { level: 4, label: "DEFCON 4", desc: "GUARDED", color: "var(--neon-cyan)" },
    { level: 3, label: "DEFCON 3", desc: "ELEVATED", color: "var(--neon-orange)" },
    { level: 2, label: "DEFCON 2", desc: "HIGH ALERT", color: "var(--neon-red)" },
    { level: 1, label: "DEFCON 1", desc: "CRITICAL", color: "var(--neon-red)" }
  ];

  const vectors = [
    {
      label: "PAYLOAD CONFIDENTIALITY",
      val: high === 0 ? "VERIFIED" : "COMPROMISED",
      sub: high === 0 ? "No cleartext leaks detected" : `${high} Critical exposure(s)`,
      color: high === 0 ? "var(--emerald-400)" : "var(--neon-red)"
    },
    {
      label: "TUNNEL POLICY & IKE",
      val: med === 0 ? "OPTIMAL" : "REVIEW REQ",
      sub: med === 0 ? "Negotiation parameters aligned" : `${med} Policy warning(s)`,
      color: med === 0 ? "var(--neon-cyan)" : "var(--neon-orange)"
    },
    {
      label: "TELEMETRY SIGNALS",
      val: `${findings.length} EVENTS`,
      sub: `${lowInfo} Informational observation(s)`,
      color: "var(--neon-purple)"
    },
    {
      label: "COMPLIANCE SCORE",
      val: `${score} / 100`,
      sub: `Posture: ${status}`,
      color: globalColor
    }
  ];

  return h(
    'div',
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        width: "100%",
        animation: "fadeInUp 0.5s ease"
      }
    },

    // 1. SEPARATED PAGE HEADER (Matches SystemInternals & ProtocolScanView)
    h(
      'div',
      { style: { paddingBottom: "8px", paddingTop: "12px" } },
      h(
        'div',
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "16px"
          }
        },
        h(
          'div',
          null,
          h(
            'div',
            {
              className: "eyebrow",
              style: {
                color: "var(--neon-cyan)",
                letterSpacing: "2px",
                fontSize: "11px",
                marginBottom: "8px",
                fontWeight: "700"
              }
            },
            "ZERO-TRUST CRYPTOGRAPHIC & ANOMALY AUDIT"
          ),
          h(
            'h1',
            {
              style: {
                color: "var(--text-primary)",
                fontSize: "2.5rem",
                fontWeight: "800",
                letterSpacing: "-1px",
                margin: 0,
                textShadow: "0 2px 10px rgba(0,0,0,0.5)"
              }
            },
            "Risk Findings & Threat Matrix"
          ),
          h(
            'p',
            {
              style: {
                color: "var(--text-secondary)",
                fontSize: "14px",
                marginTop: "8px",
                marginBottom: 0
              }
            },
            "Automated vulnerability heuristics, attack surface radar, and cryptographic posture scoring."
          )
        ),

        h(
          'div',
          { style: { textAlign: "right" } },
          h(
            'div',
            {
              style: {
                fontSize: "11px",
                color: "var(--text-muted)",
                letterSpacing: "1px",
                fontWeight: "700",
                marginBottom: "4px"
              }
            },
            "SECURITY INTEGRITY SCORE"
          ),
          h(
            'div',
            {
              style: {
                display: "flex",
                alignItems: "baseline",
                justifyContent: "flex-end",
                gap: "8px"
              }
            },
            h(
              'span',
              {
                style: {
                  fontSize: "28px",
                  fontWeight: "800",
                  color: globalColor,
                  fontFamily: "var(--font-mono)",
                  textShadow: globalGlow
                }
              },
              `${score}`
            ),
            h(
              'span',
              {
                style: {
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: "700"
                }
              },
              "/ 100"
            )
          )
        )
      )
    ),

    // Signature Glowing Divider
    h('hr', {
      style: {
        border: "none",
        height: "2px",
        background: "linear-gradient(90deg, var(--neon-cyan), var(--neon-purple), transparent)",
        opacity: 0.8,
        margin: "0 0 8px 0",
        boxShadow: "0 0 10px rgba(0, 229, 255, 0.4)"
      }
    }),

    // 2. FOUR-COLUMN VECTOR TELEMETRY STRIP
    h(
      'div',
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "20px"
        }
      },
      ...vectors.map((vec, idx) =>
        h(
          'div',
          {
            key: idx,
            className: "card",
            style: {
              padding: "18px 20px",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderLeft: `3px solid ${vec.color}`,
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }
          },
          h(
            'div',
            {
              style: {
                fontSize: "10px",
                color: "var(--text-muted)",
                letterSpacing: "1px",
                fontWeight: "700",
                fontFamily: "var(--font-mono)"
              }
            },
            vec.label
          ),
          h(
            'div',
            {
              style: {
                fontSize: "20px",
                fontWeight: "800",
                color: vec.color,
                fontFamily: "var(--font-mono)",
                marginTop: "8px",
                textShadow: `0 0 10px ${vec.color}50`
              }
            },
            vec.val
          ),
          h(
            'div',
            {
              style: {
                fontSize: "11px",
                color: "var(--text-secondary)",
                marginTop: "4px",
                fontFamily: "var(--font-mono)"
              }
            },
            vec.sub
          )
        )
      )
    ),

    // 3. TOP SOC DASHBOARD (DEFCON + ATTACK RADAR)
    h(
      'div',
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1.15fr 1fr",
          gap: "24px"
        }
      },

      // LEFT CARD: DEFCON & Integrity Stats
      h(
        'div',
        {
          className: "card",
          style: {
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
            border: `1px solid ${globalColor}40`,
            boxShadow: "inset 0 0 30px rgba(0,0,0,0.65)"
          }
        },
        // Left Glowing Bar
        h('div', {
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: "4px",
            height: "100%",
            background: globalColor,
            boxShadow: `0 0 15px ${globalColor}`
          }
        }),

        // Top Header & DEFCON Readout
        h(
          'div',
          null,
          h(
            'div',
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
                flexWrap: "wrap"
              }
            },
            h(
              'div',
              null,
              h(
                'div',
                {
                  style: {
                    fontSize: "11px",
                    color: "var(--neon-cyan)",
                    letterSpacing: "2px",
                    fontFamily: "var(--font-mono)",
                    marginBottom: "6px",
                    fontWeight: "700"
                  }
                },
                "GLOBAL THREAT POSTURE"
              ),
              h(
                'div',
                {
                  style: {
                    fontSize: "52px",
                    fontWeight: "900",
                    color: globalColor,
                    fontFamily: "var(--font-mono)",
                    textShadow: `0 0 22px ${globalColor}50`,
                    lineHeight: "1.05",
                    letterSpacing: "-1px"
                  }
                },
                `DEFCON ${defcon}`
              )
            ),

            h(
              'div',
              {
                style: {
                  padding: "6px 12px",
                  borderRadius: "6px",
                  background: "rgba(0,0,0,0.45)",
                  border: `1px solid ${globalColor}50`,
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: globalColor,
                  fontWeight: "800",
                  letterSpacing: "1px",
                  boxShadow: `0 0 12px ${globalColor}20`
                }
              },
              `STATUS // ${status}`
            )
          ),

          // 5-Stage DEFCON Tactical Readiness Bar
          h(
            'div',
            {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "8px",
                marginTop: "20px"
              }
            },
            ...defconLevels.map(d => {
              const isActive = d.level === defcon;
              return h(
                'div',
                {
                  key: d.level,
                  style: {
                    padding: "8px 6px",
                    borderRadius: "6px",
                    textAlign: "center",
                    background: isActive ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.3)",
                    border: isActive ? `1.5px solid ${d.color}` : "1px solid rgba(255,255,255,0.05)",
                    boxShadow: isActive ? `0 0 14px ${d.color}35` : "none",
                    opacity: isActive ? 1 : 0.45,
                    transition: "all 0.3s ease"
                  }
                },
                h(
                  'div',
                  {
                    style: {
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: "800",
                      color: isActive ? d.color : "var(--text-secondary)"
                    }
                  },
                  d.label
                ),
                h(
                  'div',
                  {
                    style: {
                      fontSize: "8px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                      letterSpacing: "0.5px",
                      marginTop: "2px"
                    }
                  },
                  d.desc
                )
              );
            })
          ),

          // Cryptographic Integrity Meter
          h(
            'div',
            { style: { marginTop: "20px" } },
            h(
              'div',
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  marginBottom: "6px"
                }
              },
              h('span', { style: { color: "var(--text-muted)", letterSpacing: "1px" } }, "CRYPTOGRAPHIC EVIDENCE INTEGRITY"),
              h('span', { style: { color: globalColor, fontWeight: "800" } }, `${score}%`)
            ),
            h(
              'div',
              {
                style: {
                  width: "100%",
                  height: "6px",
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "3px",
                  overflow: "hidden"
                }
              },
              h('div', {
                style: {
                  width: `${Math.min(100, Math.max(0, score))}%`,
                  height: "100%",
                  background: globalColor,
                  boxShadow: `0 0 10px ${globalColor}`,
                  transition: "width 0.6s ease"
                }
              })
            )
          )
        ),

        // Bottom 3 Severity Boxes
        h(
          'div',
          { style: { display: "flex", gap: "14px", marginTop: "24px" } },
          // Critical / High
          h(
            'div',
            {
              style: {
                flex: 1,
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255, 51, 102, 0.25)",
                borderTop: "3px solid var(--neon-red)",
                padding: "14px 12px",
                borderRadius: "8px",
                textAlign: "center",
                boxShadow: "inset 0 0 20px rgba(255,51,102,0.08)"
              }
            },
            h(
              'div',
              {
                style: {
                  fontSize: "32px",
                  color: "var(--neon-red)",
                  fontWeight: "800",
                  fontFamily: "var(--font-mono)",
                  textShadow: "var(--shadow-glow-red)"
                }
              },
              high
            ),
            h(
              'div',
              {
                style: {
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  letterSpacing: "1px",
                  fontWeight: "700",
                  marginTop: "4px"
                }
              },
              "CRITICAL / HIGH"
            )
          ),

          // Elevated / Med
          h(
            'div',
            {
              style: {
                flex: 1,
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255, 170, 0, 0.25)",
                borderTop: "3px solid var(--neon-orange)",
                padding: "14px 12px",
                borderRadius: "8px",
                textAlign: "center",
                boxShadow: "inset 0 0 20px rgba(255,170,0,0.08)"
              }
            },
            h(
              'div',
              {
                style: {
                  fontSize: "32px",
                  color: "var(--neon-orange)",
                  fontWeight: "800",
                  fontFamily: "var(--font-mono)",
                  textShadow: "var(--shadow-glow-amber)"
                }
              },
              med
            ),
            h(
              'div',
              {
                style: {
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  letterSpacing: "1px",
                  fontWeight: "700",
                  marginTop: "4px"
                }
              },
              "ELEVATED / MED"
            )
          ),

          // Low / Info
          h(
            'div',
            {
              style: {
                flex: 1,
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(0, 255, 163, 0.25)",
                borderTop: "3px solid var(--emerald-400)",
                padding: "14px 12px",
                borderRadius: "8px",
                textAlign: "center",
                boxShadow: "inset 0 0 20px rgba(0,255,163,0.08)"
              }
            },
            h(
              'div',
              {
                style: {
                  fontSize: "32px",
                  color: "var(--emerald-400)",
                  fontWeight: "800",
                  fontFamily: "var(--font-mono)",
                  textShadow: "var(--shadow-glow-emerald)"
                }
              },
              lowInfo
            ),
            h(
              'div',
              {
                style: {
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  letterSpacing: "1px",
                  fontWeight: "700",
                  marginTop: "4px"
                }
              },
              "LOW / INFO"
            )
          )
        )
      ),

      // RIGHT CARD: Animated Attack Surface Radar HUD
      h(
        'div',
        {
          className: "card",
          style: {
            padding: "24px",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "radial-gradient(circle at 50% 55%, rgba(16, 26, 42, 0.92) 0%, rgba(7, 11, 18, 0.98) 100%)",
            border: "1px solid rgba(0, 229, 255, 0.2)",
            boxShadow: "inset 0 0 35px rgba(0,0,0,0.85)",
            overflow: "hidden"
          }
        },
        // Cyber Grid Overlay
        h('div', {
          style: {
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(0, 229, 255, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.035) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            pointerEvents: "none"
          }
        }),

        // Top Radar Header
        h(
          'div',
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              position: "relative",
              zIndex: 2,
              marginBottom: "8px"
            }
          },
          h(
            'div',
            null,
            h(
              'div',
              {
                style: {
                  fontSize: "10px",
                  color: "var(--neon-cyan)",
                  letterSpacing: "1.5px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: "700"
                }
              },
              "TACTICAL TELEMETRY // RADAR-01"
            ),
            h(
              'div',
              {
                style: {
                  fontSize: "15px",
                  color: "var(--text-primary)",
                  fontWeight: "800",
                  marginTop: "2px"
                }
              },
              "Attack Surface Radar"
            )
          ),
          h(
            'div',
            {
              style: {
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                color: globalColor,
                border: `1px solid ${globalColor}50`,
                background: "rgba(0,0,0,0.5)",
                padding: "4px 10px",
                borderRadius: "4px"
              }
            },
            `● ${findings.length} VECTORS PLOTTED`
          )
        ),

        // SVG Radar Stage
        h(
          'div',
          {
            style: {
              position: "relative",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexGrow: 1,
              margin: "4px 0"
            }
          },
          h(
            'svg',
            {
              viewBox: "0 0 220 220",
              style: {
                width: "100%",
                height: "100%",
                maxHeight: "235px",
                display: "block",
                overflow: "visible"
              }
            },
            h(
              'defs',
              null,
              h(
                'linearGradient',
                { id: "radarSweep", x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
                h('stop', { offset: "0%", stopColor: sweepRgba }),
                h('stop', { offset: "100%", stopColor: "transparent" })
              )
            ),

            // Outer Degree Ring (Dashed)
            h('circle', {
              cx: "110",
              cy: "110",
              r: "94",
              fill: "none",
              stroke: "rgba(0, 229, 255, 0.2)",
              strokeWidth: "1",
              strokeDasharray: "2, 6"
            }),

            // 3 Concentric Threat Rings
            h('circle', {
              cx: "110",
              cy: "110",
              r: "80",
              fill: "rgba(0, 0, 0, 0.35)",
              stroke: "rgba(255, 255, 255, 0.12)",
              strokeWidth: "1"
            }),
            h('circle', {
              cx: "110",
              cy: "110",
              r: "54",
              fill: "none",
              stroke: "rgba(255, 170, 0, 0.18)",
              strokeWidth: "1",
              strokeDasharray: "4, 4"
            }),
            h('circle', {
              cx: "110",
              cy: "110",
              r: "28",
              fill: "rgba(255, 51, 102, 0.05)",
              stroke: "rgba(255, 51, 102, 0.28)",
              strokeWidth: "1"
            }),

            // Crosshair Axes
            h('line', {
              x1: "20",
              y1: "110",
              x2: "200",
              y2: "110",
              stroke: "rgba(0, 229, 255, 0.15)",
              strokeWidth: "1"
            }),
            h('line', {
              x1: "110",
              y1: "20",
              x2: "110",
              y2: "200",
              stroke: "rgba(0, 229, 255, 0.15)",
              strokeWidth: "1"
            }),
            h('line', {
              x1: "53",
              y1: "53",
              x2: "167",
              y2: "167",
              stroke: "rgba(255, 255, 255, 0.05)",
              strokeWidth: "1"
            }),
            h('line', {
              x1: "167",
              y1: "53",
              x2: "53",
              y2: "167",
              stroke: "rgba(255, 255, 255, 0.05)",
              strokeWidth: "1"
            }),

            // Range Ring Labels
            h(
              'text',
              {
                x: "113",
                y: "39",
                fill: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "6px"
              },
              "PERIMETER"
            ),
            h(
              'text',
              {
                x: "113",
                y: "64",
                fill: "var(--neon-orange)",
                fontFamily: "var(--font-mono)",
                fontSize: "6px",
                opacity: "0.8"
              },
              "ELEVATED"
            ),
            h(
              'text',
              {
                x: "113",
                y: "89",
                fill: "var(--neon-red)",
                fontFamily: "var(--font-mono)",
                fontSize: "6px",
                opacity: "0.85"
              },
              "CRITICAL"
            ),

            // Rotating Radar Sweep Sector
            h(
              'path',
              {
                d: "M110,110 L110,30 A80,80 0 0,1 190,110 Z",
                fill: "url(#radarSweep)"
              },
              h('animateTransform', {
                attributeName: "transform",
                type: "rotate",
                from: "0 110 110",
                to: "360 110 110",
                dur: "4s",
                repeatCount: "indefinite"
              })
            ),

            // Center Core Node
            h('circle', {
              cx: "110",
              cy: "110",
              r: "3.5",
              fill: "var(--neon-cyan)",
              filter: "drop-shadow(0 0 6px var(--neon-cyan))"
            }),

            // Plotting actual findings as animated target-lock blips
            ...findings.map((f, i) => {
              const angle = (i * (360 / totalFindings)) * (Math.PI / 180);
              const dist = f.severity === 'HIGH' ? 24 : f.severity === 'MEDIUM' ? 52 : 74;
              const x = 110 + dist * Math.cos(angle);
              const y = 110 + dist * Math.sin(angle);
              const color =
                f.severity === 'HIGH'
                  ? 'var(--neon-red)'
                  : f.severity === 'MEDIUM'
                  ? 'var(--neon-orange)'
                  : 'var(--emerald-400)';

              return h(
                'g',
                { key: i },
                // Outer Pulsing Target Lock Ring
                h(
                  'circle',
                  {
                    cx: x,
                    cy: y,
                    r: "7",
                    fill: "none",
                    stroke: color,
                    strokeWidth: "1",
                    strokeOpacity: "0.6"
                  },
                  h('animate', {
                    attributeName: "r",
                    values: "3;9;3",
                    dur: "2.8s",
                    begin: `${i * 0.35}s`,
                    repeatCount: "indefinite"
                  }),
                  h('animate', {
                    attributeName: "opacity",
                    values: "0.8;0.1;0.8",
                    dur: "2.8s",
                    begin: `${i * 0.35}s`,
                    repeatCount: "indefinite"
                  })
                ),
                // Inner Glowing Threat Blip
                h(
                  'circle',
                  {
                    cx: x,
                    cy: y,
                    r: "3.5",
                    fill: color,
                    filter: `drop-shadow(0 0 8px ${color})`
                  },
                  h('animate', {
                    attributeName: "opacity",
                    values: "0.3;1;0.3;1;1",
                    dur: "3s",
                    begin: `${i * 0.4}s`,
                    repeatCount: "indefinite"
                  })
                )
              );
            })
          )
        ),

        // Bottom Radar Legend Bar
        h(
          'div',
          {
            style: {
              position: "relative",
              zIndex: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: "10px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--text-muted)"
            }
          },
          h('span', { style: { color: "var(--neon-red)" } }, "● CORE: HIGH RISK"),
          h('span', { style: { color: "var(--neon-orange)" } }, "● MID: ELEVATED"),
          h('span', { style: { color: "var(--emerald-400)" } }, "● OUTER: LOW / INFO")
        )
      )
    ),

    // 4. EXISTING SECURITY FINDINGS LIST (Preserved intact)
    h(SecurityFindings, { findings })
  );
}