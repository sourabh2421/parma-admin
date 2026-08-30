/**
 * Month range formatter utility for bulk fee creation
 * Formats an array of month names into a human-readable range string
 */

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

/**
 * Formats an array of month names into a human-readable range string
 * 
 * @param {string[]} months - Array of month names from MONTH_OPTIONS
 * @param {number} year - The year for the month range
 * @returns {string} Formatted month range string
 * 
 * @example
 * formatMonthRange(['April', 'May', 'June'], 2026) 
 * // Returns: "April–June 2026"
 * 
 * @example
 * formatMonthRange(['January', 'March', 'June'], 2026)
 * // Returns: "3 months (January, ..., June) 2026"
 * 
 * @example
 * formatMonthRange(['January'], 2026)
 * // Returns: "January 2026"
 * 
 * Requirements: 8.2 - Sort by calendar order, check consecutive, 
 * format as "FirstMonth–LastMonth Year" or "N months (First, ..., Last) Year"
 */
export function formatMonthRange(months, year) {
  if (!months || months.length === 0) return ''
  
  // Single month: just return the month name with year
  if (months.length === 1) return `${months[0]} ${year}`
  
  // Sort months by calendar order using MONTH_OPTIONS indices
  const ordered = months.slice().sort((a, b) => {
    return MONTH_OPTIONS.indexOf(a) - MONTH_OPTIONS.indexOf(b)
  })
  
  // Check if months are consecutive in calendar
  const firstIdx = MONTH_OPTIONS.indexOf(ordered[0])
  const lastIdx = MONTH_OPTIONS.indexOf(ordered[ordered.length - 1])
  const isConsecutive = lastIdx - firstIdx === ordered.length - 1
  
  if (isConsecutive) {
    // Consecutive months: format as range "FirstMonth–LastMonth Year"
    return `${ordered[0]}–${ordered[ordered.length - 1]} ${year}`
  } else {
    // Non-consecutive months: format as "N months (First, ..., Last) Year"
    return `${ordered.length} months (${ordered[0]}, ..., ${ordered[ordered.length - 1]}) ${year}`
  }
}
