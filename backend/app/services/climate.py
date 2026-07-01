"""Year-by-year aggregated statistics for the Climate Trends page.

Reads data/raw/gb_vineyard_dataset.csv directly and groups by year -- real
historical data. Note this is safe to use even though a couple of these
columns (e.g. annual rainfall) were excluded as model *inputs* in Phase 2
for leakage reasons: that exclusion was about not letting the model see
the answer at prediction time, and has no bearing on displaying real
historical charts here.
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
ANALYSIS_SRC = PROJECT_ROOT / "analysis" / "src"
if str(ANALYSIS_SRC) not in sys.path:
    sys.path.insert(0, str(ANALYSIS_SRC))

from data import load_dataset  # noqa: E402


def get_trends() -> list[dict]:
    df = load_dataset()

    grouped = df.groupby("year").agg(
        avg_temperature_C=("avg_temperature_C", "mean"),
        annual_rainfall_mm=("annual_rainfall_mm", "mean"),
        growing_degree_days=("growing_degree_days", "mean"),
        summer_heat_days=("summer_heat_days", "mean"),
        spring_frost_days=("spring_frost_days", "mean"),
        mean_yield_kg_ha=("yield_kg_ha", "mean"),
    ).round(1)

    harvest_counts = df.groupby(["year", "harvest_category"]).size().unstack(fill_value=0)

    records = []
    for year, row in grouped.iterrows():
        counts = harvest_counts.loc[year]
        records.append(
            {
                "year": int(year),
                "avg_temperature_C": float(row["avg_temperature_C"]),
                "annual_rainfall_mm": float(row["annual_rainfall_mm"]),
                "growing_degree_days": float(row["growing_degree_days"]),
                "summer_heat_days": float(row["summer_heat_days"]),
                "spring_frost_days": float(row["spring_frost_days"]),
                "mean_yield_kg_ha": float(row["mean_yield_kg_ha"]),
                "harvest_early_count": int(counts.get("Early", 0)),
                "harvest_normal_count": int(counts.get("Normal", 0)),
                "harvest_late_count": int(counts.get("Late", 0)),
            }
        )
    return records
