# Implementation Reference — IPsec Sentinel

> Detailed implementation specifications for every module. This document is the authoritative reference for how each component works internally.

---

## Directory Structure

```
d:\Ipsec\
├── pyproject.toml
├── README.md
├── Plan.md
├── Goal.md
├── Implementation.md
├── config/
│   └── default_config.yaml
├── testbed/
│   ├── README.md
│   ├── run_testbed.sh
│   ├── configurations/                     # 18 single-proposal configs
│   ├── traffic_scripts/                    # 6 generators (--target IP)
│   └── labeling/
│       ├── label_pcaps.py                  # Config-as-truth + ESP gate
│       └── dataset_builder.py              # config_id, capture_id, ip_version
├── src/
│   └── ipsec_analyzer/
│       ├── __init__.py
│       ├── capture/
│       │   ├── __init__.py
│       │   ├── packet_loader.py
│       │   └── live_sniffer.py
│       ├── parsers/
│       │   ├── __init__.py
│       │   ├── models.py                   # SourcedValue[T], 4 source types
│       │   ├── ike_parser.py               # Cleartext only, Scapy+tshark
│       │   ├── esp_parser.py               # NAT-T aware, no payload
│       │   ├── ah_parser.py                # Stub
│       │   └── sa_tracker.py
│       ├── ai/
│       │   ├── __init__.py
│       │   ├── feature_engineering.py      # ESP_ONLY (incl ip_version) / FULL
│       │   ├── protocol_identifier.py      # 3 RFs + LOGO ablation
│       │   ├── traffic_classifier.py       # RF + LOGO by capture_id
│       │   ├── anomaly_detector.py
│       │   ├── explainability.py           # Per-target SHAP
│       │   └── llm_advisor.py              # Claude + template fallback
│       ├── assessment/
│       │   ├── __init__.py
│       │   ├── crypto_evaluator.py         # Confidence-weighted scoring
│       │   ├── compliance_checker.py       # RFC 8247 + NIST 800-77
│       │   ├── vulnerability_detector.py   # Source-labeled findings
│       │   └── threat_matrix.py
│       ├── reporting/
│       │   ├── __init__.py
│       │   ├── report_generator.py
│       │   ├── json_exporter.py
│       │   └── templates/
│       │       ├── executive_report.html.j2
│       │       ├── technical_report.html.j2
│       │       └── assessment_template.j2
│       ├── dashboard/
│       │   ├── __init__.py
│       │   ├── app.py
│       │   ├── templates/
│       │   │   ├── index.html
│       │   │   └── components/             # 5 panel templates
│       │   └── static/
│       └── cli/
│           ├── __init__.py
│           └── main.py
├── tests/
│   ├── conftest.py
│   ├── test_ike_parser.py
│   ├── test_esp_parser.py                  # NAT-T marker tests
│   ├── test_sa_tracker.py
│   ├── test_labeling.py                    # ESP gate verification
│   ├── test_crypto_evaluator.py
│   ├── test_protocol_identifier.py         # Ablation verification
│   └── test_integration.py                 # E2E: PCAP → report
├── samples/
│   ├── pcaps/
│   ├── labels/
│   └── training_data/
├── models/
│   ├── rf_cipher.joblib
│   ├── rf_cipher_esp_only.joblib
│   ├── rf_mode.joblib
│   ├── rf_mode_esp_only.joblib
│   ├── rf_pfs.joblib
│   ├── rf_pfs_esp_only.joblib
│   ├── traffic_classifier.joblib
│   ├── traffic_classifier.pt               # CNN-LSTM stretch
│   └── anomaly_baseline.joblib
└── prototype/
    └── dashboard.html                      # Working UI prototype
```

---

## Module 1: Data Models (`parsers/models.py`)

### Purpose
Define the type system that enforces provenance tracking across the entire pipeline.

### Key Types

