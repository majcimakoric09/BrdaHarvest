from fastapi import APIRouter, HTTPException

from app.schemas.predict import PredictionRequest, PredictionResponse
from app.services import prediction

router = APIRouter()


@router.post("/predict", response_model=PredictionResponse)
def predict(payload: PredictionRequest) -> PredictionResponse:
    # Missing/invalid fields (wrong type, out-of-range, unknown grape
    # variety/soil type/location) never reach here — Pydantic rejects
    # those with a 422 automatically, based on the schema in
    # app/schemas/predict.py.
    try:
        result = prediction.predict(payload)
    except prediction.ModelsNotReadyError as exc:
        raise HTTPException(status_code=503, detail=f"Prediction models are not available: {exc}") from exc
    return PredictionResponse(**result)
