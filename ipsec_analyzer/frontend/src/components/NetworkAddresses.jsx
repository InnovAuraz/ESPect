import React, { useState } from "react";
import { displayList } from "../utils/format";

const h = React.createElement;

export default function NetworkAddresses({ ipsec }) {
  const [copiedIp, setCopiedIp] = useState(null);

  if (!ipsec) return null;

  const sources = displayList(ipsec.source_addresses);
  const destinations = displayList(ipsec.destination_addresses);

  const handleCopy = (addr) => {
    if (navigator?.clipboard && addr && addr !== "None") {
      navigator.clipboard.writeText(addr);
      setCopiedIp(addr);
      setTimeout(() => setCopiedIp(null), 1500);
    }
  };

  const renderEndpointBay = (title, roleCode, list, accentColor, prefix) =>
    h(
      "div",
      {
        style: {
          padding: "18px 20px",
          background: "rgba(0, 0, 0, 0.35)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderLeft: `3px solid ${accentColor}`,
          borderRadius: "8px",
          boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.55)",
          display: "flex",
          flexDirection: "column",
          gap: "14px"
        }
      },
      // Bay Header
      h(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
            paddingBottom: "10px"
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
                color: accentColor,
                letterSpacing: "1.5px",
                fontWeight: "700",
                marginBottom: "2px"
              }
            },
            roleCode
          ),
          h(
            "div",
            {
              className: "address-group-label",
              style: {
                fontSize: "14px",
                fontWeight: "800",
                color: "var(--text-primary)",
                margin: 0
              }
            },
            title
          )
        ),
        h(
          "span",
          {
            style: {
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.07)",
              padding: "2px 8px",
              borderRadius: "4px"
            }
          },
          `${list.length} HOST${list.length === 1 ? "" : "S"}`
        )
      ),

      // Address Cartridge List
      h(
        "div",
        {
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: "10px"
          }
        },
        ...list.map((addr, i) => {
          const isCopied = copiedIp === addr;
          const isPrimary = i === 0;
          const idxLabel = `${prefix}-${String(i + 1).padStart(2, "0")}`;

          return h(
            "div",
            {
              key: i,
              onClick: () => handleCopy(addr),
              title: "Click to copy IP address",
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                borderRadius: "6px",
                background: isCopied
                  ? "rgba(0, 255, 163, 0.12)"
                  : "rgba(13, 19, 29, 0.9)",
                border: isCopied
                  ? "1px solid var(--emerald-400)"
                  : `1px solid ${accentColor}40`,
                boxShadow: `0 0 12px ${accentColor}15`,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }
            },
            h("span", {
              style: {
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: isCopied ? "var(--emerald-400)" : accentColor,
                boxShadow: `0 0 8px ${isCopied ? "var(--emerald-400)" : accentColor}`
              }
            }),
            h(
              "span",
              {
                style: {
                  fontSize: "9px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                  letterSpacing: "0.5px",
                  fontWeight: "700"
                }
              },
              idxLabel
            ),
            h(
              "span",
              {
                className: "address-tag",
                style: {
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  fontWeight: "800",
                  color: isCopied ? "var(--emerald-400)" : "var(--text-primary)",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  margin: 0,
                  textShadow: `0 0 8px ${accentColor}40`
                }
              },
              isCopied ? "✓ COPIED" : addr
            )
          );
        })
      )
    );

  return h(
    "div",
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
      "div",
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
        "div",
        { style: { display: "flex", alignItems: "center", gap: "12px" } },
        // Glowing Vector Network Icon (Replaces Globe Emoji)
        h(
          "div",
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
            "svg",
            { viewBox: "0 0 24 24", style: { width: "18px", height: "18px" } },
            h("circle", {
              cx: "12",
              cy: "12",
              r: "9",
              fill: "none",
              stroke: "var(--neon-cyan)",
              strokeWidth: "1.8"
            }),
            h("ellipse", {
              cx: "12",
              cy: "12",
              rx: "4",
              ry: "9",
              fill: "none",
              stroke: "var(--emerald-400)",
              strokeWidth: "1.5"
            }),
            h("line", {
              x1: "3",
              y1: "12",
              x2: "21",
              y2: "12",
              stroke: "var(--neon-cyan)",
              strokeWidth: "1.5"
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
            "LAYER-3 ROUTING // HOST IDENTIFICATION"
          ),
          h(
            "span",
            {
              className: "card-title",
              style: {
                fontSize: "16px",
                fontWeight: "800",
                color: "var(--text-primary)",
                marginTop: "2px"
              }
            },
            "Network Endpoints"
          )
        )
      ),

      h(
        "span",
        {
          className: "card-badge secure",
          style: {
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            fontWeight: "800",
            letterSpacing: "1px",
            color: "var(--neon-cyan)",
            background: "rgba(0, 229, 255, 0.08)",
            border: "1px solid rgba(0, 229, 255, 0.35)",
            padding: "4px 12px",
            borderRadius: "20px",
            boxShadow: "0 0 10px rgba(0, 229, 255, 0.2)"
          }
        },
        `PROTOCOL: ${ipsec.ip_version ?? "IPv4"}`
      )
    ),

    // 2. CARD BODY
    h(
      "div",
      {
        className: "card-body",
        style: { padding: "22px 24px" }
      },
      h(
        "div",
        {
          className: "address-grid",
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "20px"
          }
        },
        renderEndpointBay(
          "Source Addresses",
          "INITIATOR // OUTBOUND",
          sources,
          "var(--neon-cyan)",
          "SRC"
        ),
        renderEndpointBay(
          "Destination Addresses",
          "RESPONDER // INBOUND",
          destinations,
          "var(--neon-purple)",
          "DST"
        )
      )
    )
  );
}