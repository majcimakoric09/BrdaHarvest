from pydantic import BaseModel


class YearlyClimateRecord(BaseModel):
    year: int
    avg_temperature_C: float
    annual_rainfall_mm: float
    growing_degree_days: float
    summer_heat_days: float
    spring_frost_days: float
    mean_yield_kg_ha: float
    harvest_early_count: int
    harvest_normal_count: int
    harvest_late_count: int


class ClimateTrends(BaseModel):
    records: list[YearlyClimateRecord]
