"""Open-Meteo weather integration for the harvest prediction.

Fetches real historical weather for Dobrovo (Goriška Brda's administrative
center, used as a single representative point for the whole region --
Open-Meteo's grid resolution can't meaningfully distinguish between the
region's villages, which sit only a few km apart) and derives the weather
fields the models were trained on.

Falls back to training-data defaults on a *per-field* basis, not just for
the whole request: a network failure defaults everything, but predicting a
still-in-progress year (e.g. this year, before summer has happened yet)
only defaults the fields whose time window isn't fully available yet.

Eurostat is intentionally NOT called here or anywhere at request time --
per the project proposal it's an offline data-preparation/reporting source
only, never a live dependency.
"""

import json
from datetime import date, timedelta
from pathlib import Path

import pandas as pd
import requests

PROJECT_ROOT = Path(__file__).resolve().parents[3]
with open(PROJECT_ROOT / "models" / "feature_metadata.json") as f:
    _metadata = json.load(f)

_DEFAULTS = _metadata["raw_feature_defaults"]

WEATHER_FIELDS = [
    "avg_temperature_C",
    "min_spring_temp_C",
    "summer_heat_days",
    "spring_frost_days",
    "winter_rainfall_mm",
    "spring_rainfall_mm",
    "summer_rainfall_mm",
    "rainfall_deviation_mm",
    "humidity_pct",
    "sunshine_hours",
    "soil_moisture_pct",
]
# growing_degree_days, prev_harvest_doy, and prev_yield_kg_ha are also raw
# model inputs, but they're out of scope for this weather service (GDD
# would need an assumed base-temperature formula not specified anywhere;
# the prev_* fields are vineyard history, not weather) — they stay on
# training defaults, handled in prediction.py.

_RAINFALL_BASELINE_MM = (
    _DEFAULTS["winter_rainfall_mm"] + _DEFAULTS["spring_rainfall_mm"] + _DEFAULTS["summer_rainfall_mm"]
)

# Dobrovo, Goriška Brda's administrative center.
DOBROVO_LATITUDE = 45.9436
DOBROVO_LONGITUDE = 13.5994

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
REQUEST_TIMEOUT_SECONDS = 10
ARCHIVE_LAG_DAYS = 5  # Open-Meteo's historical archive isn't available in real time
HEAT_DAY_THRESHOLD_C = 30.0
FROST_DAY_THRESHOLD_C = 0.0

DAILY_VARIABLES = [
    "temperature_2m_mean",
    "temperature_2m_min",
    "temperature_2m_max",
    "precipitation_sum",
    "sunshine_duration",
    "relative_humidity_2m_mean",
    "soil_moisture_0_to_7cm_mean",
]


def _all_defaults() -> dict:
    return {name: _DEFAULTS[name] for name in WEATHER_FIELDS}


def _season_windows(year: int) -> dict[str, tuple[date, date]]:
    """Winter wraps the year boundary (Dec of year-1 through Feb of year);
    spring/summer are the standard meteorological months. `full` spans the
    whole range in one request rather than three separate API calls."""
    winter_start = date(year - 1, 12, 1)
    spring_start = date(year, 3, 1)
    summer_start = date(year, 6, 1)
    summer_end = date(year, 8, 31)
    return {
        "full": (winter_start, summer_end),
        "winter": (winter_start, spring_start - timedelta(days=1)),
        "spring": (spring_start, summer_start - timedelta(days=1)),
        "summer": (summer_start, summer_end),
    }


