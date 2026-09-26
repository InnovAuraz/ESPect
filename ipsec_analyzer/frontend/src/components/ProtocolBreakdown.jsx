import React from 'react';

const h = React.createElement;

export default function ProtocolBreakdown({ protocols, total }) {
  if (!protocols || total === 0) return null;

  const sorted = Object.entries(protocols).sort((a, b) => b[1] - a[1]);

  function protoMeta(name) {
    const n = name.toUpperCase();
    if (n === "ESP") {
      return {
        cls: "proto-esp",
        color: "var(--emerald-400)",
        tag: "IPPROTO-50 // ENCRYPTED",
        bg: "rgba(0, 255, 163, 0.08)"
      };
    }
    if (n === "UDP") {
      return {
        cls: "proto-udp",
        color: "var(--neon-cyan)",
        tag: "TRANSPORT // IKE / NAT-T",
        bg: "rgba(0, 229, 255, 0.08)"
      };
    }
    if (n === "TCP") {
      return {
        cls: "proto-tcp",
        color: "var(--neon-purple)",
        tag: "TRANSPORT // STREAM",
        bg: "rgba(187, 134, 252, 0.08)"
      };
    }
    if (n.includes("ICMP")) {
      return {
        cls: "proto-icmp",
        color: "var(--neon-orange)",
        tag: "CONTROL // DIAGNOSTIC",
        bg: "rgba(255, 170, 0, 0.08)"
      };
    }
    return {
      cls: "proto-other",
      color: "#60a5fa",
      tag: "NETWORK // AUXILIARY",
      bg: "rgba(96, 165, 250, 0.08)"
    };
  }

  return h(
    'div',
    {
      className: "card",
      style: {
        border: "1px solid rgba(0, 229, 255, 0.2)",
        boxShadow: "inset 0 0 30px rgba(0,0,0,0.65)",
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
          padding: "18px 24px",
          background: "rgba(13, 19, 29, 0.9)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexWrap: "wrap",
          gap: "12px"
        }
      },
      h(
        'div',
        { style: { display: "flex", alignItems: "center", gap: "12px" } },
        // Glowing Vector Spectrum Icon (Replaces Chart Emoji)
        h(
          'div',
          {
            style: {
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "rgba(0, 229, 255, 0.08)",
              border: "1px solid rgba(0, 229, 255, 0.35)",
              boxShadow: "0 0 12px rgba(0, 229, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }
          },
          h(
            'svg',
            { viewBox: "0 0 24 24", style: { width: "18px", height: "18px" } },
            h('rect', { x: "3", y: "12", width: "4", height: "8", rx: "1", fill: "var(--neon-cyan)" }),
            h('rect', { x: "10", y: "6", width: "4", height: "14", rx: "1", fill: "var(--emerald-400)" }),
            h('rect', { x: "17", y: "9", width: "4", height: "11", rx: "1", fill: "var(--neon-purple)" })
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
            "PACKET LAYER TELEMETRY"
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
            "Protocol Distribution"
          )
        )
      ),

      h(
        'div',
        {
          style: {
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            color: "var(--text-secondary)",
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "4px 10px",
            borderRadius: "4px"
          }
        },
        "TOTAL: ",
        h('strong', { style: { color: "var(--neon-cyan)" } }, `${total.toLocaleString()} PKTS`)
      )
    ),

    // 2. CARD BODY
    h(
      'div',
      {
        className: "card-body",
        style: {
          padding: "22px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px"
        }
      },

      // Multi-Segment Stacked Spectrum Bar
      h(
        'div',
        {
          style: {
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: "8px",
            padding: "12px 14px"
          }
        },
        h(
          'div',
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              letterSpacing: "1px",
              marginBottom: "8px"
            }
          },
          h('span', null, "COMPOSITE TRAFFIC RATIO"),
          h('span', { style: { color: "var(--emerald-400)" } }, `${sorted.length} ACTIVE LAYERS`)
        ),
        h(
          'div',
          {
            style: {
              display: "flex",
              width: "100%",
              height: "8px",
              borderRadius: "4px",
              overflow: "hidden",
              background: "rgba(255,255,255,0.05)",
              gap: "2px"
            }
          },
          ...sorted.map(([name, count]) => {
            const meta = protoMeta(name);
            const pct = (count / total) * 100;
            return h('div', {
              key: `seg-${name}`,
              style: {
                width: `${pct}%`,
                height: "100%",
                background: meta.color,
                boxShadow: `0 0 8px ${meta.color}`,
                transition: "width 0.5s ease"
              }
            });
          })
        )
      ),

      // Individual Protocol Telemetry Rows
      h(
        'div',
        {
          className: "protocol-bars",
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }
        },
        ...sorted.map(([name, count]) => {
          const meta = protoMeta(name);
          const pct = ((count / total) * 100).toFixed(1);

          return h(
            'div',
            {
              key: name,
              className: "protocol-bar-row",
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "12px 14px",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderLeft: `3px solid ${meta.color}`,
                borderRadius: "6px",
                boxShadow: "inset 0 0 15px rgba(0,0,0,0.45)"
              }
            },
            h(
              'div',
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px"
                }
              },
              h(
                'div',
                { style: { display: "flex", alignItems: "center", gap: "10px" } },
                h(
                  'span',
                  {
                    className: "protocol-bar-name",
                    style: {
                      fontFamily: "var(--font-mono)",
                      fontSize: "13px",
                      fontWeight: "800",
                      color: meta.color,
                      textShadow: `0 0 8px ${meta.color}50`,
                      minWidth: "48px"
                    }
                  },
                  name
                ),
                h(
                  'span',
                  {
                    style: {
                      fontSize: "9px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      letterSpacing: "0.8px"
                    }
                  },
                  meta.tag
                )
              ),

              h(
                'div',
                {
                  className: "protocol-bar-count",
                  style: {
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }
                },
                h(
                  'span',
                  { style: { color: "var(--text-primary)", fontWeight: "700" } },
                  `${count.toLocaleString()} pkts`
                ),
                h(
                  'span',
                  {
                    style: {
                      color: meta.color,
                      background: meta.bg,
                      border: `1px solid ${meta.color}40`,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: "800"
                    }
                  },
                  `${pct}%`
                )
              )
            ),

            // Glowing Bar Track
            h(
              'div',
              {
                className: "protocol-bar-track",
                style: {
                  width: "100%",
                  height: "6px",
                  background: "rgba(255,255,255,0.07)",
                  borderRadius: "3px",
                  overflow: "hidden"
                }
              },
              h('div', {
                className: `protocol-bar-fill ${meta.cls}`,
                style: {
                  width: `${(count / total) * 100}%`,
                  height: "100%",
                  background: meta.color,
                  boxShadow: `0 0 10px ${meta.color}`,
                  borderRadius: "3px",
                  transition: "width 0.6s ease"
                }
              })
            )
          );
        })
      )
    )
  );
}