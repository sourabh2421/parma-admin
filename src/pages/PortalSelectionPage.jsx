import { Link } from 'react-router-dom'
import useAuth from '../auth/useAuth.jsx'
import { useMarksheetAuth } from '../context/MarksheetAuthContext.jsx'

export default function PortalSelectionPage() {
  const { user, logout: feeLogout } = useAuth()
  const { teacherUser, isAuthenticated: isTeacherAuth, logout: teacherLogout } = useMarksheetAuth()

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
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-emerald-500/20">
              PA
            </div>
            <div>
              <h1 className="tracking-wider text-base text-white zen-dots-regular">PARMA ACADEMY</h1>
              <p className="text-xs text-slate-400">Affiliated to ICSE New Delhi · Ayodhya</p>
            </div>
          </div>

          {/* Active Sessions Status Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {user && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/50 px-3 py-1.5 text-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300 font-semibold">Office:</span>
                <span className="text-slate-200 max-w-[150px] truncate" title={user.email}>{user.email}</span>
                <button
                  type="button"
                  onClick={feeLogout}
                  className="ml-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 transition"
                  title="Sign out from Office Fee Desk"
                >
                  (Sign Out)
                </button>
              </div>
            )}

            {isTeacherAuth && (
              <div className="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-950/50 px-3 py-1.5 text-xs">
                <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-indigo-300 font-semibold">Teacher:</span>
                <span className="text-slate-200 max-w-[150px] truncate">{teacherUser?.name || 'Academic Staff'}</span>
                <button
                  type="button"
                  onClick={teacherLogout}
                  className="ml-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 transition"
                  title="Sign out from Teacher Marksheet Desk"
                >
                  (Sign Out)
                </button>
              </div>
            )}

            {!user && !isTeacherAuth && (
              <div className="text-xs font-medium text-slate-400">
                Independent Role Access Gateway
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3.5 py-1 text-xs font-bold text-slate-300 mb-4">
            <span>🛡️</span> Independent Departmental Desks
          </div>
          <h2 className="text-3xl sm:text-4xl tracking-tight text-white zen-dots-regular">
            Select Management Portal
          </h2>
          <p className="mt-3 text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            Please choose the departmental desk you wish to access. <strong>Fee Management</strong> is used by Office personnel, and <strong>Marksheet Management</strong> is used by Teachers.
          </p>
        </div>

        {/* Portals Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Portal 1: Fee Management System (Office Person) */}
          <div className="group relative rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-8 shadow-2xl transition-all duration-300 hover:border-emerald-500/60 hover:shadow-emerald-500/10 hover:-translate-y-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                  💳
                </div>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
                  🏢 Office & Accounts Desk
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                Fee Management System
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Used by <strong>Office Staff</strong> to manage student fee ledgers, 6-item fee breakdown schedules, physical receipt generator, pending fee audits, and financial exports.
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
                <span>{user ? 'Enter Fee Portal (Active: Office)' : 'Sign In as Office Staff'}</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Portal 2: Marksheet Management System (Teacher) */}
          <div className="group relative rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-8 shadow-2xl transition-all duration-300 hover:border-indigo-500/60 hover:shadow-indigo-500/10 hover:-translate-y-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                  📊
                </div>
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 text-xs font-bold text-indigo-400">
                  👩‍🏫 Teachers & Academic Desk
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                Marksheet Management System
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Used by <strong>Teachers</strong> to enter FA-1 to SA-2 periodic marks, configure class subjects, and generate official 1-page A4 Half-Yearly & Annual report cards.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> Periodic Exam Marks Entry (FA-1, FA-2, SA-1, FA-3, FA-4, SA-2)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> Automated ICSE Grade Thresholds & Percentage
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> Official Half-Yearly (out of 100) & Annual (out of 200) A4 Report Cards
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold">✓</span> Stream Subjects Master Setup
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800">
              <Link
                to={isTeacherAuth ? '/marksheets' : '/marksheets/login'}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition active:scale-[0.98]"
              >
                <span>{isTeacherAuth ? 'Enter Marksheet Portal (Active: Teacher)' : 'Sign In as Teacher'}</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 py-4 text-center text-xs text-slate-500">
        Parma Academy Management Suite · Independent Office & Academic Gateways · Ayodhya, U.P.
      </footer>
    </div>
  )
}
