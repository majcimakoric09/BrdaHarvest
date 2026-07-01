from fastapi import APIRouter

from app.schemas.dashboard import DashboardSummary
from app.services import dashboard

router = APIRouter()


@router.get("/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary() -> DashboardSummary:
    return DashboardSummary(**dashboard.get_summary())
