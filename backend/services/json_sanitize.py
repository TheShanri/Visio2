"""Utilities to coerce numpy/pandas objects into JSON-serializable forms."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def to_jsonable(obj: Any) -> Any:
    """Recursively convert common numpy/pandas scalars to native JSONable types."""

    if isinstance(obj, dict):
        return {key: to_jsonable(value) for key, value in obj.items()}

    if isinstance(obj, (list, tuple)):
        return [to_jsonable(item) for item in obj]

    if isinstance(obj, np.integer):
        return int(obj)

    if isinstance(obj, np.floating):
        return float(obj)

    if isinstance(obj, np.bool_):
        return bool(obj)

    if isinstance(obj, np.ndarray):
        return [to_jsonable(item) for item in obj.tolist()]

    if isinstance(obj, pd.Timestamp):
        return obj.isoformat()

    return obj
