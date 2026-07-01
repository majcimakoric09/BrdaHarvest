import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Database, Grape, MapPin, TrendingUp, CalendarDays, CalendarRange, CloudSun, BarChart3, ArrowRight,
} from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import StatCard from '../components/StatCard.jsx'
import ChartCard from '../components/ChartCard.jsx'
import LoadingState from '../components/LoadingState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import Modal from '../components/Modal.jsx'
import { getDashboardSummary } from '../services/api.js'
import { LOCATION_COORDS } from '../data/locationCoords.js'

const HARVEST_COLORS = { Early: '#4C7A5B', Normal: '#B8935A', Late: '#7A2E3A' }

const CTA_LINKS = [
  {
    to: '/predict',
    icon: Grape,
    title: 'Start Harvest Prediction',
    description: 'Predict harvest timing, yield, and climate risk for a vineyard.',
  },
  {
    to: '/climate',
    icon: CloudSun,
    title: 'Explore Climate Trends',
    description: '34 years of temperature, rainfall, and harvest-timing history.',
  },
  {
    to: '/performance',
    icon: BarChart3,
    title: 'View Model Performance',
    description: 'Honest accuracy, error metrics, and feature importance.',
  },
]

function Chip({ title, subtitle }) {
  return (
    <div className="rounded-xl border border-brda-beige bg-brda-offwhite/60 px-3.5 py-2.5">
      <p className="text-sm font-medium text-brda-forest">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-brda-forest/60">{subtitle}</p>}
    </div>
  )
}

// Purely presentational, computed client-side from today's date -- not
// backend data, just calendar context for the "current season" line.
function getCurrentSeason() {
  const month = new Date().getMonth() // 0 = Jan
  if (month >= 2 && month <= 4) return { emoji: '🌱', label: 'Spring', detail: 'bud break and early canopy growth' }
  if (month >= 5 && month <= 7) return { emoji: '☀️', label: 'Summer', detail: 'growing season in full swing' }
  if (month >= 8 && month <= 9) return { emoji: '🍇', label: 'Harvest', detail: 'harvest season is underway' }
  return { emoji: '❄️', label: 'Dormant', detail: 'vines resting through winter' }
}

