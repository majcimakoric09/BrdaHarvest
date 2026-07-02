"""Daily/entertaining information for vineyard managers, shown on the
standalone Vineyard Intelligence page: weather alerts, seasonal tips,
wine/vineyard news, podcasts, EU industry insights, and events.

Everything here is either real live data (Open-Meteo forecast, real RSS
feeds from Decanter/VinePair/Wine Enthusiast/GuildSomm, OIV, and the EU
Commission's own press feed) or genuine general viticulture knowledge tied
to the real current calendar date -- nothing is invented per-request. Each piece
degrades independently and gracefully: if one external source fails or
doesn't exist, the others still render, and a clearly-labeled fallback is
shown instead of guessing.

Two sources were investigated and found NOT to have a usable public feed,
so they intentionally fall back rather than scrape or fabricate:
- Wine Business Monthly: no working RSS endpoint found (checked
  /news/rss/, /rss/, and the ?feed=rss query param -- the latter returns
  HTTP 200 but with the normal HTML page, not RSS).
- Goriška Brda tourism events (brda.si): the site's only RSS feed
  (/rss/rss.php) is a general "Novice" (news) feed, not structured event
  data, and its most recent item is over a year stale. No JSON/calendar
  endpoint was found on the dedicated /sl/dogodki/ events page either.
- An official "Decanter" podcast could not be reliably identified via the
  public iTunes Search API (the only close name match is an unrelated,
  Portuguese-language independent podcast) -- not included to avoid
  mislabeling it.
- Grape prices / wine export volumes: no free public API found for this
  specific region; Eurostat itself is intentionally not called live here,
  consistent with the rest of this project (see weather.py) -- it's an
  offline reporting source only.
"""

import html
import re
import xml.etree.ElementTree as ET
from datetime import date, datetime
from email.utils import parsedate_to_datetime

import requests

from app.services.weather import DOBROVO_LATITUDE, DOBROVO_LONGITUDE, FROST_DAY_THRESHOLD_C, HEAT_DAY_THRESHOLD_C

REQUEST_TIMEOUT_SECONDS = 6
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
HEAVY_RAIN_DAY_THRESHOLD_MM = 20.0

NEWS_FEEDS = [
    {"source": "Decanter", "url": "https://www.decanter.com/feed/"},
    {"source": "VinePair", "url": "https://vinepair.com/feed/"},
    {"source": "Wine Enthusiast", "url": "https://www.wineenthusiast.com/feed/"},
]
PODCAST_FEEDS = [
    {"name": "GuildSomm Podcast", "url": "https://guildsomm.libsyn.com/rss"},
    {"name": "Wine Enthusiast Podcast", "url": "https://wineenthusiastpodcast.libsyn.com/rss"},
]
# Decanter/VinePair/Wine Enthusiast are wine magazines, so almost everything
# in their feeds is already wine-adjacent -- the real problem is the minority
# of lifestyle/recipe/trivia filler (cocktail recipes, "N reasons to..."
# listicles, holiday tie-ins) mixed into otherwise genuine industry news.
# Blocklist that filler rather than requiring an include-list, which would
# risk rejecting real news that happens not to contain a guessed keyword.
NEWS_EXCLUDE_KEYWORDS = [
    "recipe", "cocktail", "jelly", "road trip", "birthday", "quiz", "gift guide",
    "reasons to", "history of", "trivia", "fun facts", "national wine day",
    "valentine", "mother's day", "father's day", "thanksgiving", "gift for",
]
EU_PRESS_FEED_URL = "https://ec.europa.eu/commission/presscorner/api/rss?type=IP"
# Broader than just "wine" -- Industry Insights covers agriculture policy,
# sustainability, and export/trade news too, per the four categories this
# section promises. Still a real filter over a real feed, not padding.
EU_INSIGHT_KEYWORDS = [
    "wine", "vineyard", "viticulture", "grape", "agricultur", "geographical indication", "PDO", "PGI",
    "sustainab", "export", "trade", "rural development", "farm", "climate",
]
# OIV (International Organisation of Vine and Wine) is the actual global
# authority on wine market/policy data -- unlike the EU Commission's general
# press feed (mostly foreign policy, rarely wine-related even filtered), the
# entire OIV feed is genuinely wine-industry content, so no keyword filter is
# needed here. Primary source for this section; the EU feed supplements it.
OIV_FEED_URL = "https://www.oiv.int/rss.xml"

BRDA_EVENTS_URL = "https://www.brda.si/sl/dogodki/"

_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html(text: str) -> str:
    """RSS descriptions often embed arbitrary, not-necessarily-well-formed
    HTML (unescaped &, unclosed tags) -- parsing that as XML to strip it
    (as an ET.fromstring round-trip would) throws on real-world feeds. A
    plain regex strip + entity-unescape is more robust for this."""
    return html.unescape(_TAG_RE.sub("", text)).strip()


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].rstrip(".,;: ") + "…"


