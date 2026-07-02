"""Regional comparison for the Climate Trends page: Goriška Brda's home
region against Friuli-Venezia Giulia, the Italian wine region it directly
borders (Collio/Brda is one contiguous wine-growing area split by the
Slovenia-Italy border).

Real data from Eurostat's public REST API (no key required) -- this is a
deliberate exception to this project's usual "Eurostat is offline-only"
rule (see weather.py), because that rule was specifically about the live
/predict request path never depending on it. This is a separate,
non-critical comparison feature: if Eurostat is unreachable, this section
degrades gracefully and the rest of the app is unaffected.

Two real limitations, stated honestly rather than worked around:
- Eurostat only publishes agricultural statistics for Slovenia down to
  NUTS2 level (SI04, "Zahodna Slovenija" / Western Slovenia) -- there is
  no NUTS3 breakdown for the "Goriška" statistical region specifically
  that actually contains Goriška Brda. SI04 is the closest real
  comparison available, and is labelled as such rather than implying a
  more precise match.
- The vineyard census dataset (vit_t1) is only published every ~5 years
  (2015, 2020 are the only two points with data for these regions), unlike
  the annual crop-area series (apro_cpshr).
"""

import requests

EUROSTAT_API_BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data"
REQUEST_TIMEOUT_SECONDS = 10

REGIONS = {
    "SI04": "Zahodna Slovenija (West Slovenia, incl. Goriška Brda)",
    "ITH4": "Friuli-Venezia Giulia, Italy",
}


def _decode_jsonstat(payload: dict) -> list[dict]:
    """Eurostat's API returns SDMX-JSON (JSON-stat), which encodes the
    value array by a single flat index computed from each dimension's
    category position -- this reverses that back into one row per
    (dimension...) combination actually present in the response."""
    dims = payload["id"]
    sizes = payload["size"]
    dim_indexes = [payload["dimension"][d]["category"]["index"] for d in dims]
    dim_reverse = [{v: k for k, v in idx.items()} for idx in dim_indexes]

    rows = []
    for flat_str, value in payload["value"].items():
        flat = int(flat_str)
        coords = []
        remaining = flat
        for size in reversed(sizes):
            coords.append(remaining % size)
            remaining //= size
        coords.reverse()

        row = {dims[i]: dim_reverse[i][coords[i]] for i in range(len(dims))}
        row["value"] = value
        rows.append(row)
    return rows


def _fetch_jsonstat(dataset: str, params: dict) -> dict | None:
    try:
        response = requests.get(
            f"{EUROSTAT_API_BASE}/{dataset}",
            params={**params, "format": "JSON", "lang": "en"},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return response.json()
    except Exception:
        return None


def _grape_area_trend() -> list[dict]:
    """Annual grape-growing area (thousand ha), both regions -- apro_cpshr,
    "Main area" for the Grapes (W1000) crop code, 2000-2024 series."""
    payload = _fetch_jsonstat(
        "apro_cpshr",
        {"geo": list(REGIONS.keys()), "crops": "W1000", "strucpro": "MAR_THS_HA"},
    )
    if payload is None:
        return []

    rows = _decode_jsonstat(payload)
    return sorted(
        (
            {
                "year": int(row["time"]),
                "region": REGIONS[row["geo"]],
                "region_code": row["geo"],
                "area_thousand_ha": row["value"],
            }
            for row in rows
            if row["value"] is not None
        ),
        key=lambda r: (r["year"], r["region_code"]),
    )


def _vineyard_census_snapshot() -> list[dict]:
    """5-yearly vineyard census (vit_t1): total area under vines and
    number of wine-grower holdings, both regions, for whichever census
    years actually have data (2015 and 2020, as of when this was written)."""
    payload = _fetch_jsonstat(
        "vit_t1",
        {"geo": list(REGIONS.keys()), "vinetype": "TOTAL", "unit": ["HA", "HLD"]},
    )
    if payload is None:
        return []

    rows = _decode_jsonstat(payload)
    by_key: dict[tuple, dict] = {}
    for row in rows:
        if row["value"] is None:
            continue
        key = (row["geo"], row["time"])
        entry = by_key.setdefault(key, {
            "region": REGIONS[row["geo"]],
            "region_code": row["geo"],
            "year": int(row["time"]),
            "area_ha": None,
            "holdings": None,
        })
        if row["unit"] == "HA":
            entry["area_ha"] = row["value"]
        elif row["unit"] == "HLD":
            entry["holdings"] = row["value"]

    return sorted(by_key.values(), key=lambda r: (r["year"], r["region_code"]))


def get_regional_comparison() -> dict:
    return {
        "regions": [{"code": code, "name": name} for code, name in REGIONS.items()],
        "grape_area_trend": _grape_area_trend(),
        "vineyard_census": _vineyard_census_snapshot(),
        "source_note": (
            "Eurostat (ec.europa.eu/eurostat), NUTS2 regional level. Western Slovenia "
            "(SI04) is the finest region Eurostat publishes agricultural statistics for "
            "in Slovenia -- there's no separate breakdown for the Goriška statistical "
            "region specifically."
        ),
    }
