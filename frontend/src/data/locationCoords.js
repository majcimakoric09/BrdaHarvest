// Real village-center coordinates within Goriška Brda, looked up via
// OpenStreetMap's Nominatim geocoder (nominatim.openstreetmap.org) --
// not rough estimates. Two exceptions:
// - Dobrovo intentionally matches the backend exactly (weather.py's
//   DOBROVO_LATITUDE/LONGITUDE), the fixed point the app actually fetches
//   weather for regardless of which location is selected on the Harvest
//   Planner -- kept in sync with that on purpose, not re-geocoded.
// - Cerovo has no single village entry in OSM; the real place is split
//   into two hamlets, "Dolnje Cerovo" (45.9772, 13.5531) and "Gornje
//   Cerovo" (45.9826, 13.5638). The value below is their midpoint, used
//   as a single representative point for the dataset's "Cerovo" location.
// Fixed, hardcoded (looked up once, not a live geocoding call). Shared by
// HarvestPrediction.jsx (map preview) and Dashboard.jsx (Locations modal).
export const LOCATION_COORDS = {
  Biljana: { lat: 45.9972, lon: 13.5348 },
  Cerovo: { lat: 45.9799, lon: 13.5585 },
  Dobrovo: { lat: 45.9436, lon: 13.5994 },
  Kozana: { lat: 45.9921, lon: 13.5494 },
  Medana: { lat: 45.9851, lon: 13.5221 },
  Neblo: { lat: 46.0066, lon: 13.5000 },
  'Vipolže': { lat: 45.9752, lon: 13.5373 },
  'Šmartno': { lat: 46.0058, lon: 13.5557 },
}