# Four evergreen, genuine viticulture practice areas -- always shown, with
# the ones most relevant to the real current month flagged so the page can
# highlight them, rather than only ever showing a single rotating tip.
def _seasonal_tips(today: date) -> list[dict]:
    month = today.month
    is_spring = month in (3, 4, 5)
    is_summer = month in (6, 7, 8)
    is_harvest = month in (9, 10)
    is_dormant = month in (11, 12, 1, 2)

    if is_spring:
        seasonal_task = (
            "Watch overnight lows closely during bud break -- late spring frost is one of the "
            "biggest risks to yield this time of year. Frost protection (wind machines, sprinklers, "
            "or timing pruning to delay bud break) pays off most in the weeks right after budbreak."
        )
    elif is_summer:
        seasonal_task = (
            "Monitor irrigation after prolonged dry periods, especially during veraison. Vines "
            "under water stress in mid-summer can show reduced canopy function right when fruit "
            "needs it most."
        )
    elif is_harvest:
        seasonal_task = (
            "Line up picking crews, bins, and winery logistics well ahead of your target harvest "
            "window -- conditions and sugar levels can shift quickly in early autumn."
        )
    else:
        seasonal_task = (
            "Winter is the window for structural pruning and equipment maintenance ahead of next "
            "season. It's also a good time to review last year's yield and harvest-timing records."
        )

    return [
        {
            "category": "Seasonal Tasks",
            "tip": seasonal_task,
            "relevant_now": True,  # always tied directly to the real current month
        },
        {
            "category": "Canopy Management",
            "tip": (
                "Leaf removal around the fruit zone improves airflow and sun exposure, reducing "
                "disease pressure and helping ripening evenness -- but avoid over-exposing fruit on "
                "the hottest west-facing rows, where it raises sunburn risk instead of helping."
            ),
            "relevant_now": is_summer,
        },
        {
            "category": "Disease Prevention",
            "tip": (
                "Warm, humid conditions after rainfall are the highest-risk window for downy and "
                "powdery mildew. Scout vineyards within 48 hours of a rain event during the growing "
                "season, and keep preventative spray intervals consistent through veraison."
            ),
            "relevant_now": is_spring or is_summer,
        },
        {
            "category": "Harvest Preparation",
            "tip": (
                "Start tracking sugar and acid levels as veraison completes. Deciding on a picking "
                "date 2-3 weeks out, rather than reacting once fruit is ready, gives crews and "
                "storage time to be lined up properly."
            ),
            "relevant_now": is_harvest,
        },
    ]


