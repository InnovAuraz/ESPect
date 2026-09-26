import React, { useState } from 'react';

const h = React.createElement;

export default function StartupGuide() {
  const [copiedCmd, setCopiedCmd] = useState(null);

  const handleCopy = (code) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCmd(code);
      setTimeout(() => setCopiedCmd(null), 1800);
    }
  };

  const specs = [
    {
      label: "PYTHON RUNTIME",
      val: "v3.10+ VENV",
      sub: "Scapy • PyTorch / ML • FastAPI",
      color: "var(--neon-cyan)"
    },
    {
      label: "TARGET PROTOCOLS",
      val: "UDP 500 / 4500",
      sub: "IKEv2 Negotiation + ESP (Proto 50)",
      color: "var(--neon-purple)"
    },
    {
      label: "INTERFACE PRIVILEGE",
      val: "CAP_NET_RAW",
      sub: "Root / sudo packet socket binding",
      color: "var(--neon-orange)"
    },
    {
      label: "ASGI TELEMETRY SOCKET",
      val: "PORT 8000",
      sub: "http://0.0.0.0:8000 (Auto-Reload)",
      color: "var(--emerald-400)"
    }
  ];

  const TerminalBlock = ({ code, label = "bash — root@espect-node-01", accent = "var(--neon-cyan)" }) => {
    const isCopied = copiedCmd === code;

    return h(
      'div',
      {
        style: {
          background: "#0a0f14",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "8px",
          margin: "12px 0",
          boxShadow: "inset 0 0 25px rgba(0,0,0,0.85)",
          overflow: "hidden"
        }
      },
      // Terminal Top Bar (Matches SystemInternals)
      h(
        'div',
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 14px",
            background: "#131822",
            borderBottom: "1px solid rgba(255,255,255,0.05)"
          }
        },
        h(
          'div',
          { style: { display: "flex", alignItems: "center", gap: "12px" } },
          h(
            'div',
            { style: { display: "flex", gap: "6px" } },
            h('span', {
              style: {
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#ff5f56",
                boxShadow: "0 0 5px #ff5f56",
                display: "inline-block"
              }
            }),
            h('span', {
              style: {
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#ffbd2e",
                boxShadow: "0 0 5px #ffbd2e",
                display: "inline-block"
              }
            }),
            h('span', {
              style: {
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#27c93f",
                boxShadow: "0 0 5px #27c93f",
                display: "inline-block"
              }
            })
          ),
          h(
            'span',
            {
              style: {
                fontSize: "11px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.5px"
              }
            },
            label
          )
        ),
        h(
          'button',
          {
            type: "button",
            onClick: () => handleCopy(code),
            style: {
              background: isCopied ? "rgba(0, 255, 163, 0.12)" : "rgba(255,255,255,0.04)",
              border: isCopied
                ? "1px solid var(--emerald-400)"
                : "1px solid rgba(255,255,255,0.1)",
              color: isCopied ? "var(--emerald-400)" : "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              fontWeight: "700",
              padding: "3px 10px",
              borderRadius: "4px",
              cursor: "pointer",
              letterSpacing: "0.8px",
              transition: "all 0.2s ease"
            }
          },
          isCopied ? "✓ COPIED" : "COPY CMD"
        )
      ),

      // Terminal Command Body
      h(
        'div',
        {
          style: {
            padding: "14px 18px",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            color: accent,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            overflowX: "auto"
          }
        },
        h(
          'span',
          {
            style: {
              color: "var(--text-muted)",
              userSelect: "none",
              fontWeight: "700"
            }
          },
          "root@espect:~#"
        ),
        h(
          'span',
          {
            style: {
              color: accent,
              textShadow: `0 0 8px ${accent}40`,
              fontWeight: "600"
            }
          },
          code
        )
      )
    );
  };

  const GuideStep = ({ num, phase, badge, title, children, glowColor }) =>
    h(
      'div',
      {
        className: "card",
        style: {
          position: "relative",
          overflow: "hidden",
          background: "rgba(10, 15, 22, 0.75)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.65)"
        }
      },
      // Left Neon Accent Rail
      h('div', {
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          width: "4px",
          height: "100%",
          background: glowColor,
          boxShadow: `0 0 15px ${glowColor}`
        }
      }),

      // Step Header
      h(
        'div',
        {
          className: "card-header",
          style: {
            padding: "18px 24px",
            background: "rgba(13, 19, 29, 0.85)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }
        },
        h(
          'div',
          { style: { display: "flex", alignItems: "center", gap: "14px" } },
          h(
            'div',
            {
              style: {
                padding: "6px 10px",
                borderRadius: "6px",
                background: "rgba(0,0,0,0.5)",
                border: `1px solid ${glowColor}50`,
                color: glowColor,
                fontFamily: "var(--font-mono)",
                fontSize: "14px",
                fontWeight: "800",
                textShadow: `0 0 10px ${glowColor}80`,
                boxShadow: `0 0 12px ${glowColor}20`
              }
            },
            `0${num}`
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
                  color: glowColor,
                  letterSpacing: "1.5px",
                  fontWeight: "700"
                }
              },
              phase
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
              title
            )
          )
        ),
        h(
          'span',
          {
            style: {
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: glowColor,
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${glowColor}40`,
              padding: "4px 10px",
              borderRadius: "4px",
              letterSpacing: "1px",
              fontWeight: "700"
            }
          },
          badge
        )
      ),

      // Step Body
      h(
        'div',
        {
          className: "card-body",
          style: {
            padding: "22px 24px",
            color: "var(--text-secondary)",
            fontSize: "14px",
            lineHeight: "1.7"
          }
        },
        children
      )
    );

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
            "DEPLOYMENT RUNBOOK & ARCHITECTURE"
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
            "Analyzer Startup Guide"
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
            "System architecture, node configuration, and operational protocols for SIH 2026."
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
            "DOCS VERSION"
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
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "var(--emerald-400)",
                boxShadow: "var(--shadow-glow-emerald)",
                display: "inline-block"
              }
            }),
            h(
              'span',
              {
                style: {
                  fontSize: "24px",
                  fontWeight: "800",
                  color: "var(--neon-cyan)",
                  fontFamily: "var(--font-mono)",
                  textShadow: "var(--shadow-glow-cyan)",
                  letterSpacing: "0.5px"
                }
              },
              "v1.0.0-SIH"
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

    // 2. TOP PREREQUISITES TELEMETRY STRIP
    h(
      'div',
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "20px"
        }
      },
      ...specs.map((s, idx) =>
        h(
          'div',
          {
            key: idx,
            className: "card",
            style: {
              padding: "18px 20px",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderLeft: `3px solid ${s.color}`,
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
            s.label
          ),
          h(
            'div',
            {
              style: {
                fontSize: "20px",
                fontWeight: "800",
                color: s.color,
                fontFamily: "var(--font-mono)",
                marginTop: "8px",
                textShadow: `0 0 10px ${s.color}50`
              }
            },
            s.val
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
            s.sub
          )
        )
      )
    ),

    // 3. STEP-BY-STEP EXECUTION CARDS
    h(
      'div',
      { style: { display: "grid", gridTemplateColumns: "1fr", gap: "24px" } },

      // STEP 01
      h(
        GuideStep,
        {
          num: "1",
          phase: "PHASE 01 // DEPENDENCY BOOTSTRAP",
          badge: "PYTHON 3.10+ ENV",
          title: "Environment Initialization",
          glowColor: "var(--neon-cyan)"
        },
        h(
          'p',
          { style: { marginTop: 0, marginBottom: "14px" } },
          "The ESPect Analyzer requires an isolated Python 3.10+ virtual environment with cryptographic dissection (Scapy/PyShark) and ML inference dependencies to decode IPsec/ESP payloads."
        ),
        h(TerminalBlock, {
          code: "python -m venv venv && source venv/bin/activate",
          label: "step-01a — virtual-env-init",
          accent: "var(--neon-cyan)"
        }),
        h(TerminalBlock, {
          code: "pip install -r requirements.txt",
          label: "step-01b — install-dependencies",
          accent: "var(--neon-cyan)"
        })
      ),

      // STEP 02
      h(
        GuideStep,
        {
          num: "2",
          phase: "PHASE 02 // NETWORK INTERFACE BINDING",
          badge: "UDP 500 / 4500 & ESP",
          title: "Packet Acquisition Protocol",
          glowColor: "var(--neon-purple)"
        },
        h(
          'p',
          { style: { marginTop: 0, marginBottom: "14px" } },
          "To analyze tunnel behavior, capture the VPN key exchange negotiation (IKEv2 / ISAKMP) and the subsequent encrypted payload stream (ESP) across UDP ports 500 and 4500."
        ),
        h(TerminalBlock, {
          code: "tcpdump -i eth0 -n -w capture.pcap udp port 500 or udp port 4500",
          label: "step-02 — tcpdump-acquisition-socket",
          accent: "var(--neon-purple)"
        }),
        h(
          'div',
          {
            style: {
              marginTop: "14px",
              padding: "10px 14px",
              borderRadius: "6px",
              background: "rgba(255, 170, 0, 0.05)",
              borderLeft: "3px solid var(--neon-orange)",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--text-secondary)"
            }
          },
          h('strong', { style: { color: "var(--neon-orange)" } }, "PRIVILEGE NOTE: "),
          "Ensure you run tcpdump with elevated privileges (sudo or CAP_NET_RAW) to bind directly to the network interface."
        )
      ),

      // STEP 03
      h(
        GuideStep,
        {
          num: "3",
          phase: "PHASE 03 // ASGI ENGINE & ML WORKER IGNITION",
          badge: "FASTAPI :8000",
          title: "Igniting the AI Analysis Engine",
          glowColor: "var(--emerald-400)"
        },
        h(
          'p',
          { style: { marginTop: 0, marginBottom: "14px" } },
          "Once the PCAP is acquired (or prior to launching Live Capture), start the FastAPI backend. The deep packet inspection (DPI) dissector and neural network classifiers will automatically spin up on worker threads."
        ),
        h(TerminalBlock, {
          code: "uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload",
          label: "step-03 — uvicorn-asgi-server",
          accent: "var(--emerald-400)"
        }),
        h(
          'div',
          {
            style: {
              marginTop: "14px",
              padding: "10px 14px",
              borderRadius: "6px",
              background: "rgba(0, 255, 163, 0.06)",
              borderLeft: "3px solid var(--emerald-400)",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--emerald-400)",
              fontWeight: "600"
            }
          },
          "● SOCKET SYNC: The frontend UI will automatically transition to ONLINE (READY) once http://0.0.0.0:8000/api/v1/health responds."
        )
      )
    )
  );
}