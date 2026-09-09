from __future__ import annotations

from pathlib import Path

from src.ml.dataset import Dataset
from src.ml.model import TrafficClassifier


class Trainer:
    def __init__(
        self,
        dataset: Dataset,
        model_path: str | Path = "training/model/traffic_classifier.joblib",
    ):
        self.dataset = dataset
        self.model_path = Path(model_path)
        self.classifier = TrafficClassifier()

    def train(self) -> None:
        self.dataset.load()

        if self.model_path.is_file():
            self.classifier.load(self.model_path)
        else:
            self.classifier.create()

        self.classifier.fit(
            self.dataset.train_features,
            self.dataset.train_labels,
        )

        self.classifier.save(self.model_path)

if __name__ == "__main__":
    dataset = Dataset(
        "C:/Users/sneha/Desktop/MyDocuments/PythonCodes/ESPect/testbed/sih-ipsec-analyzer_vm1/dataset/",
        "training",
    )

    trainer = Trainer(dataset)
    trainer.train()

    print("Training complete.")