/**
 * Pure allocation module for multi-month fee entry at Parma Academy.
 *
 * Rules:
 * - Academic calendar runs April to March.
 * - January, February, and March belong to the second calendar year of an academic session (e.g. 2026-27).
 * - Recurring fee heads (tuition, conveyance) apply to all selected months.
 * - Non-recurring fee heads (annual/transfer, admission, exam, late fee) attach to the FIRST selected month
 *   by default, with optional per-head month override.
 * - Currency is in whole Indian Rupees (integers), never floats.
 * - Allocations prioritize the oldest month first.
 * - Per-month status is derived strictly from amounts:
 *   - 'paid': remainingDue === 0
 *   - 'partial': 0 < paid < due
 *   - 'pending': paid === 0
 */

export const ACADEMIC_MONTH_ORDER = [
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'January',
  'February',
  'March',
]

export const RECURRING_HEADS = ['tuitionFee', 'conveyanceFee']
export const NON_RECURRING_HEADS = ['annualFee', 'admissionFee', 'examFee', 'lateFee']

/**
 * Returns month index in the April-March academic cycle (0 to 11).
 */
export function getAcademicMonthIndex(monthName) {
  if (!monthName) return -1
  const normalized = String(monthName).trim().toLowerCase()
  return ACADEMIC_MONTH_ORDER.findIndex(
    (m) => m.toLowerCase() === normalized,
  )
}

/**
 * Derives academic session string for a given month and year (e.g. "2026-27").
 * - April-December: Session starts in current year (e.g., May 2026 -> "2026-27").
 * - January-March: Session started in previous year (e.g., February 2027 -> "2026-27").
 */
export function getAcademicSession(year, month) {
  const y = Number(year)
  const idx = getAcademicMonthIndex(month)
  if (isNaN(y) || idx === -1) return ''

  // If month is Jan, Feb, or Mar (indexes 9, 10, 11), start year was y - 1
  const startYear = idx >= 9 ? y - 1 : y
  const endYearShort = String(startYear + 1).slice(-2)
  return `${startYear}-${endYearShort}`
}

/**
 * Calculates calendar year for a month given an academic session string (e.g. "2026-27").
 */
export function getYearForAcademicMonth(session, month) {
  if (!session || !month) return null
  const [startStr] = session.split('-')
  const startYear = parseInt(startStr, 10)
  if (isNaN(startYear)) return null

  const idx = getAcademicMonthIndex(month)
  if (idx === -1) return null

  // Jan, Feb, Mar belong to startYear + 1
  return idx >= 9 ? startYear + 1 : startYear
}

/**
 * Compares two month/year objects in chronological academic sequence.
 */
export function compareAcademicPeriod(a, b) {
  const yearA = Number(a.year) || 0
  const yearB = Number(b.year) || 0
  const idxA = getAcademicMonthIndex(a.month)
  const idxB = getAcademicMonthIndex(b.month)

  // Construct absolute academic order key:
  // If month is Jan-Mar (idx >= 9), it's part of the session starting year - 1
  // Absolute linear academic index:
  const sessionYearA = idxA >= 9 ? yearA - 1 : yearA
  const sessionYearB = idxB >= 9 ? yearB - 1 : yearB

  if (sessionYearA !== sessionYearB) {
    return sessionYearA - sessionYearB
  }
  return idxA - idxB
}

/**
 * Sorts an array of month records or names in academic order (oldest first).
 */
export function sortMonthsInAcademicOrder(items = []) {
  return [...items].sort((a, b) => compareAcademicPeriod(a, b))
}

/**
 * Sanitizes numbers to whole integer Rupees.
 */
export function toRupees(val) {
  const num = Number(val)
  if (!Number.isFinite(num) || num < 0) return 0
  return Math.round(num)
}

/**
 * Computes scheduled dues for each month in a multi-month selection.
 *
 * @param {Object} params
 * @param {Array<{ month: string, year: number, existingRecord?: Object }>} params.months
 * @param {Object} params.breakdown - Per-month recurring & non-recurring fee values
 * @param {Object} [params.nonRecurringOverrides] - Map of headName -> assigned month
 * @returns {Array} Array of months with calculated total due and breakdown
 */