**SourcedValue[T]** — Generic wrapper annotating every value with how it was determined:
```python
from typing import Literal
from pydantic import BaseModel

SourceType = Literal[
    "parsed_cleartext",     # Directly read from unencrypted IKE_SA_INIT / Phase 1
    "testbed_verified",     # From deployed config file + establishment confirmation
    "ml_inferred",          # Inferred from ESP side-channel features by ML model
    "not_observed",         # No model attempts this; field is genuinely unknown
]

class SourcedValue[T](BaseModel):
    value: T
    source: SourceType
    confidence: float = 1.0  # 1.0 for parsed/verified, 0.0 for not_observed,
                             # model probability for ml_inferred
```

**IKESAParams** — IKE SA's OWN crypto (NOT Child SA):
```python
class IKESAParams(BaseModel):
    encryption: SourcedValue[str]       # e.g. "AES-CBC-256"
    integrity: SourcedValue[str]        # e.g. "HMAC-SHA256"
    prf: SourcedValue[str]              # e.g. "PRF-HMAC-SHA256"
    dh_group: SourcedValue[int]         # e.g. 14, 19, 20
```

**ChildSAParams** — Inferred or testbed-verified:
```python
class ChildSAParams(BaseModel):
    encryption: SourcedValue[str]
    integrity: SourcedValue[str | None]      # None for AEAD ciphers
    dh_group: SourcedValue[int | None]       # None = no PFS
    mode: SourcedValue[str]                  # "tunnel" | "transport"
    pfs_enabled: SourcedValue[bool]
```

**IKESession** — Version-dependent auth_method:
```python
class IKESession(BaseModel):
    initiator_spi: str
    responder_spi: str
    version: SourcedValue[str]              # "IKEv1" | "IKEv2"
    exchange_type: SourcedValue[str]
    ike_sa_params: IKESAParams
    nat_traversal: SourcedValue[bool]
    vendor_ids: list[str]
    timestamps: list[float]
    initiator_ip: str
    responder_ip: str
    auth_method: SourcedValue[str | None]
    # IKEv1: parsed_cleartext (Phase 1 SA attribute)
    # IKEv2: not_observed (AUTH payload inside SK{})
```

**ESPFlow** — Per-SPI flow metadata:
```python
class ESPFlow(BaseModel):
    spi: int
    source_ip: str
    dest_ip: str
    packet_count: int
    seq_numbers: list[int]
    payload_sizes: list[int]        # Encrypted payload sizes — observable
    timestamps: list[float]
    ip_version: int                 # 4 or 6 — required for mode inference
    nat_traversed: bool
```

**AblationResult** — Ablation study output:
```python
class SingleTargetAblation(BaseModel):
    target_name: str
    full_features_macro_f1: float
    esp_only_macro_f1: float
    full_features_per_class: dict[str, dict[str, float]]
    esp_only_per_class: dict[str, dict[str, float]]
    full_features_per_config_acc: dict[str, float]   # ACCURACY, not macro-F1
    esp_only_per_config_acc: dict[str, float]
    decorrelated_configs_full_acc: dict[str, float]   # Configs 13-18
    decorrelated_configs_esp_only_acc: dict[str, float]
    feature_importances_full: dict[str, float]
    feature_importances_esp_only: dict[str, float]
    rare_class_caveat: list[str]

class AblationResult(BaseModel):
    cipher_family: SingleTargetAblation
    operating_mode: SingleTargetAblation
    pfs_status: SingleTargetAblation
    cv_methodology: str = "LeaveOneGroupOut(groups=config_id)"
    n_groups: int = 18
    decorrelated_config_prefixes: list[str] = ["13","14","15","16","17","18"]
```

### Design Decision: PEP 695 Generics
Requires Python ≥3.12. `SourcedValue[T]` uses the new `class Name[T]` syntax. Pinned in `pyproject.toml`.

---

## Module 2: IKE Parser (`parsers/ike_parser.py`)

### Purpose
Extract all directly observable IKE parameters. Enforce the cleartext/encrypted boundary.

