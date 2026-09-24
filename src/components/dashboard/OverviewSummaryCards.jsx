import { useOwnerRevenue } from '../../context/OwnerRevenueContext.jsx'

function OverviewSummaryCards({
  totalStudents,
  totalFeesCollected,
  pendingPaymentsCount,
  currentMonthCollection,
  loading = false,
}) {
  const { isUnlocked, openModal } = useOwnerRevenue()

  const cards = [
    {
      label: 'Total Students',
      value: loading ? '—' : totalStudents,
      color: 'text-emerald-700',
      isSensitive: false,
    },
    {
      label: 'Total Fees Collected',
      value: loading
        ? '—'
        : isUnlocked
        ? `INR ${totalFeesCollected.toLocaleString()}`
        : '••••••',
      color: 'text-emerald-700',
      isSensitive: true,
    },
    {
      label: 'Pending Payments',
      value: loading ? '—' : String(pendingPaymentsCount),
      color: 'text-rose-700',
      isSensitive: false,
    },
    {
      label: 'Current Month Collection',
      value: loading ? '—' : `INR ${currentMonthCollection.toLocaleString()}`,
      color: 'text-emerald-700',
      isSensitive: false,
    },
  ]

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const isLocked = card.isSensitive && !isUnlocked

        return (
          <article
            key={card.label}
            className={`rounded-none border border-emerald-200 border-l-4 border-l-emerald-600 bg-white p-4 transition ${
              isLocked ? 'relative overflow-hidden' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-light uppercase tracking-wide text-slate-500">{card.label}</p>
              {card.isSensitive && (
                isLocked ? (
                  <button
                    type="button"
                    onClick={openModal}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 transition"
                    title="Unlock with Owner credentials"
                  >
                    <span>🔒</span>
                    <span>Unlock</span>
                  </button>
                ) : (
                  <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Owner Visible
                  </span>
                )
              )}
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <p className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </p>
              {isLocked && (
                <span className="text-[11px] font-medium text-slate-400">
                  Owner restricted
                </span>
              )}
            </div>
          </article>
        )
      })}
    </section>
  )
}

export default OverviewSummaryCards
