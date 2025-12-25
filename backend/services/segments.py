from __future__ import annotations

import bisect
from typing import Dict, List, Optional

PeakPoint = Dict[str, float]

DEFAULT_PARAMS = {
    "onsetGradient": 0.5,
    "onsetPressureDrop": 5,
    "emptyPressureDrop": 2,
    "minAfterPeakSec": 10,
    "searchStartAfterPrevPeakSec": 50,
    "fallbackOnsetSec": 300,
    "fallbackEmptySec": 100,
}


def _nearest_index(times: List[float], target: float) -> int:
    if not times:
        return 0
    pos = bisect.bisect_left(times, target)
    if pos <= 0:
        return 0
    if pos >= len(times):
        return len(times) - 1
    before = pos - 1
    after = pos
    if abs(times[after] - target) < abs(times[before] - target):
        return after
    return before


def _value_at_time(rows: List[Dict[str, float]], time_key: str, value_key: str, target: float) -> Optional[float]:
    if not rows:
        return None
    times = [float(row.get(time_key, 0)) for row in rows]
    idx = _nearest_index(times, target)
    if 0 <= idx < len(rows):
        value = rows[idx].get(value_key)
        return float(value) if value is not None else None
    return None


def _average_between(times: List[float], values: List[float], start_time: float, end_time: float) -> Optional[float]:
    if not times or start_time >= end_time:
        return None
    start_idx = _nearest_index(times, start_time)
    end_idx = _nearest_index(times, end_time)
    if start_idx >= end_idx:
        return None
    segment_values = values[start_idx:end_idx + 1]
    if not segment_values:
        return None
    return sum(segment_values) / len(segment_values)


def _gradient(values: List[float], times: List[float], idx: int) -> float:
    if idx <= 0 or idx >= len(values):
        return 0.0
    delta_t = times[idx] - times[idx - 1]
    if delta_t == 0:
        return 0.0
    return (values[idx] - values[idx - 1]) / delta_t


def _clean_params(params: Optional[Dict[str, float]]) -> Dict[str, float]:
    cleaned = DEFAULT_PARAMS.copy()
    if not params:
        return cleaned
    for key, value in params.items():
        if key in cleaned and isinstance(value, (int, float)):
            cleaned[key] = float(value)
    return cleaned


def _find_onset_index(
    peak_index: int,
    peak_value: float,
    times: List[float],
    values: List[float],
    search_start_time: float,
    cfg: Dict[str, float],
) -> int:
    start_idx = _nearest_index(times, min(search_start_time, times[peak_index]))
    for idx in range(peak_index - 1, start_idx, -1):
        grad = _gradient(values, times, idx)
        drop = peak_value - values[idx]
        if grad >= cfg["onsetGradient"] and drop >= cfg["onsetPressureDrop"]:
            return idx

    fallback_time = max(times[start_idx], times[peak_index] - cfg["fallbackOnsetSec"])
    fallback_idx = _nearest_index(times, fallback_time)
    if fallback_idx >= peak_index:
        fallback_idx = max(0, peak_index - 1)
    return fallback_idx


def _find_empty_index(
    peak_index: int,
    peak_value: float,
    times: List[float],
    values: List[float],
    min_search_time: float,
    end_limit_time: float,
    cfg: Dict[str, float],
    onset_index: int,
) -> int:
    start_idx = _nearest_index(times, min_search_time)
    if start_idx <= peak_index and peak_index + 1 < len(times):
        start_idx = peak_index + 1

    end_idx = _nearest_index(times, end_limit_time)
    if end_idx <= start_idx:
        end_idx = len(times) - 1

    for idx in range(start_idx, max(end_idx, start_idx) + 1):
        drop = peak_value - values[idx]
        if drop < cfg["emptyPressureDrop"]:
            continue
        prev_grad = _gradient(values, times, idx)
        next_grad = _gradient(values, times, min(idx + 1, len(values) - 1))
        if prev_grad < 0 <= next_grad:
            return idx

    fallback_time = min(times[-1], times[peak_index] + cfg["fallbackEmptySec"])
    if fallback_time <= times[onset_index]:
        fallback_time = min(times[-1], times[onset_index] + max(cfg["minAfterPeakSec"], 1))
    fallback_idx = _nearest_index(times, fallback_time)
    if fallback_idx <= peak_index and peak_index + 1 < len(times):
        fallback_idx = peak_index + 1
    if fallback_idx <= onset_index and onset_index + 1 < len(times):
        fallback_idx = onset_index + 1
    return fallback_idx


