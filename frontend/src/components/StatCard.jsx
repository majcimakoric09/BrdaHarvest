import { ChevronRight } from 'lucide-react'

function StatCard({ icon: Icon, label, value, sublabel, onClick }) {
  const clickable = Boolean(onClick)

  function handleKeyDown(event) {
    if (!clickable) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  return (
    // min-w-0 is required: this is a grid item inside an auto-fit/minmax
    // track (Dashboard.jsx). Without it, grid items default to
    // min-width:auto (their content's intrinsic width), which can force
    // the auto-fit column-fitting calculation to overflow the container.
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={`min-w-0 rounded-2xl border border-brda-beige bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brda-vine/30 hover:shadow-md ${
        clickable ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-brda-vine/40' : ''
      }`}
    >
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brda-beige-light to-brda-beige text-brda-vine">
            <Icon size={20} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-brda-forest/60">{label}</p>
          <p className="font-display text-2xl font-semibold text-brda-forest">{value}</p>
          {sublabel && <p className="text-xs text-brda-forest/60">{sublabel}</p>}
        </div>
        {clickable && <ChevronRight size={18} className="shrink-0 text-brda-forest/30" />}
      </div>
    </div>
  )
}

export default StatCard
