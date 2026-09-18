from pathlib import Path

import pytest
from scapy.all import Ether, IP, TCP, UDP, wrpcap

from src.pcap import Packet, PcapReader


@pytest.fixture
def pcap_file(tmp_path: Path) -> Path:
    path = tmp_path / "test.pcap"

    packets = [
        Ether()
        / IP(src="192.168.1.10", dst="192.168.1.20")
        / TCP(sport=1234, dport=80),
        Ether()
        / IP(src="192.168.1.20", dst="192.168.1.10")
        / UDP(sport=5000, dport=5001),
    ]

    wrpcap(str(path), packets)
    return path


def test_reader_requires_existing_file(tmp_path: Path):
    path = tmp_path / "missing.pcap"

    with pytest.raises(FileNotFoundError):
        PcapReader(path)


def test_reader_reads_packets(pcap_file: Path):
    packets = list(PcapReader(pcap_file))

    assert len(packets) == 2
    assert all(isinstance(packet, Packet) for packet in packets)


def test_reader_extracts_tcp_packet(pcap_file: Path):
    packet = list(PcapReader(pcap_file))[0]

    assert packet.source == "192.168.1.10"
    assert packet.destination == "192.168.1.20"
    assert packet.protocol == "TCP"
    assert packet.source_port == 1234
    assert packet.destination_port == 80
    assert packet.length > 0
    assert packet.raw is not None


def test_reader_extracts_udp_packet(pcap_file: Path):
    packet = list(PcapReader(pcap_file))[1]

    assert packet.source == "192.168.1.20"
    assert packet.destination == "192.168.1.10"
    assert packet.protocol == "UDP"
    assert packet.source_port == 5000
    assert packet.destination_port == 5001


def test_reader_preserves_timestamp(pcap_file: Path):
    packet = list(PcapReader(pcap_file))[0]

    assert isinstance(packet.timestamp, float)


def test_reader_is_iterable(pcap_file: Path):
    reader = PcapReader(pcap_file)

    first = next(iter(reader))

    assert isinstance(first, Packet)