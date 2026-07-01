import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import ChartCard from '../components/ChartCard.jsx'
import LoadingState from '../components/LoadingState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import { getClimateTrends } from '../services/api.js'

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

  function loadTrends() {
    setError(null)
    setTrends(null)
    getClimateTrends()
      .then((data) => setTrends(data.records))
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    loadTrends()
  }, [])

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
    </div>
  )
}

export default ClimateTrends
