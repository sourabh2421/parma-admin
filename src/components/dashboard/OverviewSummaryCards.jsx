function OverviewSummaryCards({
  totalStudents,
  totalFeesCollected,
  pendingPaymentsCount,
  currentMonthCollection,
  loading = false,
}) {
  const cards = [
    {
      label: 'Total Students',
      value: loading ? '—' : totalStudents,
      color: 'text-emerald-700',
    },
    {
      label: 'Total Fees Collected',
      value: loading ? '—' : `INR ${totalFeesCollected.toLocaleString()}`,
      color: 'text-emerald-700',
    },
    {
      label: 'Pending Payments',
      value: loading ? '—' : String(pendingPaymentsCount),
      color: 'text-rose-700',
    },
    {
      label: 'Current Month Collection',
      value: loading ? '—' : `INR ${currentMonthCollection.toLocaleString()}`,
      color: 'text-emerald-700',
    },
  ]

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.label} className="rounded-none border border-emerald-200 border-l-4 border-l-emerald-600 bg-white p-4">
          <p className="text-xs font-light uppercase tracking-wide text-slate-500">{card.label}</p>
          <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
        </article>
      ))}
    </section>
  )
}

export default OverviewSummaryCards
