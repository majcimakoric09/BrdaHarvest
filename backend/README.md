# backend/

FastAPI application that will serve harvest-timing and yield predictions
to the React frontend, once a trained model exists in `models/`.

```
backend/
├── app/
│   ├── main.py       # FastAPI app instance + entry point
│   ├── api/          # Route modules (e.g. /predict, /health)
│   ├── core/         # Settings, config, shared utilities
│   ├── schemas/       # Pydantic request/response models
│   └── services/      # Business logic (incl. loading & calling the ML model)
├── tests/             # Backend tests
├── requirements.txt
├── .env.example
└── render.yaml        # Render deployment config
```

## Status

Skeleton app only (`/health` endpoint). No prediction logic yet.

## Local development (once dependencies are added)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Deployment

Deployed to [Render](https://render.com) using `render.yaml`.
