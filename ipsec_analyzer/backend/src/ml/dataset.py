from __future__ import annotations

import csv
import random
import shutil
from dataclasses import dataclass
from pathlib import Path

from src.features import FEATURE_NAMES, extract
from src.pcap import PcapReader


@dataclass(frozen=True)
class Experiment:
    experiment_id: str
    pcap_file: str
    traffic_type: str


@dataclass(frozen=True)
class Sample:
    experiment_id: str
    traffic_type: str
    features: tuple[float, ...]


class Dataset:
    def __init__(
        self,
        dataset_path: str | Path,
        output_path: str | Path = "training",
        test_size: float = 0.2,
        seed: int = 42,
    ):
        self.dataset_path = Path(dataset_path)
        self.output_path = Path(output_path)
        self.test_size = test_size
        self.seed = seed

        self.train: list[Sample] = []
        self.test: list[Sample] = []

        self._validate()

    def _validate(self) -> None:
        metadata_path = self.dataset_path / "metadata.csv"
        pcap_path = self.dataset_path / "pcaps"

        if not metadata_path.is_file():
            raise FileNotFoundError(
                f"Metadata file not found: {metadata_path}"
            )

        if not pcap_path.is_dir():
            raise FileNotFoundError(
                f"PCAP directory not found: {pcap_path}"
            )

        if not 0.0 < self.test_size < 1.0:
            raise ValueError("test_size must be between 0 and 1")

    def build(self) -> None:
        experiments = self._read_metadata()

        train_experiments, test_experiments = self._split(
            experiments
        )

        self._clear_output()

        self.train = self._process_split(
            train_experiments,
            "train",
        )

        self.test = self._process_split(
            test_experiments,
            "test",
        )

    def load(self) -> None:
        self.train = self._load_split("train")
        self.test = self._load_split("test")

    def _read_metadata(self) -> list[Experiment]:
        metadata_path = self.dataset_path / "metadata.csv"
        experiments = []

        with metadata_path.open(
            "r",
            newline="",
            encoding="utf-8",
        ) as file:
            reader = csv.DictReader(file)

            required = {
                "experiment_id",
                "pcap_file",
                "traffic_type",
            }

            columns = set(reader.fieldnames or [])

            if not required.issubset(columns):
                missing = required - columns
                raise ValueError(
                    f"metadata.csv is missing columns: {sorted(missing)}"
                )

            for row in reader:
                experiments.append(
                    Experiment(
                        experiment_id=row["experiment_id"],
                        pcap_file=row["pcap_file"],
                        traffic_type=row["traffic_type"],
                    )
                )

        return experiments

    def _split(
        self,
        experiments: list[Experiment],
    ) -> tuple[list[Experiment], list[Experiment]]:
        grouped: dict[str, list[Experiment]] = {}

        for experiment in experiments:
            grouped.setdefault(
                experiment.traffic_type,
                [],
            ).append(experiment)

        rng = random.Random(self.seed)

        train = []
        test = []

        for experiments_for_label in grouped.values():
            items = experiments_for_label.copy()
            rng.shuffle(items)

            test_count = round(
                len(items) * self.test_size
            )

            if test_count == 0 and len(items) > 1:
                test_count = 1

            test.extend(items[:test_count])
            train.extend(items[test_count:])

        rng.shuffle(train)
        rng.shuffle(test)

        return train, test

    def _process_split(
        self,
        experiments: list[Experiment],
        split_name: str,
    ) -> list[Sample]:
        split_path = self.output_path / split_name
        pcap_output = split_path / "pcaps"

        pcap_output.mkdir(
            parents=True,
            exist_ok=True,
        )

        samples = []

        for experiment in experiments:
            source_pcap = (
                self.dataset_path
                / "pcaps"
                / experiment.pcap_file
            )

            if not source_pcap.is_file():
                raise FileNotFoundError(
                    f"PCAP file not found: {source_pcap}"
                )

            destination_pcap = (
                pcap_output / experiment.pcap_file
            )

            shutil.copy2(
                source_pcap,
                destination_pcap,
            )

            packets = list(PcapReader(source_pcap))
            features = extract(packets)

            if len(features) != len(FEATURE_NAMES):
                raise ValueError(
                    f"{experiment.pcap_file} produced "
                    f"{len(features)} features; "
                    f"expected {len(FEATURE_NAMES)}"
                )

            samples.append(
                Sample(
                    experiment_id=experiment.experiment_id,
                    traffic_type=experiment.traffic_type,
                    features=tuple(features),
                )
            )

        self._write_features(
            split_path / "features.csv",
            samples,
        )

        return samples

    @staticmethod
    def _write_features(
        path: Path,
        samples: list[Sample],
    ) -> None:
        fieldnames = [
            "experiment_id",
            "traffic_type",
            *FEATURE_NAMES,
        ]

        with path.open(
            "w",
            newline="",
            encoding="utf-8",
        ) as file:
            writer = csv.DictWriter(
                file,
                fieldnames=fieldnames,
            )

            writer.writeheader()

            for sample in samples:
                row = {
                    "experiment_id": sample.experiment_id,
                    "traffic_type": sample.traffic_type,
                }

                row.update(
                    zip(FEATURE_NAMES, sample.features)
                )

                writer.writerow(row)

    def _clear_output(self) -> None:
        if self.output_path.exists():
            shutil.rmtree(self.output_path)

    def _load_split(
        self,
        split_name: str,
    ) -> list[Sample]:
        path = (
            self.output_path
            / split_name
            / "features.csv"
        )

        if not path.is_file():
            raise FileNotFoundError(
                f"Feature dataset not found: {path}"
            )

        samples = []

        with path.open(
            "r",
            newline="",
            encoding="utf-8",
        ) as file:
            reader = csv.DictReader(file)

            required = {
                "experiment_id",
                "traffic_type",
                *FEATURE_NAMES,
            }

            columns = set(reader.fieldnames or [])

            if not required.issubset(columns):
                missing = required - columns
                raise ValueError(
                    f"{path} is missing columns: {sorted(missing)}"
                )

            for row in reader:
                features = tuple(
                    float(row[name])
                    for name in FEATURE_NAMES
                )

                samples.append(
                    Sample(
                        experiment_id=row["experiment_id"],
                        traffic_type=row["traffic_type"],
                        features=features,
                    )
                )

        return samples

    @property
    def train_features(self) -> list[list[float]]:
        return [
            list(sample.features)
            for sample in self.train
        ]

    @property
    def train_labels(self) -> list[str]:
        return [
            sample.traffic_type
            for sample in self.train
        ]

    @property
    def test_features(self) -> list[list[float]]:
        return [
            list(sample.features)
            for sample in self.test
        ]

    @property
    def test_labels(self) -> list[str]:
        return [
            sample.traffic_type
            for sample in self.test
        ]