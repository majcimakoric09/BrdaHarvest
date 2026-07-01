# analysis/

Python workspace for exploratory data analysis (EDA) and model
experimentation. This is where the vineyard dataset gets explored,
cleaned, visualized, and used to prototype prediction models before any
logic is promoted into the FastAPI backend.

```
analysis/
├── notebooks/   # Jupyter notebooks for EDA, experiments, visualizations
├── src/         # Reusable Python modules (data loading, feature prep, etc.)
└── requirements.txt
```

## Status

EDA (`01_eda.ipynb`), preprocessing pipeline (`02_preprocessing_features.ipynb`), and
model training (`03_model_training.ipynb`) are done — see each notebook for details.

## Known issue: XGBoost on macOS needs `libomp`

XGBoost's macOS wheel dynamically links against `libomp.dylib` (OpenMP), which Apple
doesn't ship and PyPI can't legally bundle. If `import xgboost` fails with
`Library not loaded: @rpath/libomp.dylib`, fix it one of two ways:

**Preferred, if you have Homebrew:**
```bash
brew install libomp
```

**No Homebrew available:** extract `libomp.dylib` from PyTorch's macOS wheel (it bundles
its own copy for this exact reason) and point XGBoost at it directly — no sudo needed,
since it only touches files inside this project's own `.venv`:
```bash
cd analysis
source .venv/bin/activate
pip download torch --no-deps -d /tmp/torch_dl
python3 -m zipfile -e /tmp/torch_dl/torch-*.whl /tmp/torch_dl/extracted/
XGB_LIB=".venv/lib/python3.13/site-packages/xgboost/lib"
cp /tmp/torch_dl/extracted/torch/lib/libomp.dylib "$XGB_LIB/libomp.dylib"
install_name_tool -change "@rpath/libomp.dylib" "@loader_path/libomp.dylib" "$XGB_LIB/libxgboost.dylib"
codesign --sign - --force "$XGB_LIB/libxgboost.dylib" "$XGB_LIB/libomp.dylib"
rm -rf /tmp/torch_dl
```

This patches the installed package inside `.venv/`, which is git-ignored — if the venv is
ever deleted and recreated, this fix needs to be reapplied (or use Homebrew instead).
