from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from .config import BackendSettings, get_settings
from .decision import ManualInputs, evaluate_decision
from .video_inference import DrowsinessVideoAnalyzer, VideoInferenceSettings


class FatiguePipeline:
    def __init__(self, settings: Optional[BackendSettings] = None):
        self.settings = settings or get_settings()
        self.settings.output_dir.mkdir(parents=True, exist_ok=True)
        self.analyzer = DrowsinessVideoAnalyzer(
            VideoInferenceSettings(
                model_path=self.settings.model_path,
                metadata_path=self.settings.metadata_path,
                frame_interval_sec=self.settings.frame_interval_sec,
                device=self.settings.device,
                use_face_crop=self.settings.use_face_crop,
                fallback_to_previous_bbox=self.settings.fallback_to_previous_bbox,
                fallback_to_full_frame=self.settings.fallback_to_full_frame,
                use_grayscale_3ch=self.settings.use_grayscale_3ch,
                max_frames=self.settings.max_frames,
            )
        )

    def run(
        self,
        video_path: Path,
        driving_duration_min: float,
        time_since_last_break_min: float,
        session_id: Optional[str] = None,
        save_output: bool = True,
    ) -> Dict[str, Any]:
        resolved_video_path = video_path.expanduser().resolve()
        if not resolved_video_path.exists():
            raise FileNotFoundError(f"Video not found: {resolved_video_path}")

        session_id = session_id or self._make_session_id(resolved_video_path)
        manual_inputs = ManualInputs(
            driving_duration_min=float(driving_duration_min),
            time_since_last_break_min=float(time_since_last_break_min),
        )
        video_outputs = self.analyzer.analyze_video(resolved_video_path)
        decision_outputs = evaluate_decision(
            manual_inputs=manual_inputs,
            drowsy_probability_sequence=video_outputs[
                "drowsy_probability_sequence"
            ],
        )
        result = {
            "session_id": session_id,
            "manual_inputs": {
                "driving_duration_min": manual_inputs.driving_duration_min,
                "time_since_last_break_min": manual_inputs.time_since_last_break_min,
            },
            "video_outputs": video_outputs,
            "decision_outputs": decision_outputs,
        }

        if save_output:
            output_path = self.settings.output_dir / f"{session_id}_result.json"
            with output_path.open("w", encoding="utf-8") as file:
                json.dump(result, file, indent=2)

        return result

    def _make_session_id(self, video_path: Path) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_stem = "".join(
            char if char.isalnum() or char in {"-", "_"} else "_"
            for char in video_path.stem
        )
        return f"{safe_stem}_{timestamp}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Run fatigue pipeline.")
    parser.add_argument("video_path", type=Path)
    parser.add_argument("--driving-duration-min", type=float, required=True)
    parser.add_argument("--time-since-last-break-min", type=float, required=True)
    parser.add_argument("--session-id", type=str)
    parser.add_argument("--no-save", action="store_true")
    args = parser.parse_args()

    pipeline = FatiguePipeline()
    result = pipeline.run(
        video_path=args.video_path,
        driving_duration_min=args.driving_duration_min,
        time_since_last_break_min=args.time_since_last_break_min,
        session_id=args.session_id,
        save_output=not args.no_save,
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
