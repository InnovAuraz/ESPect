# ESPect

## AI-Powered IPsec VPN Protocol Analyzer and Security Assessment Framework

ESPect is an end-to-end framework for **IPsec VPN traffic analysis, encrypted-traffic classification, and security assessment**.

The project combines a controlled Linux-based IPsec testbed with a Windows-based analysis platform. The testbed creates reproducible, labelled IPsec traffic captures under controlled cryptographic and application conditions. The analyzer processes those captures to identify IPsec behaviour, extract observable traffic characteristics, classify encrypted traffic, and produce a security assessment.

```text
ESPect/
├── testbed/
├── ipsec-analyzer/
├── README.md
└── .gitignore
```

- `testbed/` — Linux-side IPsec experiment and dataset-generation system.
- `ipsec-analyzer/` — Windows-side PCAP analysis, traffic classification, and security-assessment system.

---

# 1. Problem

IPsec provides confidentiality and integrity by protecting network traffic at the IP layer. Once application payloads are encrypted, conventional payload-based inspection becomes ineffective.

However, encryption does not hide everything.

A packet capture can still expose observable characteristics such as:

- IKE negotiation traffic
- ESP packets
- Security Parameter Indexes (SPI)
- IP addresses and protocol information
- packet sizes
- packet counts
- timestamps
- packet-rate behaviour
- directionality
- flow duration
- burst and idle patterns
- observable cryptographic negotiation parameters

These characteristics provide valuable information for protocol analysis and encrypted-traffic classification.

ESPect uses this observable information to answer two related questions:

1. What can be determined about the IPsec connection from a PCAP?
2. What can be inferred about the type and behaviour of encrypted traffic without decrypting its payload?

---

# 2. Objectives

ESPect is designed around four primary objectives.

### 2.1 IPsec Protocol Analysis

Identify and analyse IPsec traffic and extract relevant protocol information from packet captures.

The analysis covers:

- IKE / IKEv2
- ESP
- transport mode
- tunnel mode
- IPv4
- IPv6
- encryption algorithms
- integrity algorithms
- Diffie-Hellman groups
- Perfect Forward Secrecy
- Security Associations
- SPI values
- packet directions and flow behaviour

### 2.2 Encrypted Traffic Classification

Classify application traffic from encrypted packet behaviour rather than plaintext payloads.

The controlled dataset contains representative traffic profiles such as:

- ICMP
- Web
- Email
- Video
- VoIP
- Messaging

The classifier uses packet-level and flow-level characteristics that remain observable after encryption.

### 2.3 Security Assessment

Evaluate observed IPsec characteristics against security policies and assessment rules.

The assessment can identify conditions such as:

- weak cryptographic selections
- undesirable configuration combinations
- anomalous protocol behaviour
- unexpected traffic characteristics
- potentially risky security configurations

### 2.4 Explainable Results

ESPect provides evidence with its conclusions.

Instead of returning only a classification or risk score, the system exposes the observations that contributed to the result.

---

# 3. System Architecture

ESPect follows a two-system architecture.

```text
                         ESPect
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
        Linux Testbed              Windows Analyzer
             │                           │
       strongSwan/IPsec                   │
             │                           │
       Controlled Traffic                 │
             │                           │
         tcpdump PCAP                     │
             │                           │
             └──────────────►─────────────┘
                                    │
                              PCAP Analysis
                                    │
                       ┌────────────┴────────────┐
                       │                         │
                Protocol Analysis        ML Classification
                       │                         │
                       └────────────┬────────────┘
                                    │
                           Security Assessment
                                    │
                              Report / UI
```

The testbed knows the exact conditions under which a capture was generated.

The analyzer works from the capture and observable packet information.

This separation provides a controlled basis for evaluating protocol analysis and machine-learning components.

---

# 4. Linux Testbed

The `testbed/` directory contains the complete Linux-side experimental environment.

It is responsible for:

- creating IPsec configurations,
- deploying them to two endpoints,
- establishing IKEv2/IPsec Security Associations,
- generating controlled application traffic,
- capturing packets,
- validating captures,
- maintaining experiment state,
- and writing ground-truth dataset metadata.

