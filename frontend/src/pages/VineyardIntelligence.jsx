import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import LoadingState from '../components/LoadingState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import Select from '../components/Select.jsx'
import { LOCATION_COORDS } from '../data/locationCoords.js'
import { getVineyardIntelligence, getWeatherForLocation } from '../services/api.js'

// This is the app's second, independent use of the shared village list --
// intentionally not the same 8 locations as the Harvest Prediction form's
// LOCATIONS (which must exactly match the trained model's categorical
// options and can't change). This selector is purely for monitoring live
// weather, so it can (and does, per spec) include Gonjače instead of
// Cerovo. All coordinates still come from the one shared LOCATION_COORDS
// mapping -- nothing duplicated.
const WEATHER_LOCATIONS = ['Biljana', 'Dobrovo', 'Medana', 'Šmartno', 'Kozana', 'Vipolže', 'Gonjače', 'Neblo']

function Card({ emoji, title, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-brda-beige bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md ${className}`}>
      {title && (
        <div className="mb-2 flex items-center gap-2">
          {emoji && <span className="text-xl">{emoji}</span>}
          <h3 className="font-display text-base font-semibold text-brda-forest">{title}</h3>
        </div>
      )}
      {children}
    </div>
  )
}

const DAY_LABEL = new Intl.DateTimeFormat(undefined, { weekday: 'short' })

function ForecastDay({ day, isToday }) {
  const label = isToday ? 'Today' : DAY_LABEL.format(new Date(`${day.date}T00:00:00`))
  return (
    <div className={`flex min-w-[84px] flex-col items-center rounded-xl border p-3 text-center ${isToday ? 'border-brda-vine bg-brda-vine/5' : 'border-brda-beige bg-brda-offwhite/60'}`}>
      <p className="text-xs font-medium text-brda-forest/60">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold text-brda-forest">{Math.round(day.temp_max_c)}°</p>
      <p className="text-xs text-brda-forest/60">{Math.round(day.temp_min_c)}°</p>
      {day.precipitation_mm > 0 && (
        <p className="mt-1 text-xs text-brda-vine">💧 {day.precipitation_mm.toFixed(1)}mm</p>
      )}
    </div>
  )
}

function WarningPill({ label, warning }) {
  return (
    <div className={`rounded-xl border p-3 ${warning.active ? 'border-amber-300 bg-amber-50' : 'border-brda-beige bg-brda-offwhite/60'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${warning.active ? 'text-amber-700' : 'text-brda-forest/60'}`}>
        {label} {warning.active ? '— Active' : ''}
      </p>
      <p className="mt-1 text-sm text-brda-forest/70">{warning.message}</p>
    </div>
  )
}

function ArticleCard({ article }) {
  return (
    <div className="flex flex-col rounded-2xl border border-brda-beige bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <span className="text-xs font-medium uppercase tracking-wide text-brda-vine">{article.source}</span>
      <h4 className="mt-1 font-display text-sm font-semibold leading-snug text-brda-forest">{article.title}</h4>
      {article.summary && <p className="mt-2 flex-1 text-xs text-brda-forest/60">{article.summary}</p>}
      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brda-vine hover:underline"
      >
        Read more →
      </a>
    </div>
  )
}

function VineyardIntelligence() {
  const [intel, setIntel] = useState(null)
  const [error, setError] = useState(null)

  // Weather is tracked separately from the rest of `intel` so changing the
  // forecast location only refetches the weather block (Open-Meteo), not
  // the news/podcasts/tips/events sections, which don't depend on it.
  const [weatherLocation, setWeatherLocation] = useState('Dobrovo')
  const [weather, setWeather] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  function load() {
    setError(null)
    setIntel(null)
    getVineyardIntelligence()
      .then((data) => {
        setIntel(data)
        setWeather(data.weather) // Dobrovo, from the initial page load -- no extra fetch needed
      })
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    load()
  }, [])

  function handleLocationChange(event) {
    const location = event.target.value
    setWeatherLocation(location)
    setWeatherLoading(true)
    const { lat, lon } = LOCATION_COORDS[location]
    getWeatherForLocation(lat, lon)
      .then(setWeather)
      .catch(() => setWeather({ available: false, today: null, forecast: [], warnings: null }))
      .finally(() => setWeatherLoading(false))
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-brda-forest">🍇 Vineyard Intelligence</h1>
      <p className="mt-2 max-w-2xl text-brda-forest/70">
        Daily context for vineyard managers — live weather, seasonal guidance, wine industry news,
        podcasts, EU industry insights, and local events.
      </p>

      {error && <div className="mt-6"><ErrorState message={`Couldn't load vineyard intelligence: ${error}`} onRetry={load} /></div>}
      {!intel && !error && <div className="mt-6"><LoadingState label="Loading vineyard intelligence…" /></div>}

      {intel && (
        <div className="mt-6 space-y-10">
          {/* Weather Alerts */}
          <section>
            <h2 className="font-display text-xl font-semibold text-brda-forest">🌦️ Weather Alerts</h2>
            <p className="text-sm text-brda-forest/60">Live 7-day forecast, by vineyard location.</p>

            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-brda-beige bg-brda-offwhite/60 p-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full sm:max-w-xs">
                <Select
                  label="Forecast location"
                  name="weather_location"
                  value={weatherLocation}
                  onChange={handleLocationChange}
                  options={WEATHER_LOCATIONS}
                />
              </div>
              <p className="flex items-center gap-1.5 text-sm text-brda-forest/70">
                {weatherLoading ? (
                  <span className="flex items-center gap-1.5 text-brda-forest/50">
                    <Loader2 size={14} className="animate-spin" /> Updating forecast…
                  </span>
                ) : (
                  <>📍 Currently viewing: <span className="font-medium text-brda-forest">{weatherLocation}, Goriška Brda</span></>
                )}
              </p>
            </div>

            {weather && (
              <div className={`transition-opacity duration-200 ${weatherLoading ? 'opacity-50' : 'opacity-100'}`}>
                {weather.available ? (
                  <div className="mt-4 space-y-4">
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {weather.forecast.map((day, i) => (
                        <ForecastDay key={day.date} day={day} isToday={i === 0} />
                      ))}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <WarningPill label="🔥 Heat" warning={weather.warnings.heat} />
                      <WarningPill label="🌧️ Rain" warning={weather.warnings.rain} />
                      <WarningPill label="❄️ Frost" warning={weather.warnings.frost} />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4"><ErrorState message={`Live forecast for ${weatherLocation} is temporarily unavailable.`} /></div>
                )}
              </div>
            )}
          </section>

          {/* Seasonal Tips */}
          <section>
            <h2 className="font-display text-xl font-semibold text-brda-forest">🌱 Seasonal Vineyard Tips</h2>
            <p className="text-sm text-brda-forest/60">General viticulture guidance — highlighted tips are most relevant this month.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {intel.tips.map((tip) => (
                <Card
                  key={tip.category}
                  className={tip.relevant_now ? 'border-brda-vine/40 bg-brda-vine/5' : ''}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base font-semibold text-brda-forest">{tip.category}</h3>
                    {tip.relevant_now && (
                      <span className="rounded-full bg-brda-vine px-2.5 py-0.5 text-xs font-medium text-white">
                        Relevant now
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-brda-forest/70">{tip.tip}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* News */}
          <section>
            <h2 className="font-display text-xl font-semibold text-brda-forest">📰 Latest Wine Industry News</h2>
            <p className="text-sm text-brda-forest/60">Live from Decanter, VinePair, and Wine Enthusiast.</p>
            {intel.news.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {intel.news.map((article) => <ArticleCard key={article.link} article={article} />)}
              </div>
            ) : (
              <p className="mt-4 text-sm text-brda-forest/60">News is temporarily unavailable.</p>
            )}
          </section>

          {/* Podcasts */}
          <section>
            <h2 className="font-display text-xl font-semibold text-brda-forest">🎙️ Podcasts</h2>
            <p className="text-sm text-brda-forest/60">Latest episodes from GuildSomm and Wine Enthusiast.</p>
            {intel.podcasts.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {intel.podcasts.map((podcast) => (
                  <Card key={podcast.link} emoji="🎙️" title={podcast.podcast_name}>
                    <h4 className="font-display text-sm font-semibold text-brda-forest">{podcast.episode_title}</h4>
                    <p className="mt-2 text-sm text-brda-forest/70">{podcast.description}</p>
                    <a
                      href={podcast.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brda-vine hover:underline"
                    >
                      Listen to this episode →
                    </a>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-brda-forest/60">Podcasts are temporarily unavailable.</p>
            )}
          </section>

          {/* Industry Insights */}
          <section>
            <h2 className="font-display text-xl font-semibold text-brda-forest">📊 Industry Insights</h2>
            <p className="text-sm text-brda-forest/60">
              Wine policy, sustainability, and trade news from OIV (International Organisation of
              Vine and Wine) and the European Commission's press feed.
            </p>

            {intel.industry_insights.updates.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {intel.industry_insights.updates.map((article) => <ArticleCard key={article.link} article={article} />)}
              </div>
            ) : (
              <p className="mt-4 text-sm text-brda-forest/60">
                {intel.industry_insights.updates_available
                  ? 'No recent wine policy or agriculture updates found.'
                  : 'Industry news feeds are temporarily unavailable.'}
              </p>
            )}

            <div className="mt-4 rounded-xl border border-brda-beige bg-brda-offwhite/60 px-5 py-4 text-sm text-brda-forest/60">
              {intel.industry_insights.note}
            </div>
          </section>

          {/* Events */}
          <section>
            <h2 className="font-display text-xl font-semibold text-brda-forest">📅 Upcoming Events</h2>
            <p className="text-sm text-brda-forest/60">Goriška Brda tourism and wine events.</p>

            {intel.events.available ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Structured event data would render here if a public feed existed. */}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-brda-beige bg-white/40 p-8 text-center">
                <span className="text-3xl">📅</span>
                <p className="mt-2 text-sm text-brda-forest/60">{intel.events.message}</p>
                <a
                  href={intel.events.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brda-vine to-brda-forest px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md hover:brightness-110"
                >
                  View Official Brda Events Calendar →
                </a>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default VineyardIntelligence