function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)
  const [openModal, setOpenModal] = useState(null) // null | 'varieties' | 'locations' | 'years'
  const season = getCurrentSeason()

  function loadSummary() {
    setError(null)
    setSummary(null)
    getDashboardSummary()
      .then(setSummary)
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    loadSummary()
  }, [])

  return (
    <div className="w-full">
      <section className="rounded-2xl bg-gradient-to-br from-brda-forest to-brda-forest-light p-6 text-brda-offwhite shadow-sm sm:p-10">
        <p className="text-xs font-medium uppercase tracking-widest text-brda-beige-light/70">Welcome back</p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">🍇 BrdaHarvest</h1>
        <p className="mt-1 font-display text-lg text-brda-beige-light">
          Forecasting Platform for Vineyard Management
        </p>
        <p className="mt-3 max-w-2xl text-brda-offwhite/80">
          Helping wineries in Goriška Brda predict harvest timing, estimate grape yield,
          and monitor climate risk — built on real vineyard history and live weather data.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm">
          <span>{season.emoji}</span>
          <span className="font-medium">{season.label} season</span>
          <span className="hidden text-brda-offwhite/70 sm:inline">— {season.detail}</span>
        </div>
      </section>

      {error && <div className="mt-6"><ErrorState message={`Couldn't load dashboard data: ${error}`} onRetry={loadSummary} /></div>}
      {!summary && !error && <div className="mt-6"><LoadingState label="Loading dataset overview…" /></div>}

      {summary && (
        <>
          <div className="mt-8 grid w-full gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            <StatCard icon={Database} label="Vineyard Records" value={summary.total_records.toLocaleString()} />
            <StatCard
              icon={Grape}
              label="Grape Varieties"
              value={summary.grape_varieties}
              sublabel="Tap to view all"
              onClick={() => setOpenModal('varieties')}
            />
            <StatCard
              icon={MapPin}
              label="Locations"
              value={summary.locations}
              sublabel="Tap to view all"
              onClick={() => setOpenModal('locations')}
            />
            <StatCard
              icon={TrendingUp}
              label="Average Yield"
              value={`${summary.mean_yield_kg_ha.toLocaleString()} kg/ha`}
            />
            <StatCard icon={CalendarDays} label="Average Harvest Date" value={summary.mean_harvest_date} />
            <StatCard
              icon={CalendarRange}
              label="Years Covered"
              value={summary.years_covered}
              sublabel="Tap to view details"
              onClick={() => setOpenModal('years')}
            />
          </div>

          <h2 className="mt-10 font-display text-xl font-semibold text-brda-forest">Vineyard Insights</h2>
          <div className="mt-4 grid w-full grid-cols-1 gap-6 lg:[grid-template-columns:repeat(2,minmax(0,1fr))]">
            <ChartCard
              title="Harvest Timing Distribution"
              description="Share of records by harvest category, across all years and vineyards."
            >
              <div style={{ height: 300, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(summary.harvest_category_counts).map(([name, value]) => ({ name, value }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {Object.keys(summary.harvest_category_counts).map((name) => (
                        <Cell key={name} fill={HARVEST_COLORS[name]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Yield by Grape Variety"
              description="Mean yield (kg/ha) across all vineyards and years, by variety."
            >
              <div style={{ height: 300, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.yield_by_variety} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EFE6D2" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="grape_variety"
                      width={110}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(value) => [`${value.toLocaleString()} kg/ha`, 'Mean yield']} />
                    <Bar dataKey="mean_yield_kg_ha" fill="#4C7A5B" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <h2 className="mt-10 font-display text-xl font-semibold text-brda-forest">Get Started</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {CTA_LINKS.map(({ to, icon: Icon, title, description }) => (
              <Link
                key={to}
                to={to}
                className="group flex flex-col rounded-2xl border border-brda-beige bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brda-vine/30 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brda-beige-light to-brda-beige text-brda-vine">
                  <Icon size={20} />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-brda-forest">{title}</h3>
                <p className="mt-1 flex-1 text-sm text-brda-forest/60">{description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brda-vine">
                  Go <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>

          {openModal === 'varieties' && (
            <Modal
              title="Grape Varieties"
              description={`All ${summary.grape_varieties} varieties grown across the Goriška Brda vineyards in this dataset.`}
              onClose={() => setOpenModal(null)}
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {summary.variety_counts.map((v) => (
                  <Chip key={v.grape_variety} title={v.grape_variety} subtitle={`${v.count.toLocaleString()} records`} />
                ))}
              </div>
            </Modal>
          )}

          {openModal === 'locations' && (
            <Modal
              title="Vineyard Locations"
              description={`All ${summary.locations} villages in Goriška Brda represented in this dataset.`}
              onClose={() => setOpenModal(null)}
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {summary.location_counts.map((l) => {
                  const coords = LOCATION_COORDS[l.location]
                  return (
                    <Chip
                      key={l.location}
                      title={l.location}
                      subtitle={
                        coords
                          ? `${l.count.toLocaleString()} records · ${coords.lat.toFixed(4)}°N, ${coords.lon.toFixed(4)}°E`
                          : `${l.count.toLocaleString()} records`
                      }
                    />
                  )
                })}
              </div>
              <p className="mt-3 text-xs text-brda-forest/60">
                Coordinates are approximate village-center placements, not surveyed points.
                A map preview for each location is available on the Harvest Prediction page.
              </p>
            </Modal>
          )}

          {openModal === 'years' && (
            <Modal
              title="Years Covered"
              description="The full time range of vineyard records in this dataset."
              onClose={() => setOpenModal(null)}
            >
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-brda-forest/60">Earliest</p>
                  <p className="font-display text-3xl font-semibold text-brda-forest">{summary.year_min}</p>
                </div>
                <span className="text-2xl text-brda-forest/30">→</span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-brda-forest/60">Latest</p>
                  <p className="font-display text-3xl font-semibold text-brda-forest">{summary.year_max}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-brda-forest/70">
                That's {summary.year_max - summary.year_min + 1} growing seasons of vineyard records —
                harvest timing, yield, and weather-derived features — across all {summary.locations} locations
                and {summary.grape_varieties} grape varieties. This is the same historical range the
                prediction models were trained and evaluated on.
              </p>
            </Modal>
          )}
        </>
      )}
    </div>
  )
}

export default Dashboard