The testbed is designed to produce repeatable PCAP samples for the analyzer.

---

# 5. Testbed Architecture

The testbed uses two Arch Linux virtual machines running under VMware Workstation.

```text
                       Windows Host
                            │
                     VMware Workstation
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
             VM1 / Arch              VM2 / Arch
             Controller              Endpoint
                │                       │
                │       IPsec VPN       │
                └───────────────────────┘
```

### VM1

VM1 is the primary experiment controller.

It performs:

- experiment generation
- configuration validation
- endpoint coordination
- IPsec configuration generation
- IPsec lifecycle control
- traffic orchestration
- packet capture
- PCAP validation
- dataset writing
- experiment-state persistence

### VM2

VM2 is intentionally lightweight.

It provides:

- strongSwan/IPsec endpoint functionality
- remote agent functionality
- traffic-generation functionality
- traffic reception and response

This allows the controller to coordinate both endpoints without placing the entire experiment system on both machines.

---

# 6. Testbed Network

The VMware environment uses separate virtual networks for normal connectivity and experimental traffic.

The experimental network is an isolated VMnet1 network.

Example IPv4 configuration:

```text
Windows Host     192.168.160.1
VM1              192.168.160.128
VM2              192.168.160.129
```

The testbed also supports IPv6 experiments using dedicated IPv6 endpoint and inner tunnel addresses.

The IPsec experiments are performed over the controlled VM-to-VM network rather than the public Internet.

---

# 7. Linux Software Stack

The testbed is built using:

- Arch Linux
- Linux networking / XFRM
- strongSwan
- `swanctl`
- tcpdump
- Python
- pytest
- VMware Workstation

strongSwan provides the IKEv2 and IPsec implementation.

Linux XFRM provides the kernel-level IPsec policy and state mechanisms.

tcpdump provides packet capture.

Python provides experiment orchestration and endpoint agents.

pytest is used for automated verification.

---

# 8. Testbed Software Structure

The main VM contains the following logical components:

```text
testbed/
└── sih-ipsec-analyzer_vm1/
    ├── config/
    ├── data/
    ├── dataset/
    │   └── pcaps/
    ├── debug/
    │   └── logs/
    ├── scripts/
    ├── src/
    │   ├── agent/
    │   ├── capture/
    │   ├── controller/
    │   ├── dataset/
    │   ├── experiment/
    │   └── traffic/
    └── tests/
```

VM2 contains only the endpoint-side functionality:

```text
testbed/
└── sih-ipsec-analyzer_vm2/
    ├── scripts/
    ├── src/
    │   ├── agent/
    │   └── traffic/
    └── tests/
```

The separation keeps experiment orchestration on VM1 while VM2 remains a lightweight controlled peer.

---

# 9. Experiment Configuration

Every experiment is described using a fixed set of parameters:

```text
ipsec_mode
encryption
integrity
dh_group
pfs
ip_version
traffic_type
```

## IPsec Modes

```text
transport
tunnel
```

## Encryption

```text
aes128-cbc
aes256-cbc
aes128-gcm16
aes256-gcm16
```

## Integrity

```text
sha256
sha384
sha512
none-aead
```

`none-aead` is used with authenticated-encryption configurations where a separate integrity algorithm is not required.

## Diffie-Hellman Groups

```text
modp2048
modp3072
modp4096
ecp256
ecp384
```

## Perfect Forward Secrecy

```text
true
false
```

## IP Version

```text
ipv4
ipv6
```

## Traffic Type

```text
icmp
web
email
video
voip
whatsapp
```

Not every Cartesian combination represents a valid IPsec configuration.

The configuration validator rejects incompatible combinations before execution.

---

# 10. IPsec Configuration

The testbed uses IKEv2 and strongSwan.

A generated configuration specifies:

- local and remote addresses,
- authentication,
- cryptographic proposal,
- IPsec mode,
- traffic selectors,
- ESP proposal,
- PFS/DH parameters,
- and IP version.

The controller generates the appropriate configuration for both endpoints.

For transport-mode experiments, endpoint addresses are used as traffic selectors:

```text
VM1 ───────────────────── VM2
192.168.160.128           192.168.160.129
```

