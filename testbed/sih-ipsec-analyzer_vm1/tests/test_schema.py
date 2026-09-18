from pathlib import Path

import pytest

from src.experiment.schema import ExperimentSchema


SCHEMA_PATH = (
    Path(__file__).resolve().parents[1]
    / "config"
    / "experiment_schema.yaml"
)


def test_load_schema():
    schema = ExperimentSchema.from_yaml(SCHEMA_PATH)

    assert schema.version == 1
    assert isinstance(schema.parameters, dict)
    assert isinstance(schema.traffic, dict)


def test_parameter_names():
    schema = ExperimentSchema.from_yaml(SCHEMA_PATH)

    assert schema.parameter_names == [
        "ipsec_mode",
        "encryption",
        "integrity",
        "dh_group",
        "pfs",
        "ip_version",
        "traffic_type",
    ]


def test_parameter_values():
    schema = ExperimentSchema.from_yaml(SCHEMA_PATH)

    assert schema.values("ipsec_mode") == [
        "transport",
        "tunnel",
    ]

    assert schema.values("encryption") == [
        "aes128-cbc",
        "aes256-cbc",
        "aes128-gcm16",
        "aes256-gcm16",
    ]

    assert schema.values("traffic_type") == [
        "voip",
        "whatsapp",
        "email",
        "web",
        "icmp",
        "video",
    ]


def test_parameter_count():
    schema = ExperimentSchema.from_yaml(SCHEMA_PATH)

    assert len(schema.parameter_names) == 7


def test_search_space_size():
    schema = ExperimentSchema.from_yaml(SCHEMA_PATH)

    assert schema.size == 3840


def test_unknown_parameter():
    schema = ExperimentSchema.from_yaml(SCHEMA_PATH)

    with pytest.raises(KeyError):
        schema.values("does_not_exist")


def test_configuration_from_coordinate():
    schema = ExperimentSchema.from_yaml(SCHEMA_PATH)

    coordinate = [1, 2, 0, 3, 1, 0, 4]

    configuration = schema.configuration(coordinate)

    assert configuration == {
        "ipsec_mode": "tunnel",
        "encryption": "aes128-gcm16",
        "integrity": "sha256",
        "dh_group": "ecp256",
        "pfs": False,
        "ip_version": "ipv4",
        "traffic_type": "icmp",
    }


def test_invalid_coordinate_length():
    schema = ExperimentSchema.from_yaml(SCHEMA_PATH)

    with pytest.raises(ValueError):
        schema.configuration([0, 0])


def test_invalid_coordinate_value():
    schema = ExperimentSchema.from_yaml(SCHEMA_PATH)

    with pytest.raises(ValueError):
        schema.configuration([2, 0, 0, 0, 0, 0, 0])


def test_traffic_roles():
    schema = ExperimentSchema.from_yaml(SCHEMA_PATH)

    assert schema.traffic_roles("icmp") == (
        "sender",
        "receiver",
    )

    assert schema.traffic_roles("web") == (
        "sender",
        "receiver",
    )

    assert schema.traffic_roles("email") == (
        "sender",
        "receiver",
    )

    assert schema.traffic_roles("video") == (
        "sender",
        "receiver",
    )

    assert schema.traffic_roles("voip") == (
        "peer",
        "peer",
    )

    assert schema.traffic_roles("whatsapp") == (
        "peer",
        "peer",
    )


def test_unknown_traffic_type():
    schema = ExperimentSchema.from_yaml(SCHEMA_PATH)

    with pytest.raises(KeyError):
        schema.traffic_roles("does_not_exist")