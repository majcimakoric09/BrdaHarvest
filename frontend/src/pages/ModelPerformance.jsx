import { useEffect, useState } from 'react'
import { Target, Activity, TrendingUp, Ruler, Gauge } from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from 'recharts'
import StatCard from '../components/StatCard.jsx'
import ChartCard from '../components/ChartCard.jsx'
import LoadingState from '../components/LoadingState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import { getModelPerformance } from '../services/api.js'

// Presentation-only: maps the model's real internal feature names to
// business-friendly labels for display. Never touches the underlying
// data, values, or ordering -- charts still sort/plot by the raw
// `feature` string via dataKey; this only changes what's *rendered* for
// axis ticks and tooltips.
const FEATURE_LABELS = {
  year: 'Year',
  elevation_m: 'Elevation',
  vine_age_years: 'Vine Age',
  avg_temperature_C: 'Average Growing Temperature',
  min_spring_temp_C: 'Minimum Spring Temperature',
  summer_heat_days: 'Summer Heat Days',
  spring_frost_days: 'Spring Frost Days',
  winter_rainfall_mm: 'Winter Rainfall',
  spring_rainfall_mm: 'Spring Rainfall',
  summer_rainfall_mm: 'Summer Rainfall',
  rainfall_deviation_mm: 'Rainfall Deviation from Normal',
  humidity_pct: 'Humidity',
  sunshine_hours: 'Sunshine Hours',
  soil_moisture_pct: 'Soil Moisture',
  heat_frost_ratio: 'Heat-to-Frost Ratio',
  prev_harvest_doy: 'Previous Harvest Timing',
  prev_yield_kg_ha: "Previous Year's Yield",
  rainfall_efficiency: 'Rainfall Efficiency',
  gdd_per_sunshine_hour: 'Growing Degree Days per Sunshine Hour',
  yield_lag_change: 'Yield Change from Previous Year',
  harvest_lag_change: 'Harvest Timing Change',

  'grape_variety_Cabernet Sauvignon': 'Cabernet Sauvignon Variety',
  grape_variety_Chardonnay: 'Chardonnay Variety',
  grape_variety_Malvazija: 'Malvazija Variety',
  grape_variety_Merlot: 'Merlot Variety',
  'grape_variety_Pinot Grigio': 'Pinot Grigio Variety',
  'grape_variety_Pinot Noir': 'Pinot Noir Variety',
  grape_variety_Rebula: 'Rebula Variety',
  'grape_variety_Sauvignon Blanc': 'Sauvignon Blanc Variety',

  soil_type_Clay: 'Clay Soil',
  'soil_type_Clay-Loam': 'Clay-Loam Soil',
  soil_type_Loam: 'Loam Soil',
  soil_type_Marl: 'Marl Soil',
  'soil_type_Marl-Loam': 'Marl-Loam Soil',
  'soil_type_Sandy-Loam': 'Sandy-Loam Soil',

  location_Biljana: 'Biljana Location',
  location_Cerovo: 'Cerovo Location',
  location_Dobrovo: 'Dobrovo Location',
  location_Kozana: 'Kozana Location',
  location_Medana: 'Medana Location',
  location_Neblo: 'Neblo Location',
  'location_Vipolže': 'Vipolže Location',
  'location_Šmartno': 'Šmartno Location',
}

