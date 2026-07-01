import { useState } from 'react'
import ErrorState from '../components/ErrorState.jsx'
import Select from '../components/Select.jsx'
import { predictHarvest } from '../services/api.js'
import { LOCATION_COORDS } from '../data/locationCoords.js'

const GRAPE_VARIETIES = [
  'Cabernet Sauvignon', 'Chardonnay', 'Malvazija', 'Merlot',
  'Pinot Grigio', 'Pinot Noir', 'Rebula', 'Sauvignon Blanc',
]
const SOIL_TYPES = ['Clay', 'Clay-Loam', 'Loam', 'Marl', 'Marl-Loam', 'Sandy-Loam']
const LOCATIONS = ['Biljana', 'Cerovo', 'Dobrovo', 'Kozana', 'Medana', 'Neblo', 'Vipolže', 'Šmartno']

const RISK_COLORS = {
  Low: 'text-brda-vine bg-brda-vine/10',
  Medium: 'text-amber-700 bg-amber-100',
  High: 'text-brda-burgundy bg-brda-burgundy/10',
}

const initialForm = {
  grape_variety: GRAPE_VARIETIES[0],
  soil_type: SOIL_TYPES[0],
  location: LOCATIONS[0],
  elevation_m: 135,
  vine_age_years: 15,
  year: new Date().getFullYear(),
  vineyard_area_ha: 2.4,
}

const fieldClass =
  'block w-full rounded-lg border border-brda-beige bg-white px-3 py-2 text-brda-forest ' +
  'focus:border-brda-vine focus:outline-none focus:ring-2 focus:ring-brda-vine/30'
const labelClass = 'mb-1.5 block text-sm font-medium text-brda-forest/80'

function ResultCard({ emoji, title, children }) {
  return (
    <div className="rounded-2xl border border-brda-beige bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <h3 className="font-display text-base font-semibold text-brda-forest">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// CSS-only radial indicator (conic-gradient), no charting library needed
// for a single percentage.
function ConfidenceRing({ value }) {
  const pct = Math.round(value * 100)
  return (
    <div className="relative h-16 w-16 shrink-0">
      <div
        className="h-16 w-16 rounded-full"
        style={{ background: `conic-gradient(#4C7A5B ${pct * 3.6}deg, #EFE6D2 0deg)` }}
      />
      <div className="absolute inset-1.5 flex items-center justify-center rounded-full bg-white">
        <span className="font-display text-base font-semibold text-brda-forest">{pct}%</span>
      </div>
    </div>
  )
}

// Uses OpenStreetMap's own free embeddable map (openstreetmap.org/export) --
// no API key, no npm dependency, no Leaflet bundler/icon setup. The location
// list is a closed <select> (never free text), so interpolating it into the
// iframe URL has no injection surface.
// OpenStreetMap's embed only starts fetching map tiles once the iframe
// scrolls into the visible viewport (its own internal behavior, separate
// from the HTML `loading` attribute) -- normal and expected, since the map
// sits below the form and a real user scrolls to it naturally.
function LocationMap({ location }) {
  const coords = LOCATION_COORDS[location]
  if (!coords) return null

  const delta = 0.015
  const bbox = [coords.lon - delta, coords.lat - delta, coords.lon + delta, coords.lat + delta].join(',')
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${coords.lat},${coords.lon}`
  const isDobrovo = location === 'Dobrovo'

  return (
    <div className="rounded-2xl border border-brda-beige bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-semibold text-brda-forest">📍 {location}</h3>
          <p className="text-xs text-brda-forest/60">Goriška Brda, Slovenia</p>
        </div>
        <p className="whitespace-nowrap text-right text-xs text-brda-forest/60">
          {coords.lat.toFixed(4)}°N<br />{coords.lon.toFixed(4)}°E
        </p>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-brda-beige">
        <iframe title={`Map of ${location}`} src={src} className="h-44 w-full" />
      </div>

      <p className="mt-2 text-xs text-brda-forest/60">
        {isDobrovo
          ? 'Weather is fetched for Dobrovo — this is the exact point used, as the single representative location for the whole Goriška Brda region.'
          : 'Weather is fetched for Dobrovo (shown on the map when selected), used as a single representative point for the whole Goriška Brda region rather than per-village.'}
      </p>
    </div>
  )
}

// Groups the flat weather_inputs list from the backend into the named
// categories a winery manager thinks in terms of (Temperature, Rainfall,
// ...), each still showing its underlying field(s) with a live/default
// indicator per value.
const WEATHER_GROUPS = [
  { title: 'Temperature', emoji: '🌡️', features: ['avg_temperature_C', 'min_spring_temp_C'] },
  { title: 'Rainfall', emoji: '🌧️', features: ['winter_rainfall_mm', 'spring_rainfall_mm', 'summer_rainfall_mm', 'rainfall_deviation_mm'] },
  { title: 'Spring Frost Days', emoji: '❄️', features: ['spring_frost_days'] },
  { title: 'Summer Heat Days', emoji: '🔥', features: ['summer_heat_days'] },
  { title: 'Sunshine Hours', emoji: '☀️', features: ['sunshine_hours'] },
  { title: 'Soil Moisture', emoji: '🌱', features: ['soil_moisture_pct'] },
  { title: 'Humidity', emoji: '💧', features: ['humidity_pct'] },
]

function WeatherValue({ item, showLabel }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      {showLabel && <span className="text-brda-forest/60">{item.label}</span>}
      <span className="ml-auto flex items-center gap-1.5 font-medium text-brda-forest">
        {item.value.toLocaleString(undefined, { maximumFractionDigits: 1 })} {item.unit}
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${item.source === 'open-meteo' ? 'bg-brda-vine' : 'bg-brda-beige'}`}
          title={item.source === 'open-meteo' ? 'Live Open-Meteo data' : 'Training-data default'}
        />
      </span>
    </div>
  )
}

