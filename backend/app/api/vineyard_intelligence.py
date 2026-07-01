from fastapi import APIRouter

from app.schemas.vineyard_intelligence import VineyardIntelligence
from app.services import vineyard_intelligence

router = APIRouter()


@router.get("/vineyard-intelligence", response_model=VineyardIntelligence)
def get_vineyard_intelligence() -> VineyardIntelligence:
    return VineyardIntelligence(**vineyard_intelligence.get_vineyard_intelligence())