### Architecture
- **Dual-path:** Scapy primary, tshark fallback on parse failure
- **Day 1 smoke test required:** `scapy.contrib.ikev2` has historically broken Transform dissection

### What It Extracts (all `parsed_cleartext`, confidence 1.0)
- IKE version (v1/v2) and exchange type
- IKE SA crypto proposals: encryption, integrity, PRF, DH group
- Vendor IDs → vendor lookup table
- NAT-T detection (NAT-D payloads)
- Auth method: IKEv1 only (`parsed_cleartext`). IKEv2: `SourcedValue(value=None, source="not_observed", confidence=0.0)`

### What It Does NOT Extract (encrypted)
- Child SA cipher, integrity, mode, PFS — inside SK{} (IKEv2) or Quick Mode (IKEv1)
- Auth method for IKEv2 — AUTH payload inside SK{}

### Key Implementation
```python
def parse_ike_sa_init(packet):
    try:
        return _parse_with_scapy(packet)
    except (IndexError, AttributeError):
        return _parse_with_tshark(packet)
```

### tshark Fallback
```bash
tshark -r capture.pcap -Y "isakmp.exchangetype==34" -T fields \
  -e isakmp.ispi -e isakmp.rspi \
  -e ikev2.sa.transform.type -e ikev2.sa.transform.id \
  -e ikev2.ke.dh_group -e isakmp.vid
```

### Exchange Type Filter
- IKEv2: Only `exchangetype == 34` (IKE_SA_INIT). Skip 35+ (encrypted).
- IKEv1: Main Mode messages 1-2, Aggressive Mode message 1. Skip Quick Mode (32, encrypted).

---

## Module 3: ESP Parser (`parsers/esp_parser.py`)

### Purpose
Extract ESP packet metadata without inspecting encrypted payload content.

### NAT-T Handling (RFC 3948 §2.2)
```python
def extract_esp_from_udp(udp_payload: bytes, src_port: int, dst_port: int) -> bytes | None:
    if src_port == 4500 or dst_port == 4500:
        if len(udp_payload) < 4:
            return None
        if udp_payload[:4] == b"\x00\x00\x00\x00":
            return None  # Non-ESP marker → IKE-over-4500
        return udp_payload  # Non-zero first 4 bytes = SPI → ESP
    return udp_payload  # Proto 50, no marker
```

### What It Extracts
- SPI (4-byte big-endian uint32)
- Sequence numbers (per-SPI ordered list)
- Encrypted payload sizes (total ESP length - 8 header bytes)
- Timestamps (pcap capture time)
- IP version (4 or 6)
- `nat_traversed` flag

### Sequence Analysis
- **Gaps** (seq[i+1] - seq[i] > 1): packet loss count
- **Resets** (seq[i+1] << seq[i]): SA rekeying indicator
- **Out-of-order** (seq[i+1] < seq[i], small diff): replay/reorder
- **Wrap-around** (seq approaching 2³²): ESN warning

### Critical Constraint
**No payload inspection.** The ESP payload is ciphertext. Mode inference is done statistically by `feature_engineering.py` and `rf_mode`, not by looking at payload content.

---

## Module 4: SA Tracker (`parsers/sa_tracker.py`)

### Purpose
Correlate IKE sessions with ESP flows to build `SecurityAssociation` objects.

### Correlation Logic
- Match by IP address pairs (IKE initiator/responder ↔ ESP source/dest)
- Match by timing (ESP flows starting after IKE session establishment)
- Track SA lifecycle: establishment → rekeying (sequence resets) → expiry
- Apply appropriate `source` annotations to the combined object

---

## Module 5: Feature Engineering (`ai/feature_engineering.py`)

### Feature Sets (architecturally separated for ablation)

**ESP_ONLY_FEATURES (19 features — no cleartext IKE info):**

