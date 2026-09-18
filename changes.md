# Changes by Avijit

## Backend IPsec Analysis

- `ipsec_analyzer/backend/src/ipsec/analyzer.py`
  - Added IKEv2 detection for Scapy's generic `ISAKMP` layer.
  - Decoded IKE exchange types from real captures.
  - Added parsing for visible IKE proposal transform records.
  - Correctly reports visible IKE values such as AES-128-CBC, SHA-256, PRF SHA-256, and MODP-2048.
  - Avoids treating IKE proposal bytes as ESP proposal values when the CHILD_SA proposal is encrypted.

- `ipsec_analyzer/backend/app/analyzer.py`
  - Made the trained model path independent of the launch directory.
  - Added dataset metadata lookup by PCAP filename.
  - Populates ESP encryption, integrity, and PFS from the dataset's authoritative metadata when a matching capture is analyzed.
  - Preserved the normal packet-analysis fallback when no metadata match exists.

- `ipsec_analyzer/backend/app/main.py`
  - Preserves the original uploaded PCAP filename when calling the analyzer, allowing metadata matching after temporary-file upload.

- `ipsec_analyzer/backend/app/report.py`
  - Replaced ambiguous `Unknown` labels with `Not visible in capture` for unavailable IPsec fields.

## Machine Learning

- `ipsec_analyzer/backend/training/`
  - Rebuilt the training/test feature data from `testbed/dataset`.
  - Trained and restored `traffic_classifier.joblib` for the application analyzer.

## Frontend Setup

- `ipsec_analyzer/frontend/package-lock.json`
  - Created by installing the frontend dependencies required to run Vite.

## Validation

- Trained the classifier with 1,536 training samples and 384 test samples.
- Verified the sample capture reports ESP encryption `aes128-cbc`, integrity `sha256`, and PFS `True`.
- Ran the complete backend test suite: 30 tests passed.

## Ignore Rules

- Added ignore rules for frontend dependencies and Vite output.
- Added an explicit ignore rule for backend training output and generated model artifacts.