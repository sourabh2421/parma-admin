import { useEffect, useMemo, useState } from 'react'
import { isFirebaseConfigured } from '../../firebase/config.js'
import { subscribeStudents } from '../../firebase/studentRepository.js'
import { subscribeAllFees } from '../../firebase/feeRepository.js'
import { compareClasses } from '../../utils/studentSort.js'
import TableSkeleton from '../../components/dashboard/TableSkeleton.jsx'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function PendingFeesPage() {
  const now = new Date()
  const [month, setMonth] = useState(MONTH_NAMES[now.getMonth()])
  const [year, setYear] = useState(now.getFullYear())
  const [students, setStudents] = useState([])
  const [fees, setFees] = useState([])
  const [loading, setLoading] = useState(() => isFirebaseConfigured())
  const [error, setError] = useState(() =>
    isFirebaseConfigured() ? '' : 'Firebase is not configured. Add environment variables and restart.',
  )

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return undefined
    }

    const unsubStudents = subscribeStudents(
      (list) => {
        setStudents(list)
        setLoading(false)
      },
      (err) => {
        setError(err?.message || 'Failed to load students.')
        setLoading(false)
      },
    )
    const unsubFees = subscribeAllFees(
      (list) => {
        setFees(list)
        setLoading(false)
      },
      (err) => {
        setError(err?.message || 'Failed to load fees.')
        setLoading(false)
      },
    )
    return () => {
      unsubStudents()
      unsubFees()
    }
  }, [])

  const paidStudentIdsForPeriod = useMemo(() => {
    const set = new Set()
    fees.forEach((fee) => {
      if (fee.month === month && Number(fee.year) === Number(year) && fee.status === 'paid') {
        set.add(fee.studentId)
      }
    })
    return set
  }, [fees, month, year])

  const pendingRows = useMemo(() => {
    return students
      .filter((s) => !paidStudentIdsForPeriod.has(s.id))
      .map((s) => ({
        studentId: s.id,
        studentName: s.name,
        class: s.class,
        pendingMonth: `${month} ${year}`,
        pendingAmount: '—',
      }))
      .sort((a, b) => {
        const classComp = compareClasses(a.class, b.class)
        if (classComp !== 0) return classComp
        return a.studentName.localeCompare(b.studentName)
      })
  }, [students, paidStudentIdsForPeriod, month, year])

  const yearSelectOptions = useMemo(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 12 }, (_, i) => y - 5 + i)
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Pending fees</h2>
        <p className="text-sm text-slate-600">
          Students with no paid fee record for the selected calendar month (pending until a payment is
          recorded).
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label htmlFor="pending-month" className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Month
          </label>
          <select
            id="pending-month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          >
            {MONTH_NAMES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pending-year" className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Year
          </label>
          <select
            id="pending-year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          >
            {yearSelectOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={6} cols={4} />
          ) : (
            <table className="min-w-[720px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">Student name</th>
                  <th className="px-3 py-3">Class</th>
                  <th className="px-3 py-3">Pending month</th>
                  <th className="px-3 py-3">Pending amount</th>
                </tr>
              </thead>
              <tbody>
                {pendingRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-12 text-center text-slate-500">
                      No pending students for this period (or no students imported yet).
                    </td>
                  </tr>
                ) : (
                  pendingRows.map((row) => (
                    <tr key={row.studentId} className="border-b border-slate-100 bg-rose-50/50">
                      <td className="px-3 py-3 font-medium text-slate-900">{row.studentName}</td>
                      <td className="px-3 py-3 text-slate-700">{row.class}</td>
                      <td className="px-3 py-3 text-slate-700">{row.pendingMonth}</td>
                      <td className="px-3 py-3 text-slate-600">{row.pendingAmount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}

export default PendingFeesPage
