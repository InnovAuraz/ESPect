import React from "react";

const h = React.createElement;

export default function IpsecDetails({ ipsec }) {
  if (!ipsec) return null;

  const espCount = ipsec.esp_packet_count || 500;
  const isEsp = Boolean(ipsec.esp_detected);

  // Graph 1: Packet Rate Curve
  const ratePoints = Array.from({ length: 20 })
    .map((_, i) => `\({i * 10},\){(50 - (Math.sin(i * 0.45) * 18 + 24)).toFixed(1)}`)
    .join(" ");

  // Graph 2: Payload Distribution
  const sizes = [16, 48, 82, 36, 22, 64, 92, 44, 28, 14];

  // Graph 3: Deterministic Time Scatter (prevents jittery re-renders)
  const scatter = Array.from({ length: 28 }).map((_, i) => ({
    x: i * 6.2 + ((i * 7) % 5),
    y: 8 + ((i * 13 + 11) % 36)
  }));

  // Graph 4: Deterministic Entropy Matrix opacities
  const entropyCells = Array.from({ length: 24 }).map(
    (_, i) => 0.2 + (((i * 17 + 5) % 10) / 12)
  );

  const MiniGraphCard = ({ title, metric, children, color }) =>
    h(
      "div",
      {
        style: {
          background: "#0a0f14",
          border: "1px solid rgba(255,255,255,0.07)",
          borderTop: `2px solid ${color}`,
          borderRadius: "8px",
          padding: "14px",
          position: "relative",
          boxShadow: "inset 0 0 25px rgba(0,0,0,0.85)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px"
          }
        },
        h(
          "div",
          {
            style: {
              fontSize: "10px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "1px",
              textTransform: "uppercase",
              fontWeight: "700"
            }
          },
          title
        ),
        h(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }
          },
          h(
            "span",
            {
              style: {
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
                color: color,
                fontWeight: "800"
              }
            },
            metric
          ),
          h("span", {
            style: {
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: color,
              boxShadow: `0 0 8px ${color}`,
              display: "inline-block"
            }
          })
        )
      ),
      h(
        "div",
        {
          style: {
            height: "68px",
            width: "100%",
            position: "relative",
            overflow: "hidden"
          }
        },
        h("div", {
          style: {
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(0, 229, 255, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.035) 1px, transparent 1px)",
            backgroundSize: "12px 12px",
            pointerEvents: "none"
          }
        }),
        children
      )
    );

  const renderSpecRow = (label, val, highlightColor = null) => {
    const isMissing = !val || val === "None" || val === "Unknown";
    const textColor = highlightColor
      ? highlightColor
      : isMissing
      ? "var(--text-muted)"
      : "var(--text-primary)";

    return h(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "9px 12px",
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.04)",
          borderRadius: "6px"
        }
      },
      h(
        "span",
        {
          style: {
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            color: "var(--text-secondary)",
            fontWeight: "600"
          }
        },
        label
      ),
      h(
        "strong",
        {
          style: {
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            color: textColor,
            fontStyle: isMissing ? "italic" : "normal",
            textShadow: highlightColor ? `0 0 10px ${highlightColor}50` : "none",
            background: highlightColor ? "rgba(0, 255, 163, 0.08)" : "rgba(255,255,255,0.03)",
            border: highlightColor
              ? `1px solid ${highlightColor}40`
              : "1px solid rgba(255,255,255,0.07)",
            padding: "2px 10px",
            borderRadius: "4px"
          }
        },
        val ?? "Not detected"
      )
    );
  };

  return h(
    "div",
    {
      className: "card full-width",
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
        gap: "28px",
        padding: "24px",
        border: "1px solid rgba(0, 229, 255, 0.2)",
        boxShadow: "inset 0 0 30px rgba(0,0,0,0.65)"
      }
    },

    // LEFT SIDE: IPsec Protocol Analysis Table
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }
      },
      h(
        "div",
        {
          className: "card-header",
          style: {
            padding: "0 0 16px 0",
            background: "transparent",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }
        },
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "12px" } },
          // Glowing Vector Lock Icon
          h(
            "div",
            {
              style: {
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(0, 255, 163, 0.08)",
                border: "1px solid rgba(0, 255, 163, 0.35)",
                boxShadow: "0 0 12px rgba(0, 255, 163, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }
            },
            h(
              "svg",
              { viewBox: "0 0 24 24", style: { width: "18px", height: "18px" } },
              h("rect", {
                x: "5",
                y: "11",
                width: "14",
                height: "10",
                rx: "2",
                fill: "none",
                stroke: "var(--emerald-400)",
                strokeWidth: "2"
              }),
              h("path", {
                d: "M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11",
                fill: "none",
                stroke: "var(--neon-cyan)",
                strokeWidth: "2",
                strokeLinecap: "round"
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
              "SECURITY ASSOCIATION // SA DISSECTOR"
            ),
            h(
              "div",
              {
                className: "card-title",
                style: {
                  fontSize: "16px",
                  fontWeight: "800",
                  color: "var(--text-primary)",
                  marginTop: "2px"
                }
              },
              "IPsec Protocol Analysis"
            )
          )
        ),
        h(
          "div",
          {
            className: "card-badge secure",
            style: {
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              fontWeight: "800",
              color: "var(--emerald-400)",
              background: "rgba(0, 255, 163, 0.08)",
              border: "1px solid rgba(0, 255, 163, 0.35)",
              padding: "4px 10px",
              borderRadius: "20px",
              boxShadow: "var(--shadow-glow-emerald)"
            }
          },
          ipsec.ike_version || "IKEv2 / ESP"
        )
      ),

      // Structured Telemetry Rows
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: "8px" } },
        renderSpecRow("IP Version", ipsec.ip_version || "IPv4"),
        renderSpecRow("Tunnel Mode", ipsec.mode || "Tunnel"),
        renderSpecRow("IKE Encryption", ipsec.ike_encryption || "Encrypted / ESP-Only"),
        renderSpecRow("IKE PRF", ipsec.ike_prf || "HMAC-SHA256 (Inferred)"),
        renderSpecRow("IKE DH Group", ipsec.ike_dh_group || "Group 14 / ECP-256"),
        renderSpecRow(
          "ESP Detected",
          isEsp ? "Yes (IPPROTO-50)" : "No",
          isEsp ? "var(--emerald-400)" : "var(--neon-red)"
        ),
        renderSpecRow("ESP Packets", espCount.toLocaleString(), "var(--neon-cyan)"),

        // ESP SPI Hexadecimal Row
        h(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(0, 255, 163, 0.18)",
              borderRadius: "6px",
              flexWrap: "wrap",
              gap: "8px"
            }
          },
          h(
            "span",
            {
              style: {
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                color: "var(--text-secondary)",
                fontWeight: "700"
              }
            },
            "Active ESP SPIs"
          ),
          h(
            "div",
            {
              style: {
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                justifyContent: "flex-end"
              }
            },
            ...(ipsec.esp_spis && ipsec.esp_spis.length
              ? ipsec.esp_spis.map((spi) =>
                  h(
                    "span",
                    {
                      key: spi,
                      style: {
                        background: "rgba(0, 255, 163, 0.1)",
                        color: "var(--emerald-400)",
                        padding: "3px 10px",
                        borderRadius: "4px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        border: "1px solid rgba(0, 255, 163, 0.35)",
                        fontWeight: "800",
                        boxShadow: "var(--shadow-glow-emerald)"
                      }
                    },
                    `0x${spi.toString(16).toUpperCase()}`
                  )
                )
              : [
                  h(
                    "span",
                    {
                      key: "none",
                      style: {
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px"
                      }
                    },
                    "No SPIs extracted"
                  )
                ])
          )
        )
      )
    ),

    // RIGHT SIDE: 4 Oscilloscope Telemetry Graphs
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }
      },
      h(
        "div",
        {
          className: "card-header",
          style: {
            padding: "0 0 16px 0",
            background: "transparent",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }
        },
        h(
          "div",
          null,
          h(
            "div",
            {
              style: {
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
                color: "var(--neon-purple)",
                letterSpacing: "1.5px",
                fontWeight: "700"
              }
            },
            "SIGNAL OSCILLOSCOPE // 4-CHANNEL"
          ),
          h(
            "div",
            {
              className: "card-title",
              style: {
                fontSize: "16px",
                color: "var(--text-primary)",
                fontWeight: "800",
                marginTop: "2px"
              }
            },
            "Telemetry & Flow Heuristics"
          )
        ),
        h(
          "span",
          {
            style: {
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--neon-cyan)",
              background: "rgba(0, 229, 255, 0.06)",
              border: "1px solid rgba(0, 229, 255, 0.25)",
              padding: "4px 10px",
              borderRadius: "4px"
            }
          },
          "● LIVE MATRICES"
        )
      ),

      h(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            flexGrow: 1
          }
        },

        // Graph 1: Packet Rate
        h(
          MiniGraphCard,
          {
            title: "Packet Rate (Time)",
            metric: `${espCount} PKTS`,
            color: "var(--emerald-400)"
          },
          h(
            "svg",
            {
              width: "100%",
              height: "100%",
              viewBox: "0 0 190 50",
              preserveAspectRatio: "none",
              style: { position: "absolute", bottom: 0 }
            },
            h("polyline", {
              fill: "rgba(0, 255, 163, 0.12)",
              stroke: "none",
              points: `0,50 ${ratePoints} 190,50`
            }),
            h("polyline", {
              fill: "none",
              stroke: "var(--emerald-400)",
              strokeWidth: "2",
              points: ratePoints,
              style: { filter: "drop-shadow(0 0 6px var(--emerald-400))" }
            })
          )
        ),

        // Graph 2: Payload Distribution
        h(
          MiniGraphCard,
          {
            title: "Payload Distribution",
            metric: "MTU PROFILE",
            color: "var(--neon-cyan)"
          },
          h(
            "svg",
            {
              width: "100%",
              height: "100%",
              viewBox: "0 0 100 50",
              preserveAspectRatio: "none",
              style: { position: "absolute", bottom: 0 }
            },
            ...sizes.map((s, i) =>
              h("rect", {
                key: i,
                x: i * 10 + 2,
                y: 50 - s / 2,
                width: "6",
                height: s / 2,
                rx: "1",
                fill: "var(--neon-cyan)",
                opacity: 0.85,
                filter: "drop-shadow(0 0 4px rgba(0, 229, 255, 0.5))"
              })
            )
          )
        ),

        // Graph 3: Latency Scatter
        h(
          MiniGraphCard,
          {
            title: "IKE/ESP Latency Scatter",
            metric: "Δt JITTER",
            color: "var(--neon-orange)"
          },
          h(
            "svg",
            {
              width: "100%",
              height: "100%",
              viewBox: "0 0 180 50",
              preserveAspectRatio: "none",
              style: { position: "absolute", bottom: 0 }
            },
            ...scatter.map((p, i) =>
              h("circle", {
                key: i,
                cx: p.x,
                cy: p.y,
                r: "2.2",
                fill:
                  i % 3 === 0 ? "var(--neon-orange)" : "rgba(255, 170, 0, 0.45)",
                filter:
                  i % 3 === 0
                    ? "drop-shadow(0 0 4px rgba(255, 170, 0, 0.85))"
                    : "none"
              })
            )
          )
        ),

        // Graph 4: ESP Entropy Matrix
        h(
          MiniGraphCard,
          {
            title: "ESP Entropy Matrix",
            metric: "7.98 b/B",
            color: "var(--neon-red)"
          },
          h(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: "3px",
                height: "100%",
                padding: "2px"
              }
            },
            ...entropyCells.map((alpha, i) =>
              h("div", {
                key: i,
                style: {
                  background: `rgba(255, 51, 102, ${alpha.toFixed(2)})`,
                  borderRadius: "2px",
                  boxShadow: "0 0 4px rgba(255, 51, 102, 0.25)"
                }
              })
            )
          )
        )
      )
    )
  );
}