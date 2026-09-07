from src.controller import send


def test_vm1_agent():
    response = send(
        "192.168.160.128",
        "configure",
        configuration={
            "traffic_type": "icmp",
        },
    )

    assert response["ok"] is True


def test_vm2_agent():
    response = send(
        "192.168.160.129",
        "configure",
        configuration={
            "traffic_type": "icmp",
        },
    )

    assert response["ok"] is True