| # | Feature | Signal | Target |
|---|---------|--------|--------|
| 1 | `payload_size_mean` | Average encrypted payload | Mode (overhead) |
| 2 | `payload_size_std` | Payload variability | Traffic type |
| 3 | `payload_size_min` | Minimum payload | — |
| 4 | `payload_size_max` | Maximum payload | — |
| 5 | `payload_size_median` | Central tendency | Mode |
| 6 | `payload_size_skew` | Distribution shape | Traffic type |
| 7 | `payload_size_mod16_ratio` | **★ CBC: ≡ 1.0 (block cipher guarantee)** | **Cipher** |
| 8 | `payload_size_mod16_variance` | Consistency of mod-16 property | Cipher |
| 9 | `has_consistent_tag_size` | GCM: fixed 16B ICV | Cipher |
| 10 | `spi_entropy` | SPI randomness | — |
| 11 | `seq_gap_count` | Packet loss | — |
| 12 | `seq_reset_count` | **★ SA rekeying indicator** | **PFS** |
| 13 | `iat_mean` | Average inter-arrival time | Traffic type |
| 14 | `iat_std` | Timing variability | Traffic type |
| 15 | `pkt_count` | Flow volume | — |
| 16 | `bytes_total` | Total bytes | — |
| 17 | `flow_duration` | Flow length | PFS (rekey) |
| 18 | `nat_traversed` | NAT-T encapsulation | — |
| 19 | `ip_version` | **★ Required: 20B vs 40B overhead** | **Mode** |

**IKE_HINT_FEATURES (5 features — cleartext, correlated hints):**

| # | Feature | Note |
|---|---------|------|
| 1 | `ike_sa_encryption` | Categorical encoded. IKE SA's OWN cipher, NOT Child SA. |
| 2 | `ike_sa_integrity` | Categorical encoded. |
| 3 | `ike_sa_dh_group` | Numeric. |
| 4 | `exchange_type` | Main/Aggressive/IKE_SA_INIT |
| 5 | `ike_version` | v1/v2 |

**FULL_FEATURES = ESP_ONLY_FEATURES + IKE_HINT_FEATURES (24 total)**

### Traffic Classification Features

| Feature | Signal |
|---------|--------|
| `pkt_size_mean/std/min/max/median/skew` | VoIP=uniform, video=bimodal, web=heavy-tailed |
| `iat_mean/std/min/max/median` | VoIP=regular 20ms, chat=bursty |
| `flow_duration`, `pkt_count`, `bytes_total` | Volume profile |
| `burst_count`, `burst_avg_size` | Chat/web=bursty, VoIP=steady |
| `idle_ratio`, `direction_ratio` | Asymmetry |

---

## Module 6: Protocol Identifier (`ai/protocol_identifier.py`)

### Architecture: 3 Separate Single-Output Random Forests

**Why not multi-output:** A multi-output RF returns `feature_importances_` averaged across all targets. This kills per-target SHAP explainability — you can't show that `mod16_ratio` drives cipher prediction while contributing nothing to mode prediction.

| Model | Target | Expected Difficulty | Key Signal |
|-------|--------|--------------------|-----------|
| `rf_cipher` | CBC / GCM / 3DES | Near-deterministic | `mod16_ratio` (structural) |
| `rf_mode` | Tunnel / Transport | Genuinely statistical | `payload_size_mean` + `ip_version` |
| `rf_pfs` | Enabled / Disabled | Hardest target | `seq_reset_count` + timing |

### Ablation Study Implementation

