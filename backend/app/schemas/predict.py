from typing import Literal

from pydantic import BaseModel, Field

# Matches models/feature_metadata.json's categorical_options exactly.
# Kept as static Literals (not loaded at runtime) because FastAPI turns
# them into enum dropdowns in the auto-generated docs, and any request
# with a value outside these gets a clear 422 automatically.
GrapeVariety = Literal[
    "Cabernet Sauvignon",
    "Chardonnay",
    "Malvazija",
    "Merlot",
    "Pinot Grigio",
    "Pinot Noir",
    "Rebula",
    "Sauvignon Blanc",
]
SoilType = Literal["Clay", "Clay-Loam", "Loam", "Marl", "Marl-Loam", "Sandy-Loam"]
Location = Literal[
    "Biljana", "Cerovo", "Dobrovo", "Kozana", "Medana", "Neblo", "Vipolže", "Šmartno"
]
HarvestCategory = Literal["Early", "Normal", "Late"]
ClimateRisk = Literal["Low", "Medium", "High"]
WeatherSource = Literal["open-meteo", "training-defaults"]


class PredictionRequest(BaseModel):
    grape_variety: GrapeVariety
    soil_type: SoilType
    location: Location
    elevation_m: float = Field(ge=50, le=400)
    vine_age_years: float = Field(ge=0, le=80)
    year: int = Field(ge=1991, le=2035)


class WeatherInput(BaseModel):
    feature: str
    label: str
    value: float
    unit: str
    source: WeatherSource


class PredictionResponse(BaseModel):
    harvest_category: HarvestCategory
    classification_confidence: float
    estimated_harvest_date: str
    expected_yield_kg_ha: float
    climate_risk: ClimateRisk
    main_risk_factor: str
    business_recommendation: str
    weather_source: WeatherSource
    weather_summary: str
    weather_inputs: list[WeatherInput]