// Fallback for any feature name not in the table above (shouldn't happen
// with the current fixed feature set, but keeps the chart readable rather
// than showing a raw technical name if it ever does): turns
// "some_raw_name" into "Some Raw Name".
function getFeatureLabel(rawName) {
  if (FEATURE_LABELS[rawName]) return FEATURE_LABELS[rawName]
  return rawName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function Chart({ children }) {
  return (
    <div style={{ height: 300, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}

function LeaderboardTable({ rows, selectedModel, metricCols }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-brda-beige text-left text-brda-forest/60">
            <th className="py-2 pr-3 font-medium">Model</th>
            {metricCols.map(({ key, label }) => (
              <th key={key} className="py-2 pr-3 font-medium">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = row.model === selectedModel
            return (
              <tr
                key={row.model}
                className={`border-b border-brda-beige/60 ${isSelected ? 'bg-brda-vine/10' : ''}`}
              >
                <td className="py-2 pr-3 font-medium text-brda-forest">
                  {row.model}
                  {isSelected && (
                    <span className="ml-2 rounded-full bg-brda-vine px-2 py-0.5 text-xs font-medium text-white">
                      Selected
                    </span>
                  )}
                </td>
                {metricCols.map(({ key }) => (
                  <td key={key} className="py-2 pr-3 text-brda-forest/80">
                    {typeof row[key] === 'number' ? row[key].toFixed(3) : row[key]}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ConfusionMatrix({ labels, matrix }) {
  const maxValue = Math.max(...matrix.flat())
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1">
        <thead>
          <tr>
            <th></th>
            <th colSpan={labels.length} className="pb-1 text-center text-xs font-medium text-brda-forest/60">
              Predicted
            </th>
          </tr>
          <tr>
            <th></th>
            {labels.map((l) => (
              <th key={l} className="px-2 pb-1 text-xs font-medium text-brda-forest/60">{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={labels[i]}>
              {i === 0 && (
                <th
                  rowSpan={labels.length}
                  className="pr-2 text-xs font-medium text-brda-forest/60"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  Actual
                </th>
              )}
              {i !== 0 && <th></th>}
              {row.map((value, j) => {
                const isDiagonal = i === j
                const alpha = 0.15 + 0.65 * (value / maxValue)
                const bg = isDiagonal ? `rgba(76, 122, 91, ${alpha})` : `rgba(122, 46, 58, ${alpha})`
                return (
                  <td
                    key={j}
                    className="h-16 w-16 rounded-md text-center font-display text-lg font-semibold text-brda-forest"
                    style={{ backgroundColor: bg }}
                  >
                    {value}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex gap-2 text-xs text-brda-forest/60">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'rgba(76,122,91,0.6)' }} /> Correct</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'rgba(122,46,58,0.6)' }} /> Misclassified</span>
      </div>
    </div>
  )
}

function FeatureImportanceChart({ data }) {
  const chartData = [...data].reverse() // largest at top -- unchanged
  return (
    <Chart>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EFE6D2" />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="feature"
          width={190}
          tick={{ fontSize: 10 }}
          tickFormatter={getFeatureLabel}
        />
        <Tooltip
          formatter={(value) => [value.toFixed(3), 'Importance']}
          labelFormatter={getFeatureLabel}
        />
        <Bar dataKey="importance" fill="#4C7A5B" radius={[0, 3, 3, 0]} isAnimationActive={false} />
      </BarChart>
    </Chart>
  )
}

const CLF_METRIC_COLS = [
  { key: 'val_accuracy', label: 'Val Accuracy' },
  { key: 'val_f1_macro', label: 'Val F1 (macro)' },
  { key: 'val_roc_auc_ovr_macro', label: 'Val ROC-AUC' },
  { key: 'train_accuracy', label: 'Train Accuracy' },
]
const REG_METRIC_COLS = [
  { key: 'val_r2', label: 'Val R²' },
  { key: 'val_mae', label: 'Val MAE' },
  { key: 'val_rmse', label: 'Val RMSE' },
  { key: 'train_r2', label: 'Train R²' },
]

function ModelPerformance() {
  const [perf, setPerf] = useState(null)
  const [error, setError] = useState(null)

  function loadPerformance() {
    setError(null)
    setPerf(null)
    getModelPerformance()
      .then(setPerf)
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    loadPerformance()
  }, [])

  const predVsActual = perf
    ? perf.regression.predicted_vs_actual.actual.map((a, i) => ({
        actual: a,
        predicted: perf.regression.predicted_vs_actual.predicted[i],
      }))
    : []
  const diagonalDomain = perf
    ? (() => {
        const all = [...perf.regression.predicted_vs_actual.actual, ...perf.regression.predicted_vs_actual.predicted]
        const min = Math.min(...all)
        const max = Math.max(...all)
        return [{ actual: min, predicted: min }, { actual: max, predicted: max }]
      })()
    : []

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-brda-forest">Model Performance</h1>
      <p className="mt-2 max-w-2xl text-brda-forest/70">
        Honest evaluation of the trained models on the held-out test set — never seen during
        training or model selection.
      </p>

      {error && <div className="mt-6"><ErrorState message={`Couldn't load model performance: ${error}`} onRetry={loadPerformance} /></div>}
      {!perf && !error && <div className="mt-6"><LoadingState label="Loading evaluation results…" /></div>}

      {perf && (
        <>
          <section className="mt-8">
            <h2 className="font-display text-xl font-semibold text-brda-forest">
              Classification: Harvest Timing
            </h2>
            <p className="text-sm text-brda-forest/60">
              Selected model: {perf.classification.selected_model} — test-set metrics below
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard icon={Target} label="Accuracy" value={perf.classification.test_metrics.accuracy.toFixed(3)} />
              <StatCard icon={Activity} label="Macro F1" value={perf.classification.test_metrics.f1_macro.toFixed(3)} />
              <StatCard icon={Gauge} label="ROC-AUC (macro)" value={perf.classification.test_metrics.roc_auc_ovr_macro.toFixed(3)} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard title="Confusion Matrix" description="Test set — rows are actual category, columns are predicted.">
                <ConfusionMatrix labels={perf.classification.labels} matrix={perf.classification.confusion_matrix} />
              </ChartCard>

              <ChartCard title="Classification Leaderboard" description="Validation metrics for every candidate model.">
                <LeaderboardTable
                  rows={perf.classification.leaderboard}
                  selectedModel={perf.classification.selected_model}
                  metricCols={CLF_METRIC_COLS}
                />
              </ChartCard>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-xl font-semibold text-brda-forest">
              Regression: Expected Yield
            </h2>
            <p className="text-sm text-brda-forest/60">
              Selected model: {perf.regression.selected_model} — test-set metrics below
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard icon={TrendingUp} label="R²" value={perf.regression.test_metrics.r2.toFixed(3)} />
              <StatCard icon={Ruler} label="MAE" value={`${Math.round(perf.regression.test_metrics.mae).toLocaleString()} kg/ha`} />
              <StatCard icon={Ruler} label="RMSE" value={`${Math.round(perf.regression.test_metrics.rmse).toLocaleString()} kg/ha`} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard title="Predicted vs Actual" description={`Test set, ${predVsActual.length} vineyard-years.`}>
                <Chart>
                  <ComposedChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EFE6D2" />
                    <XAxis type="number" dataKey="actual" name="Actual" unit=" kg/ha" tick={{ fontSize: 11 }} />
                    <YAxis type="number" dataKey="predicted" name="Predicted" unit=" kg/ha" tick={{ fontSize: 11 }} width={45} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={predVsActual} fill="#4C7A5B" fillOpacity={0.4} isAnimationActive={false} />
                    <Line
                      data={diagonalDomain}
                      dataKey="predicted"
                      stroke="#7A2E3A"
                      strokeDasharray="4 4"
                      dot={false}
                      legendType="none"
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </Chart>
              </ChartCard>

              <ChartCard title="Regression Leaderboard" description="Validation metrics for every candidate model.">
                <LeaderboardTable
                  rows={perf.regression.leaderboard}
                  selectedModel={perf.regression.selected_model}
                  metricCols={REG_METRIC_COLS}
                />
              </ChartCard>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-xl font-semibold text-brda-forest">Feature Importance</h2>
            <p className="text-sm text-brda-forest/60">
              Which vineyard and weather factors matter most to the models, ranked by how much
              each one actually influences the prediction — the top 15 factors for each.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard
                title="Harvest Timing Factors"
                description="What most influences whether harvest is predicted Early, Normal, or Late. Longer bars mean that factor has a bigger effect on the timing prediction."
              >
                <FeatureImportanceChart data={perf.feature_importance.classification} />
              </ChartCard>
              <ChartCard
                title="Yield Factors"
                description="What most influences the predicted grape yield (kg/ha). Longer bars mean that factor has a bigger effect on the yield prediction."
              >
                <FeatureImportanceChart data={perf.feature_importance.regression} />
              </ChartCard>
            </div>
          </section>

          <section className="mt-10 rounded-xl border border-brda-burgundy/30 bg-brda-burgundy/5 p-6">
            <h2 className="font-display text-lg font-semibold text-brda-forest">Limitations</h2>
            <p className="mt-2 font-medium text-brda-forest">
              This model is a planning aid, not a guaranteed harvest forecast. The dataset is
              synthetic and balanced, so performance may be optimistic compared with real
              winery records.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-brda-forest/70">
              {perf.limitations
                .filter((l) => !l.startsWith('This is a synthetic'))
                .map((l) => <li key={l}>{l}</li>)}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}

export default ModelPerformance
