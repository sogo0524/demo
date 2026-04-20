from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MAX_UPLOAD_MB = 50


@dataclass(frozen=True)
class BackendSettings:
    project_root: Path
    model_path: Path
    metadata_path: Path
    upload_dir: Path
    output_dir: Path
    cors_origins: tuple[str, ...]
    max_upload_bytes: int
    frame_interval_sec: float = 0.5
    device: str = "cpu"
    use_face_crop: bool = True
    fallback_to_previous_bbox: bool = True
    fallback_to_full_frame: bool = True
    use_grayscale_3ch: bool = True
    max_frames: Optional[int] = None


def _env_path(name: str, default: Path) -> Path:
    value = os.environ.get(name)
    return Path(value).expanduser().resolve() if value else default


def _env_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_float(name: str, default: float) -> float:
    value = os.environ.get(name)
    return float(value) if value else default


def _env_int(name: str, default: int) -> int:
    value = os.environ.get(name)
    return int(value) if value else default


def _env_optional_int(name: str) -> Optional[int]:
    value = os.environ.get(name)
    if not value:
        return None
    parsed = int(value)
    return parsed if parsed > 0 else None


def _env_csv(name: str, default: tuple[str, ...]) -> tuple[str, ...]:
    value = os.environ.get(name)
    if not value:
        return default
    entries = tuple(item.strip() for item in value.split(",") if item.strip())
    return entries or default


def get_settings() -> BackendSettings:
    project_root = _env_path("FATIGUE_PROJECT_ROOT", PROJECT_ROOT)
    max_upload_mb = _env_int("FATIGUE_MAX_UPLOAD_MB", DEFAULT_MAX_UPLOAD_MB)
    return BackendSettings(
        project_root=project_root,
        model_path=_env_path(
            "FATIGUE_MODEL_PATH",
            project_root / "models" / "best_resnet18_drowsy_classifier.pth",
        ),
        metadata_path=_env_path(
            "FATIGUE_METADATA_PATH",
            project_root / "models" / "model_metadata.json",
        ),
        upload_dir=_env_path("FATIGUE_UPLOAD_DIR", project_root / "runtime_uploads"),
        output_dir=_env_path(
            "FATIGUE_OUTPUT_DIR",
            project_root / "video_inference_outputs",
        ),
        cors_origins=_env_csv("FATIGUE_CORS_ORIGINS", ("*",)),
        max_upload_bytes=max_upload_mb * 1024 * 1024,
        frame_interval_sec=_env_float("FATIGUE_FRAME_INTERVAL_SEC", 0.5),
        device=os.environ.get("FATIGUE_DEVICE", "cpu"),
        use_face_crop=_env_bool("FATIGUE_USE_FACE_CROP", True),
        fallback_to_previous_bbox=_env_bool("FATIGUE_FALLBACK_PREVIOUS_BBOX", True),
        fallback_to_full_frame=_env_bool("FATIGUE_FALLBACK_FULL_FRAME", True),
        use_grayscale_3ch=_env_bool("FATIGUE_USE_GRAYSCALE_3CH", True),
        max_frames=_env_optional_int("FATIGUE_MAX_FRAMES"),
    )