For tunnel-mode experiments, dedicated inner addresses are used:

```text
Outer:

192.168.160.128  ───────  192.168.160.129

Inner:

10.10.1.1        ───────  10.10.2.1
```

IPv6 experiments use equivalent IPv6 outer and inner addressing.

---

# 11. IPsec Policy Handling

Linux installs normal connected-network XFRM policies alongside IPsec policies.

The testbed explicitly controls IPsec policy priority so that the intended IPsec policy takes precedence over the normal connected-network policy.

This ensures that generated traffic is protected by ESP during the experiment.

The resulting Security Association and XFRM state are verified before traffic is treated as an IPsec experiment.

---

# 12. Endpoint Agents

Each VM runs a lightweight agent.

The agent exposes operations required by the controller:

```text
configure
apply_ipsec
initiate_ipsec
ipsec_status
start_traffic
wait
terminate_ipsec
```

The controller therefore operates at the experiment level instead of directly managing every endpoint process.

```text
                     Controller
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
          VM1 Agent               VM2 Agent
             │                       │
        strongSwan               strongSwan
        traffic                  traffic
```

The same traffic behaviour is available on both endpoints.

---

# 13. Traffic Profiles

The traffic subsystem implements reproducible traffic profiles.

### ICMP

Generates controlled ICMP request/reply traffic.

The profile is useful for producing small, regular packet exchanges.

### Web

Generates repeated HTTP-style request/response transactions using a controlled local service.

### Email

Generates a controlled SMTP-like transactional exchange including greeting, HELO, MAIL FROM, RCPT TO, DATA, message body, and QUIT.

No external mail infrastructure is required.

### Video

Generates a sustained UDP stream with relatively large packets and continuous transmission behaviour.

### VoIP

Generates bidirectional UDP traffic with a high packet frequency and comparatively small packets.

The two endpoints participate as peers.

### Messaging

Generates controlled messaging-style request/response exchanges.

The profile is designed to reproduce the required traffic characteristics without depending on an external messaging service.

---

# 14. Traffic Roles

Traffic profiles define endpoint roles.

The supported roles are:

```text
sender
receiver
peer
```

A sender actively generates traffic toward the other endpoint.

A receiver listens and responds.

A peer participates in bidirectional traffic generation.

The experiment profiles use the following roles:

```text
ICMP:
VM1 = sender
VM2 = receiver

Web:
VM1 = sender
VM2 = receiver

Email:
VM1 = sender
VM2 = receiver

Video:
VM1 = sender
VM2 = receiver

VoIP:
VM1 = peer
VM2 = peer

Messaging:
VM1 = sender
VM2 = receiver
```

Traffic behaviour is implemented inside the traffic subsystem while the agent provides the execution interface.

---

# 15. Experiment Lifecycle

A complete experiment follows a controlled lifecycle.

```text
                    Experiment Coordinate
                            │
                            ▼
                   Generate Configuration
                            │
                            ▼
                      Validate Config
                            │
                            ▼
                Configure VM1 + VM2 Agents
                            │
                            ▼
                     Apply IPsec Config
                            │
                            ▼
                    Initiate IKEv2 SA
                            │
                            ▼
                    Verify IPsec Status
                            │
                            ▼
                    Start Packet Capture
                            │
                            ▼
                 Start Traffic on Endpoints
                            │
                            ▼
                    Wait for Completion
                            │
                            ▼
                     Drain Capture Data
                            │
                            ▼
                       Stop tcpdump
                            │
                            ▼
                       Validate PCAP
                            │
                            ▼
                    Store Ground Truth
                            │
                            ▼
                  Advance Experiment State
```

The capture is started before traffic begins so that the complete experiment is observable.

The capture process is also given time to drain buffered packets before termination, which is important for very short traffic profiles.

---

# 16. PCAP Capture

tcpdump is used to capture the experimental traffic.

The capture subsystem manages:

- interface selection,
- capture filtering,
- PCAP output,
- tcpdump process lifecycle,
- stderr logging,
- graceful termination,
- capture-buffer draining,
- and capture errors.

IPsec-focused filtering allows the testbed to isolate the traffic relevant to the experiment.

Typical observable IPsec traffic includes:

