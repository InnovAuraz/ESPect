from src.controller import Controller


def test_controller_configures_both_agents():
    controller = Controller(
        "192.168.160.128",
        "192.168.160.129",
    )

    configuration_a = {
        "traffic_type": "icmp",
    }

    configuration_b = {
        "traffic_type": "icmp",
    }

    controller.configure(
        configuration_a,
        configuration_b,
    )


def test_controller_starts_transport_traffic_with_roles(monkeypatch):
    controller = Controller(
        "192.168.160.128",
        "192.168.160.129",
    )

    calls = []

    def fake_send(
        host,
        action,
        **data,
    ):
        calls.append(
            {
                "host": host,
                "action": action,
                **data,
            }
        )

        return {"ok": True}

    monkeypatch.setattr(
        "src.controller.controller.send",
        fake_send,
    )

    controller.start_traffic(
        "sender",
        "receiver",
        "transport",
    )

    assert sorted(
        calls,
        key=lambda call: call["host"],
    ) == [
        {
            "host": "192.168.160.128",
            "action": "start",
            "target": "192.168.160.129",
            "role": "sender",
        },
        {
            "host": "192.168.160.129",
            "action": "start",
            "target": "192.168.160.128",
            "role": "receiver",
        },
    ]


def test_controller_starts_tunnel_traffic_with_roles(monkeypatch):
    controller = Controller(
        "192.168.160.128",
        "192.168.160.129",
    )

    calls = []

    def fake_send(
        host,
        action,
        **data,
    ):
        calls.append(
            {
                "host": host,
                "action": action,
                **data,
            }
        )

        return {"ok": True}

    monkeypatch.setattr(
        "src.controller.controller.send",
        fake_send,
    )

    controller.start_traffic(
        "sender",
        "receiver",
        "tunnel",
    )

    assert sorted(
        calls,
        key=lambda call: call["host"],
    ) == [
        {
            "host": "192.168.160.128",
            "action": "start",
            "target": "10.10.2.1",
            "role": "sender",
        },
        {
            "host": "192.168.160.129",
            "action": "start",
            "target": "10.10.1.1",
            "role": "receiver",
        },
    ]


def test_controller_applies_transport_ipsec(monkeypatch):
    controller = Controller(
        "192.168.160.128",
        "192.168.160.129",
    )

    calls = []

    def fake_send(
        host,
        action,
        **data,
    ):
        calls.append(
            {
                "host": host,
                "action": action,
                **data,
            }
        )

        return {"ok": True}

    monkeypatch.setattr(
        "src.controller.controller.send",
        fake_send,
    )

    configuration = {
        "ipsec_mode": "transport",
        "encryption": "aes128-cbc",
        "integrity": "sha256",
        "dh_group": "modp2048",
        "pfs": False,
        "ip_version": "ipv4",
    }

    controller.apply_ipsec(configuration)

    assert len(calls) == 2

    for call in calls:
        assert call["action"] == "apply_ipsec"
        assert "mode = transport" in call["config_text"]
        assert "local_ts = 192.168.160." in call["config_text"]
        assert "remote_ts = 192.168.160." in call["config_text"]


def test_controller_applies_tunnel_ipsec(monkeypatch):
    controller = Controller(
        "192.168.160.128",
        "192.168.160.129",
    )

    calls = []

    def fake_send(
        host,
        action,
        **data,
    ):
        calls.append(
            {
                "host": host,
                "action": action,
                **data,
            }
        )

        return {"ok": True}

    monkeypatch.setattr(
        "src.controller.controller.send",
        fake_send,
    )

    configuration = {
        "ipsec_mode": "tunnel",
        "encryption": "aes128-cbc",
        "integrity": "sha256",
        "dh_group": "modp2048",
        "pfs": False,
        "ip_version": "ipv4",
    }

    controller.apply_ipsec(configuration)

    assert len(calls) == 2

    call_a = next(
        call
        for call in calls
        if call["host"] == "192.168.160.128"
    )

    call_b = next(
        call
        for call in calls
        if call["host"] == "192.168.160.129"
    )

    assert "mode = tunnel" in call_a["config_text"]
    assert "local_ts = 10.10.1.1/32" in call_a["config_text"]
    assert "remote_ts = 10.10.2.1/32" in call_a["config_text"]

    assert "mode = tunnel" in call_b["config_text"]
    assert "local_ts = 10.10.2.1/32" in call_b["config_text"]
    assert "remote_ts = 10.10.1.1/32" in call_b["config_text"]
    
def test_controller_applies_ipv6_transport_ipsec(monkeypatch):
    controller = Controller(
        "192.168.160.128",
        "192.168.160.129",
    )

    calls = []

    def fake_send(
        host,
        action,
        **data,
    ):
        calls.append(
            {
                "host": host,
                "action": action,
                **data,
            }
        )

        return {"ok": True}

    monkeypatch.setattr(
        "src.controller.controller.send",
        fake_send,
    )

    configuration = {
        "ipsec_mode": "transport",
        "encryption": "aes128-cbc",
        "integrity": "sha256",
        "dh_group": "modp2048",
        "pfs": False,
        "ip_version": "ipv6",
    }

    controller.apply_ipsec(configuration)

    assert len(calls) == 2

    call_a = next(
        call
        for call in calls
        if call["host"] == "192.168.160.128"
    )

    call_b = next(
        call
        for call in calls
        if call["host"] == "192.168.160.129"
    )

    assert "local_addrs = fd00:160::128" in call_a["config_text"]
    assert "remote_addrs = fd00:160::129" in call_a["config_text"]
    assert "local_ts = fd00:160::128/128" in call_a["config_text"]
    assert "remote_ts = fd00:160::129/128" in call_a["config_text"]

    assert "local_addrs = fd00:160::129" in call_b["config_text"]
    assert "remote_addrs = fd00:160::128" in call_b["config_text"]
    assert "local_ts = fd00:160::129/128" in call_b["config_text"]
    assert "remote_ts = fd00:160::128/128" in call_b["config_text"]

