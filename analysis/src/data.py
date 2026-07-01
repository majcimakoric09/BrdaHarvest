"""Shared dataset loading for analysis notebooks and scripts."""
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_DATA_PATH = PROJECT_ROOT / "data" / "raw" / "gb_vineyard_dataset.csv"


def load_dataset() -> pd.DataFrame:
    """Load the raw Goriška Brda vineyard dataset."""
    return pd.read_csv(RAW_DATA_PATH)
