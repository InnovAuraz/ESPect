from __future__ import annotations

import base64
import hashlib
import io
import json
from pathlib import Path
import random
import socket
import struct
import tempfile
import time

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .analyzer import ApplicationAnalyzer
from .report import generate_report
from .schemas import AnalysisResponse


class CaptureRequest(BaseModel):
    mode: str = "random"
    traffic_type: str = "voip"
    duration: int = 15
    ipsec_mode: str | None = None
    encryption: str | None = None
    integrity: str | None = None
    dh_group: str | None = None
    pfs: bool | None = None
    ip_version: str | None = None


app = FastAPI(
    title="ESPect API",
    description=(
        "AI-Powered IPsec VPN Protocol Analyzer "
        "and Security Assessment Framework"
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = ApplicationAnalyzer()

ALLOWED_EXTENSIONS = {
    ".pcap",
    ".pcapng",
}

VM1_HOST = "192.168.160.128"
VM2_HOST = "192.168.160.129"
CAPTURE_PATH = Path("captures") / "live_capture.pcap"
LIVE_META_PATH = Path("captures") / "live_session_meta.json"

_CAPTURE_STATE: dict[str, object] = {
    "running": False,
    "started_at": None,
    "mode": "targeted",
    "traffic_type": "voip",
    "duration": 15,
    "session_id": 1,
}

_WORKFLOW_DEFS = [
    {
        "id": "vm1_ready",
        "title": "VM1 ready",
        "endpoint": "VM1 controller",
        "command": "VM1 agent :9000 reachability",
        "detail": "Check VM1 network state and reachability.",
    },
    {
        "id": "vm2_ready",
        "title": "VM2 ready",
        "endpoint": "VM2 peer",
        "command": "VM2 agent :9000 reachability",
        "detail": "Check VM2 network state and reachability.",
    },
    {
        "id": "config_loaded",
        "title": "Config loaded",
        "endpoint": "Experiment config",
        "command": "Generate runtime configuration from the UI request",
        "detail": "Load and validate the IPsec experiment configuration.",
    },
    {
        "id": "ipsec_applied",
        "title": "IPsec applied",
        "endpoint": "StrongSwan",
        "command": "Generate and load the requested swanctl configuration",
        "detail": "Apply the IPsec SA and confirm the tunnel is active.",
    },
    {
        "id": "capture_started",
        "title": "Capture started",
        "endpoint": "tcpdump",
        "command": "tcpdump on the configured capture interface",
        "detail": "Start packet capture before traffic or IKE negotiation begins.",
    },
    {
        "id": "traffic_generated",
        "title": "Traffic generated",
        "endpoint": "Traffic generator",
        "command": "Run the selected traffic profile through the VM agents",
        "detail": "Generate encrypted traffic across the active IPsec tunnel.",
    },
    {
        "id": "capture_stopped",
        "title": "Capture stopped",
        "endpoint": "Controller",
        "command": "Stop the controller-owned tcpdump process",
        "detail": "Stop packet collection after the capture window is complete.",
    },
    {
        "id": "pcap_validated",
        "title": "PCAP validated",
        "endpoint": "Validator",
        "command": "Validate the real generated PCAP with Scapy",
        "detail": "Validate the capture before analysis or download.",
    },
]

_WORKFLOW_STATE: dict[str, dict[str, str]] = {
    step["id"]: {
        "status": "idle",
        "output": "—",
    }
    for step in _WORKFLOW_DEFS
}


def _save_live_meta(**kwargs: object) -> None:
    LIVE_META_PATH.parent.mkdir(parents=True, exist_ok=True)
    existing: dict[str, object] = {}
    if LIVE_META_PATH.is_file():
        try:
            existing = json.loads(LIVE_META_PATH.read_text(encoding="utf-8"))
        except Exception:
            existing = {}
    existing.update(kwargs)
    existing["updated_at"] = time.time()
    try:
        LIVE_META_PATH.write_text(json.dumps(existing, indent=2), encoding="utf-8")
    except Exception:
        pass


def _agent_request(host: str, action: str, timeout: float = 8.0, **kwargs) -> dict:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(timeout)
            sock.connect((host, 9000))
            payload = {"action": action, **kwargs}
            sock.sendall(json.dumps(payload).encode("utf-8"))

            response_chunks = []
            while True:
                chunk = sock.recv(65536)
                if not chunk:
                    break
                response_chunks.append(chunk)

            response_data = b"".join(response_chunks)
            if not response_data:
                raise RuntimeError("Empty response from VM agent.")

            res = json.loads(response_data.decode("utf-8"))
            if not res.get("ok", False):
                raise RuntimeError(res.get("error", "Unknown agent error."))
            return res
    except (socket.timeout, socket.error) as exc:
        raise RuntimeError(
            f"Failed to communicate with agent at {host}: {exc}"
        ) from exc


# def _build_synthetic_ipsec_pcap(
#     traffic_type: str,
#     duration: float,
#     percent: int = 100,
# ) -> bytes:
#     """Builds a valid binary libpcap with IKEv2 + ESP packets when VM1 is mid-capture."""
#     pct = max(5, min(100, int(percent or 100)))
#     dur = max(5.0, float(duration or 15.0)) * (pct / 100.0)

#     profiles = {
#         "icmp": (12, 96),
#         "whatsapp": (22, 240),
#         "email": (28, 520),
#         "voip": (45, 180),
#         "web": (55, 780),
#         "video": (75, 1180),
#     }
#     rate, base_size = profiles.get((traffic_type or "voip").lower(), (45, 180))
#     pkt_count = max(8, int(rate * dur))

#     out = bytearray(
#         struct.pack(" 20:
#                 ike_body[17] = 0x20
#                 ike_body[18] = 34 if i < 2 else 35
#             body = udp_hdr + bytes(ike_body)
#         else:
#             spi = 0xC3CE664F if i % 2 == 0 else 0xC61357EA
#             esp_hdr = struct.pack("!II", spi, i)
#             body = esp_hdr + bytes((b * 31 + i) & 0xFF for b in range(payload_len - 8))

#         frame = eth + ip_hdr + body
#         cur_t = start_ts + i * step
#         sec = int(cur_t)
#         usec = int((cur_t - sec) * 1_000_000) % 1_000_000
#         out.extend(struct.pack(" bytes:
#     if len(raw_bytes) <= 24:
#         return _build_synthetic_ipsec_pcap(traffic_type, target_duration, percent)

#     magic = struct.unpack(""
#     global_header = raw_bytes[:24]
#     records: list[tuple[int, int, int, int, bytes]] = []

#     offset = 24
#     total_len = len(raw_bytes)
#     while offset + 16 <= total_len:
#         ts_sec, ts_usec, incl_len, orig_len = struct.unpack(
#             endian + "IIII", raw_bytes[offset : offset + 16]
#         )
#         pkt_end = offset + 16 + incl_len
#         if pkt_end > total_len or incl_len > 655350:
#             break
#         pkt_data = raw_bytes[offset + 16 : pkt_end]
#         records.append((ts_sec, ts_usec, incl_len, orig_len, pkt_data))
#         offset = pkt_end

#     if len(records) < 2:
#         return _build_synthetic_ipsec_pcap(traffic_type, target_duration, percent)

#     profile_ratios = {
#         "icmp": 0.16,
#         "whatsapp": 0.28,
#         "email": 0.42,
#         "voip": 0.58,
#         "web": 0.74,
#         "video": 0.96,
#     }
#     base_ratio = profile_ratios.get((traffic_type or "voip").lower(), 0.65)
#     dur_scale = min(1.0, max(0.25, float(target_duration or 15) / 20.0))
#     pct_scale = max(0.05, min(1.0, float(percent or 100) / 100.0))

#     rng = random.Random(f"{traffic_type}_{target_duration}_{session_id}_{percent}")
#     keep_ratio = min(1.0, max(0.06, base_ratio * dur_scale * pct_scale))

#     handshake_count = min(8, len(records))
#     target_total = max(handshake_count + 4, int(len(records) * keep_ratio))
#     records = records[:target_total]

#     clean_duration = max(1.0, float(target_duration or 15) * pct_scale)
#     base_time = time.time() - clean_duration
#     num_pkts = len(records)

#     out = bytearray(global_header)
#     cur_t = base_time
#     avg_step = clean_duration / max(1, num_pkts - 1)

#     for idx, (_, _, incl_len, orig_len, pkt_data) in enumerate(records):
#         if idx > 0:
#             cur_t += avg_step * rng.uniform(0.7, 1.3)
#         sec = int(cur_t)
#         usec = int((cur_t - sec) * 1_000_000) % 1_000_000
#         out.extend(struct.pack(endian + "IIII", sec, usec, incl_len, orig_len))
#         out.extend(pkt_data)

#     return bytes(out)

def _build_synthetic_ipsec_pcap(
    traffic_type: str,
    duration: float,
    percent: int = 100,
) -> bytes:
    raise RuntimeError(
        "Synthetic PCAP generation is disabled. "
        "A real PCAP must be captured from VM1."
    )

def _fetch_remote_pcap(
    percent: int = 100,
    override_traffic: str | None = None,
    override_duration: float | None = None,
) -> bytes:
    exp = _remote_experiment_status()
    raw_bytes = b""

    try:
        file_data = bytearray()
        offset = 0
        chunk_size = 1024 * 1024

        while True:
            res = _agent_request(
                VM1_HOST,
                "read_file_chunk",
                timeout=4.0,
                filename="live_capture.pcap",
                offset=offset,
                size=chunk_size,
            )
            chunk = base64.b64decode(res["data"])
            file_data.extend(chunk)

            if res.get("eof", True):
                break

            offset += len(chunk)

        if file_data:
            raw_bytes = bytes(file_data)

    except Exception:
        raw_bytes = b""

    if not raw_bytes and CAPTURE_PATH.is_file():
        try:
            raw_bytes = CAPTURE_PATH.read_bytes()
        except Exception:
            raw_bytes = b""

    active_traffic = str(
        override_traffic
        or exp.get("traffic_type")
        or _CAPTURE_STATE.get("traffic_type")
        or "voip"
    )

    active_duration = float(
        override_duration
        or exp.get("duration")
        or _CAPTURE_STATE.get("duration")
        or 15
    )

    if not raw_bytes:
        raise RuntimeError(
            "No real PCAP was captured by VM1."
        )

    _save_live_meta(
        traffic_type=active_traffic,
        duration=active_duration,
        encryption=exp.get("encryption"),
        integrity=exp.get("integrity"),
        pfs=exp.get("pfs"),
        pcap_sha256=hashlib.sha256(raw_bytes).hexdigest(),
        pcap_size=len(raw_bytes),
    )

    return raw_bytes


def _require_agents() -> None:
    try:
        _agent_request(VM1_HOST, "ipsec_status")
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                f"VM1 agent is unreachable at {VM1_HOST}:9000. "
                "Ensure run_agent.py is running."
            ),
        ) from exc


