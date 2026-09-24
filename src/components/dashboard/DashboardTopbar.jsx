import { useOwnerRevenue } from '../../context/OwnerRevenueContext.jsx'

function DashboardTopbar({ onLogout }) {
  const { isUnlocked, openModal, lock } = useOwnerRevenue()

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
        {isUnlocked ? (
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Owner View Active</span>
            <button
              type="button"
              onClick={lock}
              className="ml-1 rounded-lg bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition"
              title="Lock financial totals"
            >
              Lock
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <span>🔒</span>
            <span>Owner Access</span>
          </button>
        )}

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
