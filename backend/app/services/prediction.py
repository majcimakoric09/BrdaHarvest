"""Loads the trained models once at import time and runs predictions.

Feature engineering must exactly match training time to avoid train/serve
skew, so this reuses analysis/src/preprocessing.py's engineer_features()
directly rather than reimplementing it here. That's why analysis/ is added
to sys.path below — same pattern the notebooks already use, just resolved
from this file's location instead of a notebook's cwd.
"""

import json
import sys
from pathlib import Path

import joblib
import pandas as pd

from app.core.dates import doy_to_date_string
from app.services import weather

PROJECT_ROOT = Path(__file__).resolve().parents[3]
ANALYSIS_SRC = PROJECT_ROOT / "analysis" / "src"
if str(ANALYSIS_SRC) not in sys.path:
    sys.path.insert(0, str(ANALYSIS_SRC))

from preprocessing import ALL_FEATURES, engineer_features  # noqa: E402

MODELS_DIR = PROJECT_ROOT / "models"

with open(MODELS_DIR / "feature_metadata.json") as f:
    _metadata = json.load(f)

CLASSIFICATION_LABELS: list[str] = _metadata["classification_labels"]
_RAW_DEFAULTS: dict = _metadata["raw_feature_defaults"]
_RISK_THRESHOLDS: dict = _metadata["climate_risk_thresholds"]
_HARVEST_DOY_BY_CATEGORY: dict = _metadata["harvest_doy_by_category"]

try:
    _classification_model = joblib.load(MODELS_DIR / "classification_model.pkl")
    _regression_model = joblib.load(MODELS_DIR / "regression_model.pkl")
    _load_error: str | None = None
except Exception as exc:  # missing/corrupt model file shouldn't crash the whole app
    _classification_model = None
    _regression_model = None
    _load_error = str(exc)


def models_loaded() -> bool:
    return _classification_model is not None and _regression_model is not None


class ModelsNotReadyError(RuntimeError):
    pass


def _build_feature_row(request, weather_fields: dict) -> pd.DataFrame:
    """Merge user-supplied fields with resolved weather fields and
    training-data defaults for everything else, then run the same feature
    engineering used at training time.

    `weather_fields` (from weather.fetch_weather) already resolved each of
    the 11 weather columns to either real Open-Meteo data or a training
    default — this just overlays them on top of `_RAW_DEFAULTS`, which
    still supplies growing_degree_days and the prev_* vineyard-history
    fields (out of scope for the weather service; this app has no database
    of past submissions to look those up from yet).
    """
    row = {
        "grape_variety": request.grape_variety,
        "soil_type": request.soil_type,
        "location": request.location,
        "elevation_m": request.elevation_m,
        "vine_age_years": request.vine_age_years,
        "year": request.year,
        **_RAW_DEFAULTS,
        **weather_fields,
    }
    df = pd.DataFrame([row])
    df = engineer_features(df)
    return df[ALL_FEATURES]


def _climate_risk(row: pd.Series) -> tuple[str, str]:
    """Simple rule-based (not ML) risk heuristic.

    The dataset's own `climate_risk` column was excluded from the trained
    models in Phase 2 as an unverified, ambiguous-provenance leakage risk —
    see analysis/notebooks/01_eda.ipynb section 5. This rebuilds a
    transparent equivalent from three already-vetted-safe weather signals,
    thresholded at the 25th/75th percentile of the training data.
    """
    frost_days = row["spring_frost_days"]
    heat_days = row["summer_heat_days"]
    rainfall_eff = row["rainfall_efficiency"]

    triggered = []
    if frost_days >= _RISK_THRESHOLDS["spring_frost_days_p75"]:
        severity = frost_days / max(_RISK_THRESHOLDS["spring_frost_days_p75"], 1e-6)
        triggered.append((severity, "Elevated spring frost days"))
    if heat_days >= _RISK_THRESHOLDS["summer_heat_days_p75"]:
        severity = heat_days / max(_RISK_THRESHOLDS["summer_heat_days_p75"], 1e-6)
        triggered.append((severity, "Elevated summer heat days"))
    if rainfall_eff <= _RISK_THRESHOLDS["rainfall_efficiency_p25"]:
        severity = _RISK_THRESHOLDS["rainfall_efficiency_p25"] / max(rainfall_eff, 1e-6)
        triggered.append((severity, "Low rainfall relative to heat accumulated (drought stress)"))

    if not triggered:
        return "Low", "No significant risk factors — conditions near seasonal norms"

    _, main_factor = max(triggered, key=lambda t: t[0])
    level = "High" if len(triggered) >= 2 else "Medium"
    return level, main_factor


