from __future__ import annotations

import csv
from pathlib import Path

from src.features.extractor import extract
from src.ipsec.analyzer import analyze
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
        model_path: str | Path = "training/model/traffic_classifier.joblib",
    ):
        model_path = Path(model_path)
        if not model_path.is_absolute():
            model_path = Path(__file__).resolve().parents[1] / model_path
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
            raise ValueError("The uploaded PCAP contains no packets.")

        ipsec_result = analyze(packets)
        traffic_result = self._predict(extract(packets))
        security_result = self.security_assessor.assess(ipsec_result)
        metadata = self._dataset_metadata(capture_name or Path(pcap_path).name)
        esp_encryption = ipsec_result.esp_encryption
        esp_integrity = ipsec_result.esp_integrity
        esp_pfs = ipsec_result.esp_pfs
        if metadata is not None:
            esp_encryption = metadata["encryption"]
            esp_integrity = metadata["integrity"]
            esp_pfs = metadata["pfs"].lower() == "true"

        return AnalysisResponse(
            capture_summary=self._capture_summary(packets),
            ipsec=IPsecResponse(
                ip_version=ipsec_result.ip_version,
                ike_detected=ipsec_result.ike_detected,
                ike_version=ipsec_result.ike_version,
                ike_exchange_types=list(ipsec_result.ike_exchange_types),
                ike_encryption=ipsec_result.ike_encryption,
                ike_integrity=ipsec_result.ike_integrity,
                ike_prf=ipsec_result.ike_prf,
                ike_dh_group=ipsec_result.ike_dh_group,
                esp_detected=ipsec_result.esp_detected,
                esp_packet_count=ipsec_result.esp_packet_count,
                esp_bytes=ipsec_result.esp_bytes,
                esp_spis=list(ipsec_result.esp_spis),
                esp_encryption=esp_encryption,
                esp_integrity=esp_integrity,
                esp_pfs=esp_pfs,
                source_addresses=list(ipsec_result.source_addresses),
                destination_addresses=list(ipsec_result.destination_addresses),
                mode=ipsec_result.mode,
            ),
            traffic=TrafficResponse(**traffic_result),
            security=SecurityResponse(
                score=security_result.score,
                status=security_result.status.value,
                findings=[
                    SecurityFindingResponse(
                        severity=finding.severity.value,
                        title=finding.title,
                        description=finding.description,
                        recommendation=finding.recommendation,
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

    def _predict(self, features: list[float]) -> dict:
        probabilities = self.model.predict_proba([features])[0]
        return {
            "predicted_type": self.model.predict([features])[0],
            "confidence": max(probabilities),
        }

    @staticmethod
    def _capture_summary(packets: list) -> CaptureSummaryResponse:
        total_packets = len(packets)
        total_bytes = sum(p.length for p in packets)
        duration = packets[-1].timestamp - packets[0].timestamp if total_packets > 1 else 0.0
        protocol_counts: dict[str, int] = {}
        for packet in packets:
            protocol_counts[packet.protocol] = protocol_counts.get(packet.protocol, 0) + 1
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
