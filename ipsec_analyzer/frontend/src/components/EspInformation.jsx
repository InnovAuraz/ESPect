import React, { useState } from "react";
import { displayText, displayBoolean, displayList, formatSpi } from "../utils/format";
import { KvRow } from "./IpsecOverview";

const h = React.createElement;

export default function EspInformation({ ipsec }) {
  const [copiedSpi, setCopiedSpi] = useState(null);

  if (!ipsec) return null;

  const spis = displayList(ipsec.esp_spis, null);
  const spiCount = spis ? spis.length : 0;

  const handleCopySpi = (spiFormatted) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(spiFormatted);
      setCopiedSpi(spiFormatted);
      setTimeout(() => setCopiedSpi(null), 1500);
    }
  };

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
        // Vector ESP Encapsulation Icon (Replaces Info Emoji)
        h(
          "div",
          {
            style: {
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "rgba(0, 229, 255, 0.08)",
              border: "1px solid rgba(0, 229, 255, 0.35)",
              boxShadow: "0 0 12px rgba(0, 229, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }
          },
          h(
            "svg",
            { viewBox: "0 0 24 24", style: { width: "18px", height: "18px" } },
            h("rect", {
              x: "4",
              y: "4",
              width: "16",
              height: "16",
              rx: "3",
              fill: "none",
              stroke: "var(--neon-cyan)",
              strokeWidth: "2"
            }),
            h("rect", {
              x: "9",
              y: "9",
              width: "6",
              height: "6",
              rx: "1",
              fill: "var(--emerald-400)"
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
            "DATA PLANE // RFC 4303 ESP"
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
            "ESP Information"
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
            color: spiCount > 0 ? "var(--neon-cyan)" : "var(--text-muted)",
            background: "rgba(0,0,0,0.45)",
            border: spiCount > 0
              ? "1px solid rgba(0, 229, 255, 0.4)"
              : "1px solid rgba(255,255,255,0.08)",
            padding: "4px 10px",
            borderRadius: "20px",
            letterSpacing: "1px"
          }
        },
        `\({spiCount} SPI\){spiCount === 1 ? "" : "S"} ACTIVE`
      )
    ),

    // 2. CARD BODY
    h(
      "div",
      {
        className: "card-body",
        style: { padding: "20px 22px" }
      },
      h(
        "div",
        {
          className: "kv-list",
          style: { display: "flex", flexDirection: "column", gap: "8px" }
        },
        h(KvRow, { label: "ESP Encryption", value: displayText(ipsec.esp_encryption) }),
        h(KvRow, { label: "ESP Integrity", value: displayText(ipsec.esp_integrity) }),
        h(KvRow, { label: "PFS (Forward Secrecy)", value: displayBoolean(ipsec.esp_pfs) }),

        // SPI Hexadecimal Register Row
        h(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              borderRadius: "6px",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(0, 229, 255, 0.15)",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "4px"
            }
          },
          h(
            "span",
            {
              style: {
                color: "var(--text-secondary)",
                fontSize: "12px",
                fontWeight: "700",
                fontFamily: "var(--font-mono)"
              }
            },
            "Security Parameter Indexes (SPIs)"
          ),
          spis
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
                ...spis.map((spi) => {
                  const formatted = formatSpi(spi);
                  const isCopied = copiedSpi === formatted;

                  return h(
                    "span",
                    {
                      key: spi,
                      title: "Click to copy SPI hex value",
                      onClick: () => handleCopySpi(formatted),
                      style: {
                        background: isCopied
                          ? "rgba(0, 255, 163, 0.15)"
                          : "rgba(0, 229, 255, 0.1)",
                        color: isCopied ? "var(--emerald-400)" : "var(--neon-cyan)",
                        padding: "3px 10px",
                        borderRadius: "4px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        border: isCopied
                          ? "1px solid var(--emerald-400)"
                          : "1px solid rgba(0, 229, 255, 0.35)",
                        fontWeight: "800",
                        boxShadow: "var(--shadow-glow-cyan)",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }
                    },
                    isCopied ? "✓ COPIED" : formatted
                  );
                })
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