def _weather(latitude: float = DOBROVO_LATITUDE, longitude: float = DOBROVO_LONGITUDE) -> dict:
    """Real short-term forecast for the given coordinates (Open-Meteo's
    forecast API, not the historical archive used elsewhere) -- simple
    threshold rules, same style as prediction.py's rule-based climate_risk
    heuristic, not ML. Defaults to Dobrovo for the main Vineyard
    Intelligence page load; the dedicated per-location weather endpoint
    (get_weather_for_location below) passes a different village's real
    coordinates so a user can monitor any of the villages, without
    re-fetching news/podcasts/etc. on every location change."""
    try:
        response = requests.get(
            FORECAST_URL,
            params={
                "latitude": latitude,
                "longitude": longitude,
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
                "forecast_days": 7,
                "timezone": "auto",
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        daily = response.json()["daily"]

        days = [
            {
                "date": daily["time"][i],
                "temp_max_c": daily["temperature_2m_max"][i],
                "temp_min_c": daily["temperature_2m_min"][i],
                "precipitation_mm": daily["precipitation_sum"][i],
            }
            for i in range(len(daily["time"]))
        ]

        heat_days = [d for d in days if d["temp_max_c"] >= HEAT_DAY_THRESHOLD_C]
        frost_nights = [d for d in days if d["temp_min_c"] < FROST_DAY_THRESHOLD_C]
        heavy_rain_days = [d for d in days if d["precipitation_mm"] >= HEAVY_RAIN_DAY_THRESHOLD_MM]

        warnings = {
            "heat": {
                "active": len(heat_days) > 0,
                "message": (
                    f"{len(heat_days)} day(s) forecast above {HEAT_DAY_THRESHOLD_C:.0f}°C -- monitor "
                    "vine water stress and consider adjusting irrigation."
                    if heat_days
                    else "No heat-stress days forecast in the next 7 days."
                ),
            },
            "rain": {
                "active": len(heavy_rain_days) > 0,
                "message": (
                    f"Heavy rainfall (≥{HEAVY_RAIN_DAY_THRESHOLD_MM:.0f}mm) forecast on "
                    f"{len(heavy_rain_days)} day(s) -- elevated disease pressure, scout vineyards "
                    "within 48 hours of the rain event."
                    if heavy_rain_days
                    else "No heavy rainfall days forecast in the next 7 days."
                ),
            },
            "frost": {
                "active": len(frost_nights) > 0,
                "message": (
                    f"Overnight temperatures forecast below freezing on {len(frost_nights)} "
                    "night(s) -- consider frost protection if vines are past bud break."
                    if frost_nights
                    else "No frost nights forecast in the next 7 days."
                ),
            },
        }

        return {
            "available": True,
            "today": days[0],
            "forecast": days,
            "warnings": warnings,
        }
    except Exception:
        return {
            "available": False,
            "today": None,
            "forecast": [],
            "warnings": None,
        }


def _parse_rss(source: str, url: str, limit: int, include_summary: bool = True) -> list[dict]:
    """include_summary=False skips using the feed's <description> as the
    summary -- some sites (OIV's Drupal site is one) put the full raw page
    layout in there (title repeated, CMS username, a date line) rather than
    a clean excerpt, which reads as broken/messy rather than a real
    summary. The title alone is still shown; this just avoids the noise."""
    try:
        response = requests.get(url, timeout=REQUEST_TIMEOUT_SECONDS, headers={"User-Agent": "BrdaHarvest/1.0"})
        response.raise_for_status()
        root = ET.fromstring(response.content)
        items = root.findall("./channel/item")[:limit]

        articles = []
        for item in items:
            title = _strip_html((item.findtext("title") or "").strip())
            link = (item.findtext("link") or "").strip()
            description = _strip_html((item.findtext("description") or "").strip()) if include_summary else ""
            pub_date_raw = item.findtext("pubDate")
            try:
                pub_date = parsedate_to_datetime(pub_date_raw) if pub_date_raw else None
            except (TypeError, ValueError):
                pub_date = None

            articles.append({
                "title": title,
                "summary": _truncate(description, 220),
                "source": source,
                "link": link,
                "published_at": pub_date.isoformat() if pub_date else None,
                "_sort_key": pub_date or datetime.min.replace(tzinfo=pub_date.tzinfo if pub_date else None),
            })
        return articles
    except Exception:
        return []


def _wine_news(limit: int = 6) -> list[dict]:
    all_articles = []
    for feed in NEWS_FEEDS:
        # Pull a larger pool than needed per feed, since the relevance
        # filter below removes some -- otherwise a feed with several
        # lifestyle pieces near the top would starve the result count even
        # though genuine news exists further down.
        all_articles.extend(_parse_rss(feed["source"], feed["url"], limit=limit * 3))

    relevant = [
        a for a in all_articles
        if not any(kw in (a["title"] + " " + a["summary"]).lower() for kw in NEWS_EXCLUDE_KEYWORDS)
    ]
    relevant.sort(key=lambda a: a["_sort_key"], reverse=True)
    for article in relevant:
        del article["_sort_key"]
    return relevant[:limit]


def _podcasts() -> list[dict]:
    results = []
    for feed in PODCAST_FEEDS:
        episodes = _parse_rss(feed["name"], feed["url"], limit=1)
        if not episodes:
            continue
        episode = episodes[0]
        results.append({
            "podcast_name": feed["name"],
            "episode_title": episode["title"],
            "description": episode["summary"],
            "link": episode["link"],
        })
    return results


def _industry_insights() -> dict:
    """OIV (International Organisation of Vine and Wine) is the real global
    authority on wine market/policy data, so its whole feed is genuinely
    on-topic -- used as the primary source here, no keyword filtering
    needed. Supplemented with EU Commission press releases filtered for
    agriculture/wine/sustainability/trade relevance (that feed is general
    EU press, not wine-specific, so most of it doesn't match -- only
    genuine matches are included, never padded with unrelated releases)."""
    oiv_items = _parse_rss("OIV", OIV_FEED_URL, limit=10, include_summary=False)

    eu_items = _parse_rss("European Commission", EU_PRESS_FEED_URL, limit=30)
    eu_relevant = [
        item for item in eu_items
        if any(kw.lower() in (item["title"] + " " + item["summary"]).lower() for kw in EU_INSIGHT_KEYWORDS)
    ]

    combined = oiv_items + eu_relevant
    combined.sort(key=lambda a: a["_sort_key"], reverse=True)
    combined = combined[:6]
    for item in combined:
        item.pop("_sort_key", None)

    return {
        "updates": combined,
        "updates_available": len(oiv_items) > 0 or len(eu_items) > 0,  # at least one feed reachable
        "grape_prices_available": False,
        "wine_exports_available": False,
        "note": (
            "No live public data source was found for regional grape prices or wine export volumes -- "
            "these figures aren't shown rather than estimated."
        ),
    }


def _events() -> dict:
    """The official Brda tourism site has no structured events feed (only a
    general, apparently-inactive news RSS) -- see module docstring. Honest
    fallback rather than scraping HTML or guessing at event dates."""
    return {
        "available": False,
        "message": "Events source unavailable automatically.",
        "link": BRDA_EVENTS_URL,
    }


def get_vineyard_intelligence() -> dict:
    today = date.today()
    return {
        "weather": _weather(),
        "tips": _seasonal_tips(today),
        "news": _wine_news(),
        "podcasts": _podcasts(),
        "industry_insights": _industry_insights(),
        "events": _events(),
    }


def get_weather_for_location(latitude: float, longitude: float) -> dict:
    """Real Open-Meteo forecast for an arbitrary vineyard location, used by
    the Weather Alerts location selector on the Vineyard Intelligence page.
    Coordinates come from the frontend's shared LOCATION_COORDS mapping --
    this endpoint is intentionally location-name-agnostic (just lat/lon),
    so it doesn't need its own copy of the village list."""
    return _weather(latitude, longitude)
