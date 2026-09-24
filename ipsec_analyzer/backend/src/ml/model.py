from __future__ import annotations

from pathlib import Path

from joblib import dump, load
from sklearn.ensemble import (
    ExtraTreesClassifier,
    RandomForestClassifier,
    IsolationForest,
)

# =====================================================================
# MODEL 1: Traffic Type Classification
# Architecture requirement: ExtraTrees Classifier
# =====================================================================
class TrafficClassifier:
    def __init__(
        self,
        n_estimators: int = 300,
        random_state: int = 42,
    ):
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.model: ExtraTreesClassifier | None = None

    def create(self) -> ExtraTreesClassifier:
        self.model = ExtraTreesClassifier(
            n_estimators=self.n_estimators,
            random_state=self.random_state,
            n_jobs=-1,
            # These 3 lines fix the VoIP guessing bias while keeping ExtraTrees:
            class_weight="balanced", 
            max_depth=20,
            min_samples_split=5,
        )
        return self.model

    def fit(self, features: list[list[float]], labels: list[str]) -> None:
        if self.model is None:
            self.create()
        self.model.fit(features, labels)

    def predict(self, features: list[list[float]]) -> list[str]:
        self._require_model()
        return self.model.predict(features).tolist()

    def predict_proba(self, features: list[list[float]]) -> list[list[float]]:
        self._require_model()
        return self.model.predict_proba(features).tolist()

    def save(self, path: str | Path) -> None:
        self._require_model()
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        dump(self.model, path)

    def load(self, path: str | Path) -> None:
        path = Path(path)
        if not path.is_file():
            raise FileNotFoundError(f"Model file not found: {path}")
        self.model = load(path)
        if not isinstance(self.model, ExtraTreesClassifier):
            raise TypeError("Saved model is not an ExtraTreesClassifier")

    def _require_model(self) -> None:
        if self.model is None:
            raise RuntimeError("Model has not been created or loaded")


# =====================================================================
# MODEL 2: Configuration Inference
# Architecture requirement: Random Forest
# =====================================================================
class ConfigurationInferenceModel:
    def __init__(self, n_estimators: int = 100, random_state: int = 42):
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.model: RandomForestClassifier | None = None

    def create(self) -> RandomForestClassifier:
        self.model = RandomForestClassifier(
            n_estimators=self.n_estimators,
            random_state=self.random_state,
            n_jobs=-1,
        )
        return self.model

    def fit(self, features: list[list[float]], labels: list[str]) -> None:
        if self.model is None:
            self.create()
        self.model.fit(features, labels)


# =====================================================================
# MODEL 3: Anomaly Detection
# Architecture requirement: Isolation Forest
# =====================================================================
class AnomalyDetectionModel:
    def __init__(self, contamination: float = 0.05, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.model: IsolationForest | None = None

    def create(self) -> IsolationForest:
        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=-1,
        )
        return self.model

    def fit(self, features: list[list[float]]) -> None:
        if self.model is None:
            self.create()
        self.model.fit(features)
        
    def predict(self, features: list[list[float]]) -> list[int]:
        # Isolation Forest returns -1 for anomalies, 1 for normal
        if self.model is None:
            raise RuntimeError("Model has not been created or loaded")
        return self.model.predict(features).tolist()