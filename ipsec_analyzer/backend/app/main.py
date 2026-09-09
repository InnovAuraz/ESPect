from __future__ import annotations

import tempfile
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
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


analyzer = ApplicationAnalyzer()


ALLOWED_EXTENSIONS = {
    ".pcap",
    ".pcapng",
}


@app.get("/health")
def health():
    return {
        "status": "ok",
    }


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

        return analyzer.analyze(temporary_path)

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
            temporary_path
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