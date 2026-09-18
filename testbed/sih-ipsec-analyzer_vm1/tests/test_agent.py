import pytest

from src.agent import Agent, AgentError


def configuration():
    return {
        "ipsec_mode": "transport",
        "encryption": "aes128-cbc",
        "integrity": "sha256",
        "dh_group": "modp2048",
        "pfs": False,
        "ip_version": "ipv4",
        "traffic_type": "icmp",
    }


def test_configure():
    agent = Agent()

    config = configuration()
    agent.configure(config)

    assert agent.configuration == config


def test_start_traffic_uses_traffic_command(monkeypatch):
    agent = Agent()
    agent.configure(configuration())

    called = {}

    def fake_command(
        traffic_type,
        role,
        target,
    ):
        called["traffic_type"] = traffic_type
        called["role"] = role
        called["target"] = target

        return [
            "ping",
            "-c",
            "10",
            target,
        ]

    class FakeProcess:
        pass

    def fake_popen(command):
        called["command"] = command
        return FakeProcess()

    monkeypatch.setattr(
        "src.agent.agent.command",
        fake_command,
    )

    monkeypatch.setattr(
        "src.agent.agent.subprocess.Popen",
        fake_popen,
    )

    agent.start_traffic(
        "192.168.160.129",
        "sender",
    )

    assert called == {
        "traffic_type": "icmp",
        "role": "sender",
        "target": "192.168.160.129",
        "command": [
            "ping",
            "-c",
            "10",
            "192.168.160.129",
        ],
    }

    assert agent.process is not None


def test_start_traffic_requires_configuration():
    agent = Agent()

    with pytest.raises(AgentError):
        agent.start_traffic(
            "192.168.160.129",
            "sender",
        )


def test_start_traffic_rejects_second_process(
    monkeypatch,
):
    agent = Agent()
    agent.configure(configuration())

    class FakeProcess:
        pass

    monkeypatch.setattr(
        "src.agent.agent.subprocess.Popen",
        lambda command: FakeProcess(),
    )

    agent.start_traffic(
        "192.168.160.129",
        "sender",
    )

    with pytest.raises(AgentError):
        agent.start_traffic(
            "192.168.160.129",
            "sender",
        )


def test_start_traffic_rejects_invalid_traffic(
    monkeypatch,
):
    agent = Agent()
    agent.configure(configuration())

    def fake_command(
        traffic_type,
        role,
        target,
    ):
        raise RuntimeError(
            "Unsupported traffic type"
        )

    monkeypatch.setattr(
        "src.agent.agent.command",
        fake_command,
    )

    with pytest.raises(AgentError):
        agent.start_traffic(
            "192.168.160.129",
            "sender",
        )


def test_start_traffic_handles_process_error(
    monkeypatch,
):
    agent = Agent()
    agent.configure(configuration())

    monkeypatch.setattr(
        "src.agent.agent.subprocess.Popen",
        lambda command: (
            (_ for _ in ()).throw(
                OSError("process failed")
            )
        ),
    )

    with pytest.raises(AgentError):
        agent.start_traffic(
            "192.168.160.129",
            "sender",
        )

    assert agent.process is None


def test_wait():
    agent = Agent()

    class FakeProcess:
        def wait(self):
            return 0

    agent.process = FakeProcess()

    agent.wait()

    assert agent.process is None


def test_wait_rejects_missing_process():
    agent = Agent()

    with pytest.raises(AgentError):
        agent.wait()


def test_wait_reports_traffic_failure():
    agent = Agent()

    class FakeProcess:
        def wait(self):
            return 1

    agent.process = FakeProcess()

    with pytest.raises(AgentError):
        agent.wait()

    assert agent.process is None