"""Leakage-safe feature engineering and preprocessing for the harvest models.

This module is the single source of truth for which columns are used as
features, how engineered features are derived, and how the sklearn
preprocessing pipeline is built. It is imported by the analysis notebooks
now, and will be imported by the FastAPI backend later so training and
inference apply the exact same transformation.
"""

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, RobustScaler

CLASSIFICATION_TARGET = "harvest_category"
REGRESSION_TARGET = "yield_kg_ha"

# Columns excluded because they are computed from, or only knowable after,
# the harvest outcome — see analysis/notebooks/01_eda.ipynb sections 3-7 for
# the evidence behind each one.
LEAKAGE_COLUMNS = [
    "harvest_doy",
    "harvest_date",
    "yield_category",
    "gbai_score",
    "ln_quality_index",
    "est_price_eur",
    "vintage_quality",
    "climate_risk",
    "harvest_rainfall_mm",
    "autumn_rainfall_mm",
    "annual_rainfall_mm",
    "grape_color",
    "vintage_age_years",
]

CATEGORICAL_FEATURES = ["grape_variety", "soil_type", "location"]

BASE_NUMERIC_FEATURES = [
    "year",
    "elevation_m",
    "vine_age_years",
    "avg_temperature_C",
    "min_spring_temp_C",
    "growing_season_temp_C",
    "temp_deviation_C",
    "summer_heat_days",
    "spring_frost_days",
    "growing_degree_days",
    "winter_rainfall_mm",
    "spring_rainfall_mm",
    "summer_rainfall_mm",
    "rainfall_deviation_mm",
    "humidity_pct",
    "sunshine_hours",
    "soil_moisture_pct",
    "heat_frost_ratio",
    "prev_harvest_doy",
    "prev_yield_kg_ha",
]

ENGINEERED_NUMERIC_FEATURES = [
    "heat_stress_index",
    "rainfall_efficiency",
    "frost_heat_ratio",
    "gdd_per_sunshine_hour",
    "yield_lag_change",
    "harvest_lag_change",
]

# Found by running find_correlated_features() on the training split
# (threshold 0.9) in analysis/notebooks/02_preprocessing_features.ipynb —
# reproduced there, not just asserted here. Each one is a near-duplicate of
# a feature already kept:
#   growing_season_temp_C, temp_deviation_C, growing_degree_days
#       -> all r=1.000 with avg_temperature_C (the dataset derives them from
#          the same underlying temperature signal)
#   heat_stress_index (= summer_heat_days * growing_degree_days)
#       -> r=0.954 with summer_heat_days, once growing_degree_days collapsed
#          into a near-duplicate of avg_temperature_C
#   frost_heat_ratio (= spring_frost_days / summer_heat_days)
#       -> r=0.919 with spring_frost_days, which already carries most of
#          that signal on its own
# Dropping these doesn't reduce what the model can see (each partner
# feature is still kept) — it just removes duplicate copies of the same
# information, which hurts model coefficients/importance interpretability
# without helping accuracy.
CORRELATED_FEATURES_DROPPED = [
    "growing_season_temp_C",
    "temp_deviation_C",
    "growing_degree_days",
    "heat_stress_index",
    "frost_heat_ratio",
]

NUMERIC_FEATURES = [
    f
    for f in BASE_NUMERIC_FEATURES + ENGINEERED_NUMERIC_FEATURES
    if f not in CORRELATED_FEATURES_DROPPED
]
ALL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES

# Small denominator guard so a rare zero (e.g. a frost-free spring) produces
# a large-but-finite ratio instead of inf/NaN.
_EPSILON = 1e-6


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add engineered features. Every input column used here is already a
    validated, leakage-safe column from analysis/notebooks/01_eda.ipynb —
    combining safe columns cannot introduce new leakage.

    Two features (`yield_lag_change`, `harvest_lag_change`) need a second
    lag step. They are built exclusively from `prev_yield_kg_ha` /
    `prev_harvest_doy` — themselves already the *previous* year's actual
    outcome — shifted one row further back within the same
    (location, grape_variety) history. That means they only ever reach two
    years into the past relative to the current row, never touch the
    current row's own target, and stay safe under the same reasoning
    Phase 1 used to clear `prev_yield_kg_ha`/`prev_harvest_doy` themselves.
    """
    df = df.sort_values(["location", "grape_variety", "year"]).copy()

    # Compounding heat exposure: many extreme-heat days AND high total
    # accumulated heat together stress vines more than either alone.
    df["heat_stress_index"] = df["summer_heat_days"] * df["growing_degree_days"]

    # mm of spring/summer rain received per unit of heat accumulated —
    # a low value signals drought stress relative to how hot the season was.
    df["rainfall_efficiency"] = (df["spring_rainfall_mm"] + df["summer_rainfall_mm"]) / (
        df["growing_degree_days"] + _EPSILON
    )

    # Frost risk share relative to heat exposure. Complements the existing
    # raw `heat_frost_ratio` column (opposite direction; checked for
    # redundancy against it via the correlation filter in the notebook).
    df["frost_heat_ratio"] = df["spring_frost_days"] / (df["summer_heat_days"] + _EPSILON)

    # Heat accumulated per hour of sunshine — distinguishes a warm-but-hazy
    # season from a sunny-but-mild one.
    df["gdd_per_sunshine_hour"] = df["growing_degree_days"] / (df["sunshine_hours"] + _EPSILON)

    # One more step back in time than prev_yield_kg_ha / prev_harvest_doy,
    # using only those already-safe lag columns (never yield_kg_ha /
    # harvest_doy directly).
    group = df.groupby(["location", "grape_variety"])
    two_years_ago_yield = group["prev_yield_kg_ha"].shift(1)
    two_years_ago_harvest_doy = group["prev_harvest_doy"].shift(1)

    df["yield_lag_change"] = df["prev_yield_kg_ha"] - two_years_ago_yield
    df["harvest_lag_change"] = df["prev_harvest_doy"] - two_years_ago_harvest_doy

    return df


def find_correlated_features(
    X_train: pd.DataFrame, numeric_features: list[str], threshold: float = 0.9
) -> list[str]:
    """Return numeric features redundant with another feature in the same set.

    Leakage-safe by construction: it only ever looks at feature-to-feature
    correlation (never the target), and must be called with the training
    split only — the returned drop-list is then applied identically to the
    validation/test splits, so no information from those rows affects which
    features are kept.
    """
    corr = X_train[numeric_features].corr().abs()
    upper_triangle = corr.where(np.triu(np.ones(corr.shape, dtype=bool), k=1))
    return [col for col in upper_triangle.columns if (upper_triangle[col] > threshold).any()]


def train_val_test_split(
    df: pd.DataFrame,
    test_size: float = 0.15,
    val_size: float = 0.15,
    random_state: int = 42,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Split into train/val/test, stratified on `harvest_category`.

    Both targets live on the same rows, so one stratified split is reused
    for classification and regression alike (see notebook 02 for the check
    that this doesn't skew the yield_kg_ha distribution across splits).
    Stratifying on the classification target keeps Early/Normal/Late
    balanced in every split; the notebook confirms yield balance too.
    """
    strat = df[CLASSIFICATION_TARGET]
    train_val_df, test_df = train_test_split(
        df, test_size=test_size, stratify=strat, random_state=random_state
    )

    val_relative_size = val_size / (1 - test_size)
    train_df, val_df = train_test_split(
        train_val_df,
        test_size=val_relative_size,
        stratify=train_val_df[CLASSIFICATION_TARGET],
        random_state=random_state,
    )
    return train_df, val_df, test_df


def build_preprocessor(
    numeric_features: list[str], categorical_features: list[str] = CATEGORICAL_FEATURES
) -> ColumnTransformer:
    """Build the leakage-safe ColumnTransformer.

    Missing-value strategy:
    - numeric: median imputation. Medians are robust to the outlier years
      (heatwaves/droughts) already visible in the EDA, unlike a mean.
    - categorical: most-frequent imputation. There's no ordering to
      interpolate and no missing values currently exist in these columns,
      but the strategy is declared explicitly so the pipeline doesn't break
      if a future data refresh introduces any.

    Scaling: RobustScaler (median/IQR-based) rather than StandardScaler,
    because several weather features have visible outlier years (extreme
    heat/frost/rainfall) that would otherwise distort a mean/std scaler.

    Both imputer and scaler are fit only when `.fit()` is called on the
    training split — see notebook 02 for the explicit train-only fit and
    train/val/test transform.
    """
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", RobustScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, numeric_features),
            ("categorical", categorical_pipeline, categorical_features),
        ]
    )
