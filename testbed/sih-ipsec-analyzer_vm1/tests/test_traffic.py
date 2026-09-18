import pytest

from src.traffic import (
    ROLES,
    TRAFFIC_TYPES,
    TrafficError,
    command,
    run,
)


IPV4_TARGET = "192.168.160.129"
IPV6_TARGET = "2001:db8::2"


def test_traffic_types():
    assert TRAFFIC_TYPES == {
        "icmp",
        "web",
        "email",
        "video",
        "voip",
        "whatsapp",
    }


def test_roles():
    assert ROLES == {
        "sender",
        "receiver",
        "peer",
    }


def test_icmp_ipv4_sender_command():
    assert command(
        "icmp",
        "sender",
        IPV4_TARGET,
    ) == [
        __import__("sys").executable,
        "-m",
        "src.traffic.traffic",
        "--run",
        "icmp",
        "--role",
        "sender",
        "--target",
        IPV4_TARGET,
    ]


def test_icmp_ipv6_sender_command():
    assert command(
        "icmp",
        "sender",
        IPV6_TARGET,
    ) == [
        __import__("sys").executable,
        "-m",
        "src.traffic.traffic",
        "--run",
        "icmp",
        "--role",
        "sender",
        "--target",
        IPV6_TARGET,
    ]


@pytest.mark.parametrize(
    "traffic_type",
    [
        "web",
        "email",
        "video",
        "voip",
        "whatsapp",
    ],
)
def test_profile_command(traffic_type):
    assert command(
        traffic_type,
        "sender" if traffic_type != "voip" else "peer",
        IPV4_TARGET,
    ) == [
        __import__("sys").executable,
        "-m",
        "src.traffic.traffic",
        "--run",
        traffic_type,
        "--role",
        "sender" if traffic_type != "voip" else "peer",
        "--target",
        IPV4_TARGET,
    ]


def test_receiver_command():
    assert command(
        "web",
        "receiver",
        IPV4_TARGET,
    ) == [
        __import__("sys").executable,
        "-m",
        "src.traffic.traffic",
        "--run",
        "web",
        "--role",
        "receiver",
        "--target",
        IPV4_TARGET,
    ]


def test_peer_command():
    assert command(
        "voip",
        "peer",
        IPV4_TARGET,
    ) == [
        __import__("sys").executable,
        "-m",
        "src.traffic.traffic",
        "--run",
        "voip",
        "--role",
        "peer",
        "--target",
        IPV4_TARGET,
    ]


def test_unsupported_traffic():
    with pytest.raises(TrafficError):
        command(
            "unknown",
            "sender",
            IPV4_TARGET,
        )


def test_unsupported_role():
    with pytest.raises(TrafficError):
        command(
            "icmp",
            "unknown",
            IPV4_TARGET,
        )


def test_missing_target():
    with pytest.raises(TrafficError):
        command(
            "icmp",
            "sender",
            "",
        )


def test_invalid_target():
    with pytest.raises(TrafficError):
        command(
            "icmp",
            "sender",
            "not-an-ip",
        )


def test_run(monkeypatch):
    called = {}

    def fake_run(args, check):
        called["args"] = args
        called["check"] = check
        returncode = 0

        class Result:
            pass

        result = Result()
        result.returncode = returncode
        return result

    monkeypatch.setattr(
        "src.traffic.traffic.subprocess.run",
        fake_run,
    )

    run(
        "icmp",
        "sender",
        IPV4_TARGET,
    )

    assert called["args"] == [
        __import__("sys").executable,
        "-m",
        "src.traffic.traffic",
        "--run",
        "icmp",
        "--role",
        "sender",
        "--target",
        IPV4_TARGET,
    ]

    assert called["check"] is False


def test_run_failure(monkeypatch):
    def fake_run(args, check):
        class Result:
            returncode = 1

        return Result()

    monkeypatch.setattr(
        "src.traffic.traffic.subprocess.run",
        fake_run,
    )

    with pytest.raises(TrafficError):
        run(
            "icmp",
            "sender",
            IPV4_TARGET,
        )