```text
UDP/500
UDP/4500
ESP / IP protocol 50
```

The resulting PCAP is preserved as the primary experimental artifact.

---

# 17. PCAP Validation

A successful traffic process does not automatically mean that an experiment is valid.

After traffic generation completes, the resulting PCAP is checked.

The testbed verifies that the capture contains usable packet data before committing the experiment to the dataset.

This protects the dataset against:

- empty captures,
- incomplete captures,
- failed tcpdump execution,
- traffic-generation failures,
- and other invalid experiment results.

Failed experiments are not silently treated as valid training samples.

---

# 18. Dataset Generation

Each successful experiment produces a PCAP:

```text
dataset/
└── pcaps/
    ├── exp000001.pcap
    ├── exp000002.pcap
    ├── exp000003.pcap
    └── ...
```

Ground-truth metadata is stored separately.

The dataset schema is:

```text
experiment_id
pcap_file
ipsec_mode
encryption
integrity
dh_group
pfs
ip_version
traffic_type
```

Example:

```csv
experiment_id,pcap_file,ipsec_mode,encryption,integrity,dh_group,pfs,ip_version,traffic_type
exp000481,exp000481.pcap,transport,aes256-cbc,sha256,modp2048,true,ipv4,voip
```

The metadata describes the conditions used to create the PCAP.

It is not a collection of features extracted from the packet capture.

---

# 19. Ground Truth and Feature Separation

This is a central design principle of ESPect.

The testbed knows:

```text
IPsec configuration
Traffic profile
Experiment parameters
```

The analyzer receives:

```text
PCAP
```

The analyzer must derive its observations from the capture.

The model must not simply use dataset metadata such as:

```text
traffic_type
encryption
dh_group
pfs
```

as input features.

Instead:

```text
                    PCAP
                     │
                     ▼
              Packet Analysis
                     │
                     ▼
             Feature Extraction
                     │
                     ▼
               Feature Vector
                     │
                     ▼
                 ML Model
                     │
                     ▼
              Predicted Class
```

The original testbed configuration is used as ground truth during training and evaluation.

This prevents direct label leakage and makes the classification problem meaningful.

---

# 20. Experiment Space

The experiment generator traverses the configured parameter space systematically.

The raw Cartesian experiment space contains:

```text
3840
```

parameter combinations before invalid configurations are removed.

Invalid combinations are rejected by the configuration validator.

The runner skips such configurations while preserving deterministic traversal.

Experiment state is persisted so dataset generation can be resumed after interruption.

---

# 21. Resumable Dataset Generation

The experiment runner stores its current coordinate.

If execution stops during dataset generation, it can resume from the last committed experiment rather than rebuilding the complete dataset.

The experiment identifier is deterministic with respect to the Cartesian coordinate.

As a result, gaps in experiment IDs can occur when invalid configurations are skipped.

For example:

```text
exp000361  skipped
exp000362  skipped
exp000363  completed
```

The gaps represent configurations that are not valid experiments.

---

# 22. Testbed Reliability

The testbed is designed around controlled failure handling.

Examples include:

- invalid experiment configuration
- failed endpoint configuration
- failed IPsec initiation
- traffic-process failure
- tcpdump startup failure
- invalid PCAP
- interrupted dataset generation

The system keeps experiment state separate from dataset commitment.

An experiment advances only after its outcome has been handled correctly.

---

# 23. Testbed Testing

The Linux testbed contains automated tests using pytest.

The tested components include:

```text
Experiment configuration
Experiment validation
Experiment coordinate traversal
Experiment state persistence
IPsec configuration generation
Traffic generation
Endpoint agents
Controller
Packet capture
Dataset writer
```

Integration tests verify actual IPsec operation for:

```text
IPv4 transport
IPv6 transport
IPv4 tunnel
IPv6 tunnel
```

The testbed therefore combines software-level tests with real Linux networking and strongSwan integration.

---

# 24. Windows IPsec Analyzer

The `ipsec-analyzer/` directory contains the Windows-side analysis platform.

Its purpose is to transform a PCAP into a structured security and traffic analysis result.

The analyzer follows a PCAP-first architecture:

