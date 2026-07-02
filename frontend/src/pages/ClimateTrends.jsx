import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import ChartCard from '../components/ChartCard.jsx'
import LoadingState from '../components/LoadingState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import { getClimateTrends, getRegionalComparison } from '../services/api.js'

const REGION_COLORS = { SI04: '#4C7A5B', ITH4: '#7A2E3A' }

const HARVEST_COLORS = { Early: '#4C7A5B', Normal: '#B8935A', Late: '#7A2E3A' }
const YEAR_TICK_INTERVAL = 4 // show every 5th year label across the 34-year range

// Explicit height wrapper is required so ResponsiveContainer has a stable
// box to measure against (see Dashboard.jsx / ChartCard.jsx notes) --
// min-w-0 on ChartCard's own root already guards the grid-overflow case.
function Chart({ children }) {
  return (
    <div style={{ height: 280, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}

function ClimateTrends() {
  const [trends, setTrends] = useState(null)
  const [error, setError] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [comparisonError, setComparisonError] = useState(null)

  function loadTrends() {
    setError(null)
    setTrends(null)
    getClimateTrends()
      .then((data) => setTrends(data.records))
      .catch((err) => setError(err.message))
  }

  function loadComparison() {
    setComparisonError(null)
    setComparison(null)
    getRegionalComparison()
      .then(setComparison)
      .catch((err) => setComparisonError(err.message))
  }

  useEffect(() => {
    loadTrends()
    // Independent from the main trends fetch -- hits Eurostat's live API,
    // so a slow or unreachable Eurostat shouldn't block the core
    // dataset-backed charts above from rendering.
    loadComparison()
  }, [])

  const comparisonChartData = comparison
    ? Object.values(
        comparison.grape_area_trend.reduce((acc, point) => {
          acc[point.year] = acc[point.year] || { year: point.year }
          acc[point.year][point.region_code] = point.area_thousand_ha
          return acc
        }, {})
      ).sort((a, b) => a.year - b.year)
    : []

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-brda-forest">Climate Trends</h1>
      <p className="mt-2 max-w-2xl text-brda-forest/70">
        Yearly averages across all 8 locations and 8 grape varieties, 1991–2024 — the same
        historical dataset the models were trained on.
      </p>

      {error && <div className="mt-6"><ErrorState message={`Couldn't load climate trends: ${error}`} onRetry={loadTrends} /></div>}
      {!trends && !error && <div className="mt-6"><LoadingState label="Loading climate history…" /></div>}

      {trends && (
        <div className="mt-6 grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Temperature Trend" description="Mean growing-season temperature by year (°C).">
            <Chart>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFE6D2" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} interval={YEAR_TICK_INTERVAL} />
                <YAxis tick={{ fontSize: 12 }} unit="°C" width={45} />
                <Tooltip />
                <Line type="monotone" dataKey="avg_temperature_C" name="Avg temperature" stroke="#7A2E3A" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </Chart>
          </ChartCard>

          <ChartCard title="Rainfall Trend" description="Total annual rainfall by year (mm).">
            <Chart>
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFE6D2" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} interval={YEAR_TICK_INTERVAL} />
                <YAxis tick={{ fontSize: 12 }} width={45} />
                <Tooltip />
                <Area type="monotone" dataKey="annual_rainfall_mm" name="Annual rainfall (mm)" stroke="#4C7A5B" fill="#4C7A5B" fillOpacity={0.25} isAnimationActive={false} />
              </AreaChart>
            </Chart>
          </ChartCard>

          <ChartCard title="Summer Heat Days" description="Days per year with maximum temperature above the heat threshold.">
            <Chart>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFE6D2" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} interval={YEAR_TICK_INTERVAL} />
                <YAxis tick={{ fontSize: 12 }} width={35} />
                <Tooltip />
                <Bar dataKey="summer_heat_days" name="Heat days" fill="#B8935A" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </Chart>
          </ChartCard>

          <ChartCard title="Spring Frost Days" description="Days per year with minimum temperature below freezing in spring.">
            <Chart>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFE6D2" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} interval={YEAR_TICK_INTERVAL} />
                <YAxis tick={{ fontSize: 12 }} width={35} />
                <Tooltip />
                <Bar dataKey="spring_frost_days" name="Frost days" fill="#1F3329" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </Chart>
          </ChartCard>

          <ChartCard title="Mean Yield by Year" description="Average yield (kg/ha) across all vineyards, by year.">
            <Chart>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFE6D2" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} interval={YEAR_TICK_INTERVAL} />
                <YAxis tick={{ fontSize: 12 }} width={55} />
                <Tooltip formatter={(value) => [`${value.toLocaleString()} kg/ha`, 'Mean yield']} />
                <Line type="monotone" dataKey="mean_yield_kg_ha" name="Mean yield" stroke="#4C7A5B" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </Chart>
          </ChartCard>

          <ChartCard title="Harvest Timing Trend" description="Early / Normal / Late harvest counts by year, across all vineyards.">
            <Chart>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFE6D2" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} interval={YEAR_TICK_INTERVAL} />
                <YAxis tick={{ fontSize: 12 }} width={35} />
                <Tooltip />
                <Legend />
                <Bar dataKey="harvest_early_count" name="Early" stackId="harvest" fill={HARVEST_COLORS.Early} isAnimationActive={false} />
                <Bar dataKey="harvest_normal_count" name="Normal" stackId="harvest" fill={HARVEST_COLORS.Normal} isAnimationActive={false} />
                <Bar dataKey="harvest_late_count" name="Late" stackId="harvest" fill={HARVEST_COLORS.Late} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </Chart>
          </ChartCard>
        </div>
      )}

      <h2 className="mt-10 font-display text-xl font-semibold text-brda-forest">Regional Comparison</h2>
      <p className="mt-1 max-w-2xl text-sm text-brda-forest/60">
        Goriška Brda's home region against Friuli-Venezia Giulia, the Italian wine region it
        directly borders (Collio/Brda is one contiguous wine-growing area split by the
        Slovenia-Italy border) — real data from Eurostat.
      </p>

      {comparisonError && (
        <div className="mt-4">
          <ErrorState message={`Couldn't load regional comparison: ${comparisonError}`} onRetry={loadComparison} />
        </div>
      )}
      {!comparison && !comparisonError && <div className="mt-4"><LoadingState label="Loading Eurostat regional data…" /></div>}

      {comparison && (
        <div className="mt-4 space-y-6">
          <ChartCard
            title="Grape-Growing Area by Year"
            description="Main area under grapes (thousand hectares), by region."
          >
            <Chart>
              <LineChart data={comparisonChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFE6D2" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} unit=" kha" width={55} />
                <Tooltip formatter={(value, name) => [`${value?.toLocaleString()} thousand ha`, name]} />
                <Legend />
                <Line
                  type="monotone" dataKey="SI04" name="West Slovenia" connectNulls
                  stroke={REGION_COLORS.SI04} strokeWidth={2} dot={false} isAnimationActive={false}
                />
                <Line
                  type="monotone" dataKey="ITH4" name="Friuli-Venezia Giulia" connectNulls
                  stroke={REGION_COLORS.ITH4} strokeWidth={2} dot={false} isAnimationActive={false}
                />
              </LineChart>
            </Chart>
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {comparison.regions.map((region) => {
              const latest = [...comparison.vineyard_census]
                .filter((p) => p.region_code === region.code)
                .sort((a, b) => b.year - a.year)[0]
              return (
                <div key={region.code} className="rounded-2xl border border-brda-beige bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brda-forest/60">{region.name}</p>
                  {latest ? (
                    <>
                      <p className="mt-2 font-display text-2xl font-semibold text-brda-forest">
                        {latest.area_ha?.toLocaleString()} ha
                      </p>
                      <p className="text-sm text-brda-forest/60">
                        Total area under vines, {latest.year} census
                        {latest.holdings != null && ` · ${latest.holdings.toLocaleString()} wine-grower holdings`}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-brda-forest/50">No census data available.</p>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-xs text-brda-forest/50">{comparison.source_note}</p>
        </div>
      )}
    </div>
  )
}

export default ClimateTrends
