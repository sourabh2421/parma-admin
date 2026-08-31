/**
 * Utilities for filtering fee records by time ranges (running month, last 3 months, last 6 months, last 1 year)
 * and calculating aggregate financial metrics for the selected time window.
 */

export const MONTH_NAMES = [
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

export const PERIOD_OPTIONS = [
  { id: 'running', label: 'Running Month' },
  { id: '3months', label: 'Last 3 Months' },
  { id: '6months', label: 'Last 6 Months' },
  { id: '1year', label: 'Last 1 Year' },
  { id: 'all', label: 'All Time' },
]

/**
 * Returns a linear month index: `year * 12 + monthIndex` (0-11).
 */
export function getFeeMonthIndex(monthName, year) {
  const mIndex = MONTH_NAMES.findIndex(
    (m) => m.toLowerCase() === String(monthName ?? '').trim().toLowerCase(),
  )
  const y = Number(year)
  if (mIndex === -1 || isNaN(y) || y <= 0) return null
  return y * 12 + mIndex
}

/**
 * Calculates month difference between reference date and fee month.
 * e.g., if ref is August 2026 and fee is August 2026 => diff = 0.
 * If fee is July 2026 => diff = 1.
 */
export function getDiffInMonths(refDate, monthName, year) {
  const ref = refDate instanceof Date ? refDate : new Date()
  const refIndex = ref.getFullYear() * 12 + ref.getMonth()
  const feeIndex = getFeeMonthIndex(monthName, year)
  if (feeIndex === null) return null
  return refIndex - feeIndex
}

/**
 * Filters fee records based on period string.
 *
 * @param {Array} fees - List of fee objects
 * @param {string} period - 'running' | '3months' | '6months' | '1year' | 'all'
 * @param {Date} [referenceDate] - Optional reference date (defaults to now)
 * @returns {Array} Filtered fee records
 */
export function filterFeesByPeriod(fees = [], period = 'running', referenceDate = new Date()) {
  if (!Array.isArray(fees)) return []
  if (period === 'all') return fees

  const ref = referenceDate instanceof Date ? referenceDate : new Date()
  const currentMonthIndex = ref.getFullYear() * 12 + ref.getMonth()

  return fees.filter((fee) => {
    if (!fee || fee.deleted === true) return false

    const feeIndex = getFeeMonthIndex(fee.month, fee.year)
    if (feeIndex === null) {
      // Fallback to paymentDate or createdAt if month/year parsing fails
      const dateStr = fee.paymentDate || fee.createdAt
      if (!dateStr) return false
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return false
      const dIndex = d.getFullYear() * 12 + d.getMonth()
      const diff = currentMonthIndex - dIndex
      if (period === 'running') return diff === 0
      if (period === '3months') return diff >= 0 && diff < 3
      if (period === '6months') return diff >= 0 && diff < 6
      if (period === '1year') return diff >= 0 && diff < 12
      return true
    }

    const diff = currentMonthIndex - feeIndex

    if (period === 'running') {
      return diff === 0
    }
    if (period === '3months') {
      return diff >= 0 && diff < 3
    }
    if (period === '6months') {
      return diff >= 0 && diff < 6
    }
    if (period === '1year') {
      return diff >= 0 && diff < 12
    }

    return true
  })
}

/**
 * Calculates aggregate financial metrics for filtered fee records.
 */
export function calculatePeriodMetrics(filteredFees = []) {
  let totalCollected = 0
  let totalDue = 0
  let paidCount = 0
  let pendingCount = 0
  let partialCount = 0

  for (const fee of filteredFees) {
    if (!fee) continue
    const paidAmt = Number(fee.amount) || 0
    const remAmt = Number(fee.remainingAmount) || 0

    if (fee.status === 'paid') {
      totalCollected += paidAmt
      if (remAmt > 0) {
        totalDue += remAmt
        partialCount += 1
      } else {
        paidCount += 1
      }
    } else {
      totalDue += fee.totalAmount != null ? Number(fee.totalAmount) : paidAmt
      pendingCount += 1
    }
  }

  return {
    totalRecords: filteredFees.length,
    totalCollected,
    totalDue,
    totalExpected: totalCollected + totalDue,
    paidCount,
    pendingCount,
    partialCount,
  }
}