def _remote_experiment_status() -> dict:
    try:
        return _agent_request(VM1_HOST, "experiment_status", timeout=3.0)
    except Exception:
        return {"status": "idle"}


def _format_bytes(value: int) -> str:
    units = ["B", "KB", "MB", "GB"]
    size = float(value)
    index = 0
    while size >= 1024 and index < len(units) - 1:
        size /= 1024
        index += 1
    return (
        f"{size:.1f} {units[index]}" if index else f"{int(size)} {units[index]}"
    )


def _workflow_snapshot() -> list[dict]:
    exp = _remote_experiment_status()
    current = exp.get("stage", "idle")
    status = exp.get("status", "idle")

    stage_order = [
        "cleanup",
        "configuring",
        "ipsec_configuring",
        "capture_starting",
        "ipsec_starting",
        "ipsec_verifying",
        "traffic_starting",
        "capturing",
        "traffic_completed",
        "completed",
    ]

    stage_to_index = {name: index for index, name in enumerate(stage_order)}
    current_index = stage_to_index.get(current, -1)

    id_to_stage = {
        "vm1_ready": "cleanup",
        "vm2_ready": "cleanup",
        "config_loaded": "configuring",
        "ipsec_applied": "ipsec_configuring",
        "capture_started": "capturing",
        "traffic_generated": "traffic_starting",
        "capture_stopped": "traffic_completed",
        "pcap_validated": "completed",
    }

    steps: list[dict] = []
    for definition in _WORKFLOW_DEFS:
        target_stage = id_to_stage.get(definition["id"])
        target_index = stage_to_index.get(target_stage, -1)

        if status == "failed":
            step_status = "failed" if target_stage == current else (
                "done" if target_index < current_index else "idle"
            )
        elif status == "completed":
            step_status = "done"
        elif status == "running":
            if target_index < current_index:
                step_status = "done"
            elif target_index == current_index:
                step_status = "running"
            else:
                step_status = "idle"
        else:
            step_status = "idle"

        output = definition["detail"]
        if definition["id"] == "traffic_generated" and exp.get("traffic_type"):
            output = f"Generating real {exp['traffic_type']} traffic"
        elif definition["id"] == "pcap_validated" and exp.get("validation"):
            output = f"Validation: {exp['validation']}"

        steps.append({
            "id": definition["id"],
            "title": definition["title"],
            "endpoint": definition["endpoint"],
            "command": definition["command"],
            "detail": definition["detail"],
            "status": step_status,
            "output": output,
        })

    return steps


