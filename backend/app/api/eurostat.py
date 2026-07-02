from fastapi import APIRouter

from app.schemas.eurostat import RegionalComparison
from app.services import eurostat

router = APIRouter()


@router.get("/climate/regional-comparison", response_model=RegionalComparison)
def get_regional_comparison() -> RegionalComparison:
    return RegionalComparison(**eurostat.get_regional_comparison())
