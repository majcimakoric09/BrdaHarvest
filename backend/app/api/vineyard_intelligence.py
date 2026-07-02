from fastapi import APIRouter, Query

from app.schemas.vineyard_intelligence import VineyardIntelligence, WeatherOutlook
from app.services import vineyard_intelligence

router = APIRouter()


@router.get("/vineyard-intelligence", response_model=VineyardIntelligence)
def get_vineyard_intelligence() -> VineyardIntelligence:
    return VineyardIntelligence(**vineyard_intelligence.get_vineyard_intelligence())


@router.get("/vineyard-intelligence/weather", response_model=WeatherOutlook)
def get_weather_for_location(
    lat: float = Query(..., ge=44.0, le=47.5, description="Latitude, Goriška Brda area"),
    lon: float = Query(..., ge=12.5, le=14.5, description="Longitude, Goriška Brda area"),
) -> WeatherOutlook:
    """Powers the Weather Alerts location selector -- refetches only the
    weather block for the selected village's real coordinates, without
    re-fetching the rest of the Vineyard Intelligence page (news, podcasts,
    etc.), which don't depend on which village is selected."""
    return WeatherOutlook(**vineyard_intelligence.get_weather_for_location(lat, lon))
