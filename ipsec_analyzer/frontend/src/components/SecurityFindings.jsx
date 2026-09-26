import React, { useState } from 'react';

const h = React.createElement;

export default function SecurityFindings({ findings }) {
  const [activeFilter, setActiveFilter] = useState('ALL');

  if (!findings || findings.length === 0) return null;

  const severityStyles = {
    HIGH: {
      label: "CRITICAL // HIGH",
      color: "var(--neon-red)",
      bg: "rgba(255, 51, 102, 0.08)",
      border: "var(--neon-red)",
      glow: "inset 24px 0 24px -20px rgba(255,51,102,0.35), 0 6px 20px rgba(0,0,0,0.45)"
    },
    MEDIUM: {
      label: "ELEVATED // MEDIUM",
      color: "var(--neon-orange)",
      bg: "rgba(255, 170, 0, 0.08)",
      border: "var(--neon-orange)",
      glow: "inset 24px 0 24px -20px rgba(255,170,0,0.35), 0 6px 20px rgba(0,0,0,0.45)"
    },
    LOW: {
      label: "GUARDED // LOW",
      color: "var(--neon-cyan)",
      bg: "rgba(0, 229, 255, 0.08)",
      border: "var(--neon-cyan)",
      glow: "inset 24px 0 24px -20px rgba(0,229,255,0.35), 0 6px 20px rgba(0,0,0,0.45)"
    },
    INFO: {
      label: "TELEMETRY // INFO",
      color: "var(--emerald-400)",
      bg: "rgba(0, 255, 163, 0.08)",
      border: "var(--emerald-400)",
      glow: "inset 24px 0 24px -20px rgba(0,255,163,0.25), 0 6px 20px rgba(0,0,0,0.45)"
    }
  };

  const counts = {
    ALL: findings.length,
    HIGH: findings.filter(f => f.severity === 'HIGH').length,
    MEDIUM: findings.filter(f => f.severity === 'MEDIUM').length,
    LOW: findings.filter(f => f.severity === 'LOW' || f.severity === 'INFO').length
  };

  const filteredFindings = findings.filter(f => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'LOW') return f.severity === 'LOW' || f.severity === 'INFO';
    return f.severity === activeFilter;
  });

  const filterButtons = [
    { id: 'ALL', label: `ALL (${counts.ALL})`, color: 'var(--neon-cyan)' },
    { id: 'HIGH', label: `HIGH (${counts.HIGH})`, color: 'var(--neon-red)' },
    { id: 'MEDIUM', label: `MED (${counts.MEDIUM})`, color: 'var(--neon-orange)' },
    { id: 'LOW', label: `LOW/INFO (${counts.LOW})`, color: 'var(--emerald-400)' }
  ];

  return h(
    'div',
    {
      className: "card full-width",
      style: {
        border: "1px solid rgba(0, 229, 255, 0.2)",
        boxShadow: "inset 0 0 30px rgba(0,0,0,0.65)",
        overflow: "hidden"
      }
    },

    // 1. UPGRADED CARD HEADER WITH FILTER TABS
    h(
      'div',
      {
        className: "card-header",
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          padding: "20px 24px",
          background: "rgba(13, 19, 29, 0.9)",
          borderBottom: "1px solid rgba(255,255,255,0.06)"
        }
      },
      h(
        'div',
        { style: { display: "flex", alignItems: "center", gap: "14px" } },
        // Vector Threat Icon Box (Replaces Warning Emoji)
        h(
          'div',
          {
            style: {
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              background: "rgba(255, 170, 0, 0.1)",
              border: "1px solid rgba(255, 170, 0, 0.4)",
              boxShadow: "0 0 15px rgba(255, 170, 0, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }
          },
          h(
            'svg',
            { viewBox: "0 0 24 24", style: { width: "20px", height: "20px" } },
            h('path', {
              d: "M12 3L2 20H22L12 3Z",
              fill: "none",
              stroke: "var(--neon-orange)",
              strokeWidth: "2",
              strokeLinejoin: "round"
            }),
            h('line', {
              x1: "12",
              y1: "10",
              x2: "12",
              y2: "14",
              stroke: "var(--neon-orange)",
              strokeWidth: "2",
              strokeLinecap: "round"
            }),
            h('circle', {
              cx: "12",
              cy: "17",
              r: "1",
              fill: "var(--neon-orange)"
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
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                color: "var(--neon-cyan)",
                letterSpacing: "1.5px",
                fontWeight: "700"
              }
            },
            "FORENSIC AUDIT LOG // DPI & ML HEURISTICS"
          ),
          h(
            'div',
            {
              className: "card-title",
              style: {
                fontSize: "17px",
                fontWeight: "800",
                color: "var(--text-primary)",
                marginTop: "2px"
              }
            },
            "Security Findings & Remediation Directives"
          )
        )
      ),

      // Interactive Severity Filter Bar
      h(
        'div',
        { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
        ...filterButtons.map(btn => {
          const isActive = activeFilter === btn.id;
          return h(
            'button',
            {
              key: btn.id,
              type: "button",
              onClick: () => setActiveFilter(btn.id),
              style: {
                padding: "6px 12px",
                borderRadius: "6px",
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                fontWeight: "800",
                letterSpacing: "1px",
                cursor: "pointer",
                background: isActive ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.4)",
                color: isActive ? btn.color : "var(--text-muted)",
                border: isActive ? `1px solid ${btn.color}` : "1px solid rgba(255,255,255,0.07)",
                boxShadow: isActive ? `0 0 12px ${btn.color}30` : "none",
                transition: "all 0.2s ease"
              }
            },
            btn.label
          );
        })
      )
    ),

    // 2. FINDINGS STREAM BODY
    h(
      'div',
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          padding: "24px"
        }
      },
      ...filteredFindings.map((finding, index) => {
        const style = severityStyles[finding.severity] || severityStyles.INFO;
        const confidencePct = Math.round((finding.confidence ?? 1) * 100);
        const ruleCode = `SEC-${String(index + 1).padStart(2, '0')}`;

        return h(
          'div',
          {
            key: index,
            style: {
              background: "rgba(10, 15, 22, 0.75)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderLeft: `4px solid ${style.border}`,
              borderRadius: "10px",
              padding: "22px",
              boxShadow: style.glow,
              position: "relative",
              overflow: "hidden",
              transition: "all 0.25s ease"
            },
            onMouseOver: (e) => {
              e.currentTarget.style.background = "rgba(18, 26, 38, 0.9)";
              e.currentTarget.style.transform = "translateX(4px)";
              e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.22)";
            },
            onMouseOut: (e) => {
              e.currentTarget.style.background = "rgba(10, 15, 22, 0.75)";
              e.currentTarget.style.transform = "translateX(0)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
            }
          },

          // Subtle Cyber Scanline Overlay
          h('div', {
            style: {
              position: "absolute",
              inset: 0,
              background: "linear-gradient(rgba(255,255,255,0) 50%, rgba(0,0,0,0.12) 50%)",
              backgroundSize: "100% 4px",
              pointerEvents: "none"
            }
          }),

          // Top Row: Rule Code + Title + Severity Badge
          h(
            'div',
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "10px",
                position: "relative",
                zIndex: 1
              }
            },
            h(
              'div',
              { style: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" } },
              h(
                'span',
                {
                  style: {
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    fontWeight: "800",
                    color: style.color,
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${style.color}40`,
                    padding: "3px 8px",
                    borderRadius: "4px",
                    letterSpacing: "1px"
                  }
                },
                ruleCode
              ),
              h(
                'h4',
                {
                  style: {
                    margin: 0,
                    color: "var(--text-primary)",
                    fontSize: "15px",
                    fontWeight: "800",
                    letterSpacing: "0.3px"
                  }
                },
                finding.title
              )
            ),

            h(
              'span',
              {
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: style.bg,
                  color: style.color,
                  border: `1px solid ${style.color}`,
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: "800",
                  letterSpacing: "1px",
                  boxShadow: `0 0 12px ${style.color}35`
                }
              },
              h('span', {
                style: {
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: style.color,
                  boxShadow: `0 0 6px ${style.color}`
                }
              }),
              style.label
            )
          ),

          // Description Paragraph
          h(
            'p',
            {
              style: {
                margin: "0 0 18px 0",
                color: "var(--text-secondary)",
                fontSize: "13px",
                lineHeight: "1.6",
                position: "relative",
                zIndex: 1
              }
            },
            finding.description
          ),

          // Forensic Telemetry & Remediation Terminal Box
          h(
            'div',
            {
              style: {
                background: "#0a0f14",
                padding: "16px 18px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "inset 0 0 20px rgba(0,0,0,0.8)",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                position: "relative",
                zIndex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }
            },

            // Row 1: Source & Confidence Bar
            h(
              'div',
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  paddingBottom: "10px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)"
                }
              },
              h(
                'div',
                null,
                h('span', { style: { color: "var(--neon-purple)", fontWeight: "700" } }, "▸ DETECTION ENGINE: "),
                h('span', { style: { color: "var(--text-primary)", fontWeight: "700" } }, finding.source || "DPI Core")
              ),

              h(
                'div',
                { style: { display: "flex", alignItems: "center", gap: "10px", minWidth: "190px" } },
                h('span', { style: { color: "var(--text-muted)", fontSize: "10px" } }, "CONFIDENCE:"),
                h(
                  'div',
                  {
                    style: {
                      flexGrow: 1,
                      height: "5px",
                      background: "rgba(255,255,255,0.1)",
                      borderRadius: "3px",
                      overflow: "hidden",
                      width: "80px"
                    }
                  },
                  h('div', {
                    style: {
                      width: `${confidencePct}%`,
                      height: "100%",
                      background: "var(--neon-cyan)",
                      boxShadow: "0 0 8px var(--neon-cyan)"
                    }
                  })
                ),
                h(
                  'span',
                  { style: { color: "var(--neon-cyan)", fontWeight: "800" } },
                  `${confidencePct}%`
                )
              )
            ),

            // Row 2: Evidence Trace (if present)
            finding.evidence
              ? h(
                  'div',
                  {
                    style: {
                      background: "rgba(255, 170, 0, 0.04)",
                      borderLeft: "2px solid var(--neon-orange)",
                      padding: "8px 12px",
                      borderRadius: "0 4px 4px 0"
                    }
                  },
                  h('span', { style: { color: "var(--neon-orange)", fontWeight: "700" } }, "▸ PACKET EVIDENCE: "),
                  h('span', { style: { color: "var(--text-primary)" } }, finding.evidence)
                )
              : null,

            // Row 3: Remediation Directive
            h(
              'div',
              {
                style: {
                  background: "rgba(0, 255, 163, 0.05)",
                  borderLeft: "2px solid var(--emerald-400)",
                  padding: "8px 12px",
                  borderRadius: "0 4px 4px 0"
                }
              },
              h('span', { style: { color: "var(--emerald-400)", fontWeight: "800" } }, "▸ REMEDIATION DIRECTIVE: "),
              h(
                'span',
                { style: { color: "var(--emerald-400)", fontWeight: "600" } },
                finding.recommendation
              )
            )
          )
        );
      })
    )
  );
}