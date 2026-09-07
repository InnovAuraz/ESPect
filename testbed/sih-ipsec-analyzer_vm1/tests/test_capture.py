from pathlib import Path
import pytest

from scapy.all import ESP, IP, IPv6, UDP, Raw, wrpcap

from src.capture import Capture, CaptureError
from src.capture.validator import (
    CaptureValidationError,
    validate,
)


def test_initial_state(tmp_path):
    capture = Capture(
        interface="ens34",
        output=tmp_path / "test.pcap",
    )

    assert capture.running is False


def test_start_builds_correct_command(monkeypatch, tmp_path):
    command = []

    class FakeProcess:
        def poll(self):
            return None

    def fake_popen(args, **kwargs):
        command.extend(args)
        return FakeProcess()

    monkeypatch.setattr(
        "src.capture.capture.subprocess.Popen",
        fake_popen,
    )

    capture = Capture(
        interface="ens34",
        output=tmp_path / "test.pcap",
        capture_filter="host 192.168.160.129",
    )

    capture.start()

    assert command == [
        "tcpdump",
        "-i",
        "ens34",
        "-nn",
        "-w",
        str(tmp_path / "test.pcap"),
        "host 192.168.160.129",
    ]

    assert capture.running is True


def test_start_without_filter(monkeypatch, tmp_path):
    command = []

    class FakeProcess:
        def poll(self):
            return None

    def fake_popen(args, **kwargs):
        command.extend(args)
        return FakeProcess()

    monkeypatch.setattr(
        "src.capture.capture.subprocess.Popen",
        fake_popen,
    )

    capture = Capture(
        interface="ens34",
        output=tmp_path / "test.pcap",
    )

    capture.start()

    assert command == [
        "tcpdump",
        "-i",
        "ens34",
        "-nn",
        "-w",
        str(tmp_path / "test.pcap"),
    ]


def test_cannot_start_twice(monkeypatch, tmp_path):
    class FakeProcess:
        def poll(self):
            return None

    monkeypatch.setattr(
        "src.capture.capture.subprocess.Popen",
        lambda *args, **kwargs: FakeProcess(),
    )

    capture = Capture(
        interface="ens34",
        output=tmp_path / "test.pcap",
    )

    capture.start()

    with pytest.raises(CaptureError):
        capture.start()


def test_cannot_stop_when_not_running(tmp_path):
    capture = Capture(
        interface="ens34",
        output=tmp_path / "test.pcap",
    )

    with pytest.raises(CaptureError):
        capture.stop()


def test_stop(monkeypatch, tmp_path):
    class FakeProcess:
        def __init__(self):
            self.terminated = False
            self.waited = False

        def poll(self):
            return None

        def terminate(self):
            self.terminated = True

        def wait(self, timeout=None):
            self.waited = True

    process = FakeProcess()

    monkeypatch.setattr(
        "src.capture.capture.subprocess.Popen",
        lambda *args, **kwargs: process,
    )

    capture = Capture(
        interface="ens34",
        output=tmp_path / "test.pcap",
    )

    capture.start()
    capture.stop()

    assert process.terminated is True
    assert process.waited is True
    assert capture.running is False
    
def test_validate_valid_ipv4_pcap(tmp_path):
    pcap = tmp_path / "valid_ipv4.pcap"

    packets = [
        IP(src="192.168.160.128", dst="192.168.160.129")
        / UDP(sport=500, dport=500)
        / Raw(b"IKE"),

        IP(src="192.168.160.129", dst="192.168.160.128")
        / UDP(sport=500, dport=500)
        / Raw(b"IKE"),

        IP(src="192.168.160.128", dst="192.168.160.129")
        / ESP(spi=1, seq=1)
        / Raw(b"ESP"),

        IP(src="192.168.160.129", dst="192.168.160.128")
        / ESP(spi=2, seq=1)
        / Raw(b"ESP"),
    ]

    wrpcap(str(pcap), packets)

    assert validate(
        pcap,
        "ipv4",
        "192.168.160.128",
        "192.168.160.129",
    ) is True


def test_validate_valid_ipv6_pcap(tmp_path):
    pcap = tmp_path / "valid_ipv6.pcap"

    packets = [
        IPv6(src="fd00:160::128", dst="fd00:160::129")
        / UDP(sport=500, dport=500)
        / Raw(b"IKE"),

        IPv6(src="fd00:160::129", dst="fd00:160::128")
        / UDP(sport=500, dport=500)
        / Raw(b"IKE"),

        IPv6(src="fd00:160::128", dst="fd00:160::129")
        / ESP(spi=1, seq=1)
        / Raw(b"ESP"),

        IPv6(src="fd00:160::129", dst="fd00:160::128")
        / ESP(spi=2, seq=1)
        / Raw(b"ESP"),
    ]

    wrpcap(str(pcap), packets)

    assert validate(
        pcap,
        "ipv6",
        "fd00:160::128",
        "fd00:160::129",
    ) is True


def test_validate_rejects_empty_pcap(tmp_path):
    pcap = tmp_path / "empty.pcap"

    wrpcap(str(pcap), [])

    assert validate(
        pcap,
        "ipv4",
        "192.168.160.128",
        "192.168.160.129",
    ) is False


def test_validate_rejects_pcap_without_ike(tmp_path):
    pcap = tmp_path / "no_ike.pcap"

    packets = [
        IP(src="192.168.160.128", dst="192.168.160.129")
        / ESP(spi=1, seq=1)
        / Raw(b"ESP"),

        IP(src="192.168.160.129", dst="192.168.160.128")
        / ESP(spi=2, seq=1)
        / Raw(b"ESP"),
    ]

    wrpcap(str(pcap), packets)

    assert validate(
        pcap,
        "ipv4",
        "192.168.160.128",
        "192.168.160.129",
    ) is False


def test_validate_rejects_pcap_without_esp(tmp_path):
    pcap = tmp_path / "no_esp.pcap"

    packets = [
        IP(src="192.168.160.128", dst="192.168.160.129")
        / UDP(sport=500, dport=500)
        / Raw(b"IKE"),

        IP(src="192.168.160.129", dst="192.168.160.128")
        / UDP(sport=500, dport=500)
        / Raw(b"IKE"),
    ]

    wrpcap(str(pcap), packets)

    assert validate(
        pcap,
        "ipv4",
        "192.168.160.128",
        "192.168.160.129",
    ) is False


def test_validate_rejects_one_way_capture(tmp_path):
    pcap = tmp_path / "one_way.pcap"

    packets = [
        IP(src="192.168.160.128", dst="192.168.160.129")
        / UDP(sport=500, dport=500)
        / Raw(b"IKE"),

        IP(src="192.168.160.128", dst="192.168.160.129")
        / ESP(spi=1, seq=1)
        / Raw(b"ESP"),
    ]

    wrpcap(str(pcap), packets)

    assert validate(
        pcap,
        "ipv4",
        "192.168.160.128",
        "192.168.160.129",
    ) is False


def test_validate_rejects_wrong_ip_version(tmp_path):
    pcap = tmp_path / "ipv4.pcap"

    packets = [
        IP(src="192.168.160.128", dst="192.168.160.129")
        / UDP(sport=500, dport=500)
        / Raw(b"IKE"),

        IP(src="192.168.160.129", dst="192.168.160.128")
        / UDP(sport=500, dport=500)
        / Raw(b"IKE"),

        IP(src="192.168.160.128", dst="192.168.160.129")
        / ESP(spi=1, seq=1)
        / Raw(b"ESP"),

        IP(src="192.168.160.129", dst="192.168.160.128")
        / ESP(spi=2, seq=1)
        / Raw(b"ESP"),
    ]

    wrpcap(str(pcap), packets)

    assert validate(
        pcap,
        "ipv6",
        "fd00:160::128",
        "fd00:160::129",
    ) is False


def test_validate_missing_pcap(tmp_path):
    pcap = tmp_path / "missing.pcap"

    with pytest.raises(CaptureValidationError):
        validate(
            pcap,
            "ipv4",
            "192.168.160.128",
            "192.168.160.129",
        )


def test_validate_rejects_invalid_ip_version(tmp_path):
    pcap = tmp_path / "test.pcap"

    with pytest.raises(CaptureValidationError):
        validate(
            pcap,
            "invalid",
            "192.168.160.128",
            "192.168.160.129",
        )