def test_controller_applies_ipv6_tunnel_ipsec(monkeypatch):
    controller = Controller(
        "192.168.160.128",
        "192.168.160.129",
    )

    calls = []

    def fake_send(
        host,
        action,
        **data,
    ):
        calls.append(
            {
                "host": host,
                "action": action,
                **data,
            }
        )

        return {"ok": True}

    monkeypatch.setattr(
        "src.controller.controller.send",
        fake_send,
    )

    configuration = {
        "ipsec_mode": "tunnel",
        "encryption": "aes128-cbc",
        "integrity": "sha256",
        "dh_group": "modp2048",
        "pfs": False,
        "ip_version": "ipv6",
    }

    controller.apply_ipsec(configuration)

    assert len(calls) == 2

    call_a = next(
        call
        for call in calls
        if call["host"] == "192.168.160.128"
    )

    call_b = next(
        call
        for call in calls
        if call["host"] == "192.168.160.129"
    )

    assert "local_addrs = fd00:160::128" in call_a["config_text"]
    assert "remote_addrs = fd00:160::129" in call_a["config_text"]
    assert "local_ts = fd00:10:10::1/128" in call_a["config_text"]
    assert "remote_ts = fd00:10:10::2/128" in call_a["config_text"]

    assert "local_addrs = fd00:160::129" in call_b["config_text"]
    assert "remote_addrs = fd00:160::128" in call_b["config_text"]
    assert "local_ts = fd00:10:10::2/128" in call_b["config_text"]
    assert "remote_ts = fd00:10:10::1/128" in call_b["config_text"]

def test_controller_starts_ipv6_transport_traffic_with_roles(monkeypatch):
    controller = Controller(
        "192.168.160.128",
        "192.168.160.129",
    )

    calls = []

    def fake_send(
        host,
        action,
        **data,
    ):
        calls.append(
            {
                "host": host,
                "action": action,
                **data,
            }
        )

        return {"ok": True}

    monkeypatch.setattr(
        "src.controller.controller.send",
        fake_send,
    )

    controller.start_traffic(
        "sender",
        "receiver",
        "transport",
        "ipv6",
    )

    assert sorted(
        calls,
        key=lambda call: call["host"],
    ) == [
        {
            "host": "192.168.160.128",
            "action": "start",
            "target": "fd00:160::129",
            "role": "sender",
        },
        {
            "host": "192.168.160.129",
            "action": "start",
            "target": "fd00:160::128",
            "role": "receiver",
        },
    ]

def test_controller_starts_ipv6_tunnel_traffic_with_roles(monkeypatch):
    controller = Controller(
        "192.168.160.128",
        "192.168.160.129",
    )

    calls = []

    def fake_send(
        host,
        action,
        **data,
    ):
        calls.append(
            {
                "host": host,
                "action": action,
                **data,
            }
        )

        return {"ok": True}

    monkeypatch.setattr(
        "src.controller.controller.send",
        fake_send,
    )

    controller.start_traffic(
        "sender",
        "receiver",
        "tunnel",
        "ipv6",
    )

    assert sorted(
        calls,
        key=lambda call: call["host"],
    ) == [
        {
            "host": "192.168.160.128",
            "action": "start",
            "target": "fd00:10:10::2",
            "role": "sender",
        },
        {
            "host": "192.168.160.129",
            "action": "start",
            "target": "fd00:10:10::1",
            "role": "receiver",
        },
    ]

def test_controller_initiates_ipsec_from_agent_a_only(monkeypatch):
    controller = Controller(
        "192.168.160.128",
        "192.168.160.129",
    )

    calls = []

    def fake_send(
        host,
        action,
        **data,
    ):
        calls.append(
            {
                "host": host,
                "action": action,
                **data,
            }
        )

        return {"ok": True}

    monkeypatch.setattr(
        "src.controller.controller.send",
        fake_send,
    )

    controller.initiate_ipsec()

    assert calls == [
        {
            "host": "192.168.160.128",
            "action": "initiate_ipsec",
        }
    ]

def test_controller_terminates_ipsec_from_agent_a_only(monkeypatch):
    controller = Controller(
        "192.168.160.128",
        "192.168.160.129",
    )

    calls = []

    def fake_send(
        host,
        action,
        **data,
    ):
        calls.append(
            {
                "host": host,
                "action": action,
                **data,
            }
        )

        return {"ok": True}

    monkeypatch.setattr(
        "src.controller.controller.send",
        fake_send,
    )

    controller.terminate_ipsec()

    assert calls == [
        {
            "host": "192.168.160.128",
            "action": "terminate_ipsec",
        }
    ]