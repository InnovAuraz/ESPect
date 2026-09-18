from src.controller import Controller


VM1 = "192.168.160.128"
VM2 = "192.168.160.129"

INNER_VM1 = "10.10.1.1"
INNER_VM2 = "10.10.2.1"


def test_controller_creates_tunnel_and_runs_icmp():
    controller = Controller(
        VM1,
        VM2,
        inner_a=INNER_VM1,
        inner_b=INNER_VM2,
    )

    configuration_a = {
        "ipsec_mode": "tunnel",
        "encryption": "aes128-cbc",
        "integrity": "sha256",
        "dh_group": "modp2048",
        "pfs": False,
        "ip_version": "ipv4",
        "traffic_type": "icmp",
    }

    configuration_b = configuration_a.copy()

    controller.configure(
        configuration_a,
        configuration_b,
    )

    controller.apply_ipsec(
        configuration_a,
    )

    controller.initiate_ipsec()

    status_a = controller.ipsec_status(VM1)
    status_b = controller.ipsec_status(VM2)

    assert "ESTABLISHED" in status_a
    assert "INSTALLED" in status_a

    assert "ESTABLISHED" in status_b
    assert "INSTALLED" in status_b

    controller.start_traffic(
        "sender",
        "receiver",
        "tunnel",
    )

    controller.wait_for_traffic()
    
def test_controller_creates_ipv6_tunnel_and_runs_icmp():
    controller = Controller(
        VM1,
        VM2,
        ipv6_inner_a="fd00:10:10::1",
        ipv6_inner_b="fd00:10:10::2",
    )

    configuration_a = {
        "ipsec_mode": "tunnel",
        "encryption": "aes128-cbc",
        "integrity": "sha256",
        "dh_group": "modp2048",
        "pfs": False,
        "ip_version": "ipv6",
        "traffic_type": "icmp",
    }

    configuration_b = configuration_a.copy()

    controller.configure(
        configuration_a,
        configuration_b,
    )

    controller.apply_ipsec(
        configuration_a,
    )

    controller.initiate_ipsec()

    status_a = controller.ipsec_status(VM1)
    status_b = controller.ipsec_status(VM2)

    assert "ESTABLISHED" in status_a
    assert "INSTALLED" in status_a

    assert "ESTABLISHED" in status_b
    assert "INSTALLED" in status_b

    controller.start_traffic(
        "sender",
        "receiver",
        "tunnel",
        "ipv6",
    )

    controller.wait_for_traffic()

    controller.terminate_ipsec()