export function calculateMultiMonthSchedule({
  months = [],
  breakdown = {},
  nonRecurringOverrides = {},
}) {
  if (!months || months.length === 0) return []

  const sortedMonths = sortMonthsInAcademicOrder(months)
  const firstMonth = sortedMonths[0]

  const tFee = toRupees(breakdown.tuitionFee)
  const cFee = toRupees(breakdown.conveyanceFee)
  const recurringPerMonth = tFee + cFee

  return sortedMonths.map((mObj, idx) => {
    const isFirst = idx === 0
    const mName = mObj.month
    const mYear = Number(mObj.year)

    // Recurring components apply to all selected months
    let tuition = tFee
    let conveyance = cFee

    // Non-recurring components apply to first month by default or overridden month
    const getHeadAmt = (head) => {
      const targetMonth = nonRecurringOverrides[head]
      if (targetMonth) {
        return targetMonth === mName ? toRupees(breakdown[head]) : 0
      }
      return isFirst ? toRupees(breakdown[head]) : 0
    }

    const exam = getHeadAmt('examFee')
    const annual = getHeadAmt('annualFee')
    const admission = getHeadAmt('admissionFee')
    const late = getHeadAmt('lateFee')

    const monthScheduledTotal = tuition + conveyance + exam + annual + admission + late

    // Check existing record for top-up calculation
    const existing = mObj.existingRecord
    let existingPaid = 0
    let existingDue = monthScheduledTotal
    let isFullyPaid = false

    if (existing && existing.deleted !== true) {
      existingPaid = toRupees(existing.amount)
      const exTot = existing.totalAmount != null ? toRupees(existing.totalAmount) : monthScheduledTotal
      existingDue = exTot
      const exRem = existing.remainingAmount != null ? toRupees(existing.remainingAmount) : Math.max(0, exTot - existingPaid)
      if (exRem <= 0 && existingPaid > 0) {
        isFullyPaid = true
      }
    }

    // Amount that actually needs to be collected for this month:
    // If top-up, target due is remaining balance
    const netDue = isFullyPaid
      ? 0
      : existing && existing.remainingAmount != null
        ? toRupees(existing.remainingAmount)
        : monthScheduledTotal

    return {
      month: mName,
      year: mYear,
      tuitionFee: tuition,
      conveyanceFee: conveyance,
      examFee: exam,
      annualFee: annual,
      admissionFee: admission,
      lateFee: late,
      totalAmount: monthScheduledTotal,
      netDue,
      existingRecord: existing || null,
      existingPaid,
      isFullyPaid,
    }
  })
}

/**
 * Allocates total received money across scheduled months (oldest month first),
 * supporting manual overrides and calculating remaining dues and statuses.
 *
 * @param {Object} params
 * @param {Array} params.scheduledMonths - Output from calculateMultiMonthSchedule
 * @param {number} params.totalReceived - Total amount handed over by parent
 * @param {Object} [params.manualAllocations] - Map of "month_year" -> manual paid amount
 * @returns {Object} Allocation result with month breakdown, validation flags, unallocated balance
 */
export function allocateMultiMonthPayment({
  scheduledMonths = [],
  totalReceived = 0,
  manualAllocations = null,
}) {
  const received = toRupees(totalReceived)
  const totalNetDue = scheduledMonths.reduce((acc, m) => acc + (m.isFullyPaid ? 0 : m.netDue), 0)

  let remainingToAllocate = received
  const allocations = []
  let totalAllocated = 0

  const hasManual = manualAllocations && typeof manualAllocations === 'object' && Object.keys(manualAllocations).length > 0

  for (const m of scheduledMonths) {
    const key = `${m.month}_${m.year}`
    const dueForMonth = m.isFullyPaid ? 0 : m.netDue

    let paidForMonth = 0

    if (m.isFullyPaid) {
      paidForMonth = 0
    } else if (hasManual && manualAllocations[key] !== undefined) {
      paidForMonth = toRupees(manualAllocations[key])
    } else {
      // Auto-allocation: oldest month first
      paidForMonth = Math.min(dueForMonth, remainingToAllocate)
      remainingToAllocate -= paidForMonth
    }

    totalAllocated += paidForMonth

    const totalPaidCumulative = m.existingPaid + paidForMonth
    const remainingDue = Math.max(0, m.totalAmount - totalPaidCumulative)

    // Status derivation:
    // 'paid' when remainingDue === 0 (and at least some amount was paid)
    // 'partial' when partially paid
    // 'pending' when 0 paid
    let status = 'pending'
    if (remainingDue === 0 && (totalPaidCumulative > 0 || m.totalAmount === 0)) {
      status = 'paid'
    } else if (totalPaidCumulative > 0 && remainingDue > 0) {
      status = 'partial'
    } else {
      status = 'pending'
    }

    allocations.push({
      ...m,
      allocatedPaid: paidForMonth,
      cumulativePaid: totalPaidCumulative,
      remainingAmount: remainingDue,
      status,
    })
  }

  const unallocatedAmount = received - totalAllocated
  const isOverAllocated = totalAllocated > received
  const isUnderAllocated = totalAllocated < received
  const exceedsTotalDue = received > totalNetDue
  const isValid = received > 0 && !exceedsTotalDue && totalAllocated === received

  return {
    allocations,
    totalReceived: received,
    totalNetDue,
    totalAllocated,
    unallocatedAmount,
    isOverAllocated,
    isUnderAllocated,
    exceedsTotalDue,
    isValid,
  }
}

/**
 * Formats sequential receipt number for a session.
 * Format: "PA-2026-27/0143"
 */
export function formatReceiptNumber(session, counter) {
  const s = session || '2026-27'
  const countStr = String(counter || 1).padStart(4, '0')
  return `PA-${s}/${countStr}`
}

/**
 * Converts a receipt number into a safe Firestore document ID (replaces "/" with "-").
 */
export function sanitizeReceiptDocId(receiptNo) {
  return String(receiptNo || '').replace(/\//g, '-').trim()
}
