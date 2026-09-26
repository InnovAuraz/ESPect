import React from "react";
import { displayText, displayList } from "../utils/format";
import { KvRow } from "./IpsecOverview";

const h = React.createElement;

export default function IkeConfiguration({ ipsec }) {
  if (!ipsec) return null;

  const exchangeTypes = displayList(ipsec.ike_exchange_types, null);
  const ikeDetected = Boolean(ipsec.ike_detected);
  const badgeColor = ikeDetected ? "var(--emerald-400)" : "var(--neon-orange)";

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
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          gap: "12px",
          flexWrap: "wrap"
        }
      },
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "12px" } },
        // Vector Key Exchange Icon (Replaces Gear Emoji)
        h(
          "div",
          {
            style: {
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "rgba(255, 170, 0, 0.1)",
              border: "1px solid rgba(255, 170, 0, 0.4)",
              boxShadow: "0 0 12px rgba(255, 170, 0, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }
          },
          h(
            "svg",
            { viewBox: "0 0 24 24", style: { width: "18px", height: "18px" } },
            h("circle", {
              cx: "8",
              cy: "15",
              r: "4",
              fill: "none",
              stroke: "var(--neon-orange)",
              strokeWidth: "2"
            }),
            h("path", {
              d: "M10.85 12.15L19 4M18 5L20 7M15 8L17 10",
              fill: "none",
              stroke: "var(--neon-orange)",
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
            "KEY EXCHANGE // UDP 500 & 4500"
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
            "IKE Configuration"
          )
        )
      ),

      h(
        "span",
        {
          style: {
            fontSize: "10px",
            fontFamily: "var(--font-mono)",
            fontWeight: "800",
            color: badgeColor,
            background: "rgba(0,0,0,0.45)",
            border: `1px solid ${badgeColor}50`,
            padding: "4px 10px",
            borderRadius: "20px",
            letterSpacing: "1px"
          }
        },
        ikeDetected ? "● HANDSHAKE CAPTURED" : "○ ESP MID-STREAM"
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
          gap: "14px"
        }
      },

      // Status Callout Strip
      h(
        "div",
        {
          style: {
            padding: "10px 12px",
            borderRadius: "6px",
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderLeft: `3px solid ${badgeColor}`,
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--text-secondary)"
          }
        },
        ikeDetected
          ? "ISAKMP / IKE negotiation payloads decoded from capture."
          : "Capture started after SA establishment (ESP data-plane active)."
      ),

      // KV Rows
      h(
        "div",
        {
          className: "kv-list",
          style: { display: "flex", flexDirection: "column", gap: "8px" }
        },
        h(KvRow, { label: "Encryption", value: displayText(ipsec.ike_encryption) }),
        h(KvRow, { label: "Integrity", value: displayText(ipsec.ike_integrity) }),
        h(KvRow, { label: "PRF", value: displayText(ipsec.ike_prf) }),
        h(KvRow, { label: "DH Group", value: displayText(ipsec.ike_dh_group) }),

        // Exchange Types Row
        h(
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
              flexWrap: "wrap",
              gap: "8px"
            }
          },
          h(
            "span",
            {
              style: {
                color: "var(--text-secondary)",
                fontSize: "12px",
                fontWeight: "600",
                fontFamily: "var(--font-mono)"
              }
            },
            "Exchange Types"
          ),
          exchangeTypes
            ? h(
                "div",
                {
                  style: {
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    justifyContent: "flex-end"
                  }
                },
                ...exchangeTypes.map((type) =>
                  h(
                    "span",
                    {
                      key: type,
                      style: {
                        background: "rgba(255, 170, 0, 0.1)",
                        color: "var(--neon-orange)",
                        padding: "2px 10px",
                        borderRadius: "4px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        border: "1px solid rgba(255, 170, 0, 0.35)",
                        fontWeight: "700",
                        boxShadow: "var(--shadow-glow-amber)"
                      }
                    },
                    type
                  )
                )
              )
            : h(
                "span",
                {
                  style: {
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    fontStyle: "italic",
                    fontSize: "12px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    padding: "2px 10px",
                    borderRadius: "4px"
                  }
                },
                "None detected"
              )
        )
      )
    )
  );
}