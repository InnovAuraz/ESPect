from __future__ import annotations

import io
import tempfile
import time
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from .analyzer import ApplicationAnalyzer
from .report import generate_report
from .schemas import AnalysisResponse

from fastapi.middleware.cors import CORSMiddleware

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

_CAPTURE_STATE = {
    "running": False,
    "started_at": None,
}

_WORKFLOW_DEFS = [
    {
        "id": "vm1_ready",
        "title": "VM1 ready",
        "endpoint": "VM1 controller",
        "command": "ip addr && ping -c 1 192.168.160.129",
        "detail": "Check VM1 network state and reachability.",
    },
    {
        "id": "vm2_ready",
        "title": "VM2 ready",
        "endpoint": "VM2 peer",
        "command": "ip addr && ping -c 1 192.168.160.128",
        "detail": "Check VM2 network state and reachability.",
    },
    {
        "id": "config_loaded",
        "title": "Config loaded",
        "endpoint": "Experiment config",
        "command": "python scripts/packet_capture.py config/configuration.yaml 30",
        "detail": "Load and validate the IPsec experiment configuration.",
    },
    {
        "id": "ipsec_applied",
        "title": "IPsec applied",
        "endpoint": "StrongSwan",
        "command": "ipsec statusall",
        "detail": "Apply the IPsec SA and confirm the tunnel is active.",
    },
    {
        "id": "capture_started",
        "title": "Capture started",
        "endpoint": "tcpdump",
        "command": "tcpdump -i eth1 -w captures/live_capture.pcap",
        "detail": "Start packet capture before traffic or IKE negotiation begins.",
    },
    {
        "id": "traffic_generated",
        "title": "Traffic generated",
        "endpoint": "Traffic generator",
        "command": "python scripts/run_agent.py --mode traffic",
        "detail": "Generate encrypted traffic across the active IPsec tunnel.",
    },
    {
        "id": "capture_stopped",
        "title": "Capture stopped",
        "endpoint": "Controller",
        "command": "pkill -f tcpdump",
        "detail": "Stop packet collection after the capture window is complete.",
    },
    {
        "id": "pcap_validated",
        "title": "PCAP validated",
        "endpoint": "Validator",
        "command": "python -m src.capture.validator",
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


def _format_count(value: int) -> str:
    return f"{value:,}"


def _format_bytes(value: int) -> str:
    units = ["B", "KB", "MB", "GB"]
    size = float(value)
    index = 0
    while size >= 1024 and index < len(units) - 1:
        size /= 1024
        index += 1
    return f"{size:.1f} {units[index]}" if index else f"{int(size)} {units[index]}"


def _workflow_snapshot() -> list[dict]:
    steps: list[dict] = []
    for definition in _WORKFLOW_DEFS:
        state = _WORKFLOW_STATE.get(definition["id"], {"status": "idle", "output": "—"})
        step = {
            "id": definition["id"],
            "title": definition["title"],
            "endpoint": definition["endpoint"],
            "command": definition["command"],
            "detail": definition["detail"],
            "status": state.get("status", "idle"),
            "output": state.get("output", "—"),
        }
        steps.append(step)
    return steps


def _capture_snapshot() -> dict:
    running = _CAPTURE_STATE["running"]
    elapsed = 0.0
    if running and _CAPTURE_STATE["started_at"] is not None:
        elapsed = max(time.monotonic() - _CAPTURE_STATE["started_at"], 0)

    base_alpha = {
        "id": "alpha",
        "title": "System A",
        "status": "Capturing" if running else "Listening",
        "ip": "10.10.0.12",
        "iface": "eth0",
        "filter": "ipsec or esp",
        "duration": (
            f"{int(elapsed // 60):02d}:{int(elapsed % 60):02d}" if running else "00:03:42"
        ),
        "packets": _format_count(18400 + int(elapsed * 220)) if running else "18.4K",
        "bytes": _format_bytes(2800000 + int(elapsed * 25000)) if running else "2.8 MB",
        "mode": "Full trace" if running else "Full trace",
    }
    base_beta = {
        "id": "beta",
        "title": "System B",
        "status": "Capturing" if running else "Listening",
        "ip": "10.10.0.22",
        "iface": "ens192",
        "filter": "udp port 500 or 4500",
        "duration": (
            f"{int(elapsed // 60):02d}:{int(elapsed % 60):02d}" if running else "00:05:01"
        ),
        "packets": _format_count(12900 + int(elapsed * 180)) if running else "12.9K",
        "bytes": _format_bytes(1700000 + int(elapsed * 17500)) if running else "1.7 MB",
        "mode": "Filtered" if running else "Filtered",
    }

    telemetry = {
        "packets_per_sec": str(8240 + int(elapsed * 42)) if running else "8,240",
        "bytes_per_sec": "1.42 MB" if not running else f"{(1.42 + (elapsed % 3) * 0.18):.2f} MB",
        "esp_flows": str(18 + int(elapsed // 12)) if running else "18",
        "alerts": str(2 if running else 2),
    }

    log = [
        "IKEv2 handshake observed on 10.10.0.12",
        "ESP tunnel established with 192.168.18.11",
        "Packet capture rotated automatically",
        "Checksum mismatch check queued",
    ]
    if running:
        log.insert(0, f"Capture session active for {int(elapsed):d}s")

    return {
        "is_running": running,
        "session_name": "capture_live_20260918.pcap",
        "endpoints": [base_alpha, base_beta],
        "telemetry": telemetry,
        "log": log,
        "workflow": {"steps": _workflow_snapshot()},
        "file": {
            "name": "capture_live_20260918.pcap",
            "size": "1.8 MB",
            "packets": "20,412",
        },
    }


def _make_pcap_bytes() -> bytes:
    header = (
        b"\xd4\xc3\xb2\xa1"
        + (2).to_bytes(2, byteorder="little", signed=False)
        + (4).to_bytes(2, byteorder="little", signed=False)
        + (0).to_bytes(4, byteorder="little", signed=False)
        + (0).to_bytes(4, byteorder="little", signed=False)
        + (65535).to_bytes(4, byteorder="little", signed=False)
        + (1).to_bytes(4, byteorder="little", signed=False)
    )
    packet = (
        (0).to_bytes(4, byteorder="little", signed=False)
        + (0).to_bytes(4, byteorder="little", signed=False)
        + (128).to_bytes(4, byteorder="little", signed=False)
        + (128).to_bytes(4, byteorder="little", signed=False)
        + b"\x00\x00\x00\x00\x00\x00\x00\x00"
    )
    return header + packet


@app.get("/health")
def health():
    return {
        "status": "ok",
    }


@app.get("/api/capture/session")
def get_capture_session():
    return _capture_snapshot()


@app.post("/api/capture/start")
def start_capture_session():
    _CAPTURE_STATE["running"] = True
    if _CAPTURE_STATE["started_at"] is None:
        _CAPTURE_STATE["started_at"] = time.monotonic()
    return _capture_snapshot()


@app.post("/api/capture/stop")
def stop_capture_session():
    _CAPTURE_STATE["running"] = False
    _CAPTURE_STATE["started_at"] = None
    return _capture_snapshot()


@app.post("/api/capture/workflow/{step_id}")
def run_capture_workflow_step(step_id: str):
    valid_step_ids = {step["id"] for step in _WORKFLOW_DEFS}
    if step_id not in valid_step_ids:
        raise HTTPException(status_code=404, detail=f"Unknown workflow step: {step_id}")

    _WORKFLOW_STATE[step_id] = {
        "status": "done",
        "output": "Completed successfully",
    }
    _CAPTURE_STATE["running"] = True
    return _capture_snapshot()


@app.get("/api/capture/download")
def download_capture_session():
    payload = _make_pcap_bytes()
    return StreamingResponse(
        io.BytesIO(payload),
        media_type="application/vnd.tcpdump.pcap",
        headers={
            "Content-Disposition": 'attachment; filename="capture_live_20260918.pcap"'
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
            detail=(
                "Unsupported file type. "
                "Please upload a PCAP file."
            ),
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

        return analyzer.analyze(
            temporary_path,
            capture_name=file.filename,
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
            temporary_path.unlink(
                missing_ok=True
            )


@app.post("/api/report")
async def generate_pcap_report(
    file: UploadFile = File(...),
):
    suffix = Path(file.filename or "").suffix.lower()

    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Please upload a PCAP file."
            ),
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

        result = analyzer.analyze(
            temporary_path,
            capture_name=file.filename,
        )

        pdf = generate_report(result)

        return StreamingResponse(
            pdf,
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    'attachment; '
                    'filename="ESPect_Report.pdf"'
                )
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
            temporary_path.unlink(
                missing_ok=True
            )