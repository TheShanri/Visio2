from __future__ import annotations

from typing import Dict, List, Optional

import numpy as np

from .peaks import run_find_peaks

PressureRow = Dict[str, float]


def _percentile_candidates(values: List[float]) -> List[float]:
    if not values:
        return []
    percentiles = np.percentile(np.array(values), [50, 60, 70, 80])
    return sorted({float(val) for val in percentiles})


def _distance_candidates(length: int, expected_count: int) -> List[int]:
    if length <= 0:
        return [1]
    rough_spacing = max(1, int(length / max(expected_count, 1)))
    multipliers = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
    distances = {
        max(1, int(rough_spacing * mult))
        for mult in multipliers
    }
    return sorted(distances)


def _prominence_candidates(values: List[float]) -> List[Optional[float]]:
    if not values:
        return [None]
    span = max(values) - min(values)
    if span <= 0:
        return [None]
    base = span * 0.05
    candidates = [None, base, base * 2, base * 3]
    return candidates


def _local_prominence(values: List[float], index: int, window: int = 5) -> float:
    start = max(0, index - window)
    end = min(len(values), index + window + 1)
    left_min = min(values[start:index] or [values[index]])
    right_min = min(values[index + 1 : end] or [values[index]])
    baseline = max(left_min, right_min)
    return values[index] - baseline


def _score_candidate(
    values: List[float], peaks: List[Dict[str, float]], params: Dict[str, float], expected: int
) -> float:
    count_penalty = abs(len(peaks) - expected)

    distance_penalty = 0.0
    distance = params.get("distance")
    if distance and len(peaks) > 1:
        sorted_indices = sorted(int(p["index"]) for p in peaks)
        for left, right in zip(sorted_indices, sorted_indices[1:]):
            if right - left < distance:
                distance_penalty += (distance - (right - left)) / max(distance, 1)

    prominence_penalty = 0.0
    if peaks:
        prominences = [_local_prominence(values, int(p["index"])) for p in peaks]
        median_prom = float(np.median(prominences))
        spread = max(values) - min(values) if values else 0
        if spread > 0:
            if median_prom < 0.03 * spread:
                prominence_penalty += 0.75
            elif median_prom < 0.06 * spread:
                prominence_penalty += 0.25

    return float(count_penalty + distance_penalty + prominence_penalty)


def suggest_params(
    pressure_rows: List[PressureRow], expected_count: int, budget: int = 60
) -> Dict[str, object]:
    values = [float(row.get("Bladder Pressure", 0)) for row in pressure_rows]

    height_candidates = _percentile_candidates(values)
    if not height_candidates:
        height_candidates = [None]
    distance_candidates = _distance_candidates(len(values), expected_count)
    prominence_candidates = _prominence_candidates(values)

    candidates: List[Dict[str, object]] = []

    for distance in distance_candidates:
        for prominence in prominence_candidates:
            for height in height_candidates:
                params = {
                    "distance": distance,
                    "prominence": prominence,
                    "height": height,
                }
                result = run_find_peaks(pressure_rows, params)
                peaks = result.get("peaks", [])
                score = _score_candidate(values, peaks, result.get("paramsUsed", {}), expected_count)

                candidates.append({"params": result.get("paramsUsed", params), "peaks": peaks, "score": score})

                if len(candidates) >= max(budget, 1):
                    break
            if len(candidates) >= max(budget, 1):
                break
        if len(candidates) >= max(budget, 1):
            break

    candidates = sorted(
        candidates,
        key=lambda c: (c["score"], -len(c.get("peaks", [])), c["params"].get("distance", 0)),
    )

    top_candidates = candidates[:5]
    best = top_candidates[0] if top_candidates else {"params": {}, "peaks": [], "score": float("inf")}

    return {"best": best, "candidates": top_candidates}
