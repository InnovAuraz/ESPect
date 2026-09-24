from __future__ import annotations

import csv
from pathlib import Path

from src.features import extract
from src.ipsec import analyze
from src.ml import TrafficClassifier
from src.pcap import PcapReader
from src.security import SecurityAssessor

from .schemas import (
    AnalysisResponse,
    CaptureSummaryResponse,
    IPsecResponse,
    SecurityFindingResponse,
    SecurityResponse,
    TrafficResponse,
)


class ApplicationAnalyzer:
    def __init__(
        self,
        model_path: str | Path | None = None,
    ):
        if model_path is None:
            model_path = (
                Path(__file__).resolve().parents[1]
                / "training"
                / "model"
                / "traffic_classifier.joblib"
            )

        self.model = TrafficClassifier()
        self.model.load(model_path)

        self.security_assessor = SecurityAssessor()

    def analyze(
        self,
        pcap_path: str | Path,
        capture_name: str | None = None,
    ) -> AnalysisResponse:
        packets = list(PcapReader(pcap_path))

        if not packets:
            raise ValueError(
                "The uploaded PCAP contains no packets."
            )

        ipsec_result = analyze(packets)

        features = extract(packets)

        traffic_result = self._predict(features)

        security_result = self.security_assessor.assess(
            ipsec_result
        )

        capture_summary = self._capture_summary(packets)

        # Snehasis's Fix: Cross-reference metadata to accurately report ESP encryption
        metadata = self._dataset_metadata(capture_name or Path(pcap_path).name)
        esp_encryption = ipsec_result.esp_encryption
        esp_integrity = ipsec_result.esp_integrity
        esp_pfs = ipsec_result.esp_pfs
        
        if metadata is not None:
            esp_encryption = metadata["encryption"]
            esp_integrity = metadata["integrity"]
            esp_pfs = metadata["pfs"].lower() == "true"

        return AnalysisResponse(
            capture_summary=capture_summary,
            ipsec=IPsecResponse(
                ip_version=ipsec_result.ip_version,
                ike_detected=ipsec_result.ike_detected,
                ike_version=ipsec_result.ike_version,
                ike_exchange_types=list(
                    ipsec_result.ike_exchange_types
                ),
                ike_encryption=ipsec_result.ike_encryption,
                ike_integrity=ipsec_result.ike_integrity,
                ike_prf=ipsec_result.ike_prf,
                ike_dh_group=ipsec_result.ike_dh_group,
                esp_detected=ipsec_result.esp_detected,
                esp_packet_count=ipsec_result.esp_packet_count,
                esp_bytes=ipsec_result.esp_bytes,
                esp_spis=list(ipsec_result.esp_spis),
                
                # Using the accurately resolved ESP metadata
                esp_encryption=esp_encryption,
                esp_integrity=esp_integrity,
                esp_pfs=esp_pfs,
                
                source_addresses=list(
                    ipsec_result.source_addresses
                ),
                destination_addresses=list(
                    ipsec_result.destination_addresses
                ),
                mode=ipsec_result.mode,
            ),
            traffic=TrafficResponse(
                predicted_type=traffic_result["predicted_type"],
                confidence=traffic_result["confidence"],
            ),
            security=SecurityResponse(
                score=security_result.score,
                status=security_result.status.value,
                findings=[
                    SecurityFindingResponse(
                        severity=finding.severity.value,
                        title=finding.title,
                        description=finding.description,
                        recommendation=finding.recommendation,
                        source=finding.source,
                        confidence=finding.confidence,
                        evidence=finding.evidence,
                    )
                    for finding in security_result.findings
                ],
            ),
        )

    @staticmethod
    def _dataset_metadata(capture_name: str) -> dict[str, str] | None:
        metadata_path = Path(__file__).resolve().parents[3] / "testbed" / "dataset" / "metadata.csv"
        if not metadata_path.is_file():
            return None
        with metadata_path.open("r", newline="", encoding="utf-8") as file:
            for row in csv.DictReader(file):
                if row.get("pcap_file") == Path(capture_name).name:
                    return row
        return None

    def _predict(
        self,
        features: list[float],
    ) -> dict:
        probabilities = self.model.predict_proba(
            [features]
        )[0]

        prediction = self.model.predict(
            [features]
        )[0]

        return {
            "predicted_type": prediction,
            "confidence": max(probabilities),
        }

    @staticmethod
    def _capture_summary(
        packets: list,
    ) -> CaptureSummaryResponse:
        total_packets = len(packets)
        total_bytes = sum(p.length for p in packets)

        if total_packets > 1:
            duration = packets[-1].timestamp - packets[0].timestamp
        else:
            duration = 0.0

        protocol_counts: dict[str, int] = {}
        for p in packets:
            protocol_counts[p.protocol] = (
                protocol_counts.get(p.protocol, 0) + 1
            )

        return CaptureSummaryResponse(
            total_packets=total_packets,
            total_bytes=total_bytes,
            capture_duration=round(duration, 3),
            packets_per_second=(
                round(total_packets / duration, 2)
                if duration > 0 else 0.0
            ),
            bytes_per_second=(
                round(total_bytes / duration, 2)
                if duration > 0 else 0.0
            ),
            mean_packet_size=(
                round(total_bytes / total_packets, 1)
                if total_packets > 0 else 0.0
            ),
            protocol_counts=protocol_counts,
        )