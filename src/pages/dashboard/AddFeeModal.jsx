import { useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { createFeeRecord } from '../../firebase/feeRepository.js'
import { useToast } from '../../context/useToast.js'
import { validateInputs } from '../../utils/feeValidation.js'
import { formatMonthRange } from '../../utils/monthRangeFormatter.js'

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

function AddFeeModal({ student, onClose, onCreated }) {
  const { showToast } = useToast()
  const now = new Date()
  const [month, setMonth] = useState(MONTH_OPTIONS[now.getMonth()])
  const [year, setYear] = useState(now.getFullYear())
  const [totalAmount, setTotalAmount] = useState('')
  const [amount, setAmount] = useState('')
  const [remainingAmount, setRemainingAmount] = useState('')
  const [status, setStatus] = useState('pending')
  const [paymentDate, setPaymentDate] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  
  // Multi-month mode state (Requirement 1.1, 1.2, 1.3, 1.4)
  const [isMultiMonth, setIsMultiMonth] = useState(false)
  const [selectedMonths, setSelectedMonths] = useState(new Set())
  const [processingIndex, setProcessingIndex] = useState(0)

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

  // Handle mode toggle (Requirement 1.3, 1.4)
  const handleModeToggle = (checked) => {
    setIsMultiMonth(checked)
    if (checked) {
      // Switching to Multi-Month Mode: clear selectedMonths (Requirement 1.4)
      setSelectedMonths(new Set())
    }
    // Switching to Single Month Mode: month state already exists, no clearing needed
  }

  // Handle month checkbox toggle in Multi-Month Mode (Requirement 3.2, 3.5)
  const handleMonthToggle = (month, checked) => {
    setSelectedMonths((prev) => {
      const next = new Set(prev)
      if (checked) {
        if (next.size < 12) {
          next.add(month)
        }
      } else {
        next.delete(month)
      }
      return next
    })
  }

  const setPending = () => {
    setStatus('pending')
    setPaymentDate(null)
  }

  const setPaid = () => {
    setStatus('paid')
    setPaymentDate((prev) => prev || new Date())
  }

  if (!student) return null

  // Single-month submission handler (extracted from original handleSubmit)
  // Requirements 2.3, 2.4: Preserve existing single-month behavior
  const handleSingleMonthSubmit = async () => {
    setSubmitting(true)
    try {
      const paidNum = Number(amount || 0)
      const totNum =
        totalAmount !== ''
          ? Number(totalAmount)
          : remainingAmount !== ''
            ? paidNum + Number(remainingAmount)
            : paidNum
      const remNum =
        remainingAmount !== ''
          ? Number(remainingAmount)
          : totalAmount !== ''
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
        status,
        paymentDate: status === 'paid' ? paymentDate : null,
      })
      
      // Existing result handling: toast messages for merge/revival/update
      if (result?.mergedDuplicates > 0) {
        showToast(
          `Fee saved. ${result.mergedDuplicates} extra duplicate row(s) for this month were archived.`,
          'success',
        )
      } else if (result?.revived) {
        showToast('Fee record restored (previously archived for this month).', 'success')
      } else if (result?.isUpdate) {
        showToast('Fee record updated for this student, month, and year.', 'success')
      } else {
        showToast('Fee record saved.', 'success')
      }
      
      // Modal close and callback
      onCreated?.()
      onClose()
    } catch (err) {
      showToast(err?.message || 'Could not save fee.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Format success message for bulk creation results - Task 8.1
  // Requirements 7.4, 8.1, 8.3: Handle full success/partial/total failure with counts, month range, metadata
  const formatSuccessMessage = (results) => {
    const { successes, failures, mergedCount, revivedCount, updateCount } = results
    
    if (failures.length === 0) {
      // Full success: all months created successfully (Requirement 8.1)
      const count = successes.length
      const monthRange = formatMonthRange(successes, year)
      let msg = `${count} fee record${count > 1 ? 's' : ''} created for ${monthRange}`
      
      // Append metadata if present (Requirement 8.3)
      // Add period before first metadata item
      let hasMetadata = false
      if (mergedCount > 0) {
        msg += `. ${mergedCount} duplicate row(s) were archived.`
        hasMetadata = true
      }
      if (revivedCount > 0) {
        msg += `${!hasMetadata ? '.' : ''} ${revivedCount} record(s) were restored from archive.`
        hasMetadata = true
      }
      if (updateCount > 0) {
        msg += `${!hasMetadata ? '.' : ''} ${updateCount} existing record(s) were updated.`
      }
      
      return msg
    } else if (successes.length > 0) {
      // Partial success: some months succeeded, some failed (Requirement 7.4)
      const totalCount = successes.length + failures.length
      const failedMonths = failures.map(f => f.month).join(', ')
      return `${successes.length} of ${totalCount} fee records created. Failed months: ${failedMonths}`
    } else {
      // Total failure: all months failed
      return 'Failed to create fee records for all selected months. Check console for details.'
    }
  }

  // Multi-month submission handler - Task 7.1
  // Requirements 6.1, 7.2: Bulk creation with result tracking
  const handleMultiMonthSubmit = async () => {
    // Convert selectedMonths Set to array
    const monthsArray = Array.from(selectedMonths)
    
    // Initialize results tracking object
    const results = {
      successes: [],
      failures: [],
      mergedCount: 0,
      revivedCount: 0,
      updateCount: 0,
    }
    
    // Set submitting to true
    setSubmitting(true)
    
    const paidNum = Number(amount || 0)
    const totNum =
      totalAmount !== ''
        ? Number(totalAmount)
        : remainingAmount !== ''
          ? paidNum + Number(remainingAmount)
          : paidNum
    const remNum =
      remainingAmount !== ''
        ? Number(remainingAmount)
        : totalAmount !== ''
          ? Math.max(0, totNum - paidNum)
          : 0

    // Task 7.2: Sequential fee creation loop
    for (let i = 0; i < monthsArray.length; i++) {
      const currentMonth = monthsArray[i]
      setProcessingIndex(i) // Update progress display (Requirement 8.4)
      
      try {
        const result = await createFeeRecord({
          studentId: student.id,
          studentName: student.name,
          class: student.class,
          month: currentMonth,
          year,
          amount: paidNum,
          totalAmount: totNum,
          remainingAmount: remNum,
          status,
          paymentDate: status === 'paid' ? paymentDate : null,
        })
        
        // Track success (Requirement 7.2)
        results.successes.push(currentMonth)
        
        // Aggregate metadata for final message (Requirement 8.3)
        if (result?.mergedDuplicates > 0) {
          results.mergedCount += result.mergedDuplicates
        }
        if (result?.revived) {
          results.revivedCount += 1
        }
        if (result?.isUpdate) {
          results.updateCount += 1
        }
      } catch (err) {
        // Track failure and continue to next month (Requirement 7.1, 7.2)
        results.failures.push({ 
          month: currentMonth, 
          error: err?.message || 'Unknown error' 
        })
        console.error(`Failed to create fee record for ${currentMonth}:`, err)
      }
    }
    
    setSubmitting(false)
    
    // Task 8.3: Post-loop feedback and result aggregation
    const message = formatSuccessMessage(results)
    
    if (results.failures.length === 0) {
      // Full success: all months created successfully
      showToast(message, 'success')
      onCreated?.() // Refresh parent data
      onClose() // Close modal
    } else if (results.successes.length > 0) {
      // Partial success: some months succeeded, some failed
      showToast(message, 'warning')
      onCreated?.() // Refresh parent data to show partial results
    } else {
      // Total failure: all months failed
      showToast(message, 'error')
    }
  }

  // Main submission handler - Task 10
  const handleSubmit = async (event) => {
    event.preventDefault()
    
    const validation = validateInputs({
      amount,
      totalAmount,
      remainingAmount,
      status,
      paymentDate,
      isMultiMonth,
      selectedMonths,
    })
    if (!validation.valid) {
      showToast(validation.error, 'error')
      return
    }

    if (isMultiMonth) {
      await handleMultiMonthSubmit()
    } else {
      await handleSingleMonthSubmit()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-fee-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="add-fee-title" className="text-lg font-bold text-slate-900">
              Add fee record
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {student.name} · {student.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {/* Mode Toggle Control */}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isMultiMonth}
              onChange={(e) => handleModeToggle(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-200"
            />
            Create fees for multiple months
          </label>

          {/* Single Month Dropdown */}
          {!isMultiMonth && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="fee-month" className="mb-1 block text-sm font-medium text-slate-700">
                  Month
                </label>
                <select
                  id="fee-month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="fee-year" className="mb-1 block text-sm font-medium text-slate-700">
                  Year
                </label>
                <select
                  id="fee-year"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                >
                  {yearOptions().map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Multi-Month Checkbox Grid */}
          {isMultiMonth && (
            <div>
              <div>
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Select months (2-12)
                </span>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {MONTH_OPTIONS.map((m) => (
                    <label
                      key={m}
                      className="flex items-center gap-1.5 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMonths.has(m)}
                        onChange={(e) => handleMonthToggle(m, e.target.checked)}
                        disabled={
                          !selectedMonths.has(m) && selectedMonths.size >= 12
                        }
                        className="rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-200"
                      />
                      {m.slice(0, 3)}
                    </label>
                  ))}
                </div>
                {selectedMonths.size > 0 && selectedMonths.size < 2 && (
                  <p className="mt-1 text-sm text-amber-600">
                    Select at least 2 months
                  </p>
                )}
                {selectedMonths.size >= 12 && (
                  <p className="mt-1 text-sm text-slate-600">
                    Maximum 12 months selected
                  </p>
                )}
              </div>
              <div className="mt-3">
                <label htmlFor="fee-year-multi" className="mb-1 block text-sm font-medium text-slate-700">
                  Year
                </label>
                <select
                  id="fee-year-multi"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                >
                  {yearOptions().map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Fee Amounts Breakdown (Total, Paid, Remaining) */}
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
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
                placeholder="e.g. 500"
                value={remainingAmount}
                onChange={(e) => handleRemainingAmountChange(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
                  Number(remainingAmount) > 0
                    ? 'border-amber-400 bg-amber-50/60 font-semibold text-amber-900 focus:border-amber-500 focus:ring-amber-200'
                    : 'border-slate-300 bg-slate-50 text-slate-700 focus:border-emerald-500 focus:ring-emerald-200'
                }`}
              />
            </div>
          </div>

          {Number(remainingAmount) > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              ⚠️ <strong>Partial payment noted:</strong> ₹{Number(amount || 0).toLocaleString()} paid, leaving a remaining balance of <strong>₹{Number(remainingAmount).toLocaleString()}</strong> which will be printed on both School & Parent receipts.
            </div>
          ) : null}

          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
            <div className="flex gap-4">
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
              <span className="mb-1 block text-sm font-medium text-slate-700">Payment date</span>
              <DatePicker
                selected={paymentDate}
                onChange={setPaymentDate}
                dateFormat="dd/MM/yyyy"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting
                ? isMultiMonth
                  ? `Saving ${processingIndex + 1} of ${selectedMonths.size}...`
                  : 'Saving…'
                : isMultiMonth
                  ? `Create ${selectedMonths.size} fee record${selectedMonths.size > 1 ? 's' : ''}`
                  : 'Save fee record'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
