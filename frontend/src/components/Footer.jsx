import { Link } from 'react-router-dom'
import { NAV_ITEMS } from './Sidebar.jsx'
import { getDailyQuote } from '../data/quotes.js'

const CONTACT_EMAIL = 'majci.makoric@gmail.com'

const DATA_SOURCES = [
  'Goriška Brda vineyard dataset, 1991–2024',
  'Open-Meteo (live weather)',
  'Decanter, VinePair, Wine Enthusiast',
  'GuildSomm, OIV, EU Commission',
]

function Footer() {
  const quote = getDailyQuote()

  return (
    <footer className="mt-16 border-t border-brda-beige pt-8">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg font-semibold text-brda-forest">🍇 BrdaHarvest</p>
          <p className="mt-2 text-sm text-brda-forest/70">
            Forecasting Platform for Vineyard Management — Goriška Brda, Slovenia.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brda-forest/60">Pages</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {NAV_ITEMS.map(({ to, label }) => (
              <li key={to}>
                <Link to={to} className="text-brda-forest/70 transition-colors hover:text-brda-vine">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brda-forest/60">Data Sources</p>
          <ul className="mt-2 space-y-1.5 text-sm text-brda-forest/70">
            {DATA_SOURCES.map((source) => <li key={source}>{source}</li>)}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brda-forest/60">Contact</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-2 inline-block text-sm text-brda-vine transition-colors hover:text-brda-forest hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>

      <div className="mt-8 border-t border-brda-beige py-6 text-center">
        <p className="font-display text-sm italic text-brda-forest/70">
          “{quote.text}”
          {quote.author && <span className="not-italic text-brda-forest/50"> — {quote.author}</span>}
        </p>
      </div>
    </footer>
  )
}

export default Footer
