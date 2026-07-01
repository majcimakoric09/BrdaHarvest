import { useState } from 'react'
import ErrorState from '../components/ErrorState.jsx'
import { predictHarvest } from '../services/api.js'

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
}

const fieldClass =
  'block w-full rounded-lg border border-brda-beige bg-white px-3 py-2 text-brda-forest ' +
  'focus:border-brda-vine focus:outline-none focus:ring-2 focus:ring-brda-vine/30'
const labelClass = 'mb-1.5 block text-sm font-medium text-brda-forest/80'

function ResultCard({ emoji, title, children }) {
  return (
    <div className="rounded-xl border border-brda-beige bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <h3 className="font-display text-base font-semibold text-brda-forest">{title}</h3>
      </div>
      {children}
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
        Weather is fetched automatically from Open-Meteo for Dobrovo based on the year you
        pick — no need to enter it manually. If live data isn't available (e.g. a future
        year, or Open-Meteo is unreachable), typical seasonal conditions are used instead.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-xl border border-brda-beige bg-white p-6 shadow-sm"
        >
          <label className={labelClass}>
            Grape variety
            <select name="grape_variety" value={form.grape_variety} onChange={handleChange} className={`mt-1.5 ${fieldClass}`}>
              {GRAPE_VARIETIES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>

          <label className={`mt-4 ${labelClass}`}>
            Soil type
            <select name="soil_type" value={form.soil_type} onChange={handleChange} className={`mt-1.5 ${fieldClass}`}>
              {SOIL_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>

          <label className={`mt-4 ${labelClass}`}>
            Harvest zone (location)
            <select name="location" value={form.location} onChange={handleChange} className={`mt-1.5 ${fieldClass}`}>
              {LOCATIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>

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

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-brda-vine px-4 py-2.5 font-medium text-white transition-colors hover:bg-brda-forest disabled:opacity-60"
          >
            {loading ? 'Predicting…' : 'Predict Harvest'}
          </button>

          {error && <div className="mt-4"><ErrorState message={error} /></div>}
        </form>

        <div>
          {!result && !loading && (
            <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-brda-beige text-brda-forest/50">
              Fill in the form and click Predict Harvest to see results.
            </div>
          )}

          {loading && (
            <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-brda-beige bg-white text-brda-forest/60">
              <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-brda-vine border-t-transparent" />
              Running the model and fetching weather…
            </div>
          )}

          {result && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ResultCard emoji="🍇" title="Harvest Timing">
                <p className="font-display text-2xl font-semibold text-brda-forest">{result.harvest_category}</p>
                <p className="text-sm text-brda-forest/60">
                  Confidence: {(result.classification_confidence * 100).toFixed(1)}%
                </p>
              </ResultCard>

              <ResultCard emoji="📅" title="Estimated Harvest Date">
                <p className="font-display text-2xl font-semibold text-brda-forest">{result.estimated_harvest_date}</p>
              </ResultCard>

              <ResultCard emoji="🍷" title="Expected Yield">
                <p className="font-display text-2xl font-semibold text-brda-forest">
                  {Math.round(result.expected_yield_kg_ha).toLocaleString()} kg/ha
                </p>
              </ResultCard>

              <ResultCard emoji="⚠️" title="Climate Risk">
                <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${RISK_COLORS[result.climate_risk]}`}>
                  {result.climate_risk}
                </span>
                <p className="mt-2 text-sm text-brda-forest/70">{result.main_risk_factor}</p>
              </ResultCard>

              <ResultCard emoji="🌤️" title="Weather Summary">
                <p className="text-sm font-medium text-brda-forest">
                  Source: {result.weather_source === 'open-meteo' ? 'Live Open-Meteo data' : 'Training-data defaults'}
                </p>
                <p className="mt-1 text-sm text-brda-forest/70">{result.weather_summary}</p>
              </ResultCard>

              <div className="rounded-xl border border-brda-beige bg-brda-beige-light p-5 shadow-sm sm:col-span-2">
                <h3 className="font-display text-base font-semibold text-brda-forest">Business Recommendation</h3>
                <p className="mt-1 italic text-brda-forest/80">{result.business_recommendation}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HarvestPrediction
