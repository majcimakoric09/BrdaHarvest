from pydantic import BaseModel


class HarvestCategoryCounts(BaseModel):
    Early: int
    Normal: int
    Late: int


class YieldHistogramBin(BaseModel):
    range_start: float
    range_end: float
    count: int


class VarietyCount(BaseModel):
    grape_variety: str
    count: int


class YieldByVariety(BaseModel):
    grape_variety: str
    mean_yield_kg_ha: float


class DashboardSummary(BaseModel):
    total_records: int
    grape_varieties: int
    soil_types: int
    locations: int
    year_min: int
    year_max: int
    years_covered: str
    mean_yield_kg_ha: float
    mean_harvest_date: str
    harvest_category_counts: HarvestCategoryCounts
    yield_histogram: list[YieldHistogramBin]
    variety_counts: list[VarietyCount]
    yield_by_variety: list[YieldByVariety]
