import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { isFirebaseConfigured } from '../../firebase/config.js'
import {
  dedupeStudentsForImport,
  migrateLegacyStudentsIfEmpty,
  subscribeStudents,
  upsertStudentsFromImport,
} from '../../firebase/studentRepository.js'
import { subscribeAllFees } from '../../firebase/feeRepository.js'
import { exportStudentsAndFeesExcel, exportStudentsAndFeesJson } from '../../utils/backupExport.js'
import { parseStudentImportSheet } from '../../utils/excelStudentImport.js'
import { sortStudentsByStudentId } from '../../utils/studentSort.js'
import { useToast } from '../../context/useToast.js'
import OverviewSummaryCards from '../../components/dashboard/OverviewSummaryCards.jsx'
import UploadPanel from '../../components/dashboard/UploadPanel.jsx'
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

function DashboardOverview() {
  const { showToast } = useToast()
  const [students, setStudents] = useState([])
  const [fees, setFees] = useState([])
  const [loading, setLoading] = useState(() => isFirebaseConfigured())
  const [error, setError] = useState(() =>
    isFirebaseConfigured() ? '' : 'Firebase is not configured. Add environment variables and restart.',
  )
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    migrateLegacyStudentsIfEmpty().catch(() => {})
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return undefined
    }

    const unsubStudents = subscribeStudents(
      (list) => {
        setStudents(sortStudentsByStudentId(list))
        setError('')
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
        setError(err?.message || 'Failed to load fee records.')
        setLoading(false)
      },
    )

    return () => {
      unsubStudents()
      unsubFees()
    }
  }, [])

  const now = new Date()
  const currentMonthName = MONTH_NAMES[now.getMonth()]
  const currentYear = now.getFullYear()

  const metrics = useMemo(() => {
    const totalStudents = students.length
    const totalFeesCollected = fees
      .filter((f) => f.status === 'paid')
      .reduce((acc, f) => acc + (Number(f.amount) || 0), 0)
    const pendingPaymentsCount = fees.filter((f) => f.status === 'pending').length
    const currentMonthCollection = fees
      .filter(
        (f) =>
          f.status === 'paid' &&
          f.month === currentMonthName &&
          Number(f.year) === currentYear,
      )
      .reduce((acc, f) => acc + (Number(f.amount) || 0), 0)

    return {
      totalStudents,
      totalFeesCollected,
      pendingPaymentsCount,
      currentMonthCollection,
    }
  }, [students, fees, currentMonthName, currentYear])

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const lowerFileName = file.name.toLowerCase()
    if (!lowerFileName.endsWith('.xlsx') && !lowerFileName.endsWith('.csv')) {
      setUploadError('Please upload a valid .xlsx or .csv file.')
      event.target.value = ''
      return
    }

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const parsed = parseStudentImportSheet(sheet)

      if (parsed.length === 0) {
        setUploadError('No valid rows. Required columns: Student ID, Name, Parent name, Class.')
        return
      }

      if (!isFirebaseConfigured()) {
        setUploadError('Firebase is not configured.')
        return
      }

      setUploadBusy(true)
      setUploadError('')
      const deduped = dedupeStudentsForImport(parsed)
      await upsertStudentsFromImport(sortStudentsByStudentId(deduped))
      const skipped = parsed.length - deduped.length
      showToast(
        skipped > 0
          ? `Imported ${deduped.length} student profile(s). (${skipped} duplicate ID row(s) in file were merged.)`
          : `Imported ${deduped.length} student profile(s).`,
        'success',
      )
    } catch (err) {
      setUploadError(err?.message || 'Upload failed.')
      showToast(err?.message || 'Upload failed.', 'error')
    } finally {
      setUploadBusy(false)
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-light text-slate-900">Dashboard overview</h2>
        <p className="text-sm text-slate-600">
          Summary across all students and fee records stored in Firestore.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      ) : null}

      <OverviewSummaryCards
        totalStudents={metrics.totalStudents}
        totalFeesCollected={metrics.totalFeesCollected}
        pendingPaymentsCount={metrics.pendingPaymentsCount}
        currentMonthCollection={metrics.currentMonthCollection}
        loading={loading && students.length === 0 && fees.length === 0}
      />

      <UploadPanel
        onUpload={handleUpload}
        uploadError={uploadError}
        uploadBusy={uploadBusy}
        description="Upload `.xlsx` or `.csv` with Student ID, Student Name, Parent Name, and Class only. The same Student ID always maps to one profile; duplicate IDs in one file are merged."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-light text-slate-900">Backup / export</h3>
        <p className="mt-1 text-sm text-slate-600">
          Download a snapshot of students and fee rows currently shown in the dashboard (active records only).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading && students.length === 0 && fees.length === 0}
            onClick={() => {
              try {
                exportStudentsAndFeesJson(students, fees)
                showToast('JSON backup downloaded.', 'success')
              } catch (err) {
                showToast(err?.message || 'Export failed.', 'error')
              }
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-emerald-400 hover:text-emerald-800 disabled:opacity-50"
          >
            Export JSON
          </button>
          <button
            type="button"
            disabled={loading && students.length === 0 && fees.length === 0}
            onClick={() => {
              try {
                exportStudentsAndFeesExcel(students, fees)
                showToast('Excel backup downloaded.', 'success')
              } catch (err) {
                showToast(err?.message || 'Export failed.', 'error')
              }
            }}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Export Excel
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-light text-slate-900">Recent fee activity</h3>
        <p className="text-sm text-slate-600">Latest entries from the fees collection.</p>
        <div className="mt-4 overflow-x-auto">
          {loading && fees.length === 0 ? (
            <TableSkeleton rows={4} cols={6} />
          ) : (
            <table className="min-w-[720px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-4 font-light">Student</th>
                  <th className="px-4 py-4 font-light">Class</th>
                  <th className="px-4 py-4 font-light">Month</th>
                  <th className="px-4 py-4 font-light">Year</th>
                  <th className="px-4 py-4 font-light">Amount</th>
                  <th className="px-4 py-4 font-light">Status</th>
                </tr>
              </thead>
              <tbody>
                {fees.slice(0, 8).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No fee records yet. Add fees from Students or Fee Records.
                    </td>
                  </tr>
                ) : (
                  fees.slice(0, 8).map((fee) => (
                    <tr key={fee.docId} className="border-b border-slate-100">
                      <td className="px-4 py-4 font-medium text-slate-900">{fee.studentName}</td>
                      <td className="px-4 py-4 font-normal text-slate-700">{fee.class}</td>
                      <td className="px-4 py-4 font-normal text-slate-700">{fee.month}</td>
                      <td className="px-4 py-4 font-normal text-slate-700">{fee.year}</td>
                      <td className="px-4 py-4 font-normal text-slate-700">INR {fee.amount.toLocaleString()}</td>
                      <td className="px-4 py-4">
                        <span
                          className={
                            fee.status === 'paid'
                              ? 'font-medium text-emerald-700'
                              : 'font-medium text-rose-700'
                          }
                        >
                          {fee.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
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

export default DashboardOverview
