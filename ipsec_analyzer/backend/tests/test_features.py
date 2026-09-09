from pathlib import Path
import pytest
from scapy.all import Ether, IP, TCP, UDP, wrpcap

from src.features import FEATURE_NAMES, extract, extract_dict
from src.pcap import PcapReader


def create_pcap(path: Path) -> None:
    packets = [
        Ether()
        / IP(src="10.0.0.1", dst="10.0.0.2")
        / TCP(sport=1000, dport=80),

        Ether()
        / IP(src="10.0.0.2", dst="10.0.0.1")
        / TCP(sport=80, dport=1000),

        Ether()
        / IP(src="10.0.0.1", dst="10.0.0.2")
        / UDP(sport=5000, dport=5001),

        Ether()
        / IP(src="10.0.0.2", dst="10.0.0.1")
        / UDP(sport=5001, dport=5000),
    ]

    for index, packet in enumerate(packets):
        packet.time = 1000.0 + index * 0.1

    wrpcap(str(path), packets)


def test_feature_count(tmp_path: Path):
    path = tmp_path / "test.pcap"
    create_pcap(path)

    packets = list(PcapReader(path))
    features = extract(packets)

    assert len(features) == 54


def test_feature_names_match_vector():
    assert len(FEATURE_NAMES) == 54


def test_feature_names_are_unique():
    assert len(FEATURE_NAMES) == len(set(FEATURE_NAMES))


def test_features_are_floats(tmp_path: Path):
    path = tmp_path / "test.pcap"
    create_pcap(path)

    packets = list(PcapReader(path))
    features = extract(packets)

    assert all(isinstance(value, float) for value in features)


def test_basic_features(tmp_path: Path):
    path = tmp_path / "test.pcap"
    create_pcap(path)

    packets = list(PcapReader(path))
    features = extract_dict(packets)

    assert features["total_packets"] == 4.0
    assert features["total_bytes"] > 0
    assert features["capture_duration"] == pytest.approx(0.3)
    assert features["forward_packets"] == 2.0
    assert features["reverse_packets"] == 2.0


def test_protocol_features(tmp_path: Path):
    path = tmp_path / "test.pcap"
    create_pcap(path)

    packets = list(PcapReader(path))
    features = extract_dict(packets)

    assert features["tcp_packet_ratio"] == 0.5
    assert features["udp_packet_ratio"] == 0.5
    assert features["icmp_packet_ratio"] == 0.0
    assert features["esp_packet_ratio"] == 0.0


def test_flow_features(tmp_path: Path):
    path = tmp_path / "test.pcap"
    create_pcap(path)

    packets = list(PcapReader(path))
    features = extract_dict(packets)

    assert features["flow_count"] == 2.0
    assert features["bidirectional_flow_count"] == 2.0
    assert features["unidirectional_flow_count"] == 0.0


def test_empty_input():
    features = extract([])

    assert len(features) == 54
    assert all(value == 0.0 for value in features)


def test_real_reader_to_feature_extractor(tmp_path: Path):
    path = tmp_path / "test.pcap"
    create_pcap(path)

    packets = list(PcapReader(path))
    features = extract(packets)

    assert len(features) == len(FEATURE_NAMES)
    assert features[0] == 4.0