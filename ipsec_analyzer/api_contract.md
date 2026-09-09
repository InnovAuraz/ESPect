# ESPect API Contract

**Version:** 1.0  
**Base URL:** `http://localhost:8000`

This document defines the public HTTP API contract between the ESPect FastAPI backend and the React frontend.

The frontend must depend only on this contract. It must not depend on internal `src/` module implementations.

---

## 1. API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Check whether the backend is running |
| `POST` | `/api/analyze` | Analyze an uploaded PCAP and return JSON results |
| `POST` | `/api/report` | Analyze an uploaded PCAP and return a downloadable PDF report |

---

# 2. Health Check

## `GET /health`

No request body.

### Response `200`

```json
{
  "status": "ok"
}
```

---

# 3. PCAP Analysis

## `POST /api/analyze`

Analyzes one uploaded PCAP.

### Request

Content type:

```text
multipart/form-data
```

Form field:

```text
file
```

The `file` field contains the PCAP file.

### Response `200`

```json
{
  "ipsec": {
    "ip_version": "ipv4",
    "ike_detected": true,
    "ike_version": "IKEv2",
    "ike_exchange_types": [
      "IKE_SA_INIT",
      "IKE_AUTH"
    ],
    "ike_encryption": "aes-cbc",
    "ike_integrity": "sha256",
    "ike_prf": "sha256",
    "ike_dh_group": "modp2048",
    "esp_detected": true,
    "esp_packet_count": 513,
    "esp_bytes": 125146,
    "esp_spis": [
      3314567513,
      3428231189
    ],
    "esp_encryption": null,
    "esp_integrity": null,
    "esp_pfs": null,
    "source_addresses": [
      "192.168.160.128",
      "192.168.160.129"
    ],
    "destination_addresses": [
      "192.168.160.128",
      "192.168.160.129"
    ],
    "mode": "transport"
  },
  "traffic": {
    "predicted_type": "voip",
    "confidence": 1.0
  },
  "security": {
    "score": 85,
    "status": "WARNING",
    "findings": [
      {
        "severity": "MEDIUM",
        "title": "ESP encryption could not be determined",
        "description": "The ESP encryption algorithm could not be determined from the captured traffic.",
        "recommendation": "Verify the configured ESP encryption algorithm."
      }
    ]
  }
}
```

---

# 4. Response Schema

## 4.1 `ipsec`

| Field | Type | Nullable | Description |
|---|---|---:|---|
| `ip_version` | `string` | Yes | Detected IP version |
| `ike_detected` | `boolean` | No | Whether IKE traffic was detected |
| `ike_version` | `string` | Yes | Detected IKE version |
| `ike_exchange_types` | `string[]` | No | Detected IKE exchange types |
| `ike_encryption` | `string` | Yes | IKE encryption algorithm |
| `ike_integrity` | `string` | Yes | IKE integrity algorithm |
| `ike_prf` | `string` | Yes | IKE PRF |
| `ike_dh_group` | `string` | Yes | IKE Diffie-Hellman group |
| `esp_detected` | `boolean` | No | Whether ESP traffic was detected |
| `esp_packet_count` | `integer` | No | Number of ESP packets |
| `esp_bytes` | `integer` | No | Total ESP bytes |
| `esp_spis` | `integer[]` | No | Detected ESP Security Parameter Index values |
| `esp_encryption` | `string` | Yes | ESP encryption algorithm |
| `esp_integrity` | `string` | Yes | ESP integrity algorithm |
| `esp_pfs` | `boolean` | Yes | Whether PFS was detected |
| `source_addresses` | `string[]` | No | Source IP addresses |
| `destination_addresses` | `string[]` | No | Destination IP addresses |
| `mode` | `string` | Yes | Detected IPsec mode |

Nullable fields may be `null` when the required information cannot be determined from the PCAP.

## 4.2 `traffic`

```json
{
  "predicted_type": "voip",
  "confidence": 1.0
}
```

| Field | Type | Description |
|---|---|---|
| `predicted_type` | `string` | ML-predicted traffic type |
| `confidence` | `number` | Prediction confidence from `0.0` to `1.0` |

Current traffic classes:

```text
email
icmp
video
voip
web
whatsapp
```

## 4.3 `security`

```json
{
  "score": 85,
  "status": "WARNING",
  "findings": []
}
```

| Field | Type | Description |
|---|---|---|
| `score` | `integer` | Security score from `0` to `100` |
| `status` | `string` | Overall security status |
| `findings` | `SecurityFinding[]` | Security findings and recommendations |

### Status values

```text
SECURE
WARNING
CRITICAL
```

### `SecurityFinding`

```json
{
  "severity": "MEDIUM",
  "title": "ESP encryption could not be determined",
  "description": "The ESP encryption algorithm could not be determined from the captured traffic.",
  "recommendation": "Verify the configured ESP encryption algorithm."
}
```

Severity values:

```text
INFO
LOW
MEDIUM
HIGH
CRITICAL
```

The frontend must render findings dynamically and must not assume a fixed number of findings.

---

# 5. PDF Report

## `POST /api/report`

Analyzes an uploaded PCAP and generates the final ESPect security assessment as a PDF.

### Request

Content type:

```text
multipart/form-data
```

Form field:

```text
file
```

### Response `200`

Content type:

```text
application/pdf
```

The response contains the dynamically generated ESPect security assessment report.

---

# 6. Error Responses

## Unsupported file

**HTTP 400**

```json
{
  "detail": "Unsupported file type. Please upload a PCAP file."
}
```

## Empty PCAP

**HTTP 400**

```json
{
  "detail": "The uploaded PCAP contains no packets."
}
```

## Analysis failure

**HTTP 500**

```json
{
  "detail": "PCAP analysis failed."
}
```

The backend must not expose Python tracebacks or internal exception details through the public API.

---

# 7. Frontend Integration Rules

The React frontend should only depend on:

```text
GET  /health
POST /api/analyze
POST /api/report
```

It should not import or depend on internal modules such as:

```text
src.pcap
src.ipsec
src.features
src.ml
src.security
```

Nullable analysis fields must be handled as potentially `null`.

Security findings should be rendered dynamically:

```javascript
result.security.findings.map(...)
```

The frontend must not assume a fixed number of findings.

---

# 8. Backend Processing Model

FastAPI is the application-level orchestrator over the existing `src/` modules.

Conceptually:

```text
                  PCAP Upload
                       |
                       v
                    FastAPI
                       |
                       v
                   PcapReader
                       |
                 packet collection
                       |
          +------------+------------+
          |            |            |
          v            v            v
      IPsec         Features      Security
      Analyzer      Extractor     Assessor
          |            |            ^
          |            v            |
          |       ML Classifier     |
          |            |            |
          +------------+------------+
                       |
                       v
                  API Response
                       |
              +--------+--------+
              |                 |
              v                 v
            JSON              PDF
```

Internal implementation changes under `src/` should not require frontend changes as long as this contract remains unchanged.

---

# 9. Current ML Model

The current traffic classifier operates on the 54 numerical features produced by the existing feature extractor.

The API does not expose those 54 internal features by default.

Current classes:

```text
email
icmp
video
voip
web
whatsapp
```

---

# 10. Contract Stability

This document is the interface contract between the backend and frontend teams.

Changes to the following are API contract changes:

- endpoint names
- HTTP methods
- request field names
- response field names
- enum values
- nullable behavior

Such changes should be communicated to the frontend team before implementation.
