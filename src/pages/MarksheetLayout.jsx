import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useMarksheetAuth } from '../context/MarksheetAuthContext.jsx'

export default function MarksheetLayout() {
  const { logout } = useMarksheetAuth()
  const navigate = useNavigate()

  const handleSignOut = () => {
    logout()
    navigate('/', { replace: true })
  }

  const navItems = [
    { to: '/marksheets', label: 'Marksheet Overview', icon: '📊', end: true },
    { to: '/marksheets/entry', label: 'Marks Entry', icon: '📝' },
    { to: '/marksheets/reports', label: 'Report Cards', icon: '📜' },
    { to: '/marksheets/subjects', label: 'Subjects Master', icon: '📚' },
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-md shadow-indigo-500/20">
                PA
              </div>
              <div>
                <div className="text-sm font-black tracking-wide text-white">PARMA ACADEMY</div>
                <div className="text-[11px] font-semibold text-indigo-400">
                  Marksheet & Academic Portal
                </div>
              </div>
            </Link>

            <span className="hidden sm:inline-block rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-[11px] font-bold text-indigo-300">
              Examination Cell
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              Portal Selection
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:border-rose-800 transition"
            >
              Lock & Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main App Layout */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-950/50 p-4 hidden md:flex md:flex-col justify-between">
          <nav className="space-y-1.5">
            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
              Academic Navigation
            </div>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 text-xs text-slate-400">
            <div className="font-bold text-slate-200 mb-1">ICSE Examination Desk</div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Password-protected examination records and report cards.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
