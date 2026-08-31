import { Link } from 'react-router-dom'
import useAuth from '../../auth/useAuth.jsx'

export default function MarksheetOverview() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300 mb-3">
            <span>🎓</span> Academic & Examination Management
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Marksheet Portal Activated
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Welcome, <strong className="text-white">{user?.email}</strong>. This portal is dedicated to examination results, student mark entry, grading systems, and official ICSE report card generation.
          </p>
        </div>
      </div>

      {/* Quick Setup Modules */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-sm hover:border-indigo-500/50 transition">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xl mb-3">
            📝
          </div>
          <h3 className="font-bold text-white text-base">Marks Entry Desk</h3>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Enter subject marks by class, section, and examination term (Unit Test, Half-Yearly, Annual).
          </p>
          <div className="mt-4">
            <span className="inline-block rounded-md bg-indigo-500/10 text-indigo-400 px-2.5 py-1 text-[11px] font-bold">
              Ready for configuration
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-sm hover:border-indigo-500/50 transition">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-xl mb-3">
            📜
          </div>
          <h3 className="font-bold text-white text-base">Printable Report Cards</h3>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Generate and print official student marksheets with total marks, percentages, grades, and teacher remarks.
          </p>
          <div className="mt-4">
            <span className="inline-block rounded-md bg-purple-500/10 text-purple-400 px-2.5 py-1 text-[11px] font-bold">
              Ready for template
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-sm hover:border-indigo-500/50 transition">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl mb-3">
            📚
          </div>
          <h3 className="font-bold text-white text-base">Subjects & Grading Rules</h3>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Configure subject lists per class (English, Hindi, Maths, Science, Social Studies, Computer, etc.).
          </p>
          <div className="mt-4">
            <span className="inline-block rounded-md bg-cyan-500/10 text-cyan-400 px-2.5 py-1 text-[11px] font-bold">
              Configurable
            </span>
          </div>
        </div>
      </div>

      {/* Information Note */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
        <h4 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
          <span>ℹ️</span> Role Protection Active
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          Office staff logged in under the Fee Management Desk cannot access this examination data. Similarly, examination staff cannot access student fee collection ledgers.
        </p>
      </div>
    </div>
  )
}
