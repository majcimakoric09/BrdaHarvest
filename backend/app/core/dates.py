"""Small shared date helper."""
from datetime import date, timedelta


def doy_to_date_string(year: int, day_of_year: float) -> str:
    """Converts a (possibly fractional, e.g. an average) day-of-year into an
    approximate calendar date string for the given year, e.g. "September 20".
    """
    d = date(year, 1, 1) + timedelta(days=round(day_of_year) - 1)
    return d.strftime("%B %d")
