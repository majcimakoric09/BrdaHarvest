import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar.jsx'
import Footer from './Footer.jsx'

function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen w-screen bg-brda-offwhite md:flex">
      {/* Desktop sidebar: a normal flex child (not position:fixed), sized to
          w-64 and pinned visually via sticky while scrolling. main below is
          flex-1 + min-w-0 so it fills all remaining width. */}
      <aside className="hidden md:sticky md:top-0 md:block md:h-screen md:w-64 md:shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between bg-brda-forest px-4 py-4 text-brda-offwhite md:hidden">
        <span className="font-display text-lg font-semibold">🍇 BrdaHarvest</span>
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 shadow-xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <main className="w-full min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-10">
        {children}
        <Footer />
      </main>
    </div>
  )
}

export default Layout
