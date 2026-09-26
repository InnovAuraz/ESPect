import React, { useState } from "react";

const h = React.createElement;

export default function StatsRow({ summary, ipsec }) {
  const [expandedHex, setExpandedHex] = useState(null);

  if (!summary) return null;

  const totalPkts = summary.total_packets || 0;
  const espPackets = ipsec?.esp_packet_count || 0;
  const nonEspPackets = Math.max(0, totalPkts - espPackets);
  const espPct = totalPkts > 0 ? ((espPackets / totalPkts) * 100).toFixed(1) : "0.0";
  const kbTotal = ((summary.total_bytes || 0) / 1024).toFixed(1);
  const kbRate = ((summary.bytes_per_second || 0) / 1024).toFixed(1);

  const cards = [
    {
      title: "TOTAL PACKETS",
      value: totalPkts.toLocaleString(),
      sub: `${summary.packets_per_second} pkt/s`,
      hex: "0x1A4F",
      colorVar: "var(--neon-cyan)",
      wave: "0,28 20,22 40,25 60,14 80,18 100,8",
      details: [
        { k: "INGESTION RATE", v: `${summary.packets_per_second} pkts/sec` },
        { k: "NON-ESP FRAMES", v: `${nonEspPackets.toLocaleString()} pkts` }
      ]
    },
    {
      title: "ESP PACKETS",
      value: espPackets.toLocaleString(),
      sub: `${espPct}% of total`,
      hex: "0x2B9C",
      colorVar: "var(--neon-purple)",
      wave: "0,26 20,24 40,15 60,19 80,10 100,12",
      details: [
        { k: "ENCAPSULATION RATIO", v: `${espPct}% ESP` },
        { k: "TUNNEL MODE", v: ipsec?.mode || "ESP Tunnel" }
      ]
    },
    {
      title: "DATA VOLUME",
      value: `${kbTotal} KB`,
      sub: `${kbRate} KB/s`,
      hex: "0x3C22",
      colorVar: "var(--emerald-400)",
      wave: "0,29 20,20 40,22 60,12 80,15 100,6",
      details: [
        { k: "RAW OCTETS", v: `${(summary.total_bytes || 0).toLocaleString()} B` },
        { k: "ESP PAYLOAD", v: `${((ipsec?.esp_bytes || 0) / 1024).toFixed(1)} KB` }
      ]
    },
    {
      title: "DURATION",
      value: `${summary.capture_duration}s`,
      sub: `Avg ${summary.mean_packet_size} B/pkt`,
      hex: "0x4D81",
      colorVar: "var(--neon-orange)",
      wave: "0,24 20,25 40,18 60,20 80,14 100,10",
      details: [
        { k: "MEAN FRAME SIZE", v: `${summary.mean_packet_size} Bytes` },
        { k: "WINDOW STATE", v: " PCAP LOCKED" }
      ]
    }
  ];

  return h(
    "div",
    {
      className: "stats-row",
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "20px",
        width: "100%"
      }
    },
    ...cards.map((c) => {
      const isOpen = expandedHex === c.hex;

      return h(
        "div",
        {
          key: c.hex,
          className: "stat-card card",
          style: {
            position: "relative",
            padding: "20px 22px",
            background: "rgba(10, 15, 22, 0.8)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderBottom: `3px solid ${c.colorVar}`,
            borderRadius: "10px",
            boxShadow: "inset 0 0 25px rgba(0,0,0,0.65)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            transition: "all 0.25s ease"
          }
        },

        // Top Row: Title + Hex Address Badge
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
              className: "stat-label",
              style: {
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--text-muted)",
                letterSpacing: "1px",
                fontFamily: "var(--font-mono)"
              }
            },
            c.title
          ),
          h(
            "span",
            {
              style: {
                fontSize: "10px",
                color: c.colorVar,
                fontFamily: "var(--font-mono)",
                fontWeight: "700",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${c.colorVar}35`,
                padding: "2px 6px",
                borderRadius: "4px"
              }
            },
            c.hex
          )
        ),

        // Main Monospace Value + Mini Sparkline
        h(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: "12px",
              margin: "4px 0 14px 0"
            }
          },
          h(
            "div",
            {
              className: "stat-value mono",
              style: {
                fontSize: "28px",
                fontWeight: "800",
                fontFamily: "var(--font-mono)",
                color: c.colorVar,
                textShadow: `0 0 15px ${c.colorVar}45`,
                lineHeight: "1.1"
              }
            },
            c.value
          ),
          h(
            "svg",
            {
              viewBox: "0 0 100 32",
              style: { width: "76px", height: "28px", overflow: "visible", opacity: 0.85 }
            },
            h("polyline", {
              fill: "none",
              stroke: c.colorVar,
              strokeWidth: "2",
              points: c.wave,
              style: { filter: `drop-shadow(0 0 5px ${c.colorVar})` }
            })
          )
        ),

        // Expandable Inline Forensic Details Drawer
        isOpen
          ? h(
              "div",
              {
                style: {
                  background: "rgba(0,0,0,0.45)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "6px",
                  padding: "8px 10px",
                  marginBottom: "12px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }
              },
              ...c.details.map((d, idx) =>
                h(
                  "div",
                  {
                    key: idx,
                    style: { display: "flex", justifyContent: "space-between" }
                  },
                  h("span", { style: { color: "var(--text-muted)" } }, d.k),
                  h("span", { style: { color: "var(--text-primary)", fontWeight: "700" } }, d.v)
                )
              )
            )
          : null,

        // Bottom Row: Sub-metric + Interactive Inspect Button
        h(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: "10px",
              borderTop: "1px solid rgba(255,255,255,0.05)"
            }
          },
          h(
            "span",
            {
              className: "stat-sub",
              style: {
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                color: "var(--text-secondary)",
                fontWeight: "600"
              }
            },
            c.sub
          ),
          h(
            "button",
            {
              type: "button",
              onClick: () => setExpandedHex(isOpen ? null : c.hex),
              style: {
                background: isOpen ? `${c.colorVar}25` : "rgba(255,255,255,0.03)",
                border: `1px solid ${c.colorVar}50`,
                color: c.colorVar,
                fontSize: "10px",
                fontWeight: "700",
                padding: "4px 10px",
                cursor: "pointer",
                borderRadius: "4px",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                transition: "all 0.2s ease"
              },
              onMouseOver: (e) => {
                e.currentTarget.style.background = `${c.colorVar}25`;
                e.currentTarget.style.borderColor = c.colorVar;
                e.currentTarget.style.boxShadow = `0 0 10px ${c.colorVar}40`;
              },
              onMouseOut: (e) => {
                e.currentTarget.style.background = isOpen
                  ? `${c.colorVar}25`
                  : "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = `${c.colorVar}50`;
                e.currentTarget.style.boxShadow = "none";
              }
            },
            isOpen ? "HIDE INTEL" : "GET DETAILS"
          )
        )
      );
    })
  );
}