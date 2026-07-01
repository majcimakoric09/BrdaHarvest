function StatCard({ icon: Icon, label, value, sublabel }) {
  return (
    // min-w-0 is required: this is a grid item inside an auto-fit/minmax
    // track (Dashboard.jsx). Without it, grid items default to
    // min-width:auto (their content's intrinsic width), which can force
    // the auto-fit column-fitting calculation to overflow the container.
    <div className="min-w-0 rounded-xl border border-brda-beige bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brda-beige-light text-brda-vine">
            <Icon size={20} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm text-brda-forest/60">{label}</p>
          <p className="font-display text-2xl font-semibold text-brda-forest">{value}</p>
          {sublabel && <p className="text-xs text-brda-forest/50">{sublabel}</p>}
        </div>
      </div>
    </div>
  )
}

export default StatCard
