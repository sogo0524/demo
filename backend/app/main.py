from __future__ import annotations

import os
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .config import BackendSettings, get_settings
from .pipeline import FatiguePipeline


ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".webm"}
ALLOWED_VIDEO_CONTENT_TYPES = {
    "application/octet-stream",
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-m4v",
}
CHUNK_SIZE = 1024 * 1024


settings = get_settings()
app = FastAPI(
    title="Driver Fatigue Intervention API",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_headers=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_origins=list(settings.cors_origins),
)


@lru_cache(maxsize=1)
def get_pipeline() -> FatiguePipeline:
    return FatiguePipeline(get_settings())


@app.exception_handler(HTTPException)
def handle_http_exception(_request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": str(exc.detail)},
    )


@app.exception_handler(RequestValidationError)
def handle_validation_exception(
    _request: Request,
    _exc: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": (
                "Upload a video file and complete the driver inputs before "
                "starting analysis."
            ),
        },
    )


@app.exception_handler(Exception)
def handle_unexpected_exception(
    _request: Request,
    exc: Exception,
) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": str(exc) or "Analysis failed unexpectedly.",
        },
    )


@app.get("/health")
@app.get("/api/health", include_in_schema=False)
def health() -> Dict[str, Any]:
    current_settings = get_settings()
    return {
        "status": "ok",
        "model_available": current_settings.model_path.exists(),
        "metadata_available": current_settings.metadata_path.exists(),
    }


@app.post("/analyze")
@app.post("/api/analyze", include_in_schema=False)
def analyze(
    request: Request,
    driving_duration_min: float = Form(0),
    time_since_last_break_min: float = Form(0),
    video: UploadFile = File(...),
) -> Dict[str, Any]:
    current_settings = get_settings()
    _validate_content_length(request, current_settings)
    _validate_video_upload(video)

    upload_path = _save_upload(video, current_settings)
    try:
        result = get_pipeline().run(
            video_path=upload_path,
            driving_duration_min=driving_duration_min,
            time_since_last_break_min=time_since_last_break_min,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return _to_api_response(result)


def _validate_content_length(
    request: Request,
    current_settings: BackendSettings,
) -> None:
    content_length = request.headers.get("content-length")
    if not content_length:
        return

    try:
        upload_size = int(content_length)
    except ValueError:
        return

    if upload_size > current_settings.max_upload_bytes:
        limit_mb = current_settings.max_upload_bytes // (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"Video is too large. Please upload a file up to {limit_mb} MB.",
        )


def _validate_video_upload(video: UploadFile) -> None:
    filename = Path(video.filename or "").name
    extension = Path(filename).suffix.lower()
    content_type = (video.content_type or "").lower()

    if not filename:
        raise HTTPException(status_code=400, detail="Missing uploaded video file.")

    if extension not in ALLOWED_VIDEO_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_VIDEO_EXTENSIONS))
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video type. Please upload one of: {allowed}.",
        )

    if content_type and content_type not in ALLOWED_VIDEO_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported video MIME type. Please upload MP4, MOV, M4V, or WEBM.",
        )


def _save_upload(video: UploadFile, current_settings: BackendSettings) -> Path:
    current_settings.upload_dir.mkdir(parents=True, exist_ok=True)
    original_name = Path(video.filename or "uploaded_video").name
    upload_path = current_settings.upload_dir / f"{uuid.uuid4().hex}_{original_name}"

    bytes_written = 0
    with upload_path.open("wb") as output:
        while True:
            chunk = video.file.read(CHUNK_SIZE)
            if not chunk:
                break
            bytes_written += len(chunk)
            if bytes_written > current_settings.max_upload_bytes:
                upload_path.unlink(missing_ok=True)
                limit_mb = current_settings.max_upload_bytes // (1024 * 1024)
                raise HTTPException(
                    status_code=413,
                    detail=(
                        "Video is too large. "
                        f"Please upload a file up to {limit_mb} MB."
                    ),
                )
            output.write(chunk)

    if bytes_written == 0:
        upload_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Uploaded video is empty.")

    video.file.seek(0)
    return upload_path


def _to_api_response(result: Dict[str, Any]) -> Dict[str, Any]:
    decision = result.get("decision_outputs", {})
    video_outputs = result.get("video_outputs", {})
    fatigue_score = _as_float(decision.get("fatigue_score"), 0.0)
    fatigue_level = str(decision.get("risk_level") or "unknown")
    recommendation = str(decision.get("recommendation") or "continue")
    probability_sequence = video_outputs.get("drowsy_probability_sequence") or []

    return {
        "success": True,
        "risk_score": round(fatigue_score / 100, 4),
        "fatigue_level": fatigue_level,
        "recommended_action": _map_recommended_action(recommendation),
        "explanation": _build_explanation(
            fatigue_level=fatigue_level,
            fatigue_score=fatigue_score,
            sample_count=len(probability_sequence),
        ),
        **result,
    }


def _map_recommended_action(recommendation: str) -> str:
    if recommendation in {"break_now", "break_soon"}:
        return "take_break"
    if recommendation == "stay_alert":
        return "alert"
    return "none"


def _build_explanation(
    fatigue_level: str,
    fatigue_score: float,
    sample_count: int,
) -> str:
    return (
        f"Detected {fatigue_level} fatigue risk from {sample_count} sampled "
        f"video frames and manual driving context. Fatigue score: "
        f"{fatigue_score:.1f}/100."
    )


def _as_float(value: Any, default: float) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    return default


def main() -> None:
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
