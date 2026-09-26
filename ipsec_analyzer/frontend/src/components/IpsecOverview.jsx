import React from "react";
import { displayText, formatBytes } from "../utils/format";

const h = React.createElement;

export default function IpsecOverview({ ipsec }) {
  if (!ipsec) return null;

  const isEsp = Boolean(ipsec.esp_detected);
  const statusColor = isEsp ? "var(--emerald-400)" : "var(--neon-orange)";
  const statusGlow = isEsp ? "var(--shadow-glow-emerald)" : "var(--shadow-glow-amber)";

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

    // 1. UPGRADED CARD HEADER
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
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          gap: "12px",
          flexWrap: "wrap"
        }
      },
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "12px" } },
        // Glowing Vector Icon Box (Replaces Info Emoji)
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
            h("path", {
              d: "M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z",
              fill: "none",
              stroke: "var(--emerald-400)",
              strokeWidth: "2",
              strokeLinejoin: "round"
            }),
            h("circle", {
              cx: "12",
              cy: "12",
              r: "2.5",
              fill: "var(--neon-cyan)"
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
            "TUNNEL PARAMETERS // RFC 4301"
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
            "Connection Overview"
          )
        )
      ),

      // Live Tunnel Status Pill
      h(
        "span",
        {
          style: {
            fontSize: "10px",
            fontFamily: "var(--font-mono)",
            fontWeight: "800",
            color: statusColor,
            background: "rgba(0,0,0,0.45)",
            border: `1px solid ${statusColor}50`,
            padding: "4px 10px",
            borderRadius: "20px",
            letterSpacing: "1px",
            boxShadow: `0 0 10px ${statusColor}25`
          }
        },
        isEsp ? "● ESP ACTIVE" : "○ NO ESP"
      )
    ),

    // 2. CARD BODY
    h(
      "div",
      {
        className: "card-body",
        style: {
          padding: "20px 22px",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }
      },

      // Top Highlight Mini-Cards (ESP Packets & ESP Bytes)
      h(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px"
          }
        },
        h(
          "div",
          {
            style: {
              padding: "12px 14px",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderLeft: "3px solid var(--neon-cyan)",
              borderRadius: "6px",
              boxShadow: "inset 0 0 15px rgba(0,0,0,0.5)"
            }
          },
          h(
            "div",
            {
              style: {
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
                letterSpacing: "1px",
                fontWeight: "700"
              }
            },
            "ESP PACKET COUNT"
          ),
          h(
            "div",
            {
              style: {
                fontSize: "20px",
                fontFamily: "var(--font-mono)",
                fontWeight: "800",
                color: "var(--neon-cyan)",
                textShadow: "var(--shadow-glow-cyan)",
                marginTop: "4px"
              }
            },
            ipsec.esp_packet_count ?? 0
          )
        ),
        h(
          "div",
          {
            style: {
              padding: "12px 14px",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderLeft: `3px solid ${statusColor}`,
              borderRadius: "6px",
              boxShadow: "inset 0 0 15px rgba(0,0,0,0.5)"
            }
          },
          h(
            "div",
            {
              style: {
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
                letterSpacing: "1px",
                fontWeight: "700"
              }
            },
            "ESP PAYLOAD BYTES"
          ),
          h(
            "div",
            {
              style: {
                fontSize: "20px",
                fontFamily: "var(--font-mono)",
                fontWeight: "800",
                color: statusColor,
                textShadow: statusGlow,
                marginTop: "4px"
              }
            },
            formatBytes(ipsec.esp_bytes)
          )
        )
      ),

      // Parameter Rows
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }
        },
        h(Row, { label: "IP Version", value: displayText(ipsec.ip_version, "Unknown") }),
        h(Row, { label: "IKE Detected", value: ipsec.ike_detected ? "Yes" : "No" }),
        h(Row, { label: "IKE Version", value: displayText(ipsec.ike_version, "Not detected") }),
        h(Row, { label: "IPsec Mode", value: displayText(ipsec.mode, "Unknown") }),
        h(Row, { label: "ESP Detected", value: ipsec.esp_detected ? "Yes" : "No" }),
        h(Row, { label: "ESP Packet Count", value: ipsec.esp_packet_count }),
        h(Row, { label: "ESP Bytes", value: formatBytes(ipsec.esp_bytes) })
      )
    )
  );
}

function Row({ label, value }) {
  const strVal = String(value ?? "");
  const isMuted =
    value === "Unknown" ||
    value === "Not detected" ||
    value === "None" ||
    value === null ||
    value === undefined;
  const isPositive = strVal === "Yes" || strVal === "Tunnel" || strVal === "Transport";
  const isNegative = strVal === "No";

  let valueColor = "var(--neon-cyan)";
  let badgeBg = "rgba(0, 229, 255, 0.06)";
  let badgeBorder = "rgba(0, 229, 255, 0.25)";

  if (isMuted) {
    valueColor = "var(--text-muted)";
    badgeBg = "rgba(255, 255, 255, 0.02)";
    badgeBorder = "rgba(255, 255, 255, 0.06)";
  } else if (isPositive) {
    valueColor = "var(--emerald-400)";
    badgeBg = "rgba(0, 255, 163, 0.08)";
    badgeBorder = "rgba(0, 255, 163, 0.3)";
  } else if (isNegative) {
    valueColor = "var(--neon-orange)";
    badgeBg = "rgba(255, 170, 0, 0.08)";
    badgeBorder = "rgba(255, 170, 0, 0.3)";
  }

  return h(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: "6px",
        background: "rgba(0, 0, 0, 0.25)",
        border: "1px solid rgba(255, 255, 255, 0.04)",
        transition: "all 0.2s ease"
      },
      onMouseOver: (e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
        e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.2)";
      },
      onMouseOut: (e) => {
        e.currentTarget.style.background = "rgba(0, 0, 0, 0.25)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.04)";
      }
    },
    h(
      "span",
      {
        style: {
          color: "var(--text-secondary)",
          fontSize: "12px",
          fontWeight: "600",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.3px"
        }
      },
      label
    ),
    h(
      "span",
      {
        style: {
          color: valueColor,
          fontFamily: "var(--font-mono)",
          fontStyle: isMuted ? "italic" : "normal",
          fontSize: "12px",
          fontWeight: isMuted ? "500" : "700",
          background: badgeBg,
          border: `1px solid ${badgeBorder}`,
          padding: "2px 10px",
          borderRadius: "4px",
          letterSpacing: "0.5px"
        }
      },
      value
    )
  );
}

export { Row as KvRow };