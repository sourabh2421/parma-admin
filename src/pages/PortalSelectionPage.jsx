import { Link } from 'react-router-dom'
import useAuth from '../auth/useAuth.jsx'

export default function PortalSelectionPage() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Background Glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-emerald-500/20">
              PA
            </div>
            <div>
              <h1 className="font-extrabold tracking-wider text-base text-white">PARMA ACADEMY</h1>
              <p className="text-xs text-slate-400">Affiliated to ICSE New Delhi · Ayodhya</p>
            </div>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-200">{user.email}</div>
                <div className="text-[11px] text-emerald-400 font-medium">Fee Desk Active</div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800 transition"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="text-xs font-medium text-slate-400">
              Portal Access Gateway
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3.5 py-1 text-xs font-bold text-slate-300 mb-4">
            <span>🛡️</span> Departmental Portals
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Select Management Portal
          </h2>
          <p className="mt-3 text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            Please choose the departmental desk you wish to access. Each portal is password-protected and completely independent.
          </p>
        </div>

        {/* Portals Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Portal 1: Fee Management System */}
          <div className="group relative rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-8 shadow-2xl transition-all duration-300 hover:border-emerald-500/60 hover:shadow-emerald-500/10 hover:-translate-y-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                  💳
                </div>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
                  Accounts Desk
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                Fee Management System
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Complete student fee ledger, 6-item fee breakdown schedules, physical receipt generator, pending fee audits, and financial exports.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Itemized Fee Schedules (Tuition, Exam, Conveyance)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Official Printable Receipts (Parent & School Copy)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Partial Payments & Remaining Due Tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Time-Filtered Audit Reports (PDF & Excel)
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800">
              <Link
                to={user ? '/dashboard' : '/login'}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition active:scale-[0.98]"
              >
                <span>Enter Fee Portal</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Portal 2: Marksheet Management System */}
          <div className="group relative rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-8 shadow-2xl transition-all duration-300 hover:border-indigo-500/60 hover:shadow-indigo-500/10 hover:-translate-y-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                  📊
                </div>
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 text-xs font-bold text-indigo-400">
                  Examination Cell (Password Protected)
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                Marksheet Management System
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Academic records, term-wise marks entry, automatic grading and percentages, ICSE standard report card generation, and subject analysis.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> Class & Subject Marks Entry (Term 1, Half-Yearly, Final)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> Automated Total, Percentage, Grades & Ranks
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> Official Printable Report Cards & Progress Slips
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> Class Performance & Tabulation Sheets
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800">
              <Link
                to="/marksheets"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition active:scale-[0.98]"
              >
                <span>Enter Marksheet Portal (Protected)</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 py-4 text-center text-xs text-slate-500">
        Parma Academy Management Suite · Secure Access Gateway · Ayodhya, U.P.
      </footer>
    </div>
  )
}