def _capture_snapshot() -> dict:
    exp = _remote_experiment_status()
    running = exp.get("status") == "running"

    stage = exp.get("stage", "idle")
    started_at = exp.get("started_at")
    updated_at = exp.get("updated_at")
    elapsed = 0.0
    if started_at:
        elapsed = max(0.0, (updated_at or time.time()) - started_at)

    output_size = exp.get("output_size")
    packets = exp.get("packet_count")
    validation = exp.get("validation")
    traffic_type = exp.get("traffic_type") or _CAPTURE_STATE.get("traffic_type")
    ipsec_mode = exp.get("ipsec_mode")
    ip_version = exp.get("ip_version")
    interface = exp.get("capture_interface")

    endpoint_a = {
        "id": "alpha",
        "title": "VM1",
        "status": "Capturing" if running else ("Completed" if validation == "PASSED" else "Ready"),
        "ip": VM1_HOST,
        "iface": interface or "—",
        "filter": exp.get("capture_filter", "IPsec/ESP"),
        "duration": f"{int(elapsed // 60):02d}:{int(elapsed % 60):02d}",
        "packets": f"{packets:,}" if isinstance(packets, int) else "—",
        "bytes": _format_bytes(output_size) if isinstance(output_size, int) else "—",
        "mode": ipsec_mode or "—",
    }

    endpoint_b = {
        "id": "beta",
        "title": "VM2",
        "status": "Active" if running else ("Completed" if validation == "PASSED" else "Ready"),
        "ip": VM2_HOST,
        "iface": "—",
        "filter": "IPsec/ESP",
        "duration": f"{int(elapsed // 60):02d}:{int(elapsed % 60):02d}",
        "packets": "—",
        "bytes": "—",
        "mode": ipsec_mode or "—",
    }

    telemetry = {
        "packets_per_sec": (
            f"{(packets / elapsed):.0f}" if isinstance(packets, int) and elapsed > 0 else "—"
        ),
        "bytes_per_sec": (
            _format_bytes(int(output_size / elapsed)) + "/s"
            if isinstance(output_size, int) and elapsed > 0
            else "—"
        ),
        "esp_flows": "—",
        "alerts": "—",
    }

    log = []
    if stage:
        log.append(f"Stage: {stage}")
    if traffic_type:
        log.append(f"Traffic: {traffic_type}")
    if ipsec_mode:
        log.append(f"IPsec mode: {ipsec_mode}")
    if ip_version:
        log.append(f"IP version: {ip_version}")
    if validation:
        log.append(f"PCAP validation: {validation}")
    if exp.get("error"):
        log.append(f"Error: {exp['error']}")

    filename = f"capture_live_{traffic_type or 'session'}.pcap"

    return {
        "is_running": running,
        "capture_status": exp.get("status", "idle"),
        "session_name": filename,
        "endpoints": [endpoint_a, endpoint_b],
        "telemetry": telemetry,
        "log": log,
        "workflow": {"steps": _workflow_snapshot()},
        "file": {
            "name": filename,
            "size": _format_bytes(output_size) if isinstance(output_size, int) else "—",
            "packets": f"{packets:,}" if isinstance(packets, int) else "—",
        },
        "configuration": {
            "traffic_type": traffic_type,
            "ipsec_mode": ipsec_mode,
            "ip_version": ip_version,
            "encryption": exp.get("encryption"),
            "integrity": exp.get("integrity"),
            "dh_group": exp.get("dh_group"),
            "pfs": exp.get("pfs"),
        },
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/capture/session")
def get_capture_session():
    return _capture_snapshot()


@app.post("/api/capture/start")
def start_capture_session(req: CaptureRequest):
    _require_agents()

    chosen_traffic = req.traffic_type
    if req.mode == "random":
        chosen_traffic = random.choice(
            ["voip", "video", "web", "whatsapp", "email", "icmp"]
        )

    _CAPTURE_STATE["running"] = True
    _CAPTURE_STATE["started_at"] = time.time()
    _CAPTURE_STATE["mode"] = req.mode
    _CAPTURE_STATE["traffic_type"] = chosen_traffic
    _CAPTURE_STATE["duration"] = req.duration
    _CAPTURE_STATE["session_id"] = int(_CAPTURE_STATE.get("session_id") or 0) + 1

    _save_live_meta(
        mode=req.mode,
        traffic_type=chosen_traffic,
        duration=req.duration,
        session_id=_CAPTURE_STATE["session_id"],
    )

    try:
        configuration = {
            key: value
            for key, value in {
                "ipsec_mode": req.ipsec_mode,
                "encryption": req.encryption,
                "integrity": req.integrity,
                "dh_group": req.dh_group,
                "pfs": req.pfs,
                "ip_version": req.ip_version,
            }.items()
            if value is not None
        }

        _agent_request(
            VM1_HOST,
            "start_experiment",
            duration=req.duration,
            mode=req.mode,
            traffic_type=chosen_traffic,
            configuration=configuration,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    _WORKFLOW_STATE["capture_started"] = {
        "status": "running",
        "output": f"Real capture started ({req.mode.upper()} mode - {chosen_traffic})",
    }
    return _capture_snapshot()


@app.post("/api/capture/stop")
def stop_capture_session():
    try:
        _agent_request(VM1_HOST, "stop_experiment")
    except RuntimeError as exc:
        raise HTTPException(
            status_code=409,
            detail=f"Failed to stop the VM1 capture workflow: {exc}",
        ) from exc

    _CAPTURE_STATE["running"] = False
    return _capture_snapshot()


@app.post("/api/capture/workflow/{step_id}")
def run_capture_workflow_step(step_id: str):
    valid_step_ids = {step["id"] for step in _WORKFLOW_DEFS}
    if step_id not in valid_step_ids:
        raise HTTPException(
            status_code=404, detail=f"Unknown workflow step: {step_id}"
        )

    _WORKFLOW_STATE[step_id] = {
        "status": "done",
        "output": "Completed successfully",
    }
    return _capture_snapshot()


@app.post("/api/capture/analyze")
def analyze_live_capture():
    target_path = CAPTURE_PATH
    target_path.parent.mkdir(parents=True, exist_ok=True)

    pcap_bytes = _fetch_remote_pcap(percent=100)
    target_path.write_bytes(pcap_bytes)
    active_traffic = str(_CAPTURE_STATE.get("traffic_type") or "voip")

    try:
        return analyzer.analyze(
            target_path,
            capture_name=f"capture_live_{active_traffic}.pcap",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze live capture: {exc}",
        ) from exc


@app.get("/api/capture/download")
def download_capture_session(
    percent: int = 100,
    traffic: str | None = None,
    duration: float | None = None,
):
    payload = _fetch_remote_pcap(
        percent=percent,
        override_traffic=traffic,
        override_duration=duration,
    )

    CAPTURE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if percent >= 100:
        CAPTURE_PATH.write_bytes(payload)

    active_traffic = str(
        traffic or _CAPTURE_STATE.get("traffic_type") or "session"
    )
    dl_name = f"capture_live_{active_traffic}_{percent}pct.pcap"

    return StreamingResponse(
        io.BytesIO(payload),
        media_type="application/vnd.tcpdump.pcap",
        headers={
            "Content-Disposition": f'attachment; filename="{dl_name}"'
        },
    )


@app.post(
    "/api/analyze",
    response_model=AnalysisResponse,
)
async def analyze_pcap(
    file: UploadFile = File(...),
):
    suffix = Path(file.filename or "").suffix.lower()

    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PCAP file.",
        )

    temporary_path: Path | None = None

    try:
        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="The uploaded PCAP is empty.",
            )

        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as temporary_file:
            temporary_file.write(contents)
            temporary_path = Path(temporary_file.name)

        return analyzer.analyze(temporary_path, capture_name=file.filename)

    except HTTPException:
        raise

    except ValueError as exc:
        if str(exc) == "The uploaded PCAP contains no packets.":
            raise HTTPException(
                status_code=400,
                detail=str(exc),
            ) from exc

        raise HTTPException(
            status_code=500,
            detail="PCAP analysis failed.",
        ) from exc

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="PCAP analysis failed.",
        )

    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


@app.post("/api/report")
async def generate_pcap_report(
    file: UploadFile = File(...),
):
    suffix = Path(file.filename or "").suffix.lower()

    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PCAP file.",
        )

    temporary_path: Path | None = None

    try:
        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="The uploaded PCAP is empty.",
            )

        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as temporary_file:
            temporary_file.write(contents)
            temporary_path = Path(temporary_file.name)

        result = analyzer.analyze(temporary_path, capture_name=file.filename)
        pdf = generate_report(result)

        return StreamingResponse(
            pdf,
            media_type="application/pdf",
            headers={
                "Content-Disposition": 'attachment; filename="ESPect_Report.pdf"'
            },
        )

    except HTTPException:
        raise

    except ValueError as exc:
        if str(exc) == "The uploaded PCAP contains no packets.":
            raise HTTPException(
                status_code=400,
                detail=str(exc),
            ) from exc

        raise HTTPException(
            status_code=500,
            detail="PCAP analysis failed.",
        ) from exc

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="PCAP analysis failed.",
        )

    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)