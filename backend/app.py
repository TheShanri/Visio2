import os
from typing import List

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from services import (
    create_report,
    detect_peaks,
    process_uploaded_data,
    run_find_peaks,
    suggest_params,
)

app = Flask(__name__)

DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


def _get_allowed_origins() -> List[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


CORS(app, resources={r"/*": {"origins": _get_allowed_origins()}})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True})


def _validate_pressure_rows(rows):
    if not isinstance(rows, list):
        return False
    for row in rows:
        if not isinstance(row, dict):
            return False
        if "Elapsed Time" not in row or "Bladder Pressure" not in row:
            return False
        try:
            float(row["Elapsed Time"])
            float(row["Bladder Pressure"])
        except (TypeError, ValueError):
            return False
    return True


def _validate_peak_params(params):
    if params is None:
        return {}, None
    if not isinstance(params, dict):
        return None, "params must be an object"

    allowed_keys = {"height", "threshold", "distance", "prominence", "width"}
    cleaned = {}

    for key, value in params.items():
        if key not in allowed_keys:
            return None, f"Unknown parameter: {key}"
        if value is None:
            continue
        if not isinstance(value, (int, float)):
            return None, f"{key} must be a number or null"
        cleaned[key] = value

    return cleaned, None


@app.route("/api/detect-peaks", methods=["POST"])
def detect_peaks_route():
    if not request.is_json:
        return jsonify({"error": "Expected JSON body"}), 400

    payload = request.get_json(silent=True) or {}
    pressure = payload.get("pressure")
    min_height = payload.get("min_height")
    min_distance = payload.get("min_distance")

    if not _validate_pressure_rows(pressure):
        return jsonify({"error": "Invalid or missing pressure data"}), 400

    if min_height is not None and not isinstance(min_height, (int, float)):
        return jsonify({"error": "min_height must be a number"}), 400
    if min_distance is not None:
        if not isinstance(min_distance, (int, float)):
            return jsonify({"error": "min_distance must be a number"}), 400
        min_distance = int(min_distance)

    peaks = detect_peaks(pressure, min_height=min_height, min_distance=min_distance)
    return jsonify({"peaks": peaks})


@app.route("/api/peaks/run", methods=["POST"])
def run_peaks_route():
    if not request.is_json:
        return jsonify({"error": "Expected JSON body"}), 400

    payload = request.get_json(silent=True) or {}
    pressure = payload.get("pressure")
    params_raw = payload.get("params")

    if not _validate_pressure_rows(pressure):
        return jsonify({"error": "Invalid or missing pressure data"}), 400

    params, error = _validate_peak_params(params_raw)
    if error:
        return jsonify({"error": error}), 400

    result = run_find_peaks(pressure, params)
    return jsonify(result)


@app.route("/api/peaks/suggest", methods=["POST"])
def suggest_peaks_route():
    if not request.is_json:
        return jsonify({"error": "Expected JSON body"}), 400

    payload = request.get_json(silent=True) or {}
    pressure = payload.get("pressure")
    expected_count = payload.get("expectedCount")
    search_budget = payload.get("searchBudget")

    if not _validate_pressure_rows(pressure):
        return jsonify({"error": "Invalid or missing pressure data"}), 400

    if not isinstance(expected_count, (int, float)):
        return jsonify({"error": "expectedCount must be a number"}), 400

    if search_budget is None:
        budget = 60
    elif isinstance(search_budget, (int, float)):
        budget = max(1, int(search_budget))
    else:
        return jsonify({"error": "searchBudget must be a number or null"}), 400

    suggestion = suggest_params(pressure, int(expected_count), budget)
    return jsonify(suggestion)


@app.route("/api/generate-report", methods=["POST"])
def generate_report_route():
    if not request.is_json:
        return jsonify({"error": "Expected JSON body"}), 400

    payload = request.get_json(silent=True) or {}
    data = payload.get("data")
    peaks = payload.get("peaks")

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid or missing data"}), 400
    if peaks is not None and not isinstance(peaks, list):
        return jsonify({"error": "Peaks must be a list"}), 400

    filename = create_report(data, peaks=peaks)
    download_url = f"/download/{filename}"
    return jsonify({"filename": filename, "download_url": download_url})


@app.route("/api/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400

    filename = file.filename
    if not filename.lower().endswith((".csv", ".txt")):
        return jsonify({"error": "Unsupported file type"}), 400

    file.stream.seek(0, os.SEEK_END)
    if file.stream.tell() == 0:
        file.stream.seek(0)
        return jsonify({"error": "Uploaded file is empty"}), 400
    file.stream.seek(0)

    try:
        parsed_data = process_uploaded_data(file.stream, filename)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        return jsonify({"error": "Failed to process uploaded file"}), 500

    return jsonify({"data": parsed_data})


@app.route("/download/<path:filename>", methods=["GET"])
def download_file(filename: str):
    safe_name = os.path.basename(filename)
    if not safe_name.endswith(".xlsx"):
        return jsonify({"error": "Invalid file type"}), 400

    file_path = os.path.join(DOWNLOAD_DIR, safe_name)
    if not os.path.isfile(file_path):
        return jsonify({"error": "File not found"}), 404

    return send_from_directory(DOWNLOAD_DIR, safe_name, as_attachment=True)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