```python
from sklearn.model_selection import LeaveOneGroupOut, cross_val_predict
from sklearn.metrics import accuracy_score, f1_score, classification_report
from sklearn.ensemble import RandomForestClassifier

DECORRELATED_PREFIXES = {"13", "14", "15", "16", "17", "18"}

def is_decorrelated(config_id: str) -> bool:
    return config_id.split("_", 1)[0] in DECORRELATED_PREFIXES

def train_single_target_with_ablation(X, y, groups, target_name):
    logo = LeaveOneGroupOut()
    rf_full = RandomForestClassifier(n_estimators=200, random_state=42)
    rf_esp  = RandomForestClassifier(n_estimators=200, random_state=42)

    # Out-of-fold predictions
    y_pred_full = cross_val_predict(rf_full, X[FULL_FEATURES], y, cv=logo, groups=groups)
    y_pred_esp  = cross_val_predict(rf_esp, X[ESP_ONLY_FEATURES], y, cv=logo, groups=groups)

    # Per-config: ACCURACY (not macro-F1 — phantom-class distortion)
    per_config_full, per_config_esp = {}, {}
    for cid in groups.unique():
        mask = groups == cid
        per_config_full[cid] = accuracy_score(y[mask], y_pred_full[mask])
        per_config_esp[cid]  = accuracy_score(y[mask], y_pred_esp[mask])

    # Headline evidence: decorrelated configs
    decorrelated_full = {k: v for k, v in per_config_full.items() if is_decorrelated(k)}
    decorrelated_esp  = {k: v for k, v in per_config_esp.items() if is_decorrelated(k)}
    assert len(decorrelated_full) == len(DECORRELATED_PREFIXES)

    # Final models trained on full dataset
    rf_full.fit(X[FULL_FEATURES], y)
    rf_esp.fit(X[ESP_ONLY_FEATURES], y)
    # ... return SingleTargetAblation
```

### Interpreting Ablation Results
- **ESP-only ≈ Full on configs 13–18:** Model learns genuine side-channel signal ✅
- **ESP-only << Full on configs 13–18:** Model depends on IKE hints (leakage) ⚠️
- **ESP-only >> Full on configs 13–18:** IKE hints actively mislead (decorrelation working) 🔍
- **Both outcomes are valid contributions. The ablation itself is the evidence.**

---

## Module 7: Traffic Classifier (`ai/traffic_classifier.py`)

### Core: Random Forest
- LOGO by `capture_id` (windows from same capture session stay together)
- Predicts: voip, web_browsing, video_streaming, email, chat, icmp

### Stretch: CNN-LSTM (PyTorch CUDA)
```
Input [batch, 30, 3] → Conv1D(3→32) → BatchNorm → Conv1D(32→64) → MaxPool
→ BiLSTM(64→128) → FC(256→128) → Dropout(0.3) → FC → Softmax
```
Mixed precision (`torch.cuda.amp`) for RTX 3050 (4GB VRAM).

---

## Module 8: Anomaly Detector (`ai/anomaly_detector.py`)

- Isolation Forest (`contamination=0.05`)
- Baselined on testbed normal traffic
- Detects: abnormal renegotiation, SPI reuse, sequence anomalies, volume spikes, timing anomalies
- `joblib` persistence

---

## Module 9: SHAP Explainability (`ai/explainability.py`)

### 3 Separate TreeExplainers
```python
explainer_cipher = shap.TreeExplainer(rf_cipher)
explainer_mode   = shap.TreeExplainer(rf_mode)
explainer_pfs    = shap.TreeExplainer(rf_pfs)
```

### Expected Stories
- **Cipher SHAP:** `mod16_ratio` dominates → "protocol arithmetic drives cipher detection"
- **Mode SHAP:** `payload_size_mean` + `ip_version` dominate → "overhead detection is genuinely statistical"
- **PFS SHAP:** `seq_reset_count` + `ike_sa_dh_group` → "rekeying patterns + correlated hints"

Output: PNG + JSON for reports and dashboard.

---

## Module 10: Crypto Evaluator (`assessment/crypto_evaluator.py`)

### Algorithm Security Database

| Algorithm | Base Score | Notes |
|-----------|-----------|-------|
| AES-256-GCM | 95 | Excellent — AEAD |
| AES-256-CBC | 85 | Good |
| AES-128-GCM | 90 | Very Good — AEAD |
| AES-128-CBC | 80 | Good |
| 3DES | 30 | Deprecated — Sweet32 |
| DES | 5 | Broken |
| NULL | 0 | No encryption |
| DH-21 (521-ECP) | 95 | Excellent |
| DH-20 (384-ECP) | 90 | Very Good |
| DH-19 (256-ECP) | 85 | Good |
| DH-14 (2048-MODP) | 70 | Acceptable |
| DH-5 (1536-MODP) | 40 | Weak |
| DH-2 (1024-MODP) | 15 | Logjam-vulnerable |
| DH-1 (768-MODP) | 5 | Broken |

