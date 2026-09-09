from __future__ import annotations

import csv

import pytest

from src.ml.dataset import Dataset


def create_metadata(path):
    rows = [
        {
            "experiment_id": "exp000001",
            "pcap_file": "exp000001.pcap",
            "ipsec_mode": "transport",
            "encryption": "aes128-cbc",
            "integrity": "sha256",
            "dh_group": "modp2048",
            "pfs": "True",
            "ip_version": "ipv4",
            "traffic_type": "voip",
        },
        {
            "experiment_id": "exp000002",
            "pcap_file": "exp000002.pcap",
            "ipsec_mode": "transport",
            "encryption": "aes128-cbc",
            "integrity": "sha256",
            "dh_group": "modp2048",
            "pfs": "True",
            "ip_version": "ipv4",
            "traffic_type": "video",
        },
    ]

    with path.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "experiment_id",
                "pcap_file",
                "ipsec_mode",
                "encryption",
                "integrity",
                "dh_group",
                "pfs",
                "ip_version",
                "traffic_type",
            ],
        )

        writer.writeheader()
        writer.writerows(rows)


def test_missing_metadata(tmp_path):
    pcap_dir = tmp_path / "pcaps"
    pcap_dir.mkdir()

    with pytest.raises(FileNotFoundError):
        Dataset(tmp_path)


def test_missing_pcap_directory(tmp_path):
    metadata = tmp_path / "metadata.csv"

    metadata.write_text(
        "experiment_id,pcap_file,traffic_type\n",
        encoding="utf-8",
    )

    with pytest.raises(FileNotFoundError):
        Dataset(tmp_path)


def test_missing_pcap_file(tmp_path):
    metadata = tmp_path / "metadata.csv"
    pcap_dir = tmp_path / "pcaps"

    pcap_dir.mkdir()

    create_metadata(metadata)

    dataset = Dataset(tmp_path)

    with pytest.raises(FileNotFoundError):
        dataset.build()


def test_invalid_metadata_columns(tmp_path):
    metadata = tmp_path / "metadata.csv"
    pcap_dir = tmp_path / "pcaps"

    pcap_dir.mkdir()

    metadata.write_text(
        "experiment_id,pcap_file\n"
        "exp000001,exp000001.pcap\n",
        encoding="utf-8",
    )

    dataset = Dataset(tmp_path)

    with pytest.raises(ValueError):
        dataset.build()


def test_invalid_test_size(tmp_path):
    metadata = tmp_path / "metadata.csv"
    pcap_dir = tmp_path / "pcaps"

    pcap_dir.mkdir()
    metadata.write_text(
        "experiment_id,pcap_file,traffic_type\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError):
        Dataset(tmp_path, test_size=0.0)

    with pytest.raises(ValueError):
        Dataset(tmp_path, test_size=1.0)