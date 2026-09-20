import React from 'react';
import ProtocolBreakdown from './ProtocolBreakdown';
import IpsecDetails from './IpsecDetails';
import NetworkAddresses from './NetworkAddresses';

export default function ProtocolScanView({ summary, ipsec }) {
  if (!summary || !ipsec) return null;

  const src = ipsec.source_addresses?.[0] || "192.168.160.128";
  const dst = ipsec.destination_addresses?.[0] || "192.168.160.129";
  const isEncrypted = ipsec.esp_detected;
  const tunnelColor = isEncrypted ? "#00ff9d" : "#ff4757";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", width: "100%" }}>
      
      {/* Animated Network Topology UI */}
      <div className="card" style={{ padding: "1.5rem" }}>
         <div className="card-header" style={{ marginBottom: "1rem" }}>
            <div className="card-title">Live Network Topology & Encapsulation</div>
            <div className="card-badge secure">REAL-TIME TRACE</div>
         </div>
         
         <div style={{ width: "100%", height: "220px", background: "#06090c", borderRadius: "6px", border: "1px solid #1a2634", position: "relative", overflow: "hidden" }}>
           {/* Background Grid */}
           <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#1a2634 1px, transparent 1px), linear-gradient(90deg, #1a2634 1px, transparent 1px)", backgroundSize: "20px 20px", opacity: 0.3 }} />
           
           <svg viewBox="0 0 800 200" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
             
             {/* Connection Line */}
             <line x1="200" y1="100" x2="600" y2="100" stroke={tunnelColor} strokeWidth="2" strokeDasharray="10, 10">
               <animate attributeName="stroke-dashoffset" from="100" to="0" dur="3s" repeatCount="indefinite" />
             </line>
             
             {/* Animated Packets flowing through the tunnel */}
             <circle cx="200" cy="100" r="4" fill={tunnelColor} filter={`drop-shadow(0 0 8px ${tunnelColor})`}>
               <animate attributeName="cx" values="200;600" dur="1.2s" repeatCount="indefinite" />
             </circle>
             <circle cx="600" cy="100" r="4" fill={tunnelColor} filter={`drop-shadow(0 0 8px ${tunnelColor})`}>
               <animate attributeName="cx" values="600;200" dur="1.8s" repeatCount="indefinite" />
             </circle>

             {/* Node A */}
             <rect x="120" y="60" width="80" height="80" fill="#0a0f14" stroke="#3b82f6" strokeWidth="2" rx="4" />
             <text x="160" y="95" fill="#e2e8f0" textAnchor="middle" fontFamily="monospace" fontSize="14px" fontWeight="bold">NODE A</text>
             <text x="160" y="115" fill="#64748b" textAnchor="middle" fontFamily="monospace" fontSize="10px">{src}</text>
             
             {/* Node B */}
             <rect x="600" y="60" width="80" height="80" fill="#0a0f14" stroke="#3b82f6" strokeWidth="2" rx="4" />
             <text x="640" y="95" fill="#e2e8f0" textAnchor="middle" fontFamily="monospace" fontSize="14px" fontWeight="bold">NODE B</text>
             <text x="640" y="115" fill="#64748b" textAnchor="middle" fontFamily="monospace" fontSize="10px">{dst}</text>

             {/* IPsec Gateway Box */}
             <rect x="340" y="70" width="120" height="60" fill="#0a0f14" stroke={tunnelColor} strokeWidth="1" rx="30" />
             <text x="400" y="105" fill={tunnelColor} textAnchor="middle" fontFamily="monospace" fontSize="14px" fontWeight="bold">
               {isEncrypted ? "IPSEC ESP TUNNEL" : "UNENCRYPTED"}
             </text>
           </svg>
         </div>
      </div>

      <NetworkAddresses ipsec={ipsec} />
      
      {summary.protocol_counts && (
        <ProtocolBreakdown protocols={summary.protocol_counts} total={summary.total_packets} />
      )}
      
      <IpsecDetails ipsec={ipsec} />
    </div>
  );
}