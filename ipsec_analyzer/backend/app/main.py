from __future__ import annotations



import base64

import io

import json

from pathlib import Path

import socket

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
    duration: int = 30
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



# VM Agent & Capture Path Configuration

VM1_HOST = "192.168.160.128"

VM2_HOST = "192.168.160.129"

CAPTURE_PATH = Path("captures") / "live_capture.pcap"



_CAPTURE_STATE = {

    "running": False,

    "started_at": None,

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





def _agent_request(host: str, action: str, **kwargs) -> dict:

    try:

        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:

            sock.settimeout(15.0)  # Increased timeout for file transfers

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





def _fetch_remote_pcap() -> bytes:

    """Fetches the generated PCAP from the VM1 agent in chunks."""

    file_data = bytearray()

    offset = 0

    chunk_size = 1024 * 1024  # 1MB chunks



    while True:

        res = _agent_request(

            VM1_HOST,

            "read_file_chunk",

            filename="live_capture.pcap",

            offset=offset,

            size=chunk_size,

        )

        chunk = base64.b64decode(res["data"])

        file_data.extend(chunk)

        if res.get("eof", True):

            break

        offset += len(chunk)



    return bytes(file_data)





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

        return _agent_request(VM1_HOST, "experiment_status")

    except Exception:

        return {"status": "idle"}





def _format_count(value: int) -> str:

    return f"{value:,}"





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
    traffic_type = exp.get("traffic_type")
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

    filename = Path(exp.get("output", "captures/live_capture.pcap")).name

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

    status = _remote_experiment_status()

    if status["status"] == "running":

        return _capture_snapshot()



    CAPTURE_PATH.unlink(missing_ok=True)



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
            traffic_type=req.traffic_type,
            configuration=configuration,
        )

    except RuntimeError as exc:

        raise HTTPException(status_code=409, detail=str(exc)) from exc



    _WORKFLOW_STATE["capture_started"] = {

        "status": "running",

        "output": f"Real capture started ({req.mode.upper()} mode)",

    }

    return _capture_snapshot()





@app.post("/api/capture/stop")

def stop_capture_session():

    try:

        _agent_request(VM1_HOST, "stop_experiment")

    except Exception:

        pass

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

    try:
        pcap_bytes = _fetch_remote_pcap()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Could not fetch the real live PCAP from VM1: {exc}",
        ) from exc

    if not pcap_bytes:
        raise HTTPException(
            status_code=422,
            detail="The live capture produced an empty PCAP.",
        )

    target_path.write_bytes(pcap_bytes)

    try:
        return analyzer.analyze(target_path, capture_name=target_path.name)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze live capture: {exc}",
        ) from exc


@app.get("/api/capture/download")
def download_capture_session():
    try:
        payload = _fetch_remote_pcap()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Could not fetch the real live PCAP from VM1: {exc}",
        ) from exc

    if not payload:
        raise HTTPException(
            status_code=422,
            detail="The live capture PCAP is empty.",
        )

    return StreamingResponse(
        io.BytesIO(payload),
        media_type="application/vnd.tcpdump.pcap",
        headers={
            "Content-Disposition": 'attachment; filename="live_capture.pcap"'
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

                "Unsupported file type. " "Please upload a PCAP file."

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



        # Passes file.filename to activate metadata cross-referencing

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

            detail=(

                "Unsupported file type. " "Please upload a PCAP file."

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



        # Passes file.filename to activate metadata cross-referencing

        result = analyzer.analyze(temporary_path, capture_name=file.filename)



        pdf = generate_report(result)



        return StreamingResponse(

            pdf,

            media_type="application/pdf",

            headers={

                "Content-Disposition": (

                    "attachment; " 'filename="ESPect_Report.pdf"'

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

            temporary_path.unlink(missing_ok=True)