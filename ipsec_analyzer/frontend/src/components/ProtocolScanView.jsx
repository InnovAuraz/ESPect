import React from 'react';
import ProtocolBreakdown from './ProtocolBreakdown';
import IpsecDetails from './IpsecDetails';
import NetworkAddresses from './NetworkAddresses';

const h = React.createElement;

export default function ProtocolScanView({ summary, ipsec }) {
  if (!summary || !ipsec) return null;

  // Smart Peer IP Resolution: Ensures Node A and Node B don't show the exact same IP if another address exists
  const allSources = ipsec.source_addresses || [];
  const allDests = ipsec.destination_addresses || [];
  const src = allSources[0] || "192.168.160.128";
  const distinctDst = [...allDests, ...allSources].find(ip => ip && ip !== src);
  const dst = distinctDst || "192.168.160.129";

  const isEncrypted = Boolean(ipsec.esp_detected);
  const tunnelColor = isEncrypted ? "var(--emerald-400)" : "var(--neon-red)";
  const tunnelGlow = isEncrypted ? "var(--shadow-glow-emerald)" : "var(--shadow-glow-red)";
  const totalPackets = summary.total_packets || 0;
  const protocolCount = summary.protocol_counts ? Object.keys(summary.protocol_counts).length : 0;
  const spiCount = ipsec.spi_values ? ipsec.spi_values.length : (isEncrypted ? 2 : 0);

  const frameSegments = [
    { label: "OUTER IP HEADER", bytes: "20 Bytes", desc: `\({src} →\){dst}`, color: "var(--neon-cyan)", flex: 1.1 },
    { label: "ESP HEADER (SPI + SEQ)", bytes: "8 Bytes", desc: isEncrypted ? `SPIs: ${spiCount} Active` : "No ESP Header", color: "var(--neon-purple)", flex: 1.2 },
    { label: isEncrypted ? "ENCRYPTED PAYLOAD (CIPHERTEXT)" : "CLEARTEXT PAYLOAD (EXPOSED)", bytes: "Variable Len", desc: isEncrypted ? "Confidentiality Protected" : "Unencrypted Data Stream", color: tunnelColor, flex: 2.2 },
    { label: "ESP TRAILER", bytes: "2–18 Bytes", desc: "Padding + Next Hdr", color: "var(--neon-orange)", flex: 0.9 },
    { label: "ESP ICV AUTH", bytes: "16 Bytes", desc: isEncrypted ? "Integrity Verified" : "No HMAC", color: "var(--emerald-400)", flex: 1.0 }
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

    // 1. SEPARATED PAGE HEADER
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
            "DEEP PACKET INSPECTION & TOPOLOGY"
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
            "Protocol Scan"
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
            "Cryptographic tunnel encapsulation, endpoint telemetry, and layer-by-layer protocol distribution."
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
            "ENCAPSULATION STATE"
          ),
          h(
            'div',
            {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px"
              }
            },
            h('span', {
              style: {
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: tunnelColor,
                boxShadow: tunnelGlow,
                display: "inline-block"
              }
            }),
            h(
              'span',
              {
                style: {
                  fontSize: "24px",
                  fontWeight: "800",
                  color: tunnelColor,
                  fontFamily: "var(--font-mono)",
                  textShadow: tunnelGlow,
                  letterSpacing: "0.5px"
                }
              },
              isEncrypted ? "ESP ENCRYPTED" : "EXPOSED STREAM"
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

    // 2. TOP TELEMETRY STRIP
    h(
      'div',
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "24px"
        }
      },
      // Card 1: Security Posture
      h(
        'div',
        {
          className: "card",
          style: {
            padding: "20px 24px",
            border: isEncrypted
              ? "1px solid rgba(0, 255, 163, 0.3)"
              : "1px solid rgba(255, 51, 102, 0.3)",
            boxShadow: isEncrypted
              ? "inset 0 0 20px rgba(0, 255, 163, 0.05)"
              : "inset 0 0 20px rgba(255, 51, 102, 0.05)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }
        },
        h(
          'div',
          {
            style: {
              fontSize: "11px",
              color: "var(--text-muted)",
              letterSpacing: "1px",
              fontWeight: "700"
            }
          },
          "SECURITY POSTURE"
        ),
        h(
          'div',
          {
            style: {
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginTop: "12px"
            }
          },
          h(
            'div',
            {
              style: {
                fontSize: "24px",
                fontWeight: "800",
                color: tunnelColor,
                fontFamily: "var(--font-mono)",
                textShadow: tunnelGlow
              }
            },
            isEncrypted ? "IPsec / ESP" : "UNPROTECTED"
          ),
          h(
            'span',
            {
              style: {
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                color: tunnelColor,
                border: `1px solid ${tunnelColor}40`,
                background: "rgba(255,255,255,0.03)",
                padding: "3px 8px",
                borderRadius: "4px"
              }
            },
            isEncrypted ? "TUNNEL ACTIVE" : "WARN: CLEARTEXT"
          )
        )
      ),

      // Card 2: Analyzed Packet Volume
      h(
        'div',
        {
          className: "card",
          style: {
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }
        },
        h(
          'div',
          {
            style: {
              fontSize: "11px",
              color: "var(--text-muted)",
              letterSpacing: "1px",
              fontWeight: "700"
            }
          },
          "ANALYZED PACKET VOLUME"
        ),
        h(
          'div',
          {
            style: {
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginTop: "12px"
            }
          },
          h(
            'div',
            {
              style: {
                fontSize: "26px",
                fontWeight: "800",
                color: "var(--neon-cyan)",
                fontFamily: "var(--font-mono)",
                textShadow: "var(--shadow-glow-cyan)"
              }
            },
            totalPackets.toLocaleString(),
            " ",
            h(
              'span',
              {
                style: {
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  fontWeight: "600"
                }
              },
              "pkts"
            )
          ),
          h(
            'span',
            {
              style: {
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "var(--text-secondary)"
              }
            },
            `${protocolCount} Layer Protocols`
          )
        )
      ),

      // Card 3: Primary Tunnel Pair
      h(
        'div',
        {
          className: "card",
          style: {
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }
        },
        h(
          'div',
          {
            style: {
              fontSize: "11px",
              color: "var(--text-muted)",
              letterSpacing: "1px",
              fontWeight: "700"
            }
          },
          "PRIMARY TUNNEL PAIR"
        ),
        h(
          'div',
          {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "12px",
              fontFamily: "var(--font-mono)",
              fontSize: "13px"
            }
          },
          h('span', { style: { color: "var(--neon-cyan)", fontWeight: "700" } }, src),
          h('span', { style: { color: "var(--text-muted)", fontSize: "11px" } }, "⇄"),
          h('span', { style: { color: "var(--neon-purple)", fontWeight: "700" } }, dst)
        )
      )
    ),

    // 3. ANIMATED NETWORK TOPOLOGY + RFC 4303 PACKET DISSECTOR CARD
    h(
      'div',
      {
        className: "card",
        style: {
          padding: "24px",
          border: "1px solid rgba(0, 229, 255, 0.2)",
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          gap: "20px"
        }
      },
      h(
        'div',
        {
          className: "card-header",
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 0,
            background: "transparent",
            border: "none",
            flexWrap: "wrap",
            gap: "12px"
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
                fontWeight: "700",
                marginBottom: "4px"
              }
            },
            "LIVE TELEMETRY PATH"
          ),
          h(
            'div',
            {
              className: "card-title",
              style: {
                fontSize: "16px",
                fontWeight: "800",
                color: "var(--text-primary)"
              }
            },
            "Live Network Topology & Encapsulation"
          )
        ),
        h(
          'div',
          { style: { display: "flex", alignItems: "center", gap: "10px" } },
          h(
            'div',
            {
              style: {
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "var(--text-secondary)",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "4px 10px",
                borderRadius: "4px"
              }
            },
            "IKEv2: ",
            h(
              'strong',
              {
                style: {
                  color: ipsec.ike_detected ? "var(--emerald-400)" : "var(--text-muted)"
                }
              },
              ipsec.ike_detected ? "DETECTED" : "NONE"
            )
          ),
          h(
            'div',
            {
              className: "card-badge secure",
              style: {
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "1px",
                padding: "5px 10px",
                borderRadius: "4px",
                color: tunnelColor,
                border: `1px solid ${tunnelColor}50`,
                background: "rgba(0,0,0,0.4)",
                boxShadow: `0 0 12px ${tunnelColor}25`
              }
            },
            "● REAL-TIME TRACE"
          )
        )
      ),

      // Topology Viewport
      h(
        'div',
        {
          style: {
            width: "100%",
            height: "240px",
            background:
              "radial-gradient(circle at 50% 50%, rgba(16, 24, 39, 0.9) 0%, rgba(6, 10, 15, 0.98) 100%)",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.07)",
            position: "relative",
            overflow: "hidden",
            boxShadow: "inset 0 0 35px rgba(0,0,0,0.85)"
          }
        },
        // Cyber Grid Background
        h('div', {
          style: {
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(0, 229, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.04) 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }
        }),
        // HUD Corner Labels
        h(
          'div',
          {
            style: {
              position: "absolute",
              top: "12px",
              left: "16px",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--text-muted)",
              letterSpacing: "1px"
            }
          },
          "TOPOLOGY // SEC-PIPE-01"
        ),
        h(
          'div',
          {
            style: {
              position: "absolute",
              bottom: "12px",
              right: "16px",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--text-muted)",
              letterSpacing: "1px"
            }
          },
          `MODE: ${isEncrypted ? "ESP TUNNEL ENCAPSULATION" : "DIRECT ROUTING"}`
        ),

        // Animated SVG Diagram
        h(
          'svg',
          {
            viewBox: "0 0 800 220",
            style: { width: "100%", height: "100%", position: "absolute", inset: 0 }
          },
          h(
            'defs',
            null,
            h(
              'linearGradient',
              { id: "tunnelSheath", x1: "0%", y1: "0%", x2: "100%", y2: "0%" },
              h('stop', { offset: "0%", stopColor: "var(--neon-cyan)", stopOpacity: "0.08" }),
              h('stop', { offset: "50%", stopColor: tunnelColor, stopOpacity: "0.22" }),
              h('stop', { offset: "100%", stopColor: "var(--neon-purple)", stopOpacity: "0.08" })
            )
          ),

          // Outer Encapsulation Sheath
          h('rect', {
            x: "200",
            y: "86",
            width: "400",
            height: "48",
            rx: "24",
            fill: "url(#tunnelSheath)",
            stroke: tunnelColor,
            strokeOpacity: "0.25",
            strokeWidth: "1",
            strokeDasharray: "4,4"
          }),

          // Outbound & Inbound Encrypted Stream Lines
          h(
            'line',
            {
              x1: "205",
              y1: "102",
              x2: "595",
              y2: "102",
              stroke: tunnelColor,
              strokeWidth: "2",
              strokeOpacity: "0.75",
              strokeDasharray: "8, 8"
            },
            h('animate', {
              attributeName: "stroke-dashoffset",
              from: "96",
              to: "0",
              dur: "2.2s",
              repeatCount: "indefinite"
            })
          ),
          h(
            'line',
            {
              x1: "205",
              y1: "118",
              x2: "595",
              y2: "118",
              stroke: "var(--neon-cyan)",
              strokeWidth: "1.5",
              strokeOpacity: "0.5",
              strokeDasharray: "8, 8"
            },
            h('animate', {
              attributeName: "stroke-dashoffset",
              from: "0",
              to: "96",
              dur: "2.6s",
              repeatCount: "indefinite"
            })
          ),

          // Animated Packets Flowing Node A -> Node B
          h(
            'circle',
            {
              cx: "205",
              cy: "102",
              r: "4.5",
              fill: tunnelColor,
              filter: `drop-shadow(0 0 8px ${tunnelColor})`
            },
            h('animate', {
              attributeName: "cx",
              values: "205;595",
              dur: "1.3s",
              repeatCount: "indefinite"
            })
          ),
          h(
            'circle',
            {
              cx: "205",
              cy: "102",
              r: "3",
              fill: "#ffffff",
              opacity: "0.85"
            },
            h('animate', {
              attributeName: "cx",
              values: "205;595",
              dur: "1.3s",
              begin: "0.65s",
              repeatCount: "indefinite"
            })
          ),

          // Animated Packets Flowing Node B -> Node A
          h(
            'circle',
            {
              cx: "595",
              cy: "118",
              r: "4",
              fill: "var(--neon-cyan)",
              filter: "drop-shadow(0 0 8px var(--neon-cyan))"
            },
            h('animate', {
              attributeName: "cx",
              values: "595;205",
              dur: "1.7s",
              repeatCount: "indefinite"
            })
          ),

          // NODE A (Initiator)
          h(
            'g',
            null,
            h(
              'rect',
              {
                x: "74",
                y: "54",
                width: "132",
                height: "112",
                rx: "14",
                fill: "none",
                stroke: "var(--neon-cyan)",
                strokeWidth: "1",
                strokeOpacity: "0.25"
              },
              h('animate', {
                attributeName: "stroke-opacity",
                values: "0.1;0.45;0.1",
                dur: "3s",
                repeatCount: "indefinite"
              })
            ),
            h('rect', {
              x: "80",
              y: "60",
              width: "120",
              height: "100",
              fill: "#0d131d",
              stroke: "var(--neon-cyan)",
              strokeWidth: "2",
              rx: "10",
              filter: "drop-shadow(0 0 15px rgba(0, 229, 255, 0.25))"
            }),
            h(
              'text',
              {
                x: "140",
                y: "84",
                fill: "var(--neon-cyan)",
                textAnchor: "middle",
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                fontWeight: "700",
                letterSpacing: "1.5px"
              },
              "INITIATOR"
            ),
            h(
              'text',
              {
                x: "140",
                y: "108",
                fill: "var(--text-primary)",
                textAnchor: "middle",
                fontFamily: "var(--font-mono)",
                fontSize: "15px",
                fontWeight: "800"
              },
              "NODE A"
            ),
            h('rect', {
              x: "92",
              y: "122",
              width: "96",
              height: "22",
              rx: "4",
              fill: "rgba(0, 229, 255, 0.08)",
              stroke: "rgba(0, 229, 255, 0.3)",
              strokeWidth: "1"
            }),
            h(
              'text',
              {
                x: "140",
                y: "137",
                fill: "var(--text-primary)",
                textAnchor: "middle",
                fontFamily: "var(--font-mono)",
                fontSize: "10px"
              },
              src
            )
          ),

          // NODE B (Responder)
          h(
            'g',
            null,
            h(
              'rect',
              {
                x: "594",
                y: "54",
                width: "132",
                height: "112",
                rx: "14",
                fill: "none",
                stroke: "var(--neon-purple)",
                strokeWidth: "1",
                strokeOpacity: "0.25"
              },
              h('animate', {
                attributeName: "stroke-opacity",
                values: "0.1;0.45;0.1",
                dur: "3s",
                begin: "1.5s",
                repeatCount: "indefinite"
              })
            ),
            h('rect', {
              x: "600",
              y: "60",
              width: "120",
              height: "100",
              fill: "#0d131d",
              stroke: "var(--neon-purple)",
              strokeWidth: "2",
              rx: "10",
              filter: "drop-shadow(0 0 15px rgba(187, 134, 252, 0.25))"
            }),
            h(
              'text',
              {
                x: "660",
                y: "84",
                fill: "var(--neon-purple)",
                textAnchor: "middle",
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                fontWeight: "700",
                letterSpacing: "1.5px"
              },
              "RESPONDER"
            ),
            h(
              'text',
              {
                x: "660",
                y: "108",
                fill: "var(--text-primary)",
                textAnchor: "middle",
                fontFamily: "var(--font-mono)",
                fontSize: "15px",
                fontWeight: "800"
              },
              "NODE B"
            ),
            h('rect', {
              x: "612",
              y: "122",
              width: "96",
              height: "22",
              rx: "4",
              fill: "rgba(187, 134, 252, 0.08)",
              stroke: "rgba(187, 134, 252, 0.3)",
              strokeWidth: "1"
            }),
            h(
              'text',
              {
                x: "660",
                y: "137",
                fill: "var(--text-primary)",
                textAnchor: "middle",
                fontFamily: "var(--font-mono)",
                fontSize: "10px"
              },
              dst
            )
          ),

          // Central IPsec Gateway Core
          h(
            'g',
            null,
            h('rect', {
              x: "315",
              y: "72",
              width: "170",
              height: "76",
              fill: "#0a0f16",
              stroke: tunnelColor,
              strokeWidth: "1.5",
              rx: "38",
              filter: `drop-shadow(0 0 18px ${tunnelColor}40)`
            }),
            h('rect', {
              x: "321",
              y: "78",
              width: "158",
              height: "64",
              fill: "none",
              stroke: tunnelColor,
              strokeOpacity: "0.3",
              strokeWidth: "1",
              rx: "32"
            }),
            h(
              'text',
              {
                x: "400",
                y: "103",
                fill: "var(--text-muted)",
                textAnchor: "middle",
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                fontWeight: "700",
                letterSpacing: "1.5px"
              },
              isEncrypted ? "CRYPTOGRAPHIC TUNNEL" : "SECURITY WARNING"
            ),
            h(
              'text',
              {
                x: "400",
                y: "124",
                fill: tunnelColor,
                textAnchor: "middle",
                fontFamily: "var(--font-mono)",
                fontSize: "14px",
                fontWeight: "800",
                style: { textShadow: `0 0 10px ${tunnelColor}` }
              },
              isEncrypted ? "IPSEC ESP TUNNEL" : "UNENCRYPTED"
            )
          )
        )
      ),

      // NEW: RFC 4303 ESP WIRE-LEVEL PACKET FRAME DISSECTOR
      h(
        'div',
        {
          style: {
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "8px",
            padding: "16px"
          }
        },
        h(
          'div',
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              flexWrap: "wrap",
              gap: "8px"
            }
          },
          h(
            'div',
            {
              style: {
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
                letterSpacing: "1.5px",
                fontWeight: "700"
              }
            },
            "RFC 4303 WIRE-LEVEL PACKET ENCAPSULATION ANATOMY"
          ),
          h(
            'div',
            {
              style: {
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                color: "var(--neon-cyan)"
              }
            },
            isEncrypted ? "MODE: ESP TUNNEL (IPPROTO 50)" : "MODE: STANDARD IPv4 PAYLOAD"
          )
        ),
        h(
          'div',
          {
            style: {
              display: "flex",
              gap: "8px",
              width: "100%",
              flexWrap: "wrap"
            }
          },
          ...frameSegments.map((seg, idx) =>
            h(
              'div',
              {
                key: idx,
                style: {
                  flex: seg.flex,
                  minWidth: "125px",
                  background: "rgba(13, 19, 29, 0.9)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderTop: `3px solid ${seg.color}`,
                  borderRadius: "6px",
                  padding: "10px 12px",
                  boxShadow: "inset 0 0 15px rgba(0,0,0,0.5)"
                }
              },
              h(
                'div',
                {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "4px"
                  }
                },
                h(
                  'span',
                  {
                    style: {
                      fontSize: "9px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: "800",
                      color: seg.color,
                      letterSpacing: "0.5px"
                    }
                  },
                  seg.label
                ),
                h(
                  'span',
                  {
                    style: {
                      fontSize: "9px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)"
                    }
                  },
                  seg.bytes
                )
              ),
              h(
                'div',
                {
                  style: {
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-primary)",
                    fontWeight: "600",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }
                },
                seg.desc
              )
            )
          )
        )
      )
    ),

    // 4. EXISTING MODULAR SUB-COMPONENTS
    h(NetworkAddresses, { ipsec }),
    summary.protocol_counts
      ? h(ProtocolBreakdown, {
          protocols: summary.protocol_counts,
          total: summary.total_packets
        })
      : null,
    h(IpsecDetails, { ipsec })
  );
}