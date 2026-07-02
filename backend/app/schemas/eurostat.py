from pydantic import BaseModel


class Region(BaseModel):
    code: str
    name: str


class GrapeAreaPoint(BaseModel):
    year: int
    region: str
    region_code: str
    area_thousand_ha: float


class VineyardCensusPoint(BaseModel):
    region: str
    region_code: str
    year: int
    area_ha: float | None
    holdings: float | None


class RegionalComparison(BaseModel):
    regions: list[Region]
    grape_area_trend: list[GrapeAreaPoint]
    vineyard_census: list[VineyardCensusPoint]
    source_note: str
