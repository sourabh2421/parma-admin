import { useOwnerRevenue } from '../../context/OwnerRevenueContext.jsx'
import { ShieldCheck, Lock } from 'lucide-react'

function DashboardTopbar({ onLogout }) {
  const { isUnlocked, openModal, lock } = useOwnerRevenue()

  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-[#333538] bg-[#252627] p-5 shadow-lg sm:flex-row sm:items-center sm:justify-between text-[#fff9fb]">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#fff9fb] zen-dots-regular">
            Fee Management Desk
          </h1>
          <span className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-xs font-bold text-emerald-300">
            Accounts & Finance
          </span>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-[#d3d4d9]">
          Manage student profiles, record monthly fee collections, and export audit receipts.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isUnlocked ? (
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/60 px-3.5 py-2 text-xs font-semibold text-emerald-300 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Owner View Active</span>
            <button
              type="button"
              onClick={lock}
              className="ml-1 rounded-lg bg-[#333538] px-2 py-0.5 text-[11px] font-bold text-[#fff9fb] hover:bg-rose-600 hover:text-white border border-[#444] transition"
              title="Lock financial totals"
            >
              Lock
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 hover:border-amber-500/60 shadow-sm"
          >
            <span>🔒</span>
            <span>Owner Access</span>
          </button>
        )}
      </div>
    </header>
  )
}

export default DashboardTopbar
