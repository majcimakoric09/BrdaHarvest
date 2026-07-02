"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.climate import router as climate_router
from app.api.dashboard import router as dashboard_router
from app.api.eurostat import router as eurostat_router
from app.api.performance import router as performance_router
from app.api.predict import router as predict_router
from app.api.vineyard_intelligence import router as vineyard_intelligence_router
from app.services import prediction

app = FastAPI(
    title="Goriška Brda Harvest Prediction API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)
app.include_router(dashboard_router)
app.include_router(climate_router)
app.include_router(performance_router)
app.include_router(vineyard_intelligence_router)
app.include_router(eurostat_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "models_loaded": prediction.models_loaded()}
