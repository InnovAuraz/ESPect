from __future__ import annotations

from pydantic import BaseModel, Field


class IPsecResponse(BaseModel):
    ip_version: str | None
    ike_detected: bool
    ike_version: str | None
    ike_exchange_types: list[str]

    ike_encryption: str | None
    ike_integrity: str | None
    ike_prf: str | None
    ike_dh_group: str | None

    esp_detected: bool
    esp_packet_count: int
    esp_bytes: int
    esp_spis: list[int]

    esp_encryption: str | None
    esp_integrity: str | None
    esp_pfs: bool | None

    source_addresses: list[str]
    destination_addresses: list[str]

    mode: str | None


class TrafficResponse(BaseModel):
    predicted_type: str
    confidence: float = Field(ge=0.0, le=1.0)


class SecurityFindingResponse(BaseModel):
    severity: str
    title: str
    description: str
    recommendation: str


class SecurityResponse(BaseModel):
    score: int = Field(ge=0, le=100)
    status: str
    findings: list[SecurityFindingResponse]


class AnalysisResponse(BaseModel):
    ipsec: IPsecResponse
    traffic: TrafficResponse
    security: SecurityResponse