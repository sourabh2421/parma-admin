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

export const WAIVER_REASONS = [
  'Management waiver',
  'Vacation month',
  'Transport not used',
  'Other',
]

/**
 * Computes per-month gross fee, waivers, and net due amounts for multi-month selection.
 *
 * @param {Object} params
 * @param {Array<{ month: string, year: number, existingRecord?: Object }>} params.months
 * @param {Object} [params.rates] - Default recurring rates { tuitionFee, conveyanceFee }
 * @param {Object} [params.otherCharges] - Non-recurring fees { examFee, annualFee, admissionFee, lateFee }
 * @param {Object} [params.overrides] - Map of non-recurring headName -> assigned month
 * @param {Object} [params.perMonthCustomizations] - Map of `${month}_${year}` -> {
 *   tuitionFee?: number|string,
 *   conveyanceFee?: number|string,
 *   waiveConveyance?: boolean,
 *   reason?: string,
 *   otherReasonText?: string,
 *   approvedBy?: string
 * }
 * @param {Array|Object} [params.existingRecords] - Optional list or map of existing fee records
 * @returns {Array} Array of calculated month due objects
 */
export function buildMonthDues({
  months = [],
  rates = {},
  otherCharges = {},
  overrides = {},
  perMonthCustomizations = {},
  existingRecords = [],
}) {
  if (!months || months.length === 0) return []

  const sortedMonths = sortMonthsInAcademicOrder(months)
  const defaultTuition = toRupees(rates.tuitionFee)
  const defaultConveyance = toRupees(rates.conveyanceFee)

  // Map existing records if provided
  const existingMap = new Map()
  if (Array.isArray(existingRecords)) {
    for (const rec of existingRecords) {
      if (rec && rec.month && rec.year) {
        existingMap.set(`${rec.month}_${rec.year}`, rec)
      }
    }
  }

  return sortedMonths.map((mObj, idx) => {
    const isFirst = idx === 0
    const mName = mObj.month
    const mYear = Number(mObj.year)
    const key = `${mName}_${mYear}`

    // Non-recurring components apply to first month by default or overridden month
    const getOtherHead = (head) => {
      const targetMonth = overrides[head]
      if (targetMonth) {
        return targetMonth === mName ? toRupees(otherCharges[head]) : 0
      }
      return isFirst ? toRupees(otherCharges[head]) : 0
    }

    const exam = getOtherHead('examFee')
    const annual = getOtherHead('annualFee')
    const admission = getOtherHead('admissionFee')
    const late = getOtherHead('lateFee')
    const otherTotal = exam + annual + admission + late

    // Per-month customizations
    const custom = perMonthCustomizations[key] || perMonthCustomizations[mName] || null
    const hasCustomTuition = custom && custom.tuitionFee !== undefined && custom.tuitionFee !== ''
    const hasCustomConveyance = custom && custom.conveyanceFee !== undefined && custom.conveyanceFee !== ''
    const waiveConveyance = Boolean(custom?.waiveConveyance)

    const enteredTuition = hasCustomTuition ? toRupees(custom.tuitionFee) : defaultTuition
    let enteredConveyance = defaultConveyance
    if (waiveConveyance) {
      enteredConveyance = 0
    } else if (hasCustomConveyance) {
      enteredConveyance = toRupees(custom.conveyanceFee)
    }

    const isCustomized = Boolean(
      waiveConveyance ||
        (hasCustomTuition && enteredTuition !== defaultTuition) ||
        (hasCustomConveyance && enteredConveyance !== defaultConveyance),
    )

    // Gross rates: default rate or entered rate if entered > default
    const grossTuition = Math.max(defaultTuition, enteredTuition)
    const grossConveyance = Math.max(defaultConveyance, enteredConveyance)
    const grossFee = grossTuition + grossConveyance + otherTotal

    // Waivers: if entered < gross
    const tuitionWaiver = Math.max(0, grossTuition - enteredTuition)
    const conveyanceWaiver = waiveConveyance
      ? grossConveyance
      : Math.max(0, grossConveyance - enteredConveyance)
    const waiverTotal = tuitionWaiver + conveyanceWaiver

    const waiverReason =
      custom?.reason === 'Other' && custom?.otherReasonText
        ? custom.otherReasonText.trim()
        : custom?.reason || ''

    const waiverApprovedBy = custom?.approvedBy ? String(custom.approvedBy).trim() : ''

    const waivers = []
    if (tuitionWaiver > 0) {
      waivers.push({
        head: 'tuition',
        amount: tuitionWaiver,
        reason: waiverReason,
        approvedBy: waiverApprovedBy,
      })
    }
    if (conveyanceWaiver > 0) {
      waivers.push({
        head: 'conveyance',
        amount: conveyanceWaiver,
        reason: waiverReason,
        approvedBy: waiverApprovedBy,
      })
    }

    // Net fee for this month (grossFee - waiverTotal)
    const netFee = grossFee - waiverTotal

    // Check existing record
    const existing = mObj.existingRecord || existingMap.get(key) || null
    let existingPaid = 0
    let isFullyPaid = false
    let waiverExceedsPaid = false

    if (existing && existing.deleted !== true) {
      existingPaid = toRupees(existing.amount)
      const exTot =
        existing.totalAmount != null ? toRupees(existing.totalAmount) : grossFee
      const exRem =
        existing.remainingAmount != null
          ? toRupees(existing.remainingAmount)
          : Math.max(0, exTot - existingPaid)
      if (exRem <= 0 && existingPaid > 0) {
        isFullyPaid = true
      }
      if (netFee < existingPaid) {
        waiverExceedsPaid = true
      }
    }

    // Amount actually needing collection (net due):
    // If fully paid -> 0
    // Otherwise -> Math.max(0, netFee - existingPaid)
    const netDue = isFullyPaid ? 0 : Math.max(0, netFee - existingPaid)

    return {
      month: mName,
      year: mYear,
      tuitionFee: enteredTuition, // charged net tuition
      conveyanceFee: enteredConveyance, // charged net conveyance
      grossTuition,
      grossConveyance,
      examFee: exam,
      annualFee: annual,
      admissionFee: admission,
      lateFee: late,
      otherCharges: otherTotal,
      grossFee,
      waiverTotal,
      waivers,
      waiveConveyance,
      isCustomized,
      waiverReason,
      waiverApprovedBy,
      totalAmount: netFee, // net figure for this month
      netDue,
      existingRecord: existing,
      existingPaid,
      isFullyPaid,
      waiverExceedsPaid,
    }
  })
}

