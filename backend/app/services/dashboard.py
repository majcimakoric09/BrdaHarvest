"""Dataset-level summary statistics for the Dashboard page.

Reads data/raw/gb_vineyard_dataset.csv directly (same load_dataset() used
throughout analysis/) -- every number here is a real, computed statistic,
never invented or hardcoded.
"""

import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[3]
ANALYSIS_SRC = PROJECT_ROOT / "analysis" / "src"
if str(ANALYSIS_SRC) not in sys.path:
    sys.path.insert(0, str(ANALYSIS_SRC))

from data import load_dataset  # noqa: E402

from app.core.dates import doy_to_date_string

YIELD_HISTOGRAM_BINS = 10
# Arbitrary non-leap reference year, used only to render a mean day-of-year
# as a human-readable month/day string -- not tied to any specific season.
REFERENCE_YEAR_FOR_MEAN_DATE = 2025


def get_summary() -> dict:
    df = load_dataset()

    bin_counts = pd.cut(df["yield_kg_ha"], bins=YIELD_HISTOGRAM_BINS).value_counts(sort=False).sort_index()
    yield_histogram = [
        {"range_start": round(float(interval.left), 0), "range_end": round(float(interval.right), 0), "count": int(count)}
        for interval, count in bin_counts.items()
    ]

    variety_counts = [
        {"grape_variety": variety, "count": int(count)}
        for variety, count in df["grape_variety"].value_counts().items()
    ]

    yield_by_variety = [
        {"grape_variety": variety, "mean_yield_kg_ha": round(float(mean_yield), 1)}
        for variety, mean_yield in df.groupby("grape_variety")["yield_kg_ha"]
        .mean()
        .sort_values(ascending=False)
        .items()
    ]

    harvest_counts = df["harvest_category"].value_counts().to_dict()

    return {
        "total_records": len(df),
        "grape_varieties": int(df["grape_variety"].nunique()),
        "soil_types": int(df["soil_type"].nunique()),
        "locations": int(df["location"].nunique()),
        "year_min": int(df["year"].min()),
        "year_max": int(df["year"].max()),
        "years_covered": f"{int(df['year'].min())}–{int(df['year'].max())}",
        "mean_yield_kg_ha": round(float(df["yield_kg_ha"].mean()), 1),
        "mean_harvest_date": doy_to_date_string(REFERENCE_YEAR_FOR_MEAN_DATE, df["harvest_doy"].mean()),
        "harvest_category_counts": {
            "Early": int(harvest_counts.get("Early", 0)),
            "Normal": int(harvest_counts.get("Normal", 0)),
            "Late": int(harvest_counts.get("Late", 0)),
        },
        "yield_histogram": yield_histogram,
        "variety_counts": variety_counts,
        "yield_by_variety": yield_by_variety,
    }