def fetch_weather(year: int) -> tuple[dict, str, str, dict]:
    """Returns (weather_fields, source, summary, field_sources).

    weather_fields always has all 11 WEATHER_FIELDS keys populated -- each
    one individually either real Open-Meteo data or the training default.
    field_sources maps each of those same field names to "open-meteo" or
    "training-defaults", so callers (the API response, the UI) can show
    exactly which values were live and which weren't, per field.
    """
    windows = _season_windows(year)
    full_start, full_end = windows["full"]
    today = date.today()
    available_end = min(full_end, today - timedelta(days=ARCHIVE_LAG_DAYS))

    if available_end < full_start:
        return (
            _all_defaults(),
            "training-defaults",
            f"{year} is too far in the future for historical weather data — "
            "used training-data seasonal averages for all weather fields.",
            {name: "training-defaults" for name in WEATHER_FIELDS},
        )

    try:
        response = requests.get(
            ARCHIVE_URL,
            params={
                "latitude": DOBROVO_LATITUDE,
                "longitude": DOBROVO_LONGITUDE,
                "start_date": full_start.isoformat(),
                "end_date": available_end.isoformat(),
                "daily": ",".join(DAILY_VARIABLES),
                "timezone": "auto",
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        daily = response.json()["daily"]
        df = pd.DataFrame(daily)
        df["time"] = pd.to_datetime(df["time"]).dt.date
        df = df.set_index("time")
    except Exception as exc:
        return (
            _all_defaults(),
            "training-defaults",
            f"Open-Meteo request failed ({type(exc).__name__}) — "
            "used training-data seasonal averages for all weather fields.",
            {name: "training-defaults" for name in WEATHER_FIELDS},
        )

    def window_slice(name: str):
        start, end = windows[name]
        if end > available_end:  # window not fully covered by what we fetched
            return None
        return df.loc[start:end]

    slices = {name: window_slice(name) for name in windows}

    fields: dict = {}
    used_live: list[str] = []
    used_default: list[str] = []

    def set_field(name: str, value) -> None:
        if value is None or pd.isna(value):
            fields[name] = _DEFAULTS[name]
            used_default.append(name)
        else:
            fields[name] = round(float(value), 2)
            used_live.append(name)

    full_s, spring_s, winter_s, summer_s = slices["full"], slices["spring"], slices["winter"], slices["summer"]

    set_field("avg_temperature_C", full_s["temperature_2m_mean"].mean() if full_s is not None else None)
    set_field("min_spring_temp_C", spring_s["temperature_2m_min"].min() if spring_s is not None else None)
    set_field(
        "summer_heat_days",
        (summer_s["temperature_2m_max"] >= HEAT_DAY_THRESHOLD_C).sum() if summer_s is not None else None,
    )
    set_field(
        "spring_frost_days",
        (spring_s["temperature_2m_min"] < FROST_DAY_THRESHOLD_C).sum() if spring_s is not None else None,
    )
    set_field("winter_rainfall_mm", winter_s["precipitation_sum"].sum() if winter_s is not None else None)
    set_field("spring_rainfall_mm", spring_s["precipitation_sum"].sum() if spring_s is not None else None)
    set_field("summer_rainfall_mm", summer_s["precipitation_sum"].sum() if summer_s is not None else None)
    set_field("humidity_pct", full_s["relative_humidity_2m_mean"].mean() if full_s is not None else None)
    set_field("sunshine_hours", full_s["sunshine_duration"].sum() / 3600 if full_s is not None else None)
    set_field(
        "soil_moisture_pct",
        full_s["soil_moisture_0_to_7cm_mean"].mean() * 100 if full_s is not None else None,
    )

    # Depends on the three rainfall fields above already being resolved.
    if all(name in used_live for name in ["winter_rainfall_mm", "spring_rainfall_mm", "summer_rainfall_mm"]):
        total = fields["winter_rainfall_mm"] + fields["spring_rainfall_mm"] + fields["summer_rainfall_mm"]
        set_field("rainfall_deviation_mm", total - _RAINFALL_BASELINE_MM)
    else:
        set_field("rainfall_deviation_mm", None)

    source = "open-meteo" if used_live else "training-defaults"
    summary = (
        f"Historical Open-Meteo data for Dobrovo, {full_start.isoformat()} to {available_end.isoformat()} "
        f"({len(used_live)}/{len(WEATHER_FIELDS)} fields from live data"
        + (f"; used seasonal defaults for {', '.join(used_default)})" if used_default else ")")
    )
    field_sources = {
        name: ("open-meteo" if name in used_live else "training-defaults") for name in WEATHER_FIELDS
    }
    return fields, source, summary, field_sources
