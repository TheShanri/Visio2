from __future__ import annotations

import os
from datetime import datetime
from typing import Dict, Iterable, List, Optional

from openpyxl import Workbook

DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "downloads")


def _ensure_download_dir() -> None:
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)


def _get_duration(series: Iterable[Dict[str, float]]) -> float:
    times = sorted(float(row.get("Elapsed Time", 0)) for row in series)
    if not times:
        return 0.0
    return float(times[-1] - times[0])


def _get_max_pressure(pressure_rows: Iterable[Dict[str, float]]) -> float:
    pressures = [float(row.get("Bladder Pressure", 0)) for row in pressure_rows]
    return float(max(pressures)) if pressures else 0.0


def _get_final_volume(volume_rows: Iterable[Dict[str, float]]) -> float:
    sorted_rows = sorted(volume_rows, key=lambda row: float(row.get("Elapsed Time", 0)))
    if not sorted_rows:
        return 0.0
    return float(sorted_rows[-1].get("Tot Infused Vol", 0))


def create_report(data: Dict, peaks: Optional[List[Dict[str, float]]] = None) -> str:
    _ensure_download_dir()

    wb = Workbook()
    ws_summary = wb.active
    ws_summary.title = "Summary"

    duration = _get_duration(
        data.get("pressure") or data.get("scale") or data.get("volume") or []
    )
    max_pressure = _get_max_pressure(data.get("pressure", []))
    final_volume = _get_final_volume(data.get("volume", []))
    kept_intervals = data.get("kept_intervals")

    ws_summary.append(["Metric", "Value"])
    ws_summary.append(["Duration", duration])
    ws_summary.append(["Max Pressure", max_pressure])
    ws_summary.append(["Final Volume", final_volume])
    if kept_intervals is not None:
        ws_summary.append(["Number of kept intervals", kept_intervals])
    ws_summary.append(["Generated", datetime.utcnow().isoformat()])

    ws_scale = wb.create_sheet("Scale")
    ws_scale.append(["Elapsed Time", "Scale"])
    for row in data.get("scale", []):
        ws_scale.append([row.get("Elapsed Time"), row.get("Scale")])

    ws_volume = wb.create_sheet("Volume")
    ws_volume.append(["Elapsed Time", "Tot Infused Vol"])
    for row in data.get("volume", []):
        ws_volume.append([row.get("Elapsed Time"), row.get("Tot Infused Vol")])

    ws_pressure = wb.create_sheet("Pressure")
    ws_pressure.append(["Elapsed Time", "Bladder Pressure"])
    for row in data.get("pressure", []):
        ws_pressure.append([row.get("Elapsed Time"), row.get("Bladder Pressure")])

    if peaks:
        ws_peaks = wb.create_sheet("Peaks")
        ws_peaks.append(["time", "value"])
        for peak in peaks:
            ws_peaks.append([peak.get("time"), peak.get("value")])

    filename = f"report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = os.path.join(DOWNLOAD_DIR, filename)
    wb.save(filepath)

    return filename
