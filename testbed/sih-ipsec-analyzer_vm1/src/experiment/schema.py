from pathlib import Path

import yaml


class ExperimentSchema:
    def __init__(
        self,
        version: int,
        parameters: dict[str, list],
        traffic: dict[str, dict],
    ):
        self.version = version
        self.parameters = parameters
        self.traffic = traffic

    @classmethod
    def from_yaml(cls, path: str | Path) -> "ExperimentSchema":
        path = Path(path)

        with path.open("r", encoding="utf-8") as file:
            data = yaml.safe_load(file)

        return cls(
            version=data["version"],
            parameters=data["parameters"],
            traffic=data["traffic"],
        )

    @property
    def parameter_names(self) -> list[str]:
        return list(self.parameters.keys())

    def values(self, parameter_name: str) -> list:
        if parameter_name not in self.parameters:
            raise KeyError(parameter_name)

        return self.parameters[parameter_name]

    @property
    def size(self) -> int:
        size = 1

        for values in self.parameters.values():
            size *= len(values)

        return size

    def configuration(self, coordinate: list[int]) -> dict:
        if len(coordinate) != len(self.parameter_names):
            raise ValueError("Coordinate length does not match schema")

        configuration = {}

        for i, name in enumerate(self.parameter_names):
            values = self.parameters[name]

            if not 0 <= coordinate[i] < len(values):
                raise ValueError(
                    f"Invalid coordinate for parameter: {name}"
                )

            configuration[name] = values[coordinate[i]]

        return configuration

    def traffic_roles(self, traffic_type: str) -> tuple[str, str]:
        if traffic_type not in self.traffic:
            raise KeyError(traffic_type)

        definition = self.traffic[traffic_type]

        return (
            definition["role_a"],
            definition["role_b"],
        )