import { useEffect, useState } from 'react'
import {
  Database, Grape, Layers, MapPin, CalendarRange, TrendingUp, CalendarDays,
} from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import StatCard from '../components/StatCard.jsx'
import ChartCard from '../components/ChartCard.jsx'
import LoadingState from '../components/LoadingState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import { getDashboardSummary } from '../services/api.js'

const HARVEST_COLORS = { Early: '#4C7A5B', Normal: '#B8935A', Late: '#7A2E3A' }

function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div className="w-full">
      <section className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-brda-forest sm:text-4xl">
          🍇 BrdaHarvest
        </h1>
        <p className="mt-1 font-display text-lg text-brda-vine">
          Forecasting Platform for Vineyard Management
        </p>
        <p className="mt-2 max-w-2xl text-brda-forest/70">
          Helping wineries in Goriška Brda predict harvest timing, estimate grape yield,
          and monitor climate risk.
        </p>
      </section>

      {error && <ErrorState message={`Couldn't load dashboard data: ${error}`} />}
      {!summary && !error && <LoadingState label="Loading dataset overview…" />}

      {summary && (
        <>
          <div className="grid w-full gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            <StatCard icon={Database} label="Vineyard records" value={summary.total_records.toLocaleString()} />
            <StatCard icon={Grape} label="Grape varieties" value={summary.grape_varieties} />
            <StatCard icon={Layers} label="Soil types" value={summary.soil_types} />
            <StatCard icon={MapPin} label="Locations" value={summary.locations} />
            <StatCard icon={CalendarRange} label="Years covered" value={summary.years_covered} />
            <StatCard
              icon={TrendingUp}
              label="Average yield"
              value={`${summary.mean_yield_kg_ha.toLocaleString()} kg/ha`}
            />
            <StatCard icon={CalendarDays} label="Average harvest date" value={summary.mean_harvest_date} />
          </div>

          <div className="mt-6 grid w-full grid-cols-1 gap-6 lg:[grid-template-columns:repeat(2,minmax(0,1fr))]">
            <ChartCard
              title="Harvest Timing Distribution"
              description="Share of records by harvest category, across all years and vineyards."
            >
              <div style={{ height: 280, width: '100%' }}>
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
              <div style={{ height: 280, width: '100%' }}>
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
        </>
      )}
    </div>
  )
}

export default Dashboard