```text
PCAP
 │
 ▼
Packet Ingestion
 │
 ▼
Protocol Identification
 │
 ▼
IPsec Analysis
 │
 ▼
Flow Reconstruction
 │
 ▼
Feature Extraction
 │
 ├───────────────┐
 ▼               ▼
Rule Engine       ML Engine
 │               │
 └───────┬───────┘
         ▼
 Security Assessment
         │
         ▼
 Analysis Report
```

---

# 25. Analyzer Input

The primary analyzer input is a PCAP file.

The analyzer does not require the original testbed configuration to perform analysis.

The capture may contain:

- Ethernet frames
- IPv4 packets
- IPv6 packets
- IKE traffic
- NAT-T traffic
- ESP traffic
- ICMP
- UDP
- other observable network traffic

The analyzer identifies the relevant IPsec flows and extracts the information available from the capture.

---

# 26. Packet Processing

The analyzer processes packets through several logical stages.

## 26.1 Packet Ingestion

Read packets from the PCAP and expose timestamps, protocol information, addresses, lengths, and relevant protocol fields.

## 26.2 Protocol Identification

Identify:

```text
IKE
IKEv2
ESP
UDP
ICMP
IPv4
IPv6
```

and other relevant protocols.

## 26.3 IPsec Session Identification

Group packets into the IPsec communication context.

Important identifiers include:

- endpoint addresses
- ports
- protocol
- SPI
- direction
- timestamps

## 26.4 Flow Reconstruction

Construct directional and bidirectional flows from the packet sequence.

Each flow can contain:

```text
source
destination
protocol
direction
start time
end time
duration
packet count
byte count
packet-size statistics
```

---

# 27. IKE Analysis

Where IKE negotiation packets are available, the analyzer extracts observable negotiation information.

The analysis includes:

- IKE version
- exchange information
- cryptographic proposals
- encryption algorithms
- integrity algorithms
- pseudo-random function information
- Diffie-Hellman group
- authentication-related information
- Security Association negotiation

This information is used by the security-assessment layer to evaluate the observed cryptographic configuration.

---

# 28. ESP Analysis

ESP is the primary data-protection protocol used by IPsec.

The analyzer examines observable ESP characteristics such as:

```text
SPI
sequence number
packet length
timestamp
direction
packet rate
flow duration
```

The encrypted payload itself is not required for traffic classification.

The analyzer instead works with metadata and statistical properties that remain observable.

---

# 29. Transport and Tunnel Mode Analysis

The analyzer distinguishes between transport- and tunnel-mode behaviour using observable packet structure and flow characteristics.

### Transport mode

```text
Outer IP
   │
   └── ESP
        │
        └── protected transport payload
```

### Tunnel mode

```text
Outer IP
   │
   └── ESP
        │
        └── encrypted inner IP packet
```

The distinction is important because the visible network structure differs between the two modes.

---

# 30. Traffic Feature Extraction

Encrypted traffic can retain distinctive statistical characteristics.

The analyzer extracts features from packet and flow behaviour.

### Packet Features

```text
packet length
timestamp
inter-arrival time
direction
protocol
```

### Flow Features

```text
packet count
byte count
flow duration
packet rate
byte rate
forward packet count
reverse packet count
forward byte count
reverse byte count
```

### Statistical Features

```text
mean packet size
median packet size
minimum packet size
maximum packet size
packet-size variance
inter-arrival statistics
direction ratio
burst characteristics
idle-period characteristics
```

These features provide the input representation for encrypted-traffic classification.

---

# 31. Machine Learning

The machine-learning subsystem classifies traffic using packet-derived observations.

```text
                     PCAP
                       │
                       ▼
                Packet Extraction
                       │
                       ▼
               Flow Reconstruction
                       │
                       ▼
               Feature Extraction
                       │
                       ▼
                 Feature Vector
                       │
                       ▼
                  ML Classifier
                       │
                       ▼
              Traffic Classification
```

The target traffic classes include:

```text
ICMP
Web
Email
Video
VoIP
Messaging
```

The model is evaluated independently from the packet-processing pipeline so that feature extraction and model selection remain modular.

---

# 32. Machine Learning Dataset

