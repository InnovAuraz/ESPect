from pathlib import Path

import pytest

from src.experiment.configuration import create
from src.experiment.schema import ExperimentSchema


SCHEMA_PATH = (
    Path(__file__).resolve().parents[1]
    / "config"
    / "experiment_schema.yaml"
)


def test_create_configuration():
    schema = ExperimentSchema.from_yaml(SCHEMA_PATH)

    coordinate = [0, 0, 0, 0, 0, 0, 0]

    configuration = create(schema, coordinate)

    assert configuration == {
        "ipsec_mode": "transport",
        "encryption": "aes128-cbc",
        "integrity": "sha256",
        "dh_group": "modp2048",
        "pfs": True,
        "ip_version": "ipv4",
        "traffic_type": "voip",
    }


def test_create_rejects_invalid_configuration():
    schema = ExperimentSchema.from_yaml(SCHEMA_PATH)

    # AEAD + sha256 is invalid according to validator.
    coordinate = [0, 2, 0, 0, 0, 0, 0]

    with pytest.raises(ValueError):
        create(schema, coordinate)