def derive_segments(
    data: Dict[str, List[Dict[str, float]]],
    peaks: List[PeakPoint],
    params: Optional[Dict[str, float]] = None,
) -> Dict[str, object]:
    cfg = _clean_params(params or {})

    pressure_rows = data.get("pressure") or []
    volume_rows = data.get("volume") or []

    times = [float(row.get("Elapsed Time", 0)) for row in pressure_rows]
    pressures = [float(row.get("Bladder Pressure", 0)) for row in pressure_rows]

    if not times or not peaks:
        return {"points": {"onset": [], "peak": [], "empty": []}, "segments": []}

    ordered_peaks = sorted(peaks, key=lambda p: p.get("time", 0))
    onset_points = []
    peak_points = []
    empty_points = []
    segments = []

    for idx, peak in enumerate(ordered_peaks):
        peak_index = _nearest_index(times, float(peak.get("time", 0)))
        peak_time = times[peak_index]
        peak_value = pressures[peak_index]

        search_start_time = times[0]
        if idx > 0:
            search_start_time = ordered_peaks[idx - 1].get("time", times[0]) + cfg[
                "searchStartAfterPrevPeakSec"
            ]

        onset_index = _find_onset_index(
            peak_index, peak_value, times, pressures, search_start_time, cfg
        )
        onset_time = times[onset_index]
        onset_value = pressures[onset_index]

        min_empty_time = peak_time + cfg["minAfterPeakSec"]
        end_limit_time = (
            ordered_peaks[idx + 1].get("time", times[-1])
            if idx + 1 < len(ordered_peaks)
            else times[-1]
        )
        empty_index = _find_empty_index(
            peak_index,
            peak_value,
            times,
            pressures,
            min_empty_time,
            end_limit_time,
            cfg,
            onset_index,
        )
        empty_time = times[empty_index]
        empty_value = pressures[empty_index]

        # Enforce ordering strictly
        if onset_time >= peak_time and onset_index < peak_index:
            onset_index = max(0, peak_index - 1)
            onset_time = times[onset_index]
            onset_value = pressures[onset_index]

        if empty_time <= peak_time and peak_index + 1 < len(times):
            empty_index = peak_index + 1
            empty_time = times[empty_index]
            empty_value = pressures[empty_index]

        if empty_time <= onset_time and onset_index + 1 < len(times):
            empty_index = onset_index + 1
            empty_time = times[empty_index]
            empty_value = pressures[empty_index]

        peak_points.append({"time": peak_time, "value": peak_value, "index": peak_index})
        onset_points.append(
            {"time": onset_time, "value": onset_value, "index": onset_index}
        )
        empty_points.append(
            {"time": empty_time, "value": empty_value, "index": empty_index}
        )

        imi = None
        if segments:
            prev_empty = segments[-1]["emptyTime"]
            imi = onset_time - prev_empty if onset_time > prev_empty else None

        delta_volume = None
        onset_volume = _value_at_time(
            volume_rows, "Elapsed Time", "Tot Infused Vol", onset_time
        )
        empty_volume = _value_at_time(
            volume_rows, "Elapsed Time", "Tot Infused Vol", empty_time
        )
        if onset_volume is not None and empty_volume is not None:
            delta_volume = empty_volume - onset_volume

        segments.append(
            {
                "i": idx,
                "onsetTime": onset_time,
                "peakTime": peak_time,
                "emptyTime": empty_time,
                "metrics": {
                    "imiSec": imi,
                    "maxPressure": peak_value,
                    "avgPressureBetweenEmptyAndNextOnset": None,
                    "deltaVolume": delta_volume,
                },
            }
        )

    for idx, segment in enumerate(segments[:-1]):
        next_onset = segments[idx + 1]["onsetTime"]
        avg_pressure = _average_between(times, pressures, segment["emptyTime"], next_onset)
        segment["metrics"]["avgPressureBetweenEmptyAndNextOnset"] = avg_pressure

    return {
        "points": {"onset": onset_points, "peak": peak_points, "empty": empty_points},
        "segments": segments,
    }
