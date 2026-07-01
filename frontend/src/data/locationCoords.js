// Approximate village-center coordinates within Goriška Brda. These are
// reasonable best-effort placements based on the region's known layout, not
// surveyed exact points -- Dobrovo's is the one coordinate that matches the
// backend exactly (weather.py's DOBROVO_LATITUDE/LONGITUDE, the fixed point
// the app actually fetches weather for regardless of which location is
// selected on the Harvest Planner). Fixed, hardcoded, no geocoding API
// involved. Shared by HarvestPrediction.jsx (map preview) and Dashboard.jsx
// (Locations stat card modal).
export const LOCATION_COORDS = {
  Biljana: { lat: 45.95, lon: 13.575 },
  Cerovo: { lat: 45.915, lon: 13.605 },
  Dobrovo: { lat: 45.9436, lon: 13.5994 },
  Kozana: { lat: 45.96, lon: 13.58 },
  Medana: { lat: 45.928, lon: 13.585 },
  Neblo: { lat: 45.975, lon: 13.56 },
  'Vipolže': { lat: 45.952, lon: 13.61 },
  'Šmartno': { lat: 45.935, lon: 13.628 },
}
