import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Grape, CloudSun, BarChart3, Newspaper, X } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/predict', label: 'Harvest Prediction', icon: Grape },
  { to: '/climate', label: 'Climate Trends', icon: CloudSun },
  { to: '/performance', label: 'Model Performance', icon: BarChart3 },
  { to: '/intelligence', label: 'Vineyard Intelligence', icon: Newspaper },
]

function Sidebar({ onNavigate, onClose }) {
  return (
    <div className="flex h-full flex-col bg-brda-forest text-brda-offwhite">
      <div className="flex items-center justify-between px-6 py-6">
        <span className="font-display text-xl font-semibold tracking-wide">
          🍇 BrdaHarvest
        </span>
        {onClose && (
          <button onClick={onClose} className="md:hidden" aria-label="Close menu">
            <X size={22} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brda-burgundy text-white'
                  : 'text-brda-beige-light hover:bg-brda-forest-light'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-6 text-xs text-brda-beige-light/70">
        Forecasting Platform for Vineyard Management
      </div>
    </div>
  )
}

export default Sidebar
