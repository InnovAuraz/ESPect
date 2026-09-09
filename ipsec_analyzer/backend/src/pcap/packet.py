from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Packet:
    timestamp: float
    length: int
    source: str | None
    destination: str | None
    protocol: str
    source_port: int | None
    destination_port: int | None
    raw: Any