### Confidence-Weighted Scoring
- `parsed_cleartext` (confidence 1.0): scored at full weight
- `ml_inferred` (confidence 0.87): raw_score × 0.87 weight
- `not_observed` (confidence 0.0): **excluded from scoring entirely**

---

## Module 11: Compliance Checker (`assessment/compliance_checker.py`)

### RFC 8247 Checks
- MUST implement: AES-CBC-128 (§3.1), HMAC-SHA256-128 (§3.2), DH Group 14 (§3.4)
- SHOULD implement: AES-GCM-16 (§3.1), DH Group 19 (§3.4)
- MUST NOT: DES (§3.1), DH-1 (§3.4)
- Deprecation warnings: 3DES (MAY, declining), DH-2 (SHOULD NOT)

### NIST SP 800-77 Rev.1 Checks
- §3.2: Tunnel mode recommended for gateway-to-gateway
- §4.2.1: Key strength ≥ 128-bit symmetric
- §4.2.2: PFS recommended for high-security
- §4.2.3: SA lifetime (if observable)

### CNSA 2.0 (Illustrative Only)
- AES-256 required, DH ≥ P-384 required
- **Not a regulatory claim** — illustrative post-quantum readiness benchmark

---

## Module 12: Vulnerability Detector (`assessment/vulnerability_detector.py`)

### Cleartext-Sourced (confidence 1.0)
| Vulnerability | Severity | Evidence |
|--------------|----------|----------|
| Aggressive Mode + PSK | CRITICAL | `exchange_type == 4` |
| IKEv1 usage | HIGH | `version == 1` |
| Weak DH (Logjam) | CRITICAL | `dh_group ∈ {1, 2, 5}` |
| NULL/DES in IKE SA | CRITICAL | `encryption ∈ {NULL, DES}` |
| SHA-1/MD5 integrity | HIGH | `integrity ∈ {SHA1, MD5}` |

### ML-Inferred (confidence = model probability)
| Vulnerability | Severity | Note |
|--------------|----------|------|
| Weak ESP cipher (3DES/DES) | HIGH* | Labeled "Inferred with X% confidence" |
| Transport mode | MEDIUM* | |
| Missing PFS | HIGH* | |

### Sequence-Based (rule, confidence 1.0)
| Vulnerability | Severity |
|--------------|----------|
| SPI reuse | MEDIUM |
| Seq near wrap-around (ESN needed) | MEDIUM |
| Replay indicators (out-of-order) | MEDIUM |

---

## Module 13: Threat Matrix (`assessment/threat_matrix.py`)

- Maps findings → attack scenarios
- Risk Score = Σ(likelihood × impact) / max, normalized 0–100
- ML-inferred findings: likelihood scaled by model confidence

---

## Module 14: LLM Advisor (`ai/llm_advisor.py`)

```python
class LLMAdvisor:
    def __init__(self):
        if os.getenv("ANTHROPIC_API_KEY"):
            self.provider = ClaudeProvider()       # Claude Sonnet — primary
        else:
            self.provider = TemplateFallback()      # Jinja2 — no API needed

class TemplateFallback:
    def analyze(self, findings: dict) -> str:
        return render_template("assessment_template.j2", findings)
```

- System prompt with IPsec domain expertise
- Structured JSON input preserving source annotations
- Outputs: Executive Summary, Technical Analysis, Remediation Plan, Risk Narrative
- `--no-ai` flag bypasses LLM entirely

---

## Module 15: Report Generator (`reporting/report_generator.py`)

### Executive Report
- Overall Security + Risk Score gauges
- Executive summary (LLM or template)
- Top critical findings with source annotations
- Compliance summary
- Prioritized remediation actions