# Human-readable label + unit for each weather field the model consumes,
# in the order shown to the user. Presentation metadata only — the field
# names/values themselves come from weather.WEATHER_FIELDS.
_WEATHER_FIELD_LABELS = {
    "avg_temperature_C": ("Average temperature", "°C"),
    "min_spring_temp_C": ("Minimum spring temperature", "°C"),
    "summer_heat_days": ("Summer heat days", "days"),
    "spring_frost_days": ("Spring frost days", "days"),
    "winter_rainfall_mm": ("Winter rainfall", "mm"),
    "spring_rainfall_mm": ("Spring rainfall", "mm"),
    "summer_rainfall_mm": ("Summer rainfall", "mm"),
    "rainfall_deviation_mm": ("Rainfall deviation from normal", "mm"),
    "humidity_pct": ("Humidity", "%"),
    "sunshine_hours": ("Sunshine hours", "hours"),
    "soil_moisture_pct": ("Soil moisture", "%"),
}

_TIMING_ADVICE = {
    "Early": "Harvest is trending early — begin preparing crews and equipment ahead of the usual schedule.",
    "Normal": "Harvest is trending close to the typical seasonal schedule — plan crews around the usual window.",
    "Late": "Harvest is trending later than usual — there is likely extra time to prepare, but monitor conditions as the season progresses.",
}
_RISK_ADVICE = {
    "Low": "Conditions look close to seasonal norms, with no major risk factors flagged.",
    "Medium": "Keep an eye on {factor} — it's elevated relative to typical conditions for this vineyard.",
    "High": "{factor} is significantly elevated — consider contingency planning (e.g. frost protection, irrigation, or adjusted crew timing) before the harvest window.",
}
_WEATHER_SOURCE_CLAUSE = {
    "open-meteo": "Based on this year's observed weather conditions",
    "training-defaults": "Based on typical seasonal weather for this region (live conditions weren't available for this year)",
}


def _business_recommendation(
    harvest_category: str, climate_risk: str, main_risk_factor: str, weather_source: str
) -> str:
    weather_clause = _WEATHER_SOURCE_CLAUSE[weather_source]
    timing = _TIMING_ADVICE[harvest_category]
    risk = _RISK_ADVICE[climate_risk].format(factor=main_risk_factor)
    return f"{weather_clause}: {timing} {risk}"


def predict(request) -> dict:
    if not models_loaded():
        raise ModelsNotReadyError(_load_error or "models are not loaded")

    weather_fields, weather_source, weather_summary, field_sources = weather.fetch_weather(request.year)
    row_df = _build_feature_row(request, weather_fields)

    class_idx = int(_classification_model.predict(row_df)[0])
    class_proba = _classification_model.predict_proba(row_df)[0]
    harvest_category = CLASSIFICATION_LABELS[class_idx]
    confidence = float(class_proba[class_idx])

    expected_yield = float(_regression_model.predict(row_df)[0])

    climate_risk, main_risk_factor = _climate_risk(row_df.iloc[0])
    recommendation = _business_recommendation(harvest_category, climate_risk, main_risk_factor, weather_source)

    # Approximate, not a per-vineyard forecast: the real mean harvest_doy for
    # this category (see feature_metadata.json) converted to the requested year.
    estimated_harvest_date = doy_to_date_string(request.year, _HARVEST_DOY_BY_CATEGORY[harvest_category])

    # The actual values fed into the model for this request, one entry per
    # weather field, each tagged with whether it came from Open-Meteo or a
    # training-data default -- so the UI can show precisely what drove the
    # prediction instead of only a one-line summary.
    weather_inputs = [
        {
            "feature": name,
            "label": label,
            "value": weather_fields[name],
            "unit": unit,
            "source": field_sources[name],
        }
        for name, (label, unit) in _WEATHER_FIELD_LABELS.items()
    ]

    return {
        "harvest_category": harvest_category,
        "classification_confidence": confidence,
        "estimated_harvest_date": estimated_harvest_date,
        "expected_yield_kg_ha": expected_yield,
        "climate_risk": climate_risk,
        "main_risk_factor": main_risk_factor,
        "business_recommendation": recommendation,
        "weather_source": weather_source,
        "weather_summary": weather_summary,
        "weather_inputs": weather_inputs,
    }
