import React from "react";

const h = React.createElement;

export default function TrafficClassification({ traffic }) {
  if (!traffic) return null;

  const confPct = Math.round((traffic.confidence ?? 0) * 100);

  // Generate 40 "Neural Activation" bell curve bars based on confidence
  const bars = Array.from({ length: 40 }).map((_, i) => {
    const pctThreshold = (i / 40) * 100;
    const isActive = confPct >= pctThreshold;
    const height = 6 + 38 * Math.exp(-Math.pow(i - 20, 2) / 80);

    const barColor =
      i > 26
        ? "var(--emerald-400)"
        : i > 13
        ? "var(--neon-cyan)"
        : "var(--neon-purple)";

    return h("rect", {
      key: i,
      x: i * 7.5,
      y: 50 - height,
      width: "4.5",
      height: height,
      rx: "1.5",
      fill: isActive ? barColor : "rgba(255,255,255,0.06)",
      style: {
        filter: isActive ? `drop-shadow(0 0 4px ${barColor})` : "none",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
      }
    });
  });

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
        position: "relative",
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
              justifyContent: "center"
            }
          },
          h(
            "svg",
            { viewBox: "0 0 24 24", style: { width: "18px", height: "18px" } },
            h("circle", { cx: "6", cy: "6", r: "2.5", fill: "var(--neon-cyan)" }),
            h("circle", { cx: "18", cy: "6", r: "2.5", fill: "var(--neon-purple)" }),
            h("circle", { cx: "12", cy: "18", r: "2.5", fill: "var(--emerald-400)" }),
            h("path", {
              d: "M8 7.5L11 16M16 7.5L13 16M8.5 6H15.5",
              stroke: "rgba(255,255,255,0.45)",
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
            "BEHAVIORAL FLOW CLASSIFIER"
          ),
          h(
            "div",
            {
              style: {
                fontSize: "16px",
                fontWeight: "800",
                color: "var(--text-primary)",
                marginTop: "2px"
              }
            },
            "Deep Packet Inspection"
          )
        )
      ),

      h(
        "div",
        {
          style: {
            fontSize: "10px",
            fontFamily: "var(--font-mono)",
            background: "rgba(187, 134, 252, 0.1)",
            color: "var(--neon-purple)",
            padding: "4px 12px",
            borderRadius: "20px",
            border: "1px solid rgba(187, 134, 252, 0.4)",
            letterSpacing: "1px",
            fontWeight: "800",
            boxShadow: "var(--shadow-glow-purple)"
          }
        },
        "● ML INFERENCE"
      )
    ),

    // 2. CARD BODY
    h(
      "div",
      {
        className: "card-body",
        style: {
          padding: "22px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "20px",
          flexGrow: 1
        }
      },

      // Target Classification HUD Stage
      h(
        "div",
        {
          style: {
            position: "relative",
            padding: "24px 16px",
            borderRadius: "10px",
            background: "radial-gradient(circle at 50% 50%, rgba(0, 229, 255, 0.1) 0%, rgba(8, 12, 18, 0.95) 100%)",
            border: "1px solid rgba(0, 229, 255, 0.25)",
            boxShadow: "inset 0 0 25px rgba(0,0,0,0.75)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexGrow: 1
          }
        },
        h(
          "div",
          {
            style: {
              fontSize: "9px",
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              letterSpacing: "2px",
              marginBottom: "8px",
              fontWeight: "700"
            }
          },
          "PREDICTED ENCRYPTED PAYLOAD PROFILE"
        ),
        h(
          "div",
          {
            style: {
              fontSize: "clamp(26px, 3.2vw, 38px)",
              fontWeight: "900",
              fontFamily: "var(--font-mono)",
              color: "var(--neon-cyan)",
              textShadow: "var(--shadow-glow-cyan)",
              textTransform: "uppercase",
              letterSpacing: "3px",
              lineHeight: "1.15"
            }
          },
          traffic.predicted_type || "UNKNOWN"
        ),
        h(
          "div",
          {
            style: {
              marginTop: "10px",
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--emerald-400)",
              background: "rgba(0, 255, 163, 0.08)",
              border: "1px solid rgba(0, 255, 163, 0.3)",
              padding: "2px 10px",
              borderRadius: "4px"
            }
          },
          "ENTROPY SIGNATURE LOCKED"
        )
      ),

      // Neural Net Confidence Bell-Curve Spectrum
      h(
        "div",
        null,
        h(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "11px",
              color: "var(--text-muted)",
              marginBottom: "8px",
              fontFamily: "var(--font-mono)",
              fontWeight: "700"
            }
          },
          h("span", { style: { letterSpacing: "1px" } }, "NEURAL NET CONFIDENCE MAP"),
          h(
            "span",
            {
              style: {
                fontSize: "14px",
                color: "var(--neon-purple)",
                fontWeight: "800",
                textShadow: "var(--shadow-glow-purple)"
              }
            },
            `${confPct}%`
          )
        ),

        h(
          "div",
          {
            style: {
              height: "76px",
              width: "100%",
              background: "#0a0f14",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "8px",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "flex-end",
              padding: "6px",
              boxShadow: "inset 0 0 25px rgba(0,0,0,0.85)"
            }
          },
          h("div", {
            style: {
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(0, 229, 255, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.035) 1px, transparent 1px)",
              backgroundSize: "15px 15px",
              pointerEvents: "none"
            }
          }),
          h(
            "svg",
            {
              width: "100%",
              height: "100%",
              viewBox: "0 0 300 50",
              preserveAspectRatio: "none",
              style: {
                position: "absolute",
                bottom: 0,
                left: "6px",
                right: "6px",
                width: "calc(100% - 12px)"
              }
            },
            ...bars
          )
        )
      )
    )
  );
}