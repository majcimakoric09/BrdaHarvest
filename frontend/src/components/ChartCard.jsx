function ChartCard({ title, description, children }) {
  return (
    <div className="min-w-0 rounded-xl border border-brda-beige bg-white p-5 shadow-sm">
      <h3 className="font-display text-lg font-semibold text-brda-forest">{title}</h3>
      {description && <p className="mb-3 text-sm text-brda-forest/60">{description}</p>}
      {/* min-w-0 is required here: Recharts' ResponsiveContainer measures the
          parent's width, and CSS grid/flex items default to min-width:auto,
          which breaks that measurement (charts silently render at 0 width). */}
      <div className="mt-2 min-w-0">{children}</div>
    </div>
  )
}

export default ChartCard
