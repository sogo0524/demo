from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Tuple

import cv2
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms


BBox = Tuple[int, int, int, int]


@dataclass(frozen=True)
class VideoInferenceSettings:
    model_path: Path
    metadata_path: Path
    frame_interval_sec: float = 0.5
    device: str = "cpu"
    use_face_crop: bool = True
    fallback_to_previous_bbox: bool = True
    fallback_to_full_frame: bool = True
    use_grayscale_3ch: bool = True
    max_frames: Optional[int] = None


class DrowsinessVideoAnalyzer:
    def __init__(self, settings: VideoInferenceSettings):
        self.settings = settings
        self.metadata = self._load_metadata(settings.metadata_path)
        self.device = self._select_device(settings.device)
        self.model = self._load_model(settings.model_path)
        self.transform = self._build_transform()
        self.face_cascade = self._load_face_cascade()
        self.drowsy_idx = self.metadata["class_to_idx"][
            self.metadata.get("positive_class", "DROWSY")
        ]
        self.natural_idx = self.metadata["class_to_idx"][
            self.metadata.get("negative_class", "NATURAL")
        ]

    def analyze_video(self, video_path: Path) -> Dict[str, List[float]]:
        time_points: List[float] = []
        probabilities: List[float] = []
        previous_bbox: Optional[BBox] = None

        for timestamp, frame_rgb in self._iter_sampled_frames(video_path):
            prediction = self._predict_frame(frame_rgb, previous_bbox)

            if prediction["face_detected"] and prediction["bbox"] is not None:
                previous_bbox = prediction["bbox"]

            if prediction["prob_drowsy"] is None:
                continue

            time_points.append(timestamp)
            probabilities.append(prediction["prob_drowsy"])

        if not probabilities:
            raise ValueError("No usable frames were extracted from the video.")

        return {
            "time_points": time_points,
            "drowsy_probability_sequence": probabilities,
        }

    def _load_metadata(self, metadata_path: Path) -> Dict[str, Any]:
        with metadata_path.open("r", encoding="utf-8") as file:
            return json.load(file)

    def _select_device(self, configured_device: str) -> torch.device:
        if configured_device == "cuda" and torch.cuda.is_available():
            return torch.device("cuda")
        return torch.device("cpu")

    def _load_model(self, model_path: Path) -> nn.Module:
        model_name = self.metadata["model_name"].lower()
        num_classes = self.metadata["num_classes"]

        if model_name != "resnet18":
            raise ValueError(f"Unsupported model_name: {self.metadata['model_name']}")

        model = models.resnet18(weights=None)
        model.fc = nn.Linear(model.fc.in_features, num_classes)
        checkpoint = torch.load(model_path, map_location=self.device)
        state_dict = checkpoint.get("model_state_dict", checkpoint)
        model.load_state_dict(state_dict)
        model = model.to(self.device)
        model.eval()
        return model

    def _build_transform(self):
        return transforms.Compose(
            [
                transforms.Resize((self.metadata["img_size"], self.metadata["img_size"])),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=self.metadata["normalize_mean"],
                    std=self.metadata["normalize_std"],
                ),
            ]
        )

    def _load_face_cascade(self) -> cv2.CascadeClassifier:
        candidates = [
            cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml",
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml",
        ]
        for candidate in candidates:
            detector = cv2.CascadeClassifier(candidate)
            if not detector.empty():
                return detector
        raise RuntimeError("Failed to load OpenCV Haar cascade face detector.")

    def _iter_sampled_frames(self, video_path: Path) -> Iterator[Tuple[float, np.ndarray]]:
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            cap.release()
            raise ValueError("Invalid FPS detected from video.")

        frame_step = max(int(round(self.settings.frame_interval_sec * fps)), 1)
        frame_idx = 0
        yielded = 0

        while True:
            ret, frame_bgr = cap.read()
            if not ret:
                break

            if frame_idx % frame_step == 0:
                timestamp = round(frame_idx / fps, 3)
                frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                yield timestamp, frame_rgb
                yielded += 1

                if self.settings.max_frames and yielded >= self.settings.max_frames:
                    break

            frame_idx += 1

        cap.release()

    def _predict_frame(
        self,
        frame_rgb: np.ndarray,
        previous_bbox: Optional[BBox],
    ) -> Dict[str, Any]:
        cropped_face, bbox, all_faces = self._detect_and_crop_face(frame_rgb)
        face_detected = cropped_face is not None
        used_face_crop = False
        used_prev_bbox_fallback = False

        if self.settings.use_face_crop and face_detected:
            image_array = cropped_face
            used_face_crop = True
            final_bbox = bbox
        elif self.settings.fallback_to_previous_bbox and previous_bbox is not None:
            prev_crop = self._crop_with_bbox(frame_rgb, previous_bbox)
            if prev_crop is not None:
                image_array = prev_crop
                used_prev_bbox_fallback = True
                final_bbox = previous_bbox
            elif self.settings.fallback_to_full_frame:
                image_array = frame_rgb
                final_bbox = None
            else:
                return self._empty_prediction(all_faces)
        elif self.settings.fallback_to_full_frame:
            image_array = frame_rgb
            final_bbox = None
        else:
            return self._empty_prediction(all_faces)

        pil_image = self._prepare_image_for_model(image_array)
        tensor = self.transform(pil_image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self.model(tensor)
            probs = torch.softmax(logits, dim=1).cpu().numpy()[0]

        pred_idx = int(np.argmax(probs))

        return {
            "prob_drowsy": float(probs[self.drowsy_idx]),
            "prob_natural": float(probs[self.natural_idx]),
            "pred_idx": pred_idx,
            "face_detected": face_detected,
            "used_face_crop": used_face_crop,
            "used_prev_bbox_fallback": used_prev_bbox_fallback,
            "used_full_frame_fallback": (
                not used_face_crop and not used_prev_bbox_fallback and not face_detected
            ),
            "bbox": final_bbox,
            "num_faces_detected": len(all_faces),
        }

    def _empty_prediction(self, all_faces):
        return {
            "prob_drowsy": None,
            "prob_natural": None,
            "pred_idx": None,
            "face_detected": False,
            "used_face_crop": False,
            "used_prev_bbox_fallback": False,
            "used_full_frame_fallback": False,
            "bbox": None,
            "num_faces_detected": len(all_faces),
        }

    def _prepare_image_for_model(self, frame_rgb: np.ndarray) -> Image.Image:
        if self.settings.use_grayscale_3ch:
            gray = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2GRAY)
            frame_rgb = np.stack([gray, gray, gray], axis=-1)
        return Image.fromarray(frame_rgb)

    def _detect_and_crop_face(self, frame_rgb: np.ndarray):
        faces = self._detect_faces(frame_rgb)
        if len(faces) == 0:
            return None, None, []

        best_face = self._select_best_face(faces, frame_rgb)
        x, y, w, h = best_face
        x1, y1, x2, y2 = self._expand_bbox(x, y, w, h, frame_rgb.shape)
        cropped_face = frame_rgb[y1:y2, x1:x2]

        return (
            cropped_face,
            (x1, y1, x2, y2),
            faces.tolist() if hasattr(faces, "tolist") else list(faces),
        )

    def _detect_faces(self, frame_rgb: np.ndarray):
        gray = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2GRAY)
        return self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.05,
            minNeighbors=4,
            minSize=(40, 40),
        )

    def _select_best_face(self, faces, frame_rgb: np.ndarray):
        scored = []
        for (x, y, w, h) in faces:
            score = self._score_face_candidate(x, y, w, h, frame_rgb.shape)
            scored.append((score, (x, y, w, h)))
        scored = sorted(scored, key=lambda value: value[0], reverse=True)
        return scored[0][1]

    def _score_face_candidate(
        self,
        x: int,
        y: int,
        w: int,
        h: int,
        frame_shape: Tuple[int, int, int],
    ) -> float:
        height, width = frame_shape[:2]
        area_score = (w * h) / float(width * height)
        cx = x + w / 2.0
        cy = y + h / 2.0
        center_x_dist = abs(cx - width / 2.0) / (width / 2.0)
        center_y_dist = abs(cy - height / 2.0) / (height / 2.0)
        center_penalty = 0.5 * center_x_dist + 0.5 * center_y_dist
        return area_score - 0.15 * center_penalty

    def _expand_bbox(
        self,
        x: int,
        y: int,
        w: int,
        h: int,
        frame_shape: Tuple[int, int, int],
    ) -> BBox:
        height, width = frame_shape[:2]
        x1 = max(int(x - 0.18 * w), 0)
        y1 = max(int(y - 0.10 * h), 0)
        x2 = min(int(x + w + 0.18 * w), width)
        y2 = min(int(y + h + 0.28 * h), height)
        return x1, y1, x2, y2

    def _crop_with_bbox(
        self,
        frame_rgb: np.ndarray,
        bbox: Optional[BBox],
    ) -> Optional[np.ndarray]:
        if bbox is None:
            return None

        x1, y1, x2, y2 = bbox
        height, width = frame_rgb.shape[:2]
        x1 = max(int(x1), 0)
        y1 = max(int(y1), 0)
        x2 = min(int(x2), width)
        y2 = min(int(y2), height)

        if x2 <= x1 or y2 <= y1:
            return None

        crop = frame_rgb[y1:y2, x1:x2]
        return crop if crop.size else None

