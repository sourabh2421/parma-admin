import { useEffect, useMemo, useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import {
  createFeeRecord,
  recordFeePaymentTransaction,
  subscribeFeesForStudent,
} from '../../firebase/feeRepository.js'
import { useToast } from '../../context/useToast.js'
import useAuth from '../../auth/useAuth.jsx'
import { validateInputs } from '../../utils/feeValidation.js'
import { numberToWordsIndian } from '../../utils/numberToWords.js'
import {
  ACADEMIC_MONTH_ORDER,
  allocateMultiMonthPayment,
  calculateMultiMonthSchedule,
  getAcademicSession,
  getYearForAcademicMonth,
  NON_RECURRING_HEADS,
  sortMonthsInAcademicOrder,
  toRupees,
} from '../../utils/feeAllocation.js'

const MONTH_OPTIONS = [
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

const yearOptions = () => {
  const y = new Date().getFullYear()
  return Array.from({ length: 12 }, (_, i) => y - 5 + i)
}

const sessionOptions = () => {
  const y = new Date().getFullYear()
  return [
    `${y - 1}-${String(y).slice(-2)}`,
    `${y}-${String(y + 1).slice(-2)}`,
    `${y + 1}-${String(y + 2).slice(-2)}`,
  ]
}

function AddFeeModal({ student, onClose, onCreated }) {
  const { showToast } = useToast()
  const { user } = useAuth()
  const now = new Date()

  // Single-Month state
  const [month, setMonth] = useState(MONTH_OPTIONS[now.getMonth()])
  const [year, setYear] = useState(now.getFullYear())

  // 6-Item Fee Schedule
  const [tuitionFee, setTuitionFee] = useState('')
  const [conveyanceFee, setConveyanceFee] = useState('')
  const [examFee, setExamFee] = useState('')
  const [annualFee, setAnnualFee] = useState('')
  const [admissionFee, setAdmissionFee] = useState('')
  const [lateFee, setLateFee] = useState('')

  // Single-month amounts
  const [totalAmount, setTotalAmount] = useState('')
  const [amount, setAmount] = useState('')
  const [remainingAmount, setRemainingAmount] = useState('')
  const [chequeNo, setChequeNo] = useState('')
  const [status, setStatus] = useState('pending')
  const [paymentDate, setPaymentDate] = useState(now)
  const [paymentMode, setPaymentMode] = useState('cash')
  const [submitting, setSubmitting] = useState(false)

  // Multi-Month Mode state
  const [isMultiMonth, setIsMultiMonth] = useState(false)
  const initialSession = getAcademicSession(now.getFullYear(), MONTH_OPTIONS[now.getMonth()]) || '2026-27'
  const [session, setSession] = useState(initialSession)
  const [selectedMonths, setSelectedMonths] = useState(new Set())
  const [nonRecurringOverrides, setNonRecurringOverrides] = useState({
    examFee: '',
    annualFee: '',
    admissionFee: '',
    lateFee: '',
  })
  const [totalReceivedInput, setTotalReceivedInput] = useState('')
  const [manualAllocations, setManualAllocations] = useState({})
  const [existingFees, setExistingFees] = useState([])

  // Subscribe to existing fee records for this student to detect prior payments/top-ups
  useEffect(() => {
    if (!student?.id) return
    const unsub = subscribeFeesForStudent(student.id, (list) => {
      setExistingFees(list || [])
    })
    return () => unsub()
  }, [student?.id])

  // Single-month auto-recalculation from fee schedule
  const recalculateFromSchedule = (overrides = {}) => {
    const t = overrides.tuitionFee !== undefined ? overrides.tuitionFee : tuitionFee
    const c = overrides.conveyanceFee !== undefined ? overrides.conveyanceFee : conveyanceFee
    const e = overrides.examFee !== undefined ? overrides.examFee : examFee
    const an = overrides.annualFee !== undefined ? overrides.annualFee : annualFee
    const ad = overrides.admissionFee !== undefined ? overrides.admissionFee : admissionFee
    const l = overrides.lateFee !== undefined ? overrides.lateFee : lateFee

    const hasAnySchedule = [t, c, e, an, ad, l].some((v) => v !== '')
    if (!hasAnySchedule) return

    const sum =
      (Number(t) || 0) +
      (Number(c) || 0) +
      (Number(e) || 0) +
      (Number(an) || 0) +
      (Number(ad) || 0) +
      (Number(l) || 0)

    setTotalAmount(String(sum))
    if (status === 'paid') {
      setAmount(String(sum))
      setRemainingAmount('0')
    } else {
      const paid = Number(amount || 0)
      setRemainingAmount(String(Math.max(0, sum - paid)))
    }
  }

  const handleScheduleChange = (field, val) => {
    if (field === 'tuition') setTuitionFee(val)
    if (field === 'conveyance') setConveyanceFee(val)
    if (field === 'exam') setExamFee(val)
    if (field === 'annual') setAnnualFee(val)
    if (field === 'admission') setAdmissionFee(val)
    if (field === 'late') setLateFee(val)

    if (!isMultiMonth) {
      recalculateFromSchedule({
        [field === 'tuition'
          ? 'tuitionFee'
          : field === 'conveyance'
            ? 'conveyanceFee'
            : field === 'exam'
              ? 'examFee'
              : field === 'annual'
                ? 'annualFee'
                : field === 'admission'
                  ? 'admissionFee'
                  : 'lateFee']: val,
      })
    }
  }

  const handleTotalAmountChange = (val) => {
    setTotalAmount(val)
    if (val === '') {
      setRemainingAmount('')
      return
    }
    const tot = Number(val)
    if (amount !== '') {
      const paid = Number(amount)
      setRemainingAmount(String(Math.max(0, tot - paid)))
    } else if (status === 'paid') {
      setAmount(val)
      setRemainingAmount('0')
    } else {
      setRemainingAmount(val)
    }
  }

  const handlePaidAmountChange = (val) => {
    setAmount(val)
    if (val === '') {
      if (totalAmount !== '') {
        setRemainingAmount(totalAmount)
      } else {
        setRemainingAmount('')
      }
      return
    }
    const paid = Number(val)
    if (totalAmount !== '') {
      const tot = Number(totalAmount)
      setRemainingAmount(String(Math.max(0, tot - paid)))
    } else {
      setRemainingAmount('0')
      setTotalAmount(val)
    }
  }

  const handleRemainingAmountChange = (val) => {
    setRemainingAmount(val)
    if (val === '') return
    const rem = Number(val)
    if (totalAmount !== '') {
      const tot = Number(totalAmount)
      setAmount(String(Math.max(0, tot - rem)))
    } else if (amount !== '') {
      const paid = Number(amount)
      setTotalAmount(String(paid + rem))
    }
  }

  // Multi-Month: Build academic months list for the current session
  const academicMonthsInSession = useMemo(() => {
    return ACADEMIC_MONTH_ORDER.map((m) => {
      const calYear = getYearForAcademicMonth(session, m)
      return {
        month: m,
        year: calYear,
        label: `${m.slice(0, 3)} ${calYear}`,
      }
    })
  }, [session])

  const handleModeToggle = (checked) => {
    setIsMultiMonth(checked)
    if (checked) {
      setSelectedMonths(new Set())
      setTotalReceivedInput('')
      setManualAllocations({})
    }
  }

  const handleMonthToggle = (monthName, checked) => {
    setSelectedMonths((prev) => {
      const next = new Set(prev)
      if (checked) {
        if (next.size < 12) next.add(monthName)
      } else {
        next.delete(monthName)
      }
      return next
    })
    // Reset manual allocations on month changes so auto-allocation re-runs
    setManualAllocations({})
  }

  // Quick Select buttons for academic quarters
  const selectQuarter = (monthNames) => {
    setSelectedMonths(new Set(monthNames))
    setManualAllocations({})
  }

  // Multi-Month: Prepare schedule & run allocation
  const multiMonthSchedule = useMemo(() => {
    if (!isMultiMonth || selectedMonths.size === 0) return []

    const monthsPayload = Array.from(selectedMonths).map((mName) => {
      const calYear = getYearForAcademicMonth(session, mName)
      const existing = existingFees.find(
        (f) => f.month === mName && Number(f.year) === Number(calYear) && !f.deleted,
      )
      return {
        month: mName,
        year: calYear,
        existingRecord: existing || null,
      }
    })

    return calculateMultiMonthSchedule({
      months: monthsPayload,
      breakdown: {
        tuitionFee,
        conveyanceFee,
        examFee,
        annualFee,
        admissionFee,
        lateFee,
      },
      nonRecurringOverrides,
    })
  }, [
    isMultiMonth,
    selectedMonths,
    session,
    existingFees,
    tuitionFee,
    conveyanceFee,
    examFee,
    annualFee,
    admissionFee,
    lateFee,
    nonRecurringOverrides,
  ])

  // Total net due across all selected months
  const totalNetDue = useMemo(() => {
    return multiMonthSchedule.reduce((acc, m) => acc + (m.isFullyPaid ? 0 : m.netDue), 0)
  }, [multiMonthSchedule])

  // Live Allocation calculation
  const allocationState = useMemo(() => {
    if (!isMultiMonth || multiMonthSchedule.length === 0) {
      return {
        allocations: [],
        totalReceived: 0,
        totalNetDue: 0,
        totalAllocated: 0,
        unallocatedAmount: 0,
        isValid: false,
      }
    }

    const received = toRupees(totalReceivedInput)
    return allocateMultiMonthPayment({
      scheduledMonths: multiMonthSchedule,
      totalReceived: received,
      manualAllocations: Object.keys(manualAllocations).length > 0 ? manualAllocations : null,
    })
  }, [isMultiMonth, multiMonthSchedule, totalReceivedInput, manualAllocations])

  // Amount in words
  const amountInWordsText = useMemo(() => {
    if (isMultiMonth) {
      const rec = toRupees(totalReceivedInput)
      return rec > 0 ? numberToWordsIndian(rec) : ''
    }
    const val = status === 'paid' ? amount || totalAmount : totalAmount || amount
    return numberToWordsIndian(val)
  }, [isMultiMonth, totalReceivedInput, amount, totalAmount, status])

  const setPending = () => {
    setStatus('pending')
    setPaymentDate(null)
  }

  const setPaid = () => {
    setStatus('paid')
    setPaymentDate((prev) => prev || new Date())
  }

  // Handle manual edit in a preview cell
  const handleManualCellChange = (monthKey, val) => {
    const num = val === '' ? 0 : toRupees(val)
    setManualAllocations((prev) => ({
      ...prev,
      [monthKey]: num,
    }))
  }

  const handleResetToAuto = () => {
    setManualAllocations({})
  }

  const handleFillFullDue = () => {
    setTotalReceivedInput(String(totalNetDue))
    setManualAllocations({})
  }

  if (!student) return null

  // Single-month submission
  const handleSingleMonthSubmit = async () => {
    setSubmitting(true)
    try {
      const paidNum = toRupees(amount || 0)
      const tFee = tuitionFee !== '' ? toRupees(tuitionFee) : paidNum
      const cFee = conveyanceFee !== '' ? toRupees(conveyanceFee) : 0
      const eFee = examFee !== '' ? toRupees(examFee) : 0
      const anFee = annualFee !== '' ? toRupees(annualFee) : 0
      const adFee = admissionFee !== '' ? toRupees(admissionFee) : 0
      const lFee = lateFee !== '' ? toRupees(lateFee) : 0
      const scheduleSum = tFee + cFee + eFee + anFee + adFee + lFee

      const totNum =
        totalAmount !== ''
          ? toRupees(totalAmount)
          : scheduleSum > 0
            ? scheduleSum
            : remainingAmount !== ''
              ? paidNum + toRupees(remainingAmount)
              : paidNum

      const remNum =
        remainingAmount !== ''
          ? toRupees(remainingAmount)
          : totalAmount !== '' || scheduleSum > 0
            ? Math.max(0, totNum - paidNum)
            : 0

      const result = await createFeeRecord({
        studentId: student.id,
        studentName: student.name,
        class: student.class,
        month,
        year,
        amount: paidNum,
        totalAmount: totNum,
        remainingAmount: remNum,
        tuitionFee: tFee,
        conveyanceFee: cFee,
        examFee: eFee,
        annualFee: anFee,
        admissionFee: adFee,
        lateFee: lFee,
        chequeNo: chequeNo.trim(),
        amountInWords: amountInWordsText,
        status,
        paymentDate: status === 'paid' ? paymentDate : null,
        mode: paymentMode,
        enteredBy: user?.email || '',
      })

      if (result?.receiptNo) {
        showToast(`Fee saved. Receipt: ${result.receiptNo}`, 'success')
      } else {
        showToast('Fee record saved successfully.', 'success')
      }

      onCreated?.()
      onClose()
    } catch (err) {
      showToast(err?.message || 'Could not save fee.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Multi-month submission
  const handleMultiMonthSubmit = async () => {
    if (!allocationState.isValid) {
      if (allocationState.exceedsTotalDue) {
        showToast(`Amount received exceeds total due (₹${totalNetDue.toLocaleString()}).`, 'error')
        return
      }
      if (allocationState.unallocatedAmount !== 0) {
        showToast('Please ensure the total received is fully allocated across months.', 'error')
        return
      }
      showToast('Please enter a valid amount received.', 'error')
      return
    }

    setSubmitting(true)
    try {
      const monthsPayload = Array.from(selectedMonths).map((mName) => ({
        month: mName,
        year: getYearForAcademicMonth(session, mName),
      }))

      const result = await recordFeePaymentTransaction({
        student,
        months: monthsPayload,
        breakdown: {
          tuitionFee,
          conveyanceFee,
          examFee,
          annualFee,
          admissionFee,
          lateFee,
        },
        nonRecurringOverrides,
        totalReceived: allocationState.totalReceived,
        manualAllocations: Object.keys(manualAllocations).length > 0 ? manualAllocations : null,
        paymentMode,
        reference: chequeNo.trim(),
        paymentDate: paymentDate || new Date(),
        enteredBy: user?.email || '',
      })

      showToast(
        `Payment of ₹${allocationState.totalReceived.toLocaleString()} saved with Receipt ${result.receiptNo} across ${monthsPayload.length} months.`,
        'success',
      )
      onCreated?.()
      onClose()
    } catch (err) {
      console.error('Multi-month fee payment failed:', err)
      showToast(err?.message || 'Failed to save multi-month fee payment.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isMultiMonth) {
      if (selectedMonths.size < 2) {
        showToast('Select at least 2 months for multi-month payment.', 'error')
        return
      }
      await handleMultiMonthSubmit()
    } else {
      const validation = validateInputs({
        amount,
        totalAmount,
        remainingAmount,
        status,
        paymentDate,
        isMultiMonth: false,
        selectedMonths: new Set(),
      })
      if (!validation.valid) {
        showToast(validation.error, 'error')
        return
      }
      await handleSingleMonthSubmit()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-fee-title"
    >
      <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="add-fee-title" className="text-xl font-bold text-slate-900">
                {isMultiMonth ? 'Multi-Month Fee Payment' : 'Add Fee Record'}
              </h2>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                Parma Academy
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Student: <strong className="text-slate-900">{student.name}</strong> ({student.id}) · Class: {student.class}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
          {/* Mode Switcher */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900">Multi-Month Entry Mode</span>
              <p className="text-[11px] text-slate-500">Collect fees across multiple academic months in one payment</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isMultiMonth}
                onChange={(e) => handleModeToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* SINGLE-MONTH: Month & Year Dropdowns (Original Layout) */}
          {!isMultiMonth && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="fee-month" className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                  Month
                </label>
                <select
                  id="fee-month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m} value={m} className="bg-white text-slate-900">
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="fee-year" className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                  Year
                </label>
                <select
                  id="fee-year"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                >
                  {yearOptions().map((y) => (
                    <option key={y} value={y} className="bg-white text-slate-900">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* MULTI-MONTH: Academic Session & Month Selector Grid */}
          {isMultiMonth && (
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/20 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                    Academic Session &amp; Months
                  </span>
                  <p className="text-[11px] text-slate-600">Academic year runs April to March</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-600">Session:</span>
                  <select
                    value={session}
                    onChange={(e) => {
                      setSession(e.target.value)
                      setSelectedMonths(new Set())
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                  >
                    {sessionOptions().map((s) => (
                      <option key={s} value={s} className="bg-white text-slate-900">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Month Checkboxes (April to March in Academic Order) */}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 pt-1">
                {academicMonthsInSession.map((mObj) => {
                  const isChecked = selectedMonths.has(mObj.month)
                  const existing = existingFees.find(
                    (f) => f.month === mObj.month && Number(f.year) === Number(mObj.year) && !f.deleted,
                  )
                  const isAlreadyPaid = existing && existing.status === 'paid' && existing.remainingAmount <= 0

                  return (
                    <label
                      key={mObj.month}
                      className={`flex flex-col justify-center rounded-xl border p-2 text-xs transition cursor-pointer ${
                        isChecked
                          ? 'border-emerald-600 bg-emerald-500/10 text-emerald-900 font-bold'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleMonthToggle(mObj.month, e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{mObj.label}</span>
                      </div>
                      {isAlreadyPaid && (
                        <span className="text-[10px] text-emerald-700 font-medium pl-4">Cleared</span>
                      )}
                      {existing && existing.remainingAmount > 0 && (
                        <span className="text-[10px] text-amber-700 font-medium pl-4">Bal: ₹{existing.remainingAmount}</span>
                      )}
                    </label>
                  )
                })}
              </div>

              {/* Quick Select Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-slate-500 mr-1">Quick Select:</span>
                <button
                  type="button"
                  onClick={() => selectQuarter(['April', 'May', 'June'])}
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700 hover:border-emerald-500"
                >
                  Q1 (Apr–Jun)
                </button>
                <button
                  type="button"
                  onClick={() => selectQuarter(['July', 'August', 'September'])}
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700 hover:border-emerald-500"
                >
                  Q2 (Jul–Sep)
                </button>
                <button
                  type="button"
                  onClick={() => selectQuarter(['October', 'November', 'December'])}
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700 hover:border-emerald-500"
                >
                  Q3 (Oct–Dec)
                </button>
                <button
                  type="button"
                  onClick={() => selectQuarter(['January', 'February', 'March'])}
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700 hover:border-emerald-500"
                >
                  Q4 (Jan–Mar)
                </button>
                <button
                  type="button"
                  onClick={() => selectQuarter(ACADEMIC_MONTH_ORDER)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700 hover:border-emerald-500"
                >
                  Full Session
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMonths(new Set())}
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-500 hover:text-rose-600"
                >
                  Clear
                </button>
              </div>

              {selectedMonths.size === 1 && (
                <p className="text-xs text-amber-700 font-semibold">
                  ⚠️ Select at least 2 months for multi-month mode, or toggle off to use single-month mode.
                </p>
              )}
            </div>
          )}

          {/* 6-Item Fee Schedule Breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {isMultiMonth ? 'Fee Schedule (Per Month Rates)' : 'Fee Schedule Breakdown'}
                </h3>
                {isMultiMonth && (
                  <p className="text-[11px] text-slate-500">
                    Tuition &amp; Conveyance apply to every selected month. Other charges attach to the first month.
                  </p>
                )}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Physical Receipt Book</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="fee-tuition" className="mb-1 block text-xs font-medium text-slate-700">
                  1. Tuition Fee (₹) {isMultiMonth && <span className="text-emerald-700 text-[10px] font-bold">/ month</span>}
                </label>
                <input
                  id="fee-tuition"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={tuitionFee}
                  onChange={(e) => handleScheduleChange('tuition', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label htmlFor="fee-conveyance" className="mb-1 block text-xs font-medium text-slate-700">
                  2. Conveyance Fee (₹) {isMultiMonth && <span className="text-emerald-700 text-[10px] font-bold">/ month</span>}
                </label>
                <input
                  id="fee-conveyance"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={conveyanceFee}
                  onChange={(e) => handleScheduleChange('conveyance', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="fee-exam" className="block text-xs font-medium text-slate-700">
                    3. Exam Fee (₹)
                  </label>
                  {isMultiMonth && selectedMonths.size > 1 && (
                    <select
                      value={nonRecurringOverrides.examFee}
                      onChange={(e) => setNonRecurringOverrides((p) => ({ ...p, examFee: e.target.value }))}
                      className="text-[10px] font-semibold text-slate-900 border border-slate-300 rounded px-1.5 py-0.5 bg-white outline-none"
                    >
                      <option value="" className="bg-white text-slate-900">1st Month</option>
                      {Array.from(selectedMonths).map((m) => (
                        <option key={m} value={m} className="bg-white text-slate-900">{m.slice(0, 3)}</option>
                      ))}
                    </select>
                  )}
                </div>
                <input
                  id="fee-exam"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={examFee}
                  onChange={(e) => handleScheduleChange('exam', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="fee-annual" className="block text-xs font-medium text-slate-700">
                    4. Annual / Class Transfer (₹)
                  </label>
                  {isMultiMonth && selectedMonths.size > 1 && (
                    <select
                      value={nonRecurringOverrides.annualFee}
                      onChange={(e) => setNonRecurringOverrides((p) => ({ ...p, annualFee: e.target.value }))}
                      className="text-[10px] font-semibold text-slate-900 border border-slate-300 rounded px-1.5 py-0.5 bg-white outline-none"
                    >
                      <option value="" className="bg-white text-slate-900">1st Month</option>
                      {Array.from(selectedMonths).map((m) => (
                        <option key={m} value={m} className="bg-white text-slate-900">{m.slice(0, 3)}</option>
                      ))}
                    </select>
                  )}
                </div>
                <input
                  id="fee-annual"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={annualFee}
                  onChange={(e) => handleScheduleChange('annual', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="fee-admission" className="block text-xs font-medium text-slate-700">
                    5. Admission / Re-Admission (₹)
                  </label>
                  {isMultiMonth && selectedMonths.size > 1 && (
                    <select
                      value={nonRecurringOverrides.admissionFee}
                      onChange={(e) => setNonRecurringOverrides((p) => ({ ...p, admissionFee: e.target.value }))}
                      className="text-[10px] font-semibold text-slate-900 border border-slate-300 rounded px-1.5 py-0.5 bg-white outline-none"
                    >
                      <option value="" className="bg-white text-slate-900">1st Month</option>
                      {Array.from(selectedMonths).map((m) => (
                        <option key={m} value={m} className="bg-white text-slate-900">{m.slice(0, 3)}</option>
                      ))}
                    </select>
                  )}
                </div>
                <input
                  id="fee-admission"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={admissionFee}
                  onChange={(e) => handleScheduleChange('admission', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="fee-late" className="block text-xs font-medium text-slate-700">
                    6. Late Fee (₹)
                  </label>
                  {isMultiMonth && selectedMonths.size > 1 && (
                    <select
                      value={nonRecurringOverrides.lateFee}
                      onChange={(e) => setNonRecurringOverrides((p) => ({ ...p, lateFee: e.target.value }))}
                      className="text-[10px] font-semibold text-slate-900 border border-slate-300 rounded px-1.5 py-0.5 bg-white outline-none"
                    >
                      <option value="" className="bg-white text-slate-900">1st Month</option>
                      {Array.from(selectedMonths).map((m) => (
                        <option key={m} value={m} className="bg-white text-slate-900">{m.slice(0, 3)}</option>
                      ))}
                    </select>
                  )}
                </div>
                <input
                  id="fee-late"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={lateFee}
                  onChange={(e) => handleScheduleChange('late', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>
          </div>

          {/* SINGLE-MONTH: Financial Summary (Total, Paid, Remaining) */}
          {!isMultiMonth && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="fee-total-amount" className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                  Total Fee (INR)
                </label>
                <input
                  id="fee-total-amount"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 2000"
                  value={totalAmount}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div>
                <label htmlFor="fee-amount" className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                  Amount Paid (INR)
                </label>
                <input
                  id="fee-amount"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 1500"
                  value={amount}
                  onChange={(e) => handlePaidAmountChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-950 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  required
                />
              </div>
              <div>
                <label htmlFor="fee-remaining" className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                  Remaining Due (INR)
                </label>
                <input
                  id="fee-remaining"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={remainingAmount}
                  onChange={(e) => handleRemainingAmountChange(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 placeholder:text-slate-400 ${
                    Number(remainingAmount) > 0
                      ? 'border-amber-400 bg-amber-50/70 font-semibold text-amber-950 focus:border-amber-500 focus:ring-amber-200'
                      : 'border-slate-300 bg-slate-50 font-semibold text-slate-900 focus:border-emerald-500 focus:ring-emerald-200'
                  }`}
                />
              </div>
            </div>
          )}

          {/* MULTI-MONTH: Total Due & Total Received with Auto-Allocation */}
          {isMultiMonth && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Total Due (Read-only) */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Total Due ({selectedMonths.size} Months)
                  </span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    ₹ {totalNetDue.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Sum of scheduled amounts for all selected months
                  </p>
                </div>

                {/* Amount Received Input */}
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50/40 p-3.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="fee-received-multi" className="text-[11px] font-bold uppercase tracking-wider text-emerald-950">
                      Total Amount Received (INR)
                    </label>
                    {totalNetDue > 0 && (
                      <button
                        type="button"
                        onClick={handleFillFullDue}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline"
                      >
                        Fill Full Due
                      </button>
                    )}
                  </div>
                  <input
                    id="fee-received-multi"
                    type="number"
                    min="0"
                    step="1"
                    placeholder={`e.g. ${totalNetDue || 4200}`}
                    value={totalReceivedInput}
                    onChange={(e) => {
                      setTotalReceivedInput(e.target.value)
                      setManualAllocations({})
                    }}
                    className="mt-1 w-full rounded-xl border border-emerald-500 bg-white px-3 py-2 text-xl font-black text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm"
                    required
                  />
                  <p className="text-[11px] text-slate-600 mt-1 font-medium">
                    {totalNetDue > 0
                      ? `₹${totalNetDue.toLocaleString()} due across ${selectedMonths.size} month${selectedMonths.size > 1 ? 's' : ''}`
                      : 'Select months and enter fee rates above'}
                  </p>
                </div>
              </div>

              {/* LIVE ALLOCATION PREVIEW TABLE */}
              {selectedMonths.size > 0 && (
                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-100/90 px-3.5 py-2 flex items-center justify-between border-b border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Monthly Fee Allocation Preview (Oldest Month First)
                    </span>
                    {Object.keys(manualAllocations).length > 0 && (
                      <button
                        type="button"
                        onClick={handleResetToAuto}
                        className="text-[11px] font-semibold text-emerald-700 hover:underline"
                      >
                        ↺ Reset to Auto Allocation
                      </button>
                    )}
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2 px-3">Month</th>
                        <th className="py-2 px-3 text-right">Due (₹)</th>
                        <th className="py-2 px-3 text-right" style={{ width: '130px' }}>Paid (₹)</th>
                        <th className="py-2 px-3 text-right">Remaining (₹)</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allocationState.allocations.map((a) => {
                        const monthKey = `${a.month}_${a.year}`
                        return (
                          <tr key={monthKey} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {a.month} {a.year}
                              {a.isFullyPaid && (
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  Already fully paid (skipped)
                                </span>
                              )}
                              {a.existingRecord && !a.isFullyPaid && a.existingPaid > 0 && (
                                <span className="block text-[10px] text-amber-700 font-normal">
                                  Prev paid: ₹{a.existingPaid} (Top-up mode)
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-slate-700">
                              ₹ {a.totalAmount.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                max={a.totalAmount}
                                value={a.allocatedPaid}
                                disabled={a.isFullyPaid}
                                onChange={(e) => handleManualCellChange(monthKey, e.target.value)}
                                className={`w-full rounded-lg border px-2 py-1 text-right text-xs font-bold outline-none ${
                                  a.allocatedPaid > 0
                                    ? 'border-emerald-500 bg-emerald-50/70 text-slate-900'
                                    : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'
                                }`}
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-700">
                              {a.remainingAmount > 0 ? (
                                <span className="text-amber-800">₹ {a.remainingAmount.toLocaleString()}</span>
                              ) : (
                                <span className="text-emerald-700">₹ 0</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  a.status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : a.status === 'partial'
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {a.status === 'paid' ? 'Paid' : a.status === 'partial' ? 'Partial' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {/* Allocation Status Bar */}
                  <div className="bg-slate-50 px-3.5 py-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span>Total Allocated: <strong>₹ {allocationState.totalAllocated.toLocaleString()}</strong></span>
                      {allocationState.unallocatedAmount > 0 && (
                        <span className="ml-3 font-semibold text-amber-700">
                          ⚠️ Unallocated: ₹ {allocationState.unallocatedAmount.toLocaleString()}
                        </span>
                      )}
                      {allocationState.unallocatedAmount < 0 && (
                        <span className="ml-3 font-semibold text-rose-700">
                          ⚠️ Over-allocated: ₹ {Math.abs(allocationState.unallocatedAmount).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {allocationState.exceedsTotalDue && (
                      <span className="font-semibold text-rose-700">
                        ❌ Overpayment: Exceeds total due
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Amount in Words */}
          {amountInWordsText ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Amount in Words:</span>{' '}
              <span className="italic">{amountInWordsText}</span>
            </div>
          ) : null}

          {/* Mode & Reference */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="fee-mode" className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                Payment Mode
              </label>
              <select
                id="fee-mode"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                <option value="cash" className="bg-white text-slate-900">Cash</option>
                <option value="upi" className="bg-white text-slate-900">UPI / Online</option>
                <option value="cheque" className="bg-white text-slate-900">Cheque / Demand Draft</option>
                <option value="bank" className="bg-white text-slate-900">Bank Transfer / NEFT</option>
                <option value="other" className="bg-white text-slate-900">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="fee-cheque-no" className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                Cheque No. / Transaction Ref. (Optional)
              </label>
              <input
                id="fee-cheque-no"
                type="text"
                placeholder="e.g. CHQ-994821 or UPI-Ref"
                value={chequeNo}
                onChange={(e) => setChequeNo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>

          {/* Single-Month Status & Payment Date (Original Single-Month Layout) */}
          {!isMultiMonth && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-600">Status</span>
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="fee-status"
                      checked={status === 'pending'}
                      onChange={setPending}
                    />
                    Pending
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="fee-status"
                      checked={status === 'paid'}
                      onChange={setPaid}
                    />
                    Paid
                  </label>
                </div>
              </div>

              {status === 'paid' ? (
                <div>
                  <span className="mb-1 block text-xs font-semibold uppercase text-slate-600">Payment date</span>
                  <DatePicker
                    selected={paymentDate}
                    onChange={setPaymentDate}
                    dateFormat="dd/MM/yyyy"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              ) : null}
            </div>
          )}

          {/* Multi-Month Payment Date */}
          {isMultiMonth && (
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase text-slate-600">Payment date</span>
              <DatePicker
                selected={paymentDate}
                onChange={setPaymentDate}
                dateFormat="dd/MM/yyyy"
                className="w-full sm:w-1/2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={
                submitting ||
                (isMultiMonth &&
                  (selectedMonths.size < 2 ||
                    !allocationState.isValid ||
                    allocationState.totalReceived <= 0 ||
                    allocationState.unallocatedAmount !== 0))
              }
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
            >
              {submitting
                ? 'Processing Payment...'
                : isMultiMonth
                  ? `Save Multi-Month Payment (${selectedMonths.size} Months · ₹${toRupees(totalReceivedInput).toLocaleString()})`
                  : 'Save Fee Record'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddFeeModal
