from __future__ import annotations

from typing import Dict, List, Optional

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
