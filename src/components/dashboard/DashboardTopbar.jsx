import { Link } from 'react-router-dom'
import useAuth from '../../auth/useAuth.jsx'

function DashboardTopbar({ onLogout }) {
  const { user, role, hasMarksheetAccess } = useAuth()

  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Fee Management Portal</h1>
          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
            Accounts Desk
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Manage student profiles, record fee collections, and export audit reports.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {hasMarksheetAccess && (
          <Link
            to="/marksheets"
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition active:scale-95"
            title="Switch to Marksheet Management Desk"
          >
            <span>📊</span>
            <span>Switch to Marksheet Portal</span>
          </Link>
        )}

        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
        >
          Portal Hub
        </Link>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
        >
          Logout
        </button>
      </div>
    </header>
  )
}

export default DashboardTopbar
