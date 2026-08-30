function DashboardTopbar({ onLogout }) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage students, record fee payments in Firestore, and review pending months.
        </p>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-600"
      >
        Logout
      </button>
    </header>
  )
}

export default DashboardTopbar
