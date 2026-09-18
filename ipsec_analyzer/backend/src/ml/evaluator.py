from __future__ import annotations

from pathlib import Path

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)

from src.ml.dataset import Dataset
from src.ml.model import TrafficClassifier


class Evaluator:
    def __init__(
        self,
        dataset: Dataset,
        model_path: str | Path = "training/model/traffic_classifier.joblib",
    ):
        self.dataset = dataset
        self.model_path = Path(model_path)
        self.classifier = TrafficClassifier()

    def evaluate(self) -> dict:
        self.dataset.load()
        self.classifier.load(self.model_path)

        predictions = self.classifier.predict(
            self.dataset.test_features
        )

        accuracy = accuracy_score(
            self.dataset.test_labels,
            predictions,
        )

        report = classification_report(
            self.dataset.test_labels,
            predictions,
            output_dict=True,
            zero_division=0,
        )

        matrix = confusion_matrix(
            self.dataset.test_labels,
            predictions,
        )

        return {
            "accuracy": accuracy,
            "classification_report": report,
            "confusion_matrix": matrix,
        }

    def print_report(self) -> None:
        self.dataset.load()
        self.classifier.load(self.model_path)

        predictions = self.classifier.predict(
            self.dataset.test_features
        )

        print(
            f"Accuracy: "
            f"{accuracy_score(self.dataset.test_labels, predictions):.4f}"
        )

        print("\nClassification Report:")
        print(
            classification_report(
                self.dataset.test_labels,
                predictions,
                zero_division=0,
            )
        )

        print("Confusion Matrix:")
        print(
            confusion_matrix(
                self.dataset.test_labels,
                predictions,
            )
        )

if __name__ == "__main__":
    dataset = Dataset(
        "C:/Users/sneha/Desktop/MyDocuments/PythonCodes/ESPect/testbed/sih-ipsec-analyzer_vm1/dataset/",
        "training",
    )

    evaluator = Evaluator(dataset)
    evaluator.print_report()