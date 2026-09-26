import React from "react";

const h = React.createElement;

function EvidenceRow({ code, label, sub, value, color }) {
  return h(
    "div",
    {
      className: "evidence-row",
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 14px",
        background: "rgba(0, 0, 0, 0.35)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderLeft: `3px solid ${color}`,
        borderRadius: "8px",
        boxShadow: "inset 0 0 15px rgba(0, 0, 0, 0.5)"
      }
    },
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: "10px" } },
      h("span", {
        style: {
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 8px ${color}`,
          flexShrink: 0
        }
      }),
      h(
        "div",
        null,
        h(
          "div",
          {
            style: {
              fontSize: "9px",
              fontFamily: "var(--font-mono)",
              color: color,
              letterSpacing: "1px",
              fontWeight: "700"
            }
          },
          code
        ),
        h(
          "div",
          {
            className: "evidence-label",
            style: {
              fontSize: "13px",
              fontWeight: "700",
              color: "var(--text-primary)",
              marginTop: "1px"
            }
          },
          label
        ),
        sub
          ? h(
              "div",
              {
                style: {
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)"
                }
              },
              sub
            )
          : null
      )
    ),
    h(
      "strong",
      {
        className: "evidence-value",
        style: {
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          fontWeight: "800",
          color: color,
          background: "rgba(255, 255, 255, 0.03)",
          border: `1px solid ${color}40`,
          padding: "4px 10px",
          borderRadius: "4px",
          textShadow: `0 0 8px ${color}40`
        }
      },
      value
    )
  );
}

export default function EvidencePosture({ ipsec, traffic, findings }) {
  if (!ipsec || !traffic || !findings) return null;

  const observed = [
    ipsec.ike_detected,
    ipsec.esp_detected,
    ipsec.ike_version,
    ipsec.ike_encryption,
    ipsec.ike_dh_group,
    ipsec.mode,
  ].filter(Boolean).length;

  const unavailable = findings.filter(
    (finding) => finding.source === "not_observed"
  ).length;

  const mlConfPct = Math.round((traffic.confidence ?? 0) * 100);

  return h(
    "div",
    {
      className: "card evidence-card",
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
        h(
          "div",
          {
            style: {
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "rgba(187, 134, 252, 0.1)",
              border: "1px solid rgba(187, 134, 252, 0.4)",
              boxShadow: "0 0 12px rgba(187, 134, 252, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--neon-purple)",
              fontSize: "16px"
            }
          },
          "◈"
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
            "FORENSIC CHAIN OF CUSTODY"
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
            "Evidence Posture"
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
            color: "var(--emerald-400)",
            background: "rgba(0, 255, 163, 0.08)",
            border: "1px solid rgba(0, 255, 163, 0.35)",
            padding: "4px 10px",
            borderRadius: "20px",
            boxShadow: "var(--shadow-glow-emerald)"
          }
        },
        "● TRACEABLE RESULT"
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
          justifyContent: "space-between",
          gap: "14px",
          flexGrow: 1
        }
      },

      h(
        "p",
        {
          className: "evidence-intro",
          style: {
            margin: 0,
            fontSize: "12px",
            color: "var(--text-secondary)",
            lineHeight: "1.5"
          }
        },
        "Every forensic conclusion is strictly segregated by how the raw packet capture supports it."
      ),

      // Evidence Telemetry Rows
      h(
        "div",
        {
          className: "evidence-list",
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }
        },
        h(EvidenceRow, {
          code: "TIER 01 // DIRECT WIRE PROOF",
          label: "Observed from PCAP",
          sub: "Deterministic header & SA extraction",
          value: `${observed} facts`,
          color: "var(--emerald-400)"
        }),
        h(EvidenceRow, {
          code: "TIER 02 // HEURISTIC CLASSIFIER",
          label: "ML traffic inference",
          sub: "Statistical flow timing & size profile",
          value: `${mlConfPct}%`,
          color: "var(--neon-purple)"
        }),
        h(EvidenceRow, {
          code: "TIER 03 // CRYPTOGRAPHIC BOUNDARY",
          label: "Not observable here",
          sub: "Protected inside encrypted tunnel",
          value: `${unavailable} fields`,
          color: "var(--neon-orange)"
        })
      ),

      // Cryptographic Boundary Callout Box
      h(
        "div",
        {
          className: "evidence-note",
          style: {
            padding: "10px 12px",
            borderRadius: "6px",
            background: "rgba(0, 229, 255, 0.04)",
            border: "1px solid rgba(0, 229, 255, 0.18)",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--text-secondary)",
            lineHeight: "1.5"
          }
        },
        h("strong", { style: { color: "var(--neon-cyan)" } }, "EVIDENCE BOUNDARY: "),
        "Encrypted Child-SA parameters are reported as unavailable unless the capture explicitly exposes key negotiation."
      )
    )
  );
}