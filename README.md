# Goriška Brda Harvest Prediction App

University capstone project that predicts grape harvest timing and yield for
vineyards in the Goriška Brda wine region, using a dataset of ~2,176 vineyard
records (weather, grape variety, vineyard characteristics, harvest timing,
and yield).

The project is being built incrementally: this repository currently contains
only the project skeleton (folders, configuration, and placeholders). Data
analysis, model training, API logic, and UI screens will be added in later
phases.

## Tech Stack

| Layer            | Technology                          |
|------------------|--------------------------------------|
| Data analysis/ML | Python (pandas, scikit-learn, etc.)  |
| Backend API      | FastAPI                              |
| Frontend         | React (Vite + JavaScript)            |
| Frontend hosting | Vercel                               |
| Backend hosting  | Render                               |
| Reporting        | Quarto                               |

## Project Structure

```
maja_projekt/
├── analysis/   # Python EDA & model experimentation (notebooks + scripts)
├── backend/    # FastAPI application serving predictions
├── frontend/   # React (Vite) web app consumed by end users
├── data/       # Raw, processed, and external datasets
├── models/     # Trained/serialized ML model artifacts
├── reports/    # Quarto analysis/final report
├── slides/     # Capstone presentation slides
└── docs/       # Architecture notes, decisions, and other documentation
```

See the README inside each folder for details on what belongs there.

## Development Status

Phase 0 — project scaffolding only. No ML or React code yet.

## Getting Started

Setup instructions for each component (Python environment, FastAPI server,
Vite dev server) will be documented here once those components are built.

## Deployment

- **Frontend** → Vercel (see `frontend/vercel.json`)
- **Backend** → Render (see `backend/render.yaml`)

## License

TBD.