The testbed provides labelled examples:

```text
PCAP                  Ground Truth

exp000001.pcap        ICMP
exp000002.pcap        Web
exp000003.pcap        Email
exp000004.pcap        Video
exp000005.pcap        VoIP
exp000006.pcap        Messaging
```

The analyzer extracts features from the PCAP independently.

During training:

```text
PCAP → Features → Model
                 ↑
              Label
```

During inference:

```text
PCAP → Features → Model → Prediction
```

The label is not supplied to the model during inference.

---

# 33. Model Evaluation

The classifier is evaluated using:

- accuracy
- precision
- recall
- F1-score
- per-class performance
- confusion matrix

Per-class performance is important because different encrypted application profiles can exhibit similar packet-level characteristics.

The evaluation therefore considers both overall performance and individual class behaviour.

---

# 34. Security Assessment Engine

The security assessment engine combines deterministic protocol analysis with policy-based security rules.

```text
                    PCAP
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
   Protocol Analysis      Traffic Analysis
          │                     │
          │                 ML Classifier
          │                     │
          └──────────┬──────────┘
                     ▼
             Security Assessment
                     │
                     ▼
                  Findings
```

The assessment considers observable cryptographic and protocol properties.

Each finding contains:

```text
Finding
Severity
Evidence
Explanation
Recommendation
```

The security engine distinguishes between:

- directly observable protocol facts,
- rule-based conclusions,
- statistical observations,
- and ML predictions.

An ML prediction alone is not treated as proof of a security vulnerability.

---

# 35. Security Risk Levels

Findings are organized by severity:

```text
INFO
LOW
MEDIUM
HIGH
CRITICAL
```

Example:

```text
Finding:
Weak cryptographic configuration

Severity:
HIGH

Evidence:
Observed negotiation parameters match
a configured weak-security policy.

Recommendation:
Use an approved modern cryptographic configuration.
```

---

# 36. Explainability

ESPect exposes evidence behind automated results.

Example:

```text
Traffic Classification
----------------------

Prediction: Video
Confidence: 0.94

Observed characteristics:
- sustained traffic flow
- high packet rate
- large packet-size distribution
- continuous transmission
```

A security finding can similarly contain:

```text
Security Finding
----------------

Severity: HIGH

Evidence:
- observed cryptographic proposal
- detected IPsec parameters
- matched security-policy rule

Recommendation:
Use a stronger approved configuration.
```

This makes the output useful to a human security analyst.

---

# 37. Final Analysis Result

The analyzer produces a structured assessment containing:

```text
PCAP Summary
────────────────────────
Capture duration
Packet count
Total bytes
Observed endpoints


IPsec Analysis
────────────────────────
IKE detected
IKE version
ESP detected
SPI values
Observed cryptographic parameters
Security Association information
Transport/tunnel indicators


Traffic Analysis
────────────────────────
Flow count
Packet rates
Byte rates
Direction statistics
Packet-size statistics
Timing statistics


ML Classification
────────────────────────
Predicted traffic class
Confidence
Supporting features


Security Assessment
────────────────────────
Overall risk
Findings
Severity
Evidence
Recommendations
```

---

# 38. End-to-End Workflow

The complete ESPect workflow is:

```text
┌──────────────────────────────┐
│       Experiment Design      │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        Linux Testbed         │
│                              │
│  Configure IPsec             │
│  Establish IKEv2             │
│  Generate traffic            │
│  Capture packets             │
└──────────────┬───────────────┘
               │
               ▼
             PCAP
               │
               ▼
┌──────────────────────────────┐
│      Windows Analyzer        │
│                              │
│  Parse packets               │
│  Detect IPsec                │
│  Reconstruct flows           │
│  Extract features            │
└──────────────┬───────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
┌──────────────┐ ┌──────────────┐
│ Rule Analysis│ │ ML Analysis  │
└──────┬───────┘ └──────┬───────┘
       │                │
       └───────┬────────┘
               ▼
┌──────────────────────────────┐
│     Security Assessment      │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Final Report / UI      │
└──────────────────────────────┘
```

---

# 39. Reproducibility

ESPect is designed for reproducible experimentation.

The testbed explicitly controls:

```text
IPsec mode
Cryptographic configuration
DH group
PFS
IP version
Traffic profile
```

The same experiment definition can therefore be regenerated and compared with previous captures.

This is useful for:

- dataset generation
- feature engineering
- ML training
- model evaluation
- protocol testing
- regression testing
- security-rule validation

---

# 40. Security Scope

ESPect is a defensive analysis and assessment framework.

The project focuses on:

- passive PCAP analysis
- IPsec protocol analysis
- encrypted traffic classification
- configuration assessment
- anomaly identification
- security reporting

The Linux testbed generates controlled traffic for experimentation.

The framework does not require exploitation of third-party systems to perform its analysis.

---

# 41. Design Principles

### Controlled Data

The testbed generates traffic under known conditions instead of relying exclusively on uncontrolled captures.

### Ground-Truth Integrity

Every valid PCAP is associated with the exact experiment configuration that generated it.

### PCAP-First Analysis

The analyzer derives observations from the packet capture rather than depending on hidden experiment metadata.

### No Payload Dependency

Traffic classification is based on observable packet and flow characteristics and does not require plaintext application payloads.

### Modular Architecture

Packet processing, IPsec analysis, feature extraction, machine learning, and security assessment are separated into distinct logical stages.

### Reproducibility

Experiments are deterministic in configuration space and can be resumed after interruption.

### Explainability

Automated results are accompanied by evidence and supporting observations.

### Defensive Security

The framework is intended for analysis, assessment, and research.

---

# 42. Repository Structure

```text
ESPect/
│
├── testbed/
│   ├── sih-ipsec-analyzer_vm1/
│   │   ├── config/
│   │   ├── data/
│   │   ├── dataset/
│   │   ├── debug/
│   │   ├── scripts/
│   │   ├── src/
│   │   └── tests/
│   │
│   └── sih-ipsec-analyzer_vm2/
│       ├── scripts/
│       ├── src/
│       └── tests/
│
├── ipsec-analyzer/
│
├── README.md
└── .gitignore
```

The two major directories have independent responsibilities:

```text
testbed/
    Linux
    ↓
    IPsec Experimentation
    ↓
    PCAP Dataset


ipsec-analyzer/
    Windows
    ↓
    PCAP Analysis
    ↓
    ML + Security Assessment
```

---

# 43. Technology Stack

## Testbed

```text
Operating System    Arch Linux
Virtualization      VMware Workstation
IPsec               strongSwan
IPsec Control       swanctl
Kernel Security     Linux XFRM
Packet Capture      tcpdump
Programming         Python
Testing             pytest
```

## Analyzer

The analyzer is built around:

```text
PCAP processing
Network protocol analysis
Feature engineering
Machine learning
Security assessment
Visualization / reporting
```

The packet-processing and analysis layers are kept independent from the final presentation layer.

---

# 44. System Capability

The Linux testbed provides the experimental foundation for ESPect:

- two controlled Linux IPsec endpoints,
- IKEv2 negotiation,
- transport and tunnel mode,
- IPv4 and IPv6,
- multiple cryptographic configurations,
- PFS and DH-group variation,
- controlled application traffic,
- coordinated packet capture,
- PCAP validation,
- ground-truth metadata,
- resumable experiment generation,
- and automated testing.

The resulting PCAP dataset forms the experimental input for the analysis platform.

The Windows analyzer provides the analysis pipeline for converting those captures into protocol observations, traffic intelligence, and security findings.

---

# 45. Final Objective

ESPect brings together three capabilities:

```text
IPsec Protocol Analysis
          +
Encrypted Traffic Intelligence
          +
Security Assessment
```

The final system is designed so that an analyst can supply an IPsec PCAP and obtain:

1. a protocol-level description of the observed VPN,
2. measurable characteristics of its encrypted traffic,
3. an ML-based traffic classification,
4. security findings with evidence,
5. and a clear final assessment.

The Linux testbed provides the controlled experimental foundation required to build and validate this capability.

The Windows analyzer turns those observations into an analyst-facing security system.

---

# ESPect

**Controlled IPsec experimentation.  
Encrypted traffic intelligence.  
Security assessment.**
