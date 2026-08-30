import { useEffect, useState } from 'react'
import { softDeleteFeeRecord, subscribeFeesForStudent } from '../../firebase/feeRepository.js'
import { useToast } from '../../context/useToast.js'
import AddFeeModal from './AddFeeModal.jsx'
import ReceiptPrint from './ReceiptPrint.jsx'

function formatDisplayDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}

function StudentDetailModal({ student, onClose }) {
  const { showToast } = useToast()
  const [fees, setFees] = useState([])
  const [feeError, setFeeError] = useState('')
  const [showAddFee, setShowAddFee] = useState(false)
  const [printingFee, setPrintingFee] = useState(null)

  useEffect(() => {
    if (!student) return undefined
    const unsub = subscribeFeesForStudent(
      student.id,
      (list) => {
        setFees(list)
        setFeeError('')
      },
      (err) => setFeeError(err?.message || 'Failed to load fees.'),
    )
    return unsub
  }, [student])

  const handleArchiveFee = async (fee) => {
    const ok = window.confirm(`Archive ${fee.month} ${fee.year} fee (INR ${fee.amount})?`)
    if (!ok) return
    try {
      await softDeleteFeeRecord(fee.docId)
      showToast('Fee row archived.', 'success')
    } catch (err) {
      showToast(err?.message || 'Could not archive fee.', 'error')
    }
  }

  if (!student) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-detail-title"
      >
        <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 id="student-detail-title" className="text-xl font-bold text-slate-900">
                Student details
              </h2>
              <p className="mt-1 text-sm text-slate-600">Profile and fee payment history</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowAddFee(true)}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Add fee record
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-semibold uppercase text-slate-500">Student ID</dt>
              <dd className="text-sm font-medium text-slate-900">{student.id}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-semibold uppercase text-slate-500">Name</dt>
              <dd className="text-sm font-medium text-slate-900">{student.name}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-semibold uppercase text-slate-500">Parent name</dt>
              <dd className="text-sm font-medium text-slate-900">{student.parentName || '—'}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-semibold uppercase text-slate-500">Class</dt>
              <dd className="text-sm font-medium text-slate-900">{student.class}</dd>
            </div>
          </dl>

          <h3 className="mt-6 text-base font-semibold text-slate-900">Fee history</h3>
          {feeError ? (
            <p className="mt-2 text-sm text-rose-600">{feeError}</p>
          ) : null}

          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[640px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2">Year</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Payment date</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                      No fee records yet for this student.
                    </td>
                  </tr>
                ) : (
                  fees.map((fee) => (
                    <tr key={fee.docId} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-slate-800">{fee.month}</td>
                      <td className="px-3 py-2 text-slate-800">{fee.year}</td>
                      <td className="px-3 py-2 text-slate-800">INR {fee.amount.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            fee.status === 'paid' ? 'font-medium text-emerald-700' : 'font-medium text-rose-700'
                          }
                        >
                          {fee.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{formatDisplayDate(fee.paymentDate)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          {fee.status === 'paid' && (
                            <button
                              type="button"
                              onClick={() => setPrintingFee(fee)}
                              className="rounded border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 focus:outline-2 focus:outline-emerald-500"
                            >
                              Print Receipt
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleArchiveFee(fee)}
                            className="rounded border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddFee ? (
        <AddFeeModal
          student={student}
          onClose={() => setShowAddFee(false)}
          onCreated={() => {}}
        />
      ) : null}

      {printingFee ? (
        <ReceiptPrint
          student={student}
          fee={printingFee}
          onClose={() => setPrintingFee(null)}
        />
      ) : null}
    </>
  )
}

export default StudentDetailModal
