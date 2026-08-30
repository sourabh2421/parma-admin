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
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState('pending')
  const [paymentDate, setPaymentDate] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  
  // Multi-month mode state (Requirement 1.1, 1.2, 1.3, 1.4)
  const [isMultiMonth, setIsMultiMonth] = useState(false)
  const [selectedMonths, setSelectedMonths] = useState(new Set())
  const [processingIndex, setProcessingIndex] = useState(0)

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
      const result = await createFeeRecord({
        studentId: student.id,
        studentName: student.name,
        class: student.class,
        month,
        year,
        amount: Number(amount),
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
    
    // Task 7.2: Sequential fee creation loop
    // Requirements 6.1, 6.2: Call createFeeRecord N times with unique month, shared fee details
    // Requirement 7.1: Continue processing on failure
    // Requirement 7.3: Do not roll back successful records
    for (let i = 0; i < monthsArray.length; i++) {
      const currentMonth = monthsArray[i]
      setProcessingIndex(i) // Update progress display (Requirement 8.4)
      
      try {
        const result = await createFeeRecord({
          studentId: student.id,
          studentName: student.name,
          class: student.class,
          month: currentMonth, // Unique month parameter (Requirement 6.2)
          year, // Shared fee detail (Requirement 4.4, 6.2)
          amount: Number(amount), // Shared fee detail (Requirement 4.4, 6.2)
          status, // Shared fee detail (Requirement 4.5, 6.2)
          paymentDate: status === 'paid' ? paymentDate : null, // Shared fee detail (Requirement 4.6, 6.2)
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
    // Requirements 7.4, 8.1, 8.2, 8.3, 9.1, 9.2
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
      // Keep modal open so user can see failures and retry
    } else {
      // Total failure: all months failed
      showToast(message, 'error')
      // Keep modal open, do not call onCreated
    }
  }

  // Main submission handler - Task 10
  // Requirements 10.1, 10.2, 10.3: Validate inputs, show errors, branch on mode
  const handleSubmit = async (event) => {
    event.preventDefault()
    
    // Task 10: Call validateInputs with all required params (Requirement 10.1)
    const validation = validateInputs({ amount, status, paymentDate, isMultiMonth, selectedMonths })
    if (!validation.valid) {
      // Task 10: Show toast on validation error (Requirement 10.2)
      showToast(validation.error, 'error')
      return
    }

    // Task 10: Branch on isMultiMonth to call appropriate submission handler (Requirement 10.3)
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
          {/* Mode Toggle Control (Requirement 1.1) */}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isMultiMonth}
              onChange={(e) => handleModeToggle(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-200"
            />
            Create fees for multiple months
          </label>

          {/* Single Month Dropdown - Requirement 2.1 */}
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

          {/* Multi-Month Checkbox Grid - Requirement 3.1 */}
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

          <div>
            <label htmlFor="fee-amount" className="mb-1 block text-sm font-medium text-slate-700">
              Fee amount (INR)
            </label>
            <input
              id="fee-amount"
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              required
            />
          </div>

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
