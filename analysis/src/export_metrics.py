"""Exports model evaluation results to models/evaluation_metrics.json.

Run once after model training changes (not on every backend request) so the
FastAPI backend can serve real metrics without retraining/recomputing on
every page load. Reuses the exact same functions and random_state as
03_model_training.ipynb -- these numbers must match that notebook and
reports/report.qmd, not drift from them.

Usage:
    cd analysis && source .venv/bin/activate && python3 src/export_metrics.py
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import confusion_matrix, roc_curve

from data import load_dataset
from preprocessing import (
    ALL_FEATURES,
    CLASSIFICATION_TARGET,
    LEAKAGE_COLUMNS,
    REGRESSION_TARGET,
    engineer_features,
    train_val_test_split,
)
from modeling import (
    CLASSIFICATION_LABELS,
    classification_candidates,
    classification_leaderboard,
    encode_classification_target,
    evaluate_classifier,
    evaluate_regressor,
    regression_candidates,
    regression_leaderboard,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_PATH = PROJECT_ROOT / "models" / "evaluation_metrics.json"

TOP_N_FEATURES = 15

LIMITATIONS = [
    "This is a synthetic, perfectly balanced panel dataset (8 locations x 34 years x "
    "8 varieties, no gaps) -- metrics are likely optimistic relative to real, messier "
    "winery records.",
    "No hyperparameter tuning was performed on the tree-based models; both likely have "
    "headroom that wasn't explored in this phase.",
    "`year` is a model feature and training data spans 1991-2024 -- predictions for "
    "years outside that range are extrapolations.",
    "Weather at prediction time is only live when Open-Meteo can supply it for the "
    "requested year; otherwise training-data seasonal averages are used.",
    "Vineyard history (prev_harvest_doy, prev_yield_kg_ha) is defaulted to training "
    "medians, not looked up from a real per-vineyard record, since no submissions "
    "database exists yet.",
]


def _leaderboard_records(board: pd.DataFrame) -> list[dict]:
    return json.loads(board.round(4).to_json(orient="records"))


def _feature_importance(pipeline, coefs: np.ndarray) -> list[dict]:
    feature_names = [
        n.split("__", 1)[1] for n in pipeline.named_steps["preprocessor"].get_feature_names_out()
    ]
    importance = np.abs(coefs)
    order = np.argsort(importance)[::-1][:TOP_N_FEATURES]
    return [{"feature": feature_names[i], "importance": round(float(importance[i]), 4)} for i in order]


def main() -> None:
    df = load_dataset().drop(columns=LEAKAGE_COLUMNS)
    df = engineer_features(df)
    train_df, val_df, test_df = train_val_test_split(df)
    trainval_df = pd.concat([train_df, val_df])

    X_train, X_val = train_df[ALL_FEATURES], val_df[ALL_FEATURES]
    X_trainval, X_test = trainval_df[ALL_FEATURES], test_df[ALL_FEATURES]

    y_train_clf = pd.Series(encode_classification_target(train_df[CLASSIFICATION_TARGET]))
    y_val_clf = pd.Series(encode_classification_target(val_df[CLASSIFICATION_TARGET]))
    y_trainval_clf = pd.Series(encode_classification_target(trainval_df[CLASSIFICATION_TARGET]))
    y_test_clf = pd.Series(encode_classification_target(test_df[CLASSIFICATION_TARGET]))

    y_train_reg, y_val_reg = train_df[REGRESSION_TARGET], val_df[REGRESSION_TARGET]
    y_trainval_reg, y_test_reg = trainval_df[REGRESSION_TARGET], test_df[REGRESSION_TARGET]

    clf_labels = list(range(len(CLASSIFICATION_LABELS)))

    # --- Classification ---
    clf_board, _ = classification_leaderboard(
        classification_candidates(), X_train, y_train_clf, X_val, y_val_clf, clf_labels
    )
    final_clf = classification_candidates()["LogisticRegression"]
    final_clf.fit(X_trainval, y_trainval_clf)
    test_metrics_clf = evaluate_classifier(final_clf, X_test, y_test_clf, clf_labels)

    y_test_pred = final_clf.predict(X_test)
    cm = confusion_matrix(y_test_clf, y_test_pred, labels=clf_labels).tolist()

    proba = final_clf.predict_proba(X_test)
    roc_curves = {}
    for cls_idx, cls_name in enumerate(CLASSIFICATION_LABELS):
        fpr, tpr, _ = roc_curve((y_test_clf == cls_idx).astype(int), proba[:, cls_idx])
        roc_curves[cls_name] = {
            "fpr": [round(float(v), 4) for v in fpr],
            "tpr": [round(float(v), 4) for v in tpr],
        }

    clf_coefs = final_clf.named_steps["model"].coef_
    clf_importance = _feature_importance(final_clf, np.abs(clf_coefs).mean(axis=0))

    # --- Regression ---
    reg_board, _ = regression_leaderboard(regression_candidates(), X_train, y_train_reg, X_val, y_val_reg)
    final_reg = regression_candidates()["Ridge"]
    final_reg.fit(X_trainval, y_trainval_reg)
    test_metrics_reg = evaluate_regressor(final_reg, X_test, y_test_reg)

    y_test_pred_reg = final_reg.predict(X_test)
    reg_coefs = final_reg.named_steps["model"].coef_
    reg_importance = _feature_importance(final_reg, reg_coefs)

    output = {
        "generated_from": (
            "analysis/src/export_metrics.py -- same split/models as "
            "analysis/notebooks/03_model_training.ipynb and reports/report.qmd (random_state=42)"
        ),
        "classification": {
            "labels": CLASSIFICATION_LABELS,
            "selected_model": "LogisticRegression",
            "leaderboard": _leaderboard_records(clf_board),
            "test_metrics": {k: round(float(v), 4) for k, v in test_metrics_clf.items()},
            "confusion_matrix": cm,
            "roc_curves": roc_curves,
        },
        "regression": {
            "selected_model": "Ridge",
            "leaderboard": _leaderboard_records(reg_board),
            "test_metrics": {k: round(float(v), 4) for k, v in test_metrics_reg.items()},
            "predicted_vs_actual": {
                "actual": [round(float(v), 1) for v in y_test_reg.tolist()],
                "predicted": [round(float(v), 1) for v in y_test_pred_reg.tolist()],
            },
        },
        "feature_importance": {
            "classification": clf_importance,
            "regression": reg_importance,
        },
        "limitations": LIMITATIONS,
    }

    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
