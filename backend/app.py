import os
from typing import List

from flask import Flask, jsonify, request
from flask_cors import CORS

from services import process_uploaded_data

app = Flask(__name__)


def _get_allowed_origins() -> List[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


CORS(app, resources={r"/*": {"origins": _get_allowed_origins()}})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True})


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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