### Technical Report
- SA inventory with cleartext / inferred distinction
- Per-SA scorecard
- Ablation study: pooled macro-F1, per-config accuracy, decorrelated headline
- Per-target SHAP plots
- Calibration statement: "Cipher-family relies on near-deterministic structural signal"
- Rare-class caveat: "3DES from 2 of 18 configs"
- IPv6 and decorrelated evidence as separate findings
- Vulnerability listing, threat matrix, traffic classification
- Compliance breakdown, TFC limitation, CV methodology
- Remediation config snippets (swanctl.conf examples)

---

## Module 16: Dashboard (`dashboard/app.py`)

- FastAPI with file upload, REST API, WebSocket for live mode
- HTMX for partial-page updates, Plotly for charts, Tailwind CSS

### 5 Panels

| Panel | Content |
|-------|---------|
| Security Score Gauge | 0–100 radial + risk score, color-coded |
| SA Overview Table | IKE SA (cleartext), inferred Child SA (with confidence badges), per-SA score |
| Threat Matrix | Heatmap, linked to triggering findings |
| Traffic Classification | Pie/bar chart with per-class confidence bars |
| AI Insights | LLM or template output, expandable sections |

---

## Module 17: CLI (`cli/main.py`)

```
ipsec-analyzer analyze <pcap>             # Full pipeline
ipsec-analyzer analyze --live <iface>     # Live capture
ipsec-analyzer train <dataset_dir>        # Train models
ipsec-analyzer report <results.json>      # Generate reports
ipsec-analyzer dashboard                  # Web UI on localhost:8000
ipsec-analyzer dataset build <pcap_dir>   # Build features from labeled PCAPs
```

Flags: `--output`, `--format`, `--compliance`, `--no-ai`, `--device cuda|cpu`, `--verbose`, `--config`

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `scapy` | ≥2.6 | Packet parsing |
| `scikit-learn` | ≥1.5 | RF, Isolation Forest, CV |
| `torch` | ≥2.3+cu121 | CNN-LSTM stretch (CUDA) |
| `pandas` | ≥2.2 | Feature engineering |
| `numpy` | ≥1.26 | Numerical computation |
| `anthropic` | ≥0.40 | Claude API |
| `fastapi` | ≥0.115 | Dashboard |
| `uvicorn` | ≥0.30 | ASGI server |
| `jinja2` | ≥3.1 | Templates |
| `plotly` | ≥5.24 | Charts |
| `click` | ≥8.1 | CLI |
| `rich` | ≥13.9 | Terminal output |
| `pyyaml` | ≥6.0 | Config |
| `shap` | ≥0.46 | Explainability |
| `joblib` | ≥1.4 | Model serialization |
| `pydantic` | ≥2.9 | Data validation |
| `matplotlib` | ≥3.9 | Report charts |

---

## Protocol Constraints (Must Never Be Violated)

1. ESP payload is ciphertext — never inspect for mode/content
2. IKE_SA_INIT cleartext ≠ Child SA params — different keys, different negotiation
3. PSK doesn't unlock anything — SKEYSEED = prf(Ni|Nr, g^ir), not PSK
4. IKEv2 auth_method = `not_observed` — inside SK{}, no model predicts it
5. IKEv1 auth_method = `parsed_cleartext` — Phase 1 SA attribute
6. RFC 3948: ESP-over-UDP-4500 has 4-byte non-ESP marker
7. RFC 4303 §2.4: TFC padding defeats all payload-size side channels (stated limitation)

---

## Verification Commands

```bash
# Pre-flight
python3 -c "import sys; assert sys.version_info >= (3, 12)"
python3 -c "from scapy.contrib.ikev2 import IKEv2; print('OK')"
python3 -c "import torch; assert torch.cuda.is_available()"
grep -E 'esp_proposals|proposals' testbed/configurations/*.conf | grep ','

# Test suite
pip install -e ".[dev]"
pytest tests/ -v --tb=short --cov=ipsec_analyzer
mypy src/ipsec_analyzer/
ruff check src/
```
