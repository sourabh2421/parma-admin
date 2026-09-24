import { useOwnerRevenue } from '../../context/OwnerRevenueContext.jsx'

function SummaryCards({ totalStudents, totalFeesCollected, pendingFees }) {
  const { isUnlocked, openModal } = useOwnerRevenue()

  const cards = [
    {
      label: 'Total Students',
      value: totalStudents,
      accent: 'text-blue-700',
      bg: 'bg-blue-50',
      isSensitive: false,
    },
    {
      label: 'Total Fees Collected',
      value: isUnlocked ? `INR ${totalFeesCollected.toLocaleString()}` : '••••••',
      accent: 'text-emerald-700',
      bg: 'bg-emerald-50',
      isSensitive: true,
    },
    {
      label: 'Pending Fees',
      value: isUnlocked ? `INR ${pendingFees.toLocaleString()}` : '••••••',
      accent: 'text-rose-700',
      bg: 'bg-rose-50',
      isSensitive: true,
    },
  ]

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const isLocked = card.isSensitive && !isUnlocked

        return (
          <article key={card.label} className={`rounded-2xl border border-slate-200 p-4 ${card.bg}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              {card.isSensitive && (
                isLocked ? (
                  <button
                    type="button"
                    onClick={openModal}
                    className="inline-flex items-center gap-1 rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 shadow-sm hover:bg-white"
                  >
                    <span>🔒</span>
                    <span>Unlock</span>
                  </button>
                ) : (
                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                    Owner Visible
                  </span>
                )
              )}
            </div>
            <p className={`mt-2 text-2xl font-bold ${card.accent}`}>{card.value}</p>
          </article>
        )
      })}
    </section>
  )
}

export default SummaryCards
