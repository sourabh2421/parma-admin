import { useEffect, useMemo, useState } from 'react'
import { isFirebaseConfigured } from '../../firebase/config.js'
import { softDeleteFeeRecord, subscribeAllFees } from '../../firebase/feeRepository.js'
import { useToast } from '../../context/useToast.js'
import TableSkeleton from '../../components/dashboard/TableSkeleton.jsx'
import {
  PERIOD_OPTIONS,
  calculatePeriodMetrics,
  filterFeesByPeriod,
} from '../../utils/feeFilter.js'
import {
  exportFeesToCsv,
  exportFeesToExcel,
  printFeeCollectionReport,
} from '../../utils/feeReportExport.js'
import ReceiptPrint from './ReceiptPrint.jsx'

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

  // Filters state
  const [selectedPeriod, setSelectedPeriod] = useState('running')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Print receipt state
  const [printingFeeRecord, setPrintingFeeRecord] = useState(null)

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

  // Step 1: Filter by selected time period
  const periodFees = useMemo(() => {
    return filterFeesByPeriod(fees, selectedPeriod)
  }, [fees, selectedPeriod])

  // Step 2: Compute period financial metrics
  const periodMetrics = useMemo(() => {
    return calculatePeriodMetrics(periodFees)
  }, [periodFees])

  // Step 3: Apply search query and status filters
  const displayedFees = useMemo(() => {
    let list = periodFees
    const q = searchQuery.trim().toLowerCase()

    if (q) {
      list = list.filter(
        (f) =>
          f.studentName?.toLowerCase().includes(q) ||
          f.studentId?.toLowerCase().includes(q) ||
          f.class?.toLowerCase().includes(q),
      )
    }

    if (statusFilter === 'paid') {
      list = list.filter((f) => f.status === 'paid' && (!f.remainingAmount || f.remainingAmount <= 0))
    } else if (statusFilter === 'partial') {
      list = list.filter((f) => f.status === 'paid' && f.remainingAmount > 0)
    } else if (statusFilter === 'pending') {
      list = list.filter((f) => f.status === 'pending')
    }

    return list
  }, [periodFees, searchQuery, statusFilter])

  const selectedPeriodLabel = useMemo(() => {
    return PERIOD_OPTIONS.find((p) => p.id === selectedPeriod)?.label || 'Selected Period'
  }, [selectedPeriod])

  const handleExportExcel = () => {
    if (displayedFees.length === 0) {
      showToast('No records to export for this period.', 'warning')
      return
    }
    exportFeesToExcel(displayedFees, selectedPeriodLabel)
    showToast(`Exported ${displayedFees.length} records to Excel.`, 'success')
  }

  const handleExportCsv = () => {
    if (displayedFees.length === 0) {
      showToast('No records to export for this period.', 'warning')
      return
    }
    exportFeesToCsv(displayedFees, selectedPeriodLabel)
    showToast(`Exported ${displayedFees.length} records to CSV.`, 'success')
  }

  const handlePrintReport = () => {
    if (displayedFees.length === 0) {
      showToast('No records to print for this period.', 'warning')
      return
    }
    printFeeCollectionReport(displayedFees, selectedPeriodLabel, periodMetrics)
  }

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

  const handlePrint = (fee) => {
    setPrintingFeeRecord({
      student: {
        id: fee.studentId,
        name: fee.studentName,
        class: fee.class,
        parentName: '',
      },
      fee,
    })
  }

  return (
    <div className="space-y-5">
      {/* Header & Export Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Fee Records</h2>
          <p className="text-sm text-slate-600">
            View, track, export, and print fee collection reports across time periods.
          </p>
        </div>

        {/* Print & Export Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrintReport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition active:scale-95"
            title="Print or save as PDF fee report"
          >
            <span>🖨️</span>
            <span>Print Report (PDF)</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition active:scale-95"
            title="Export to Microsoft Excel spreadsheet"
          >
            <span>📊</span>
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition active:scale-95"
            title="Export as comma-separated values"
          >
            <span>📄</span>
            <span>CSV</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      ) : null}

      {/* Time Period Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <span className="px-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          Period:
        </span>
        {PERIOD_OPTIONS.map((opt) => {
          const isActive = selectedPeriod === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedPeriod(opt.id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* Period Financial Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Fees Collected ({PERIOD_OPTIONS.find((p) => p.id === selectedPeriod)?.label})
          </div>
          <div className="mt-1 text-2xl font-black text-emerald-950">
            ₹{periodMetrics.totalCollected.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-xs text-emerald-700">
            {periodMetrics.paidCount + periodMetrics.partialCount} paid / partial payments
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">
            Remaining Due / Unpaid
          </div>
          <div className="mt-1 text-2xl font-black text-amber-950">
            ₹{periodMetrics.totalDue.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-xs text-amber-700">
            {periodMetrics.partialCount} partial balances · {periodMetrics.pendingCount} pending
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Total Fee Records
          </div>
          <div className="mt-1 text-2xl font-black text-slate-900">
            {periodMetrics.totalRecords}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Across selected time period
          </div>
        </div>
      </div>

      {/* Search & Status Filter Controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by student name, ID, or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-xs font-semibold uppercase text-slate-500">
            Status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Fully Paid</option>
            <option value="partial">Partial Payment (With Due)</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Fee Records Table */}
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
                  <th className="px-3 py-3">Payment Date</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedFees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center text-slate-500">
                      No fee records found for {PERIOD_OPTIONS.find((p) => p.id === selectedPeriod)?.label.toLowerCase()}.
                    </td>
                  </tr>
                ) : (
                  displayedFees.map((fee) => (
                    <tr
                      key={fee.docId}
                      className={`border-b border-slate-100 transition-colors hover:bg-slate-50/80 ${
                        fee.status === 'paid' ? 'bg-emerald-50/20' : 'bg-rose-50/20'
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-900">{fee.studentName}</div>
                        <div className="text-xs text-slate-500">{fee.studentId}</div>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-700">{fee.class}</td>
                      <td className="px-3 py-3 text-slate-700">{fee.month}</td>
                      <td className="px-3 py-3 text-slate-700">{fee.year}</td>
                      <td className="px-3 py-3 font-medium text-slate-900">
                        <div>INR {fee.amount.toLocaleString('en-IN')}</div>
                        {fee.remainingAmount > 0 ? (
                          <div className="text-xs font-semibold text-amber-700">
                            Due: INR {fee.remainingAmount.toLocaleString('en-IN')}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                            fee.status === 'paid'
                              ? fee.remainingAmount > 0
                                ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                                : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                              : 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'
                          }`}
                        >
                          {fee.status === 'paid'
                            ? fee.remainingAmount > 0
                              ? 'Partial'
                              : 'Paid'
                            : 'Pending'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{formatDisplayDate(fee.paymentDate)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {fee.status === 'paid' && (
                            <button
                              type="button"
                              onClick={() => handlePrint(fee)}
                              className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              Print Receipt
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleArchiveFee(fee)}
                            className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
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
          )}
        </div>
      </section>

      {/* Direct Receipt Print Popup */}
      {printingFeeRecord && (
        <ReceiptPrint
          student={printingFeeRecord.student}
          fee={printingFeeRecord.fee}
          onClose={() => setPrintingFeeRecord(null)}
        />
      )}
    </div>
  )
}

export default FeeRecordsPage
