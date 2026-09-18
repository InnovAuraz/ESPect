from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Severity(str, Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class SecurityStatus(str, Enum):
    SECURE = "SECURE"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


@dataclass(frozen=True)
class SecurityFinding:
    severity: Severity
    title: str
    description: str
    recommendation: str
    source: str = "rule"
    confidence: float = 1.0
    evidence: str | None = None


@dataclass(frozen=True)
class SecurityAssessment:
    score: int
    status: SecurityStatus
    findings: tuple[SecurityFinding, ...]