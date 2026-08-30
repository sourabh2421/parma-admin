function SummaryCards({ totalStudents, totalFeesCollected, pendingFees }) {
  const cards = [
    {
      label: 'Total Students',
      value: totalStudents,
      accent: 'text-blue-700',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Fees Collected',
      value: `INR ${totalFeesCollected.toLocaleString()}`,
      accent: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Pending Fees',
      value: `INR ${pendingFees.toLocaleString()}`,
      accent: 'text-rose-700',
      bg: 'bg-rose-50',
    },
  ]

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <article key={card.label} className={`rounded-2xl border border-slate-200 p-4 ${card.bg}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
          <p className={`mt-2 text-2xl font-bold ${card.accent}`}>{card.value}</p>
        </article>
      ))}
    </section>
  )
}

export default SummaryCards
