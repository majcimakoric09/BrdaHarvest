"""Model candidates, evaluation, and leaderboard helpers for the harvest models.

Every candidate is a full sklearn Pipeline (preprocessor + model), so
preprocessing is always fit fresh on whatever data a given `.fit()` call
receives — there's no way to accidentally fit the ColumnTransformer on
validation/test data by reusing a shared, already-fitted instance.
"""

import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from xgboost import XGBClassifier, XGBRegressor

from preprocessing import CATEGORICAL_FEATURES, NUMERIC_FEATURES, build_preprocessor

RANDOM_STATE = 42

# XGBoost's sklearn API requires integer class labels (0..n-1), unlike the
# other three classifiers which accept the raw strings directly. Rather
# than special-case XGBoost, every classifier is trained on this same
# integer encoding for consistency. Order is chronological (not sklearn's
# default alphabetical Early/Late/Normal) so it stays meaningful if it's
# ever read as an ordinal. The FastAPI backend must use this exact mapping
# to decode predictions back to a label later.
CLASSIFICATION_LABELS = ["Early", "Normal", "Late"]


def encode_classification_target(y: pd.Series) -> np.ndarray:
    mapping = {label: i for i, label in enumerate(CLASSIFICATION_LABELS)}
    return y.map(mapping).to_numpy()


def decode_classification_target(y_encoded) -> np.ndarray:
    return np.array(CLASSIFICATION_LABELS)[np.asarray(y_encoded)]


def classification_candidates(
    numeric_features: list[str] = NUMERIC_FEATURES,
    categorical_features: list[str] = CATEGORICAL_FEATURES,
) -> dict[str, Pipeline]:
    """Baseline -> increasingly complex classifiers, each its own Pipeline.

    DecisionTreeClassifier is deliberately left unconstrained (default
    max_depth=None) so its overfitting behavior is visible in the
    leaderboard rather than hidden by early regularization.
    """
    return {
        "DummyClassifier": Pipeline(
            [
                ("preprocessor", build_preprocessor(numeric_features, categorical_features)),
                ("model", DummyClassifier(strategy="prior", random_state=RANDOM_STATE)),
            ]
        ),
        "LogisticRegression": Pipeline(
            [
                ("preprocessor", build_preprocessor(numeric_features, categorical_features)),
                ("model", LogisticRegression(max_iter=1000, random_state=RANDOM_STATE)),
            ]
        ),
        "DecisionTree": Pipeline(
            [
                ("preprocessor", build_preprocessor(numeric_features, categorical_features)),
                ("model", DecisionTreeClassifier(random_state=RANDOM_STATE)),
            ]
        ),
        "XGBoost": Pipeline(
            [
                ("preprocessor", build_preprocessor(numeric_features, categorical_features)),
                (
                    "model",
                    XGBClassifier(random_state=RANDOM_STATE, eval_metric="mlogloss"),
                ),
            ]
        ),
    }


def regression_candidates(
    numeric_features: list[str] = NUMERIC_FEATURES,
    categorical_features: list[str] = CATEGORICAL_FEATURES,
) -> dict[str, Pipeline]:
    """Baseline -> increasingly complex regressors, each its own Pipeline.

    Ridge (L2-regularized linear regression) is used instead of plain
    LinearRegression so every candidate has a meaningful `random_state`
    and a touch of regularization as a sane default.
    """
    return {
        "DummyRegressor": Pipeline(
            [
                ("preprocessor", build_preprocessor(numeric_features, categorical_features)),
                ("model", DummyRegressor(strategy="mean")),
            ]
        ),
        "Ridge": Pipeline(
            [
                ("preprocessor", build_preprocessor(numeric_features, categorical_features)),
                ("model", Ridge(alpha=1.0, random_state=RANDOM_STATE)),
            ]
        ),
        "DecisionTree": Pipeline(
            [
                ("preprocessor", build_preprocessor(numeric_features, categorical_features)),
                ("model", DecisionTreeRegressor(random_state=RANDOM_STATE)),
            ]
        ),
        "XGBoost": Pipeline(
            [
                ("preprocessor", build_preprocessor(numeric_features, categorical_features)),
                ("model", XGBRegressor(random_state=RANDOM_STATE)),
            ]
        ),
    }


def evaluate_classifier(pipeline: Pipeline, X: pd.DataFrame, y: pd.Series, labels: list[str]) -> dict:
    y_pred = pipeline.predict(X)
    y_proba = pipeline.predict_proba(X)
    return {
        "accuracy": accuracy_score(y, y_pred),
        "precision_macro": precision_score(y, y_pred, average="macro", zero_division=0),
        "recall_macro": recall_score(y, y_pred, average="macro", zero_division=0),
        "f1_macro": f1_score(y, y_pred, average="macro", zero_division=0),
        "roc_auc_ovr_macro": roc_auc_score(
            y, y_proba, multi_class="ovr", average="macro", labels=labels
        ),
    }


def evaluate_regressor(pipeline: Pipeline, X: pd.DataFrame, y: pd.Series) -> dict:
    y_pred = pipeline.predict(X)
    return {
        "r2": r2_score(y, y_pred),
        "mae": mean_absolute_error(y, y_pred),
        "rmse": float(np.sqrt(mean_squared_error(y, y_pred))),
    }


def classification_leaderboard(
    candidates: dict[str, Pipeline],
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_val: pd.DataFrame,
    y_val: pd.Series,
    labels: list[str],
) -> tuple[pd.DataFrame, dict[str, Pipeline]]:
    """Fit each candidate on train only, score on train and val.

    Returns train_/val_-prefixed metric columns side by side so the
    train-val gap (overfitting signal) is visible for every model, not
    just the one being discussed.
    """
    rows = []
    fitted = {}
    for name, pipeline in candidates.items():
        pipeline.fit(X_train, y_train)
        fitted[name] = pipeline
        train_metrics = evaluate_classifier(pipeline, X_train, y_train, labels)
        val_metrics = evaluate_classifier(pipeline, X_val, y_val, labels)
        rows.append(
            {
                "model": name,
                **{f"train_{k}": v for k, v in train_metrics.items()},
                **{f"val_{k}": v for k, v in val_metrics.items()},
            }
        )
    return pd.DataFrame(rows), fitted


def regression_leaderboard(
    candidates: dict[str, Pipeline],
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_val: pd.DataFrame,
    y_val: pd.Series,
) -> tuple[pd.DataFrame, dict[str, Pipeline]]:
    rows = []
    fitted = {}
    for name, pipeline in candidates.items():
        pipeline.fit(X_train, y_train)
        fitted[name] = pipeline
        train_metrics = evaluate_regressor(pipeline, X_train, y_train)
        val_metrics = evaluate_regressor(pipeline, X_val, y_val)
        rows.append(
            {
                "model": name,
                **{f"train_{k}": v for k, v in train_metrics.items()},
                **{f"val_{k}": v for k, v in val_metrics.items()},
            }
        )
    return pd.DataFrame(rows), fitted
