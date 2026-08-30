import { useEffect, useState } from 'react'
import { isFirebaseConfigured } from '../../firebase/config.js'
import { softDeleteFeeRecord, subscribeAllFees } from '../../firebase/feeRepository.js'
import { useToast } from '../../context/useToast.js'
import TableSkeleton from '../../components/dashboard/TableSkeleton.jsx'

function formatDisplayDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function FeeRecordsPage() {
  const { showToast } = useToast()
  const [fees, setFees] = useState([])
  const [loading, setLoading] = useState(() => isFirebaseConfigured())
  const [error, setError] = useState(() =>
    isFirebaseConfigured() ? '' : 'Firebase is not configured. Add environment variables and restart.',
  )

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return undefined
    }

    const unsub = subscribeAllFees(
      (list) => {
        setFees(list)
        setError('')
        setLoading(false)
      },
      (err) => {
        setError(err?.message || 'Failed to load fee records.')
        setLoading(false)
      },
    )
    return unsub
  }, [])

  const handleArchiveFee = async (fee) => {
    const ok = window.confirm(
      `Archive this fee row for ${fee.studentName} (${fee.month} ${fee.year})? It will disappear from lists but stays recoverable in Firestore.`,
    )
    if (!ok) return
    try {
      await softDeleteFeeRecord(fee.docId)
      showToast('Fee row archived.', 'success')
    } catch (err) {
      showToast(err?.message || 'Could not archive fee.', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Fee records</h2>
        <p className="text-sm text-slate-600">All payment rows from the fees collection.</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={8} cols={8} />
          ) : (
            <table className="min-w-[960px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">Student</th>
                  <th className="px-3 py-3">Class</th>
                  <th className="px-3 py-3">Month</th>
                  <th className="px-3 py-3">Year</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Payment date</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center text-slate-500">
                      No fee records yet.
                    </td>
                  </tr>
                ) : (
                  fees.map((fee) => (
                    <tr
                      key={fee.docId}
                      className={`border-b border-slate-100 ${
                        fee.status === 'paid' ? 'bg-emerald-50/40' : 'bg-rose-50/40'
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-900">{fee.studentName}</div>
                        <div className="text-xs text-slate-500">{fee.studentId}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{fee.class}</td>
                      <td className="px-3 py-3 text-slate-700">{fee.month}</td>
                      <td className="px-3 py-3 text-slate-700">{fee.year}</td>
                      <td className="px-3 py-3 font-medium text-slate-900">
                        INR {fee.amount.toLocaleString()}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={
                            fee.status === 'paid' ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'
                          }
                        >
                          {fee.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{formatDisplayDate(fee.paymentDate)}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleArchiveFee(fee)}
                          className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          Archive
                        </button>
                      </td>
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

export default FeeRecordsPage
