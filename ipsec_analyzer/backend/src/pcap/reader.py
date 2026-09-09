from pathlib import Path
from typing import Iterator

from scapy.all import PcapReader as ScapyPcapReader

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

        elif raw.haslayer("ICMP"):
            protocol = "ICMP"

        elif raw.haslayer("ICMPv6EchoRequest") or raw.haslayer("ICMPv6EchoReply"):
            protocol = "ICMPv6"

        elif raw.haslayer("ESP"):
            protocol = "ESP"

        return Packet(
            timestamp=float(raw.time),
            length=len(raw),
            source=source,
            destination=destination,
            protocol=str(protocol),
            source_port=source_port,
            destination_port=destination_port,
            raw=raw,
        )