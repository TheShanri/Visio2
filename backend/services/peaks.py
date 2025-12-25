from __future__ import annotations

from typing import Dict, List, Optional, Tuple

try:  # Optional dependency
    from scipy.signal import find_peaks  # type: ignore
except Exception:  # pragma: no cover - fallback when scipy missing
    find_peaks = None


PressureRow = Dict[str, float]
Peak = Dict[str, float]


def _fallback_peaks(values: List[float], min_height: Optional[float], min_distance: Optional[int]) -> List[int]:
    peaks: List[int] = []
    last_peak_index: Optional[int] = None

    for idx in range(1, len(values) - 1):
        if values[idx] <= values[idx - 1] or values[idx] <= values[idx + 1]:
            continue
        if min_height is not None and values[idx] < min_height:
            continue
        if (
            min_distance is not None
            and last_peak_index is not None
            and (idx - last_peak_index) < min_distance
        ):
            continue

        peaks.append(idx)
        last_peak_index = idx

    return peaks


def detect_peaks(
    pressure_rows: List[PressureRow],
    min_height: Optional[float] = None,
    min_distance: Optional[int] = None,
) -> List[Peak]:
    times = [float(row.get("Elapsed Time", 0)) for row in pressure_rows]
    values = [float(row.get("Bladder Pressure", 0)) for row in pressure_rows]

    if len(values) < 3:
        return []

    if find_peaks:
        kwargs = {}
        if min_height is not None:
            kwargs["height"] = min_height
        if min_distance is not None:
            kwargs["distance"] = min_distance

        peaks_indices, _ = find_peaks(values, **kwargs)  # type: ignore[arg-type]
        indices = list(peaks_indices)
    else:
        indices = _fallback_peaks(values, min_height, min_distance)

    return [{"time": times[idx], "value": values[idx]} for idx in indices]


def _clean_params(params: Dict[str, Optional[float]]) -> Tuple[Dict[str, float], Optional[float], Optional[int]]:
    used_params: Dict[str, float] = {}
    min_height: Optional[float] = None
    min_distance: Optional[int] = None

    for key in ("height", "threshold", "distance", "prominence", "width"):
        value = params.get(key)
        if value is None:
            continue
        if key == "distance":
            min_distance = int(value)
            used_params[key] = min_distance
        else:
            used_params[key] = float(value)
            if key == "height":
                min_height = used_params[key]

    return used_params, min_height, min_distance


def run_find_peaks(pressure_rows: List[PressureRow], params: Dict[str, Optional[float]]) -> Dict[str, object]:
    times = [float(row.get("Elapsed Time", 0)) for row in pressure_rows]
    values = [float(row.get("Bladder Pressure", 0)) for row in pressure_rows]

    cleaned_params, min_height, min_distance = _clean_params(params)

    if len(values) < 3:
        return {"peaks": [], "paramsUsed": cleaned_params}

    if find_peaks:
        peak_indices, _ = find_peaks(values, **cleaned_params)  # type: ignore[arg-type]
        indices = list(peak_indices)
    else:
        indices = _fallback_peaks(values, min_height, min_distance)

    peaks = [
        {"time": times[idx], "value": values[idx], "index": idx}
        for idx in indices
    ]

    return {"peaks": peaks, "paramsUsed": cleaned_params}
