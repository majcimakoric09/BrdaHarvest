"""Adds weather_by_year, weather_feature_stats, and harvest_doy_by_year_variety
to models/feature_metadata.json. Merges into the existing file -- other
fields (including the pre-existing harvest_doy_by_category) aren't touched.

Why this exists: an earlier version of the backend's date estimate only
related the predicted *category* (Early/Normal/Late) to a date, blended by
the classifier's probabilities. That's coarser than it should be -- two
requests both classified "Normal" but with meaningfully different weather
(say, one with 2 spring frost days, one with 8) got dates pulled from the
same narrow pool of category means.

This adds a real weather-analog lookup instead: each of the 34 historical
years has one real weather profile (confirmed identical across all
locations/varieties within a year -- weather is a regional, not a
per-vineyard, signal in this dataset). The backend can now compare a new
request's actual resolved weather values against all 34 real years,
find the most similar ones, and use *their* real harvest_doy for the
requested variety -- i.e. "which past years had weather like this one, and
when did harvest actually happen in those years." Standard, transparent
k-nearest-neighbours-on-weather-similarity, not a new trained model.

Usage:
    cd analysis && source .venv/bin/activate && python3 src/export_weather_analog_years.py
"""

import json
from pathlib import Path

from data import load_dataset

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FEATURE_METADATA_PATH = PROJECT_ROOT / "models" / "feature_metadata.json"

# Same 11 fields weather.py resolves for a live prediction request.
WEATHER_FEATURES = [
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


def build_metadata() -> dict:
    df = load_dataset()

    # One real weather profile per year -- verified identical across every
    # location/variety row for that year, so first() is exact, not a guess.
    yearly_weather = df.groupby("year")[WEATHER_FEATURES].first()

    weather_by_year = {
        str(year): {feat: round(float(row[feat]), 2) for feat in WEATHER_FEATURES}
        for year, row in yearly_weather.iterrows()
    }

    # Mean/std across the 34 real years, used to standardize each weather
    # feature before computing similarity -- otherwise rainfall (hundreds
    # of mm) would dominate the distance over frost days (single digits).
    weather_feature_stats = {
        feat: {"mean": round(float(yearly_weather[feat].mean()), 3), "std": round(float(yearly_weather[feat].std()), 3)}
        for feat in WEATHER_FEATURES
    }

    # Real mean harvest_doy per (year, variety), averaged across the 8
    # locations -- every combination has exactly 8 real records, confirmed,
    # so no fallback/missing-data handling is needed here.
    grouped = df.groupby(["year", "grape_variety"])["harvest_doy"].mean().round(1)
    harvest_doy_by_year_variety: dict[str, dict[str, float]] = {}
    for (year, variety), doy in grouped.items():
        harvest_doy_by_year_variety.setdefault(str(year), {})[variety] = float(doy)

    return {
        "weather_features": WEATHER_FEATURES,
        "weather_by_year": weather_by_year,
        "weather_feature_stats": weather_feature_stats,
        "harvest_doy_by_year_variety": harvest_doy_by_year_variety,
        "source": (
            "Real per-year weather profile and real mean harvest_doy per (year, grape_variety), "
            "computed from the full historical dataset (analysis/src/export_weather_analog_years.py). "
            "Used to find historical years with similar weather to a new request and estimate harvest "
            "timing from what actually happened in those years, rather than only from the predicted "
            "Early/Normal/Late category."
        ),
    }


def main():
    with open(FEATURE_METADATA_PATH) as f:
        metadata = json.load(f)

    metadata["weather_analog_years"] = build_metadata()

    with open(FEATURE_METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Updated {FEATURE_METADATA_PATH} with weather_analog_years.")


if __name__ == "__main__":
    main()
