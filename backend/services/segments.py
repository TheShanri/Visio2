from __future__ import annotations

import bisect
from typing import Dict, List, Optional, Sequence

PeakPoint = Dict[str, float]

DEFAULT_PARAMS = {
    "medianKernel": 7,
    "maWindowSec": 0.6,
    "derivativeWindowSec": 0.3,
    "preWindowSec": 300,
    "guardSec": 10,
    "kNoise": 3.0,
    "slopeThreshold": 0.02,
    "sustainSec": 2.0,
    "minAfterPeakSec": 10,
    "postWindowSec": 250,
    "dropSlopeThreshold": 0.08,
    "flatSlopeThreshold": 0.01,
    "flatToleranceKNoise": 2.0,
    "dwellSec": 3.0,
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


def _median(values: Sequence[float]) -> float:
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    mid = len(sorted_vals) // 2
    if len(sorted_vals) % 2 == 0:
        return (sorted_vals[mid - 1] + sorted_vals[mid]) / 2
    return sorted_vals[mid]


def _mad(values: Sequence[float]) -> float:
    if not values:
        return 0.0
    med = _median(values)
    deviations = [abs(v - med) for v in values]
    return _median(deviations) * 1.4826


def _median_filter(values: List[float], kernel: int) -> List[float]:
    if kernel <= 1 or kernel % 2 == 0:
        kernel = max(1, kernel | 1)
    half = kernel // 2
    padded = []
    for idx in range(len(values)):
        start = max(0, idx - half)
        end = min(len(values), idx + half + 1)
        window = values[start:end]
        padded.append(_median(window))
    return padded


def _moving_average_by_time(times: List[float], values: List[float], window_sec: float) -> List[float]:
    if not values or window_sec <= 0:
        return list(values)
    prefix = [0.0]
    for v in values:
        prefix.append(prefix[-1] + v)
    result: List[float] = []
    start = 0
    half_window = window_sec / 2
    for idx, t in enumerate(times):
        while start < len(times) and t - times[start] > half_window:
            start += 1
        end = idx
        while end + 1 < len(times) and times[end + 1] - t <= half_window:
            end += 1
        total = prefix[end + 1] - prefix[start]
        count = max(1, end - start + 1)
        result.append(total / count)
    return result


def _derivative(times: List[float], values: List[float], window_sec: float) -> List[float]:
    if len(times) < 2:
        return [0.0 for _ in times]
    if window_sec <= 0:
        window_sec = times[-1] - times[0]
    half = window_sec / 2
    deriv: List[float] = []
    for idx, t in enumerate(times):
        prev_idx = idx
        while prev_idx > 0 and t - times[prev_idx] < half:
            prev_idx -= 1
        next_idx = idx
        while next_idx + 1 < len(times) and times[next_idx] - t < half:
            next_idx += 1
        if prev_idx == next_idx:
            if idx == 0:
                prev_idx = 0
                next_idx = 1
            elif idx == len(times) - 1:
                prev_idx = idx - 1
                next_idx = idx
        delta_t = times[next_idx] - times[prev_idx]
        if delta_t <= 0:
            deriv.append(0.0)
        else:
            deriv.append((values[next_idx] - values[prev_idx]) / delta_t)
    return deriv


def _clean_params(params: Optional[Dict[str, float]]) -> Dict[str, float]:
    cleaned = DEFAULT_PARAMS.copy()
    if not params:
        return cleaned
    for key, value in params.items():
        if key in cleaned and isinstance(value, (int, float)):
            cleaned[key] = float(value)
    # enforce odd kernel
    kernel = int(round(cleaned["medianKernel"]))
    if kernel % 2 == 0:
        kernel += 1
    cleaned["medianKernel"] = max(1, kernel)
    return cleaned


def _sustain_condition(
    times: List[float],
    start_idx: int,
    sustain_sec: float,
    predicate,
) -> bool:
    end_time = times[start_idx] + sustain_sec
    idx = start_idx
    while idx < len(times) and times[idx] <= end_time:
        if not predicate(idx):
            return False
        idx += 1
    return True


def _find_onset(
    peak_idx: int,
    times: List[float],
    smoothed: List[float],
    deriv: List[float],
    cfg: Dict[str, float],
) -> int:
    start_time = max(times[0], times[peak_idx] - cfg["preWindowSec"])
    end_time = max(times[0], times[peak_idx] - cfg["guardSec"])
    start_idx = _nearest_index(times, start_time)
    end_idx = _nearest_index(times, end_time)
    window_values = smoothed[start_idx : end_idx + 1]
    baseline = _median(window_values)
    noise = _mad(window_values)
    threshold = baseline + cfg["kNoise"] * noise

    for idx in range(start_idx, end_idx + 1):
        if smoothed[idx] <= threshold:
            continue
        if deriv[idx] <= cfg["slopeThreshold"]:
            continue
        if _sustain_condition(
            times,
            idx,
            cfg["sustainSec"],
            lambda j: smoothed[j] > threshold and deriv[j] > cfg["slopeThreshold"],
        ):
            return idx

    fallback_time = max(times[0], times[peak_idx] - cfg["fallbackOnsetSec"])
    return _nearest_index(times, fallback_time)


def _find_empty(
    peak_idx: int,
    times: List[float],
    smoothed: List[float],
    deriv: List[float],
    cfg: Dict[str, float],
) -> int:
    start_time = times[peak_idx] + cfg["minAfterPeakSec"]
    end_time = times[peak_idx] + cfg["postWindowSec"]
    start_idx = _nearest_index(times, start_time)
    end_idx = _nearest_index(times, end_time)
    drop_idx = start_idx
    for idx in range(start_idx, end_idx + 1):
        if deriv[idx] < -cfg["dropSlopeThreshold"]:
            drop_idx = idx
            break

    post_values = smoothed[drop_idx : end_idx + 1]
    baseline_post = _median(post_values)
    noise_post = _mad(post_values)

    def _flat_pred(j: int) -> bool:
        return (
            abs(deriv[j]) < cfg["flatSlopeThreshold"]
            and abs(smoothed[j] - baseline_post) < cfg["flatToleranceKNoise"] * noise_post
        )

    for idx in range(drop_idx, end_idx + 1):
        if not _flat_pred(idx):
            continue
        if _sustain_condition(times, idx, cfg["dwellSec"], _flat_pred):
            return idx

    # fallback: min pressure in window
    if end_idx >= start_idx:
        window = smoothed[start_idx : end_idx + 1]
        min_val = min(window)
        local_idx = window.index(min_val)
        min_idx = start_idx + local_idx
    else:
        min_idx = peak_idx
    fallback_time = times[peak_idx] + cfg["fallbackEmptySec"]
    fallback_idx = _nearest_index(times, fallback_time)
    if start_idx <= min_idx <= end_idx:
        return min_idx
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

    smoothed = _moving_average_by_time(
        times, _median_filter(pressures, int(cfg["medianKernel"])), cfg["maWindowSec"]
    )
    derivatives = _derivative(times, smoothed, cfg["derivativeWindowSec"])

    ordered_peaks = sorted(peaks, key=lambda p: p.get("time", 0))
    onset_points = []
    peak_points = []
    empty_points = []
    segments = []

    for idx, peak in enumerate(ordered_peaks):
        peak_index = _nearest_index(times, float(peak.get("time", 0)))
        peak_time = times[peak_index]
        peak_value = pressures[peak_index]

        onset_index = _find_onset(peak_index, times, smoothed, derivatives, cfg)
        onset_time = times[onset_index]
        onset_value = pressures[onset_index]

        empty_index = _find_empty(peak_index, times, smoothed, derivatives, cfg)
        empty_time = times[empty_index]
        empty_value = pressures[empty_index]

        # Enforce ordering strictly
        if onset_time >= peak_time:
            fallback_time = max(times[0], peak_time - cfg["fallbackOnsetSec"])
            onset_index = _nearest_index(times, fallback_time)
            onset_time = times[onset_index]
            onset_value = pressures[onset_index]

        if empty_time <= peak_time:
            fallback_time = peak_time + cfg["fallbackEmptySec"]
            empty_index = _nearest_index(times, fallback_time)
            empty_time = times[empty_index]
            empty_value = pressures[empty_index]

        if empty_time <= onset_time:
            fallback_time = onset_time + max(cfg["minAfterPeakSec"], cfg["dwellSec"])
            empty_index = _nearest_index(times, fallback_time)
            empty_time = times[min(empty_index, len(times) - 1)]
            empty_value = pressures[min(empty_index, len(pressures) - 1)]

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