/**
 * Computes scheduled dues for each month in a multi-month selection.
 * Wraps buildMonthDues for backward compatibility.
 *
 * @param {Object} params
 * @param {Array<{ month: string, year: number, existingRecord?: Object }>} params.months
 * @param {Object} params.breakdown - Per-month recurring & non-recurring fee values
 * @param {Object} [params.nonRecurringOverrides] - Map of headName -> assigned month
 * @param {Object} [params.perMonthCustomizations] - Map of month_year -> custom values
 * @returns {Array} Array of months with calculated total due and breakdown
 */
export function calculateMultiMonthSchedule({
  months = [],
  breakdown = {},
  nonRecurringOverrides = {},
  perMonthCustomizations = {},
}) {
  return buildMonthDues({
    months,
    rates: {
      tuitionFee: breakdown.tuitionFee,
      conveyanceFee: breakdown.conveyanceFee,
    },
    otherCharges: {
      examFee: breakdown.examFee,
      annualFee: breakdown.annualFee,
      admissionFee: breakdown.admissionFee,
      lateFee: breakdown.lateFee,
    },
    overrides: nonRecurringOverrides,
    perMonthCustomizations,
  })
}

/**
 * Validates waiver constraints across scheduled months.
 */
export function validateMultiMonthWaivers({ scheduledMonths = [], approvedBy = '' }) {
  const monthsWithWaivers = scheduledMonths.filter((m) => m.waiverTotal > 0)
  if (monthsWithWaivers.length === 0) {
    return { valid: true }
  }

  // 1. Check if any waiver pushes net due below amount already paid
  for (const m of scheduledMonths) {
    if (m.waiverExceedsPaid) {
      return {
        valid: false,
        error: `Waiver in ${m.month} ${m.year} reduces due (₹${Number(m.totalAmount).toLocaleString()}) below already paid amount (₹${Number(m.existingPaid).toLocaleString()}).`,
      }
    }
  }

  // 2. Check reason for each waived month
  for (const m of monthsWithWaivers) {
    if (!m.waiverReason || !m.waiverReason.trim()) {
      return {
        valid: false,
        error: `Please select or enter a waiver reason for ${m.month} ${m.year}.`,
      }
    }
  }

  // 3. Check approvedBy
  const approver = String(approvedBy || monthsWithWaivers[0]?.waiverApprovedBy || '').trim()
  if (!approver) {
    return {
      valid: false,
      error: 'Please enter who approved the waiver.',
    }
  }

  return { valid: true, approvedBy: approver }
}

/**
 * Allocates total received money across scheduled months (oldest month first),
 * supporting manual overrides and calculating remaining dues and statuses.
 *
 * @param {Object} params
 * @param {Array} params.scheduledMonths - Output from calculateMultiMonthSchedule or buildMonthDues
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

  const hasManual =
    manualAllocations &&
    typeof manualAllocations === 'object' &&
    Object.keys(manualAllocations).length > 0

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
    // 'paid' when remainingDue === 0 (and at least some amount was paid or due was 0)
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
      waived: m.waiverTotal || 0,
    })
  }

  const unallocatedAmount = received - totalAllocated
  const isOverAllocated = totalAllocated > received
  const isUnderAllocated = totalAllocated < received
  const exceedsTotalDue = received > totalNetDue
  const hasInvalidWaiver = scheduledMonths.some((m) => m.waiverExceedsPaid)
  const isValid =
    received > 0 && !exceedsTotalDue && totalAllocated === received && !hasInvalidWaiver

  return {
    allocations,
    totalReceived: received,
    totalNetDue,
    totalAllocated,
    unallocatedAmount,
    isOverAllocated,
    isUnderAllocated,
    exceedsTotalDue,
    hasInvalidWaiver,
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
