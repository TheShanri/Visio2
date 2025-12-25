import io
from typing import Dict, List

import numpy as np
import pandas as pd

REQUIRED_COLUMNS = ["Elapsed Time", "Scale", "Tot Infused Vol", "Bladder Pressure"]


def _decode_stream(file_stream) -> str:
    content = file_stream.read()
    if isinstance(content, bytes):
        content = content.decode("utf-8", errors="replace")
    return content


def _find_header_index(lines: List[str], delimiter: str) -> int:
    for idx, line in enumerate(lines[:50]):
        columns = [col.strip() for col in line.split(delimiter)]
        if all(required in columns for required in REQUIRED_COLUMNS):
            return idx
    raise ValueError(
        "Could not locate header row with required columns: " + ", ".join(REQUIRED_COLUMNS)
    )


def process_uploaded_data(file_stream, filename: str) -> Dict[str, List[Dict[str, float]]]:
    delimiter = "," if filename.lower().endswith(".csv") else "\t"

    content = _decode_stream(file_stream)
    if not content.strip():
        raise ValueError("Uploaded file is empty")

    lines = content.splitlines()
    header_index = _find_header_index(lines, delimiter)

    df = pd.read_csv(
        io.StringIO(content),
        delimiter=delimiter,
        skiprows=header_index,
        header=0,
    )

    missing_columns = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")

    for column in REQUIRED_COLUMNS:
        df[column] = pd.to_numeric(df[column], errors="coerce")

    df = df.dropna(subset=["Elapsed Time"])
    df = df.sort_values(by="Elapsed Time", ascending=True)

    return {
        "scale": df[["Elapsed Time", "Scale"]].replace({np.nan: None}).to_dict(orient="records"),
        "volume": df[["Elapsed Time", "Tot Infused Vol"]].replace({np.nan: None}).to_dict(orient="records"),
        "pressure": df[["Elapsed Time", "Bladder Pressure"]]
        .replace({np.nan: None})
        .to_dict(orient="records"),
    }
