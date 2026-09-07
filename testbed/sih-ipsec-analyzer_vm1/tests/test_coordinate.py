from pathlib import Path

from src.experiment.coordinate import advance
from src.experiment.schema import ExperimentSchema


SCHEMA_PATH = (
    Path(__file__).resolve().parents[1]
    / "config"
    / "experiment_schema.yaml"
)


def test_increment_last_dimension():
    C = [0, 0, 0]
    P = [2, 3, 2]

    assert advance(C, P) is True
    assert C == [0, 0, 1]


def test_carry():
    C = [0, 0, 1]
    P = [2, 3, 2]

    assert advance(C, P) is True
    assert C == [0, 1, 0]


def test_multiple_carries():
    C = [0, 2, 1]
    P = [2, 3, 2]

    assert advance(C, P) is True
    assert C == [1, 0, 0]


def test_final_coordinate():
    C = [1, 2, 1]
    P = [2, 3, 2]

    assert advance(C, P) is False
    assert C == [0, 0, 0]


def test_exhaustive_schema_enumeration():
    schema = ExperimentSchema.from_yaml(SCHEMA_PATH)

    P = [len(schema.values(name)) for name in schema.parameter_names]
    C = [0] * len(P)

    count = 1

    while advance(C, P):
        count += 1

    assert count == schema.size
    assert count == 3840