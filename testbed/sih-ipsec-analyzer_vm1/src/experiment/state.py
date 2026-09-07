import json
from pathlib import Path


def save(
    path: str | Path,
    coordinate: list[int],
) -> None:
    path = Path(path)

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with path.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            coordinate,
            file,
        )


def load(
    path: str | Path,
) -> list[int]:
    path = Path(path)

    with path.open(
        "r",
        encoding="utf-8",
    ) as file:
        coordinate = json.load(file)

    if not isinstance(coordinate, list):
        raise ValueError(
            "Saved coordinate must be a list"
        )

    if not all(
        isinstance(value, int)
        for value in coordinate
    ):
        raise ValueError(
            "Coordinate must contain integers"
        )

    return coordinate