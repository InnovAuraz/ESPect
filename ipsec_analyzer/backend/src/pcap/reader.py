from pathlib import Path
from typing import Iterator

from scapy.all import PcapReader as ScapyPcapReader
from scapy.contrib import ikev2

from .packet import Packet


class PcapReader:
    def __init__(self, path: str | Path):
        self.path = Path(path)

        if not self.path.is_file():
            raise FileNotFoundError(f"PCAP file not found: {self.path}")

    def __iter__(self) -> Iterator[Packet]:
        with ScapyPcapReader(str(self.path)) as reader:
            for raw in reader:
                yield self._convert(raw)

    @staticmethod
    def _convert(raw) -> Packet:
        source = None
        destination = None
        protocol = "OTHER"
        source_port = None
        destination_port = None
        esp_spi = None
        esp_sequence = None

        if raw.haslayer("IP"):
            ip = raw["IP"]
            source = ip.src
            destination = ip.dst
            protocol = ip.proto

        elif raw.haslayer("IPv6"):
            ip = raw["IPv6"]
            source = ip.src
            destination = ip.dst
            protocol = ip.nh

        if raw.haslayer("TCP"):
            protocol = "TCP"
            source_port = raw["TCP"].sport
            destination_port = raw["TCP"].dport

        elif raw.haslayer("UDP"):
            protocol = "UDP"
            source_port = raw["UDP"].sport
            destination_port = raw["UDP"].dport

            if 4500 in {source_port, destination_port}:
                payload = bytes(raw["UDP"].payload)

                if len(payload) >= 8 and payload[:4] != b"\x00\x00\x00\x00":
                    protocol = "ESP"
                    esp_spi = int.from_bytes(payload[:4], "big")
                    esp_sequence = int.from_bytes(payload[4:8], "big")

        elif raw.haslayer("ICMP"):
            protocol = "ICMP"

        elif raw.haslayer("ICMPv6EchoRequest") or raw.haslayer("ICMPv6EchoReply"):
            protocol = "ICMPv6"

        elif raw.haslayer("ESP"):
            protocol = "ESP"
            esp_spi = getattr(raw["ESP"], "spi", None)
            esp_sequence = getattr(raw["ESP"], "seq", None)

        return Packet(
            timestamp=float(raw.time),
            length=len(raw),
            source=source,
            destination=destination,
            protocol=str(protocol),
            source_port=source_port,
            destination_port=destination_port,
            raw=raw,
            esp_spi=esp_spi,
            esp_sequence=esp_sequence,
        )