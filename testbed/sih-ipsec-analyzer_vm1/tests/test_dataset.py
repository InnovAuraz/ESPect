import csv

import pytest

from src.dataset.writer import COLUMNS, append


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


def test_append_creates_dataset(tmp_path):
    path = tmp_path / "ipsec_dataset.csv"

    append(
        path,
        "exp000001",
        "exp000001.pcap",
        configuration(),
    )

    with path.open(newline="", encoding="utf-8") as file:
        rows = list(csv.DictReader(file))

    assert len(rows) == 1
    assert rows[0]["experiment_id"] == "exp000001"
    assert rows[0]["pcap_file"] == "exp000001.pcap"
    assert rows[0]["ipsec_mode"] == "transport"
    assert rows[0]["encryption"] == "aes128-cbc"
    assert rows[0]["pfs"] == "False"


def test_append_multiple_rows(tmp_path):
    path = tmp_path / "ipsec_dataset.csv"

    append(path, "exp000001", "exp000001.pcap", configuration())
    append(path, "exp000002", "exp000002.pcap", configuration())

    with path.open(newline="", encoding="utf-8") as file:
        rows = list(csv.DictReader(file))

    assert len(rows) == 2


def test_header_contains_exact_columns(tmp_path):
    path = tmp_path / "ipsec_dataset.csv"

    append(path, "exp000001", "exp000001.pcap", configuration())

    with path.open(newline="", encoding="utf-8") as file:
        reader = csv.reader(file)
        header = next(reader)

    assert header == COLUMNS


def test_missing_configuration_column(tmp_path):
    path = tmp_path / "ipsec_dataset.csv"

    invalid = configuration()
    del invalid["traffic_type"]

    with pytest.raises(ValueError):
        append(
            path,
            "exp000001",
            "exp000001.pcap",
            invalid,
        )