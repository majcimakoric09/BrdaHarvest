from pydantic import BaseModel


class DailyForecast(BaseModel):
    date: str
    temp_max_c: float
    temp_min_c: float
    precipitation_mm: float


class WeatherWarning(BaseModel):
    active: bool
    message: str


class WeatherWarnings(BaseModel):
    heat: WeatherWarning
    rain: WeatherWarning
    frost: WeatherWarning


class WeatherOutlook(BaseModel):
    available: bool
    today: DailyForecast | None
    forecast: list[DailyForecast]
    warnings: WeatherWarnings | None


class SeasonalTip(BaseModel):
    category: str
    tip: str
    relevant_now: bool


class NewsArticle(BaseModel):
    title: str
    summary: str
    source: str
    link: str
    published_at: str | None


class PodcastRecommendation(BaseModel):
    podcast_name: str
    episode_title: str
    description: str
    link: str


class IndustryInsights(BaseModel):
    updates: list[NewsArticle]
    updates_available: bool
    grape_prices_available: bool
    wine_exports_available: bool
    note: str


class EventsInfo(BaseModel):
    available: bool
    message: str
    link: str


class VineyardIntelligence(BaseModel):
    weather: WeatherOutlook
    tips: list[SeasonalTip]
    news: list[NewsArticle]
    podcasts: list[PodcastRecommendation]
    industry_insights: IndustryInsights
    events: EventsInfo
