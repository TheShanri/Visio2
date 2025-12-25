import os
from typing import List

from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)


def _get_allowed_origins() -> List[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


CORS(app, resources={r"/*": {"origins": _get_allowed_origins()}})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
