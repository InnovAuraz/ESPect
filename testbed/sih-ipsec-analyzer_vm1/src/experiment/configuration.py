from .schema import ExperimentSchema
from .validator import validate


def create(
    schema: ExperimentSchema,
    coordinate: list[int],
) -> dict:
    configuration = schema.configuration(coordinate)

    errors = validate(configuration)

    if errors:
        raise ValueError("; ".join(errors))

    return configuration