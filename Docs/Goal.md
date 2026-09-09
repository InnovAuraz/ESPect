# Project Goals — IPsec Sentinel

## Final Goal

A production-ready, end-to-end AI-powered IPsec VPN Protocol Analyzer that:
- Parses IKE/ESP packets from PCAP or live capture
- Infers cryptographically inaccessible Child SA parameters (cipher family, operating mode, PFS status) from ESP side-channel signals
- Classifies encrypted traffic type (VoIP, web, video, email, chat, ICMP)
- Assesses security posture against RFC 8247 and NIST SP 800-77
- Generates LLM-powered or template-based reports with honest provenance
- Presents findings in a 5-panel interactive dashboard
- Validates all claims through a rigorous LOGO ablation study with decorrelated configs

---

## Phase 1 — Foundation & Data Models

**Goal:** Establish the project skeleton — package structure, type system, and configuration.

- [ ] Create `pyproject.toml` with `requires-python = ">=3.12"` and all dependencies pinned
- [ ] Create `config/default_config.yaml` with runtime configuration
- [ ] Create `src/ipsec_analyzer/parsers/models.py` with all Pydantic data models:
  - [ ] `SourcedValue[T]` generic with 4 source types (`parsed_cleartext`, `testbed_verified`, `ml_inferred`, `not_observed`)
  - [ ] `IKESAParams` — IKE SA's own crypto suite
  - [ ] `ChildSAParams` — ESP/Child SA parameters with source annotations
  - [ ] `IKESession` — full IKE session with version-dependent `auth_method` handling
  - [ ] `ESPFlow` — per-SPI flow metadata including `ip_version`
  - [ ] `SecurityAssociation` — combined IKE + Child SA
  - [ ] `TrafficPrediction`, `CaptureMetadata`
  - [ ] `SingleTargetAblation`, `AblationResult` — ablation study structures
  - [ ] `AnalysisResult` — top-level output container
- [ ] Create all `__init__.py` files for package structure
- [ ] Verify Python 3.12+ is available on all machines
- [ ] Verify `pip install -e .` succeeds
- [ ] Verify `SourcedValue[int](value=42, source="parsed_cleartext")` constructs correctly

**Phase 1 Complete:** [ ]

---

## Phase 2 — Protocol Parsers

**Goal:** Build protocol parsers that correctly extract cleartext parameters and ESP metadata.

- [ ] **Day 1 Scapy IKEv2 smoke test** — parse a real IKE_SA_INIT PCAP with `scapy.contrib.ikev2`
  - [ ] If smoke test fails: activate tshark-primary path immediately
- [ ] Create `capture/packet_loader.py` — streaming `PcapReader`
- [ ] Create `capture/live_sniffer.py` — `scapy.sniff()` with BPF filter
- [ ] Create `parsers/ike_parser.py`:
  - [ ] Dual-path: Scapy primary, tshark fallback on `IndexError`/`AttributeError`
  - [ ] IKEv2 path: extract SA/KE/VID/NAT-D from `IKE_SA_INIT` (exchange type 34 only)
  - [ ] IKEv1 path: extract from Main Mode (messages 1-2) / Aggressive Mode (message 1)
  - [ ] `auth_method`: `parsed_cleartext` for IKEv1, `not_observed` for IKEv2
  - [ ] Skip all encrypted exchanges (IKE_AUTH, Quick Mode) — no extraction attempted
  - [ ] All outputs tagged `source="parsed_cleartext"`, `confidence=1.0`
- [ ] Create `parsers/esp_parser.py`:
  - [ ] NAT-T handling per RFC 3948 §2.2:
    - [ ] UDP 4500 with first 4 bytes `0x00000000` → IKE, skip
    - [ ] UDP 4500 with non-zero first 4 bytes → SPI → ESP
    - [ ] IP proto 50 → direct ESP
  - [ ] Extract: SPI, sequence numbers, encrypted payload sizes, timestamps, ip_version, nat_traversed
  - [ ] Sequence analysis: gaps (loss), resets (rekeying), out-of-order (replay), wrap-around (ESN)
  - [ ] **No payload inspection** — ESP payload is ciphertext
- [ ] Create `parsers/ah_parser.py` — stub (SPI + sequence number only)
- [ ] Create `parsers/sa_tracker.py` — IKE↔ESP correlation via timing + IP matching
- [ ] Create `tests/test_ike_parser.py`
- [ ] Create `tests/test_esp_parser.py` with 4 NAT-T test cases:
  - [ ] Plaintext-only PCAP → rejected
  - [ ] Genuine ESP (proto 50) → accepted
  - [ ] NAT-T ESP (UDP 4500, non-zero marker) → accepted
  - [ ] IKE-over-4500 (zero marker) → rejected
- [ ] Create `tests/test_sa_tracker.py`

**Phase 2 Complete:** [ ]

---

## Phase 3 — Security Assessment

**Goal:** Build rule-based security scoring, compliance checking, and vulnerability detection.

- [ ] Create `assessment/crypto_evaluator.py`:
  - [ ] Algorithm security database (AES-256-GCM: 95, AES-128-CBC: 80, 3DES: 30, DES: 5, NULL: 0, etc.)
  - [ ] Confidence-weighted scoring: `parsed_cleartext` → full weight, `ml_inferred` → weight × model confidence, `not_observed` → excluded
  - [ ] Aggregate Security Score (0–100)
- [ ] Create `assessment/compliance_checker.py`:
  - [ ] RFC 8247 — MUST/SHOULD/MAY algorithm requirements with clause references
  - [ ] NIST SP 800-77 Rev.1 — configuration guidance
  - [ ] CNSA 2.0 — illustrative benchmark only (not regulatory claim)
  - [ ] Verify each clause reference against published text
- [ ] Create `assessment/vulnerability_detector.py`:
  - [ ] Cleartext-sourced (confidence 1.0): Aggressive Mode+PSK, IKEv1, weak DH (Logjam), NULL/DES, SHA-1/MD5
  - [ ] ML-inferred (with confidence): weak ESP cipher, transport mode, missing PFS
  - [ ] Sequence-based (rule): SPI reuse, seq wrap-around, replay indicators
  - [ ] Every finding carries: severity, source, confidence, evidence, remediation
- [ ] Create `assessment/threat_matrix.py`:
  - [ ] Map findings → attack scenarios
  - [ ] Risk Score = Σ(likelihood × impact), normalized 0–100
- [ ] Create `tests/test_crypto_evaluator.py`:
  - [ ] Weak SA (3DES, DH-2, no PFS) → score < 30, CRITICAL findings
  - [ ] Strong SA (AES-256-GCM, DH-20, PFS) → score > 90, no critical findings

**Phase 3 Complete:** [ ]

---

## Phase 4 — Testbed & Dataset

**Goal:** Generate 108 labeled PCAP captures from 18 VPN configurations × 6 traffic types.

- [ ] Create 18 `swanctl.conf` files (12 correlated + 6 decorrelated)
  - [ ] Configs 01–12: IKE SA ≈ Child SA strength (correlated)
  - [ ] Configs 13–18: IKE SA ≠ Child SA (decorrelated — hints mislead)
  - [ ] Verify: `grep ',' configurations/*.conf` returns empty (single-proposal only)
- [ ] Create 6 traffic generator scripts (all with `--target` IP argument):
  - [ ] `gen_web_traffic.py` — curl/wget loops
  - [ ] `gen_voip_traffic.py` — iperf3 UDP G.711 simulation
  - [ ] `gen_video_traffic.py` — iperf3 UDP RTP simulation
  - [ ] `gen_email_traffic.py` — SMTP/IMAP simulation
  - [ ] `gen_chat_traffic.py` — TCP socket ping-pong
  - [ ] `gen_icmp_traffic.py` — ping/ping6
- [ ] Create `run_testbed.sh`:
  - [ ] SSH-scripted deployment to both VMs
  - [ ] Poll-until-ESTABLISHED (15 attempts, 2s apart)
  - [ ] tcpdump on eth0 (host-only adapter, NOT NAT)
  - [ ] Traffic generation targeting tunnel endpoint IP
- [ ] **Manual dry run of 1 config before full sweep**
  - [ ] Verify PCAP contains ESP: `tcpdump -r file.pcap -n proto 50 | head`
- [ ] Full 108-run sweep
- [ ] Create `labeling/label_pcaps.py`:
  - [ ] ESP presence gate (`verify_capture_contains_esp()`) — blocks bad captures
  - [ ] Config-as-ground-truth (`parse_swanctl_conf()`) — no decryption
  - [ ] Assert no multi-proposal configs (no commas)
  - [ ] Report accepted/rejected counts
- [ ] Create `labeling/dataset_builder.py`:
  - [ ] Build training CSV with `config_id`, `capture_id`, `ip_version` columns
  - [ ] Verify 18 unique `config_id` values in output
- [ ] Create `tests/test_labeling.py` with 4 ESP gate test cases

**Phase 4 Complete:** [ ]

---

## Phase 5 — AI Classification Engine

**Goal:** Train ML models, run ablation study, validate the core scientific claim.

- [ ] Create `ai/feature_engineering.py`:
  - [ ] 19 ESP_ONLY_FEATURES (including `ip_version` for mode inference)
  - [ ] 5 IKE_HINT_FEATURES (cleartext IKE SA params)
  - [ ] 24 FULL_FEATURES (combined)
  - [ ] Traffic classification features (size/timing/burst/idle stats)
- [ ] Create `ai/protocol_identifier.py`:
  - [ ] 3 separate single-output Random Forests (NOT multi-output)
    - [ ] `rf_cipher` — CBC / GCM / 3DES
    - [ ] `rf_mode` — Tunnel / Transport (★ core statistical test)
    - [ ] `rf_pfs` — Enabled / Disabled
  - [ ] LOGO ablation with `cross_val_predict`:
    - [ ] LeaveOneGroupOut by `config_id` (18 folds)
    - [ ] Per-config **accuracy** (NOT macro-F1 — phantom-class distortion)
    - [ ] Decorrelated config matching: `config_id.split("_", 1)[0]` (NOT `lstrip("0")`)
    - [ ] `assert len(decorrelated_full) == 6` — hard fail on naming changes
  - [ ] **Run ablation immediately after first successful training**
  - [ ] Inspect decorrelated configs 13–18 accuracy — this is the headline evidence
  - [ ] Document rare-class caveat (3DES: 2/18 configs)
  - [ ] Serialize models to `models/*.joblib`
- [ ] Create `ai/traffic_classifier.py`:
  - [ ] RF core with LOGO by `capture_id`
  - [ ] CNN-LSTM stretch (PyTorch CUDA, after RF works)
- [ ] Create `ai/anomaly_detector.py`:
  - [ ] Isolation Forest baselined on testbed normal traffic
- [ ] Create `ai/explainability.py`:
  - [ ] 3 separate SHAP TreeExplainers (one per target)
  - [ ] Verify: `mod16_ratio` dominates cipher, `payload_size_mean` + `ip_version` dominate mode
  - [ ] Generate waterfall/force/summary plots (PNG + JSON)
- [ ] Check IPv6 configs (10, 11, 18) accuracy specifically — report outcome either way
- [ ] Create `tests/test_protocol_identifier.py`

**Phase 5 Complete:** [ ]

---

## Phase 6 — Reporting & LLM

**Goal:** Generate natural-language reports with honest provenance and demo-safe fallback.

- [ ] Create `ai/llm_advisor.py`:
  - [ ] Claude Sonnet provider (primary)
  - [ ] Jinja2 template fallback (no API dependency)
  - [ ] System prompt with IPsec domain expertise
  - [ ] Structured JSON input preserving source annotations
- [ ] Create `reporting/report_generator.py`:
  - [ ] Executive Report: score gauges, summary, critical findings, compliance, remediation
  - [ ] Technical Report: SA inventory, ablation study, SHAP plots, vulnerability listing, compliance breakdown, CV methodology, TFC limitation statement
- [ ] Create report templates:
  - [ ] `templates/executive_report.html.j2`
  - [ ] `templates/technical_report.html.j2`
  - [ ] `templates/assessment_template.j2` (LLM-free fallback)
- [ ] Create `reporting/json_exporter.py` — `.model_dump_json()` on `AnalysisResult`
- [ ] Test `--no-ai` flag independently — must produce complete report
- [ ] Verify source annotations propagate into report text

**Phase 6 Complete:** [ ]

---

## Phase 7 — Dashboard, CLI & Integration

**Goal:** Assemble everything into a polished, usable product.

- [ ] Create `dashboard/app.py`:
  - [ ] FastAPI with file upload, REST API, WebSocket for live mode
  - [ ] 5 panels: Security Score, SA Overview, Threat Matrix, Traffic Classification, AI Insights
  - [ ] HTMX partial-page updates, Plotly charts, Tailwind CSS
- [ ] Create dashboard templates and static assets
- [ ] Create `cli/main.py`:
  - [ ] `ipsec-analyzer analyze <pcap>` — full pipeline
  - [ ] `ipsec-analyzer analyze --live <iface>` — live capture
  - [ ] `ipsec-analyzer train <dataset_dir>` — train models
  - [ ] `ipsec-analyzer report <results.json>` — generate reports
  - [ ] `ipsec-analyzer dashboard` — web UI on localhost:8000
  - [ ] `ipsec-analyzer dataset build <pcap_dir>` — build features
  - [ ] Flags: `--output`, `--format`, `--compliance`, `--no-ai`, `--device cuda|cpu`, `--verbose`, `--config`
- [ ] Create `tests/test_integration.py` — E2E tests:
  - [ ] PCAP → Parse → Assess → Classify → Report → Dashboard
  - [ ] Decorrelated configs → ML inference differs from IKE SA cleartext
  - [ ] `--no-ai` → template fallback produces complete report
  - [ ] Rejected captures (no ESP) → no label file generated
- [ ] Create `README.md` with installation, usage, architecture overview
- [ ] Run full test suite: `pytest tests/ -v --tb=short --cov=ipsec_analyzer`
- [ ] Run type checker: `mypy src/ipsec_analyzer/`
- [ ] Run linter: `ruff check src/`

**Phase 7 Complete:** [ ]

---

## Project Complete: [ ]

**Final deliverables:**
- [ ] CLI tool working end-to-end
- [ ] 3 trained RF models with ablation results
- [ ] Traffic classifier (RF + optional CNN-LSTM)
- [ ] Anomaly detector baselined
- [ ] Assessment engine with compliance checking
- [ ] Executive + Technical reports generating correctly
- [ ] Dashboard serving on localhost with all 5 panels
- [ ] Labeled dataset (108 captures) archived
- [ ] Ablation evidence documented and honest
- [ ] README complete
- [ ] All tests passing
