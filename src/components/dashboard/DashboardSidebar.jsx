import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-emerald-500/20 text-emerald-200'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
  }`

function DashboardSidebar() {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-slate-100 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">Admin Panel</p>
      <h2 className="mt-2 text-xl font-bold">Parma Academy</h2>
      <p className="mt-2 text-sm text-slate-300">
        Students, fee records, and pending payments in one admin workspace.
      </p>

      <nav className="mt-6 space-y-1" aria-label="Dashboard sections">
        <NavLink to="/dashboard" end className={linkClass}>
          Dashboard overview
        </NavLink>
        <NavLink to="/dashboard/students" className={linkClass}>
          Students
        </NavLink>
        <NavLink to="/dashboard/fees" className={linkClass}>
          Fee records
        </NavLink>
        <NavLink to="/dashboard/pending" className={linkClass}>
          Pending fees
        </NavLink>
      </nav>
    </aside>
  )
}

export default DashboardSidebar
