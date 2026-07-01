"""Serves precomputed model evaluation metrics for the Model Performance page.

Reads models/evaluation_metrics.json, generated once by
analysis/src/export_metrics.py -- never recomputed or retrained on request.
"""

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
METRICS_PATH = PROJECT_ROOT / "models" / "evaluation_metrics.json"


def get_performance() -> dict:
    with open(METRICS_PATH) as f:
        return json.load(f)