function WeatherInputsList({ inputs }) {
  const byFeature = Object.fromEntries(inputs.map((i) => [i.feature, i]))
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {WEATHER_GROUPS.map(({ title, emoji, features }) => {
        const items = features.map((f) => byFeature[f]).filter(Boolean)
        if (items.length === 0) return null
        return (
          <div key={title} className="rounded-lg border border-brda-beige/80 bg-brda-offwhite/60 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-brda-forest/60">
              <span className="text-sm">{emoji}</span> {title}
            </p>
            <div className="mt-1 space-y-1">
              {items.map((item) => (
                <WeatherValue key={item.feature} item={item} showLabel={items.length > 1} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function VineyardSummaryRow({ emoji, label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-brda-beige/60 py-2.5 text-sm last:border-b-0">
      <span className="flex items-center gap-2 text-brda-forest/60">
        <span>{emoji}</span> {label}
      </span>
      <span className="text-right font-medium text-brda-forest">{value}</span>
    </div>
  )
}

function HarvestPrediction() {
  const [form, setForm] = useState(initialForm)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await predictHarvest({
        grape_variety: form.grape_variety,
        soil_type: form.soil_type,
        location: form.location,
        elevation_m: Number(form.elevation_m),
        vine_age_years: Number(form.vine_age_years),
        year: Number(form.year),
      })
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-brda-forest">Harvest Prediction</h1>
      <p className="mt-2 max-w-2xl text-brda-forest/70">
        A decision-support tool for planning crews, storage, and sales — not a replacement
        for judgment. Weather is fetched automatically from Open-Meteo for Dobrovo based on
        the year you pick; if live data isn't available, typical seasonal conditions are
        used instead.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="space-y-6">
        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-2xl border border-brda-beige bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 font-display text-lg font-semibold text-brda-forest">Vineyard Details</h2>

          <Select label="Grape variety" name="grape_variety" value={form.grape_variety} onChange={handleChange} options={GRAPE_VARIETIES} />

          <div className="mt-4">
            <Select label="Soil type" name="soil_type" value={form.soil_type} onChange={handleChange} options={SOIL_TYPES} />
          </div>

          <div className="mt-4">
            <Select label="Harvest zone (location)" name="location" value={form.location} onChange={handleChange} options={LOCATIONS} />
          </div>

          <label className={`mt-4 ${labelClass}`}>
            Elevation (m)
            <input name="elevation_m" type="number" min={50} max={400} value={form.elevation_m} onChange={handleChange} required className={`mt-1.5 ${fieldClass}`} />
          </label>

          <label className={`mt-4 ${labelClass}`}>
            Vine age (years)
            <input name="vine_age_years" type="number" min={0} max={80} value={form.vine_age_years} onChange={handleChange} required className={`mt-1.5 ${fieldClass}`} />
          </label>

          <label className={`mt-4 ${labelClass}`}>
            Year
            <input name="year" type="number" min={1991} max={2035} value={form.year} onChange={handleChange} required className={`mt-1.5 ${fieldClass}`} />
          </label>

          <label className={`mt-4 ${labelClass}`}>
            Vineyard area (ha)
            <input name="vineyard_area_ha" type="number" min={0.1} max={100} step={0.1} value={form.vineyard_area_ha} onChange={handleChange} required className={`mt-1.5 ${fieldClass}`} />
          </label>
          <p className="mt-1 text-xs text-brda-forest/60">
            Used only for the total production estimate below — not sent to the model.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-gradient-to-r from-brda-vine to-brda-forest px-4 py-2.5 font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md hover:brightness-110 disabled:opacity-60"
          >
            {loading ? 'Predicting…' : 'Predict Harvest'}
          </button>

          {error && <div className="mt-4"><ErrorState message={error} /></div>}
        </form>

        <LocationMap location={form.location} />
        </div>

        <div>
          <h2 className="mb-4 font-display text-lg font-semibold text-brda-forest">Prediction Results</h2>

          {!result && !loading && (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-brda-beige bg-white/40 p-8 text-center">
              <span className="text-4xl">🍇</span>
              <h3 className="mt-3 font-display text-lg font-semibold text-brda-forest">Ready when you are</h3>
              <p className="mt-1 max-w-xs text-sm text-brda-forest/60">
                Fill in your vineyard details on the left and click Predict Harvest to see
                AI-powered predictions for timing, yield, and climate risk.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex h-full min-h-[360px] items-center justify-center rounded-2xl border border-brda-beige bg-white text-brda-forest/60">
              <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-brda-vine border-t-transparent" />
              Running the model and fetching weather…
            </div>
          )}

          {result && (() => {
            // Rounds the yield once and reuses that same rounded value
            // everywhere it's multiplied or displayed, so every figure
            // shown (the yield card, the total production card, the
            // summary report) is derived from the exact same number --
            // never silently drifting apart due to independent rounding.
            const roundedYield = Math.round(result.expected_yield_kg_ha)
            const vineyardAreaHa = Number(form.vineyard_area_ha)
            const totalProductionKg = Math.round(roundedYield * vineyardAreaHa)
            const weatherSourceLabel = result.weather_source === 'open-meteo' ? 'Live Open-Meteo data' : 'Training-data defaults'

            return (
            <div className="space-y-6">
              <div className="rounded-2xl border border-brda-beige bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold text-brda-forest">🍇 Vineyard Summary</h3>
                  <p className="text-xs text-brda-forest/60">Report generated for {form.year}</p>
                </div>
                <p className="mt-1 text-sm text-brda-forest/60">
                  A decision-support overview for this vineyard, based on the trained
                  prediction models and current weather data.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                  <div>
                    <VineyardSummaryRow emoji="📍" label="Location" value={form.location} />
                    <VineyardSummaryRow emoji="🍇" label="Variety" value={form.grape_variety} />
                    <VineyardSummaryRow emoji="🌿" label="Vineyard Area" value={`${vineyardAreaHa.toLocaleString()} ha`} />
                    <VineyardSummaryRow emoji="📅" label="Estimated Harvest Date" value={result.estimated_harvest_date} />
                  </div>
                  <div>
                    <VineyardSummaryRow emoji="🍷" label="Predicted Yield" value={`${roundedYield.toLocaleString()} kg/ha`} />
                    <VineyardSummaryRow emoji="🚜" label="Estimated Total Production" value={`${totalProductionKg.toLocaleString()} kg`} />
                    <VineyardSummaryRow emoji="⚠️" label="Climate Risk" value={result.climate_risk} />
                    <VineyardSummaryRow emoji="🌦️" label="Weather Source" value={weatherSourceLabel} />
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-brda-beige-light p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-brda-forest/60">Recommendation</p>
                  <p className="mt-1 flex items-start gap-2 text-sm text-brda-forest/80">
                    <span>💡</span>
                    <span className="italic">{result.business_recommendation}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ResultCard emoji="🍇" title="Harvest Timing">
                  <p className="font-display text-2xl font-semibold text-brda-forest">{result.harvest_category}</p>
                </ResultCard>

                <ResultCard emoji="🎯" title="Confidence">
                  <div className="flex items-center gap-3">
                    <ConfidenceRing value={result.classification_confidence} />
                    <p className="text-sm text-brda-forest/60">Model certainty for this prediction</p>
                  </div>
                </ResultCard>

                <ResultCard emoji="📅" title="Estimated Harvest Date">
                  <p className="font-display text-2xl font-semibold text-brda-forest">{result.estimated_harvest_date}</p>
                </ResultCard>

                <ResultCard emoji="🍷" title="Expected Yield">
                  <p className="font-display text-2xl font-semibold text-brda-forest">
                    {roundedYield.toLocaleString()} kg/ha
                  </p>
                </ResultCard>

                <ResultCard emoji="⚠️" title="Climate Risk">
                  <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${RISK_COLORS[result.climate_risk]}`}>
                    {result.climate_risk}
                  </span>
                  <p className="mt-2 text-sm text-brda-forest/70">{result.main_risk_factor}</p>
                </ResultCard>

                <ResultCard emoji="🌤️" title="Weather Source">
                  <p className="text-sm font-medium text-brda-forest">{weatherSourceLabel}</p>
                  <p className="mt-1 text-xs text-brda-forest/60">{result.weather_summary}</p>
                </ResultCard>

                <ResultCard emoji="🚜" title="Estimated Total Production">
                  <p className="font-display text-2xl font-semibold text-brda-forest">
                    {totalProductionKg.toLocaleString()} kg
                  </p>
                  <p className="mt-1 text-xs text-brda-forest/60">
                    {vineyardAreaHa.toLocaleString()} ha × {roundedYield.toLocaleString()} kg/ha
                  </p>
                </ResultCard>
              </div>

              <div className="rounded-2xl border border-brda-beige bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-brda-forest">
                    Why This Prediction?
                  </h3>
                  <span className="flex items-center gap-3 text-xs text-brda-forest/60">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brda-vine" /> Open-Meteo</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brda-beige" /> Default</span>
                  </span>
                </div>
                <p className="mb-3 text-sm text-brda-forest/60">
                  These are the most influential weather variables behind this prediction.
                  They're passed directly into the trained machine-learning pipeline and
                  influence both harvest timing and yield — not just displayed for reference.
                </p>
                <WeatherInputsList inputs={result.weather_inputs} />
              </div>
            </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

export default HarvestPrediction
