from fastapi import APIRouter

from app.schemas.climate import ClimateTrends
from app.services import climate

router = APIRouter()


@router.get("/climate/trends", response_model=ClimateTrends)
def get_climate_trends() -> ClimateTrends:
    return ClimateTrends(records=climate.get_trends())
