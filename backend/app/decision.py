from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

import numpy as np


@dataclass(frozen=True)
class ManualInputs:
    driving_duration_min: float
    time_since_last_break_min: float


def smooth_sequence(probs: List[float], window: int = 3) -> np.ndarray:
    values = np.array(probs, dtype=float)
    if len(values) < window:
        return values

    kernel = np.ones(window) / window
    padded = np.pad(values, (window // 2, window // 2), mode="edge")
    smoothed = np.convolve(padded, kernel, mode="valid")
    return smoothed[: len(values)]


def map_video_risk(probs: List[float] | np.ndarray) -> float:
    values = np.array(probs, dtype=float)
    if len(values) == 0:
        return 0.0

    mean_prob = values.mean()
    max_prob = values.max()
    high_risk_ratio = (values >= 0.6).mean()
    raw_score = 0.5 * mean_prob + 0.3 * max_prob + 0.2 * high_risk_ratio
    return float(np.clip(raw_score * 100, 0, 100))


def map_driving_duration_risk(driving_duration_min: float) -> float:
    if driving_duration_min <= 60:
        return 10
    if driving_duration_min <= 120:
        return 25
    if driving_duration_min <= 180:
        return 45
    if driving_duration_min <= 240:
        return 65
    return 85


def map_break_gap_risk(time_since_last_break_min: float) -> float:
    if time_since_last_break_min <= 60:
        return 10
    if time_since_last_break_min <= 120:
        return 25
    if time_since_last_break_min <= 180:
        return 45
    if time_since_last_break_min <= 240:
        return 65
    return 85


def compute_fatigue_score(
    video_risk: float,
    driving_duration_risk: float,
    break_gap_risk: float,
) -> float:
    score = 0.6 * video_risk + 0.2 * driving_duration_risk + 0.2 * break_gap_risk
    return float(np.clip(score, 0, 100))


def get_risk_level(fatigue_score: float) -> str:
    if fatigue_score <= 30:
        return "low"
    if fatigue_score <= 55:
        return "medium"
    if fatigue_score <= 75:
        return "high"
    return "critical"


def get_recommendation(risk_level: str) -> str:
    mapping = {
        "low": "continue",
        "medium": "stay_alert",
        "high": "break_soon",
        "critical": "break_now",
    }
    return mapping[risk_level]


def get_alert_level(risk_level: str) -> str:
    mapping = {
        "low": "none",
        "medium": "soft",
        "high": "strong",
        "critical": "urgent",
    }
    return mapping[risk_level]


def evaluate_decision(
    manual_inputs: ManualInputs,
    drowsy_probability_sequence: List[float],
    smoothing_window: int = 3,
) -> Dict[str, Any]:
    smoothed_probs = smooth_sequence(
        drowsy_probability_sequence,
        window=smoothing_window,
    )
    video_risk = map_video_risk(smoothed_probs)
    driving_duration_risk = map_driving_duration_risk(
        manual_inputs.driving_duration_min,
    )
    break_gap_risk = map_break_gap_risk(manual_inputs.time_since_last_break_min)
    fatigue_score = compute_fatigue_score(
        video_risk,
        driving_duration_risk,
        break_gap_risk,
    )
    risk_level = get_risk_level(fatigue_score)

    return {
        "video_risk": round(video_risk, 2),
        "driving_duration_risk": round(driving_duration_risk, 2),
        "break_gap_risk": round(break_gap_risk, 2),
        "fatigue_score": round(fatigue_score, 2),
        "risk_level": risk_level,
        "recommendation": get_recommendation(risk_level),
        "alert_level": get_alert_level(risk_level),
    }

