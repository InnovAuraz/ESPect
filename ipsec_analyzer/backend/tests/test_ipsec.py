from pathlib import Path

from scapy.all import (
    ESP,
    Ether,
    IP,
    UDP,
    wrpcap,
)

from scapy.contrib.ikev2 import (
    IKEv2,
    IKEv2_KE,
    IKEv2_SA,
    IKEv2_Proposal,
    IKEv2_Transform,
)

from src.ipsec import IPsecAnalysis, analyze
from src.pcap import PcapReader


def create_ipsec_pcap(path: Path) -> None:
    packets = [
        Ether()
        / IP(src="192.168.1.10", dst="192.168.1.20")
        / UDP(sport=500, dport=500)
        / IKEv2(
            exch_type="IKE_SA_INIT",
            flags="Initiator",
        )
        / IKEv2_SA(
            prop=IKEv2_Proposal(
                proto="IKE",
                trans=(
                    IKEv2_Transform(
                        transform_type="Encryption",
                        transform_id="AES-CBC",
                        key_length=128,
                    )
                    / IKEv2_Transform(
                        transform_type="PRF",
                        transform_id="PRF_HMAC_SHA2_256",
                    )
                    / IKEv2_Transform(
                        transform_type="Integrity",
                        transform_id=12,
                    )
                    / IKEv2_Transform(
                        transform_type="GroupDesc",
                        transform_id="2048MODPgr",
                    )
                ),
            )
        ),

        Ether()
        / IP(src="192.168.1.20", dst="192.168.1.10")
        / UDP(sport=500, dport=500)
        / IKEv2(
            exch_type="IKE_SA_INIT",
            flags="Response",
        )
        / IKEv2_SA(
            prop=IKEv2_Proposal(
                proto="IKE",
                trans=(
                    IKEv2_Transform(
                        transform_type="Encryption",
                        transform_id="AES-CBC",
                        key_length=128,
                    )
                    / IKEv2_Transform(
                        transform_type="PRF",
                        transform_id="PRF_HMAC_SHA2_256",
                    )
                    / IKEv2_Transform(
                        transform_type="Integrity",
                        transform_id=12,
                    )
                    / IKEv2_Transform(
                        transform_type="GroupDesc",
                        transform_id="2048MODPgr",
                    )
                ),
            )
        ),

        Ether()
        / IP(src="192.168.1.10", dst="192.168.1.20")
        / ESP(spi=0x12345678, seq=1),

        Ether()
        / IP(src="192.168.1.20", dst="192.168.1.10")
        / ESP(spi=0x87654321, seq=1),

        Ether()
        / IP(src="192.168.1.10", dst="192.168.1.20")
        / ESP(spi=0x12345678, seq=2),
    ]

    for index, packet in enumerate(packets):
        packet.time = 1000.0 + index * 0.1

    wrpcap(str(path), packets)


def test_empty_analysis():
    result = analyze([])

    assert isinstance(result, IPsecAnalysis)
    assert result.ip_version is None
    assert result.ike_detected is False
    assert result.ike_encryption is None
    assert result.ike_integrity is None
    assert result.ike_prf is None
    assert result.ike_dh_group is None
    assert result.esp_detected is False
    assert result.esp_pfs is None


def test_detects_ike_configuration(tmp_path: Path):
    path = tmp_path / "ipsec.pcap"
    create_ipsec_pcap(path)

    packets = list(PcapReader(path))
    result = analyze(packets)

    assert result.ike_version == "IKEv2"
    assert result.ike_encryption == "aes-cbc"
    assert result.ike_integrity == "sha256"
    assert result.ike_prf == "sha256"
    assert result.ike_dh_group == "modp2048"


def test_detects_exchange_type(tmp_path: Path):
    path = tmp_path / "ipsec.pcap"
    create_ipsec_pcap(path)

    packets = list(PcapReader(path))
    result = analyze(packets)

    assert "IKE_SA_INIT" in result.ike_exchange_types


def test_detects_esp(tmp_path: Path):
    path = tmp_path / "ipsec.pcap"
    create_ipsec_pcap(path)

    packets = list(PcapReader(path))
    result = analyze(packets)

    assert result.esp_detected is True
    assert result.esp_packet_count == 3
    assert result.esp_bytes > 0


def test_extracts_esp_spi(tmp_path: Path):
    path = tmp_path / "ipsec.pcap"
    create_ipsec_pcap(path)

    packets = list(PcapReader(path))
    result = analyze(packets)

    assert result.esp_spis == (
        0x12345678,
        0x87654321,
    )


def test_extracts_esp_sequence_numbers(tmp_path: Path):
    path = tmp_path / "ipsec.pcap"
    create_ipsec_pcap(path)

    packets = list(PcapReader(path))
    result = analyze(packets)

    assert result.esp_sequence_numbers == (1, 1, 2)


def test_ip_version(tmp_path: Path):
    path = tmp_path / "ipsec.pcap"
    create_ipsec_pcap(path)

    packets = list(PcapReader(path))
    result = analyze(packets)

    assert result.ip_version == "ipv4"


def test_endpoints(tmp_path: Path):
    path = tmp_path / "ipsec.pcap"
    create_ipsec_pcap(path)

    packets = list(PcapReader(path))
    result = analyze(packets)

    assert result.source_addresses == (
        "192.168.1.10",
        "192.168.1.20",
    )

    assert result.destination_addresses == (
        "192.168.1.10",
        "192.168.1.20",
    )


def test_transport_mode(tmp_path: Path):
    path = tmp_path / "ipsec.pcap"
    create_ipsec_pcap(path)

    packets = list(PcapReader(path))
    result = analyze(packets)

    assert result.mode == "transport"


def test_esp_configuration_is_unknown_when_not_visible(
    tmp_path: Path,
):
    path = tmp_path / "ipsec.pcap"
    create_ipsec_pcap(path)

    packets = list(PcapReader(path))
    result = analyze(packets)

    assert result.esp_encryption is None
    assert result.esp_integrity is None
    assert result.esp_pfs is None