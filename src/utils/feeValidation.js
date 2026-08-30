/**
 * Validates fee form inputs for both Single Month and Multi-Month modes
 * 
 * @param {Object} inputs - The inputs to validate
 * @param {string} inputs.amount - The fee amount (as string from input)
 * @param {string} inputs.status - The fee status ('pending' or 'paid')
 * @param {Date|null} inputs.paymentDate - The payment date (required when status is 'paid')
 * @param {boolean} inputs.isMultiMonth - Whether multi-month mode is active
 * @param {Set<string>} inputs.selectedMonths - The set of selected months (only used in multi-month mode)
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export function validateInputs({ amount, status, paymentDate, isMultiMonth, selectedMonths }) {
  // Requirement 10.1: Amount must be finite and non-negative
  const num = Number(amount)
  if (!Number.isFinite(num) || num < 0) {
    return { valid: false, error: 'Enter a valid fee amount.' }
  }

  // Requirement 10.3: Payment date required when paid
  if (status === 'paid' && !paymentDate) {
    return { valid: false, error: 'Select a payment date for paid fees.' }
  }

  // Requirements 10.2: Month selection validation in Multi-Month Mode
  if (isMultiMonth) {
    if (selectedMonths.size === 0) {
      return { valid: false, error: 'Select at least one month.' }
    }
    if (selectedMonths.size === 1) {
      return { valid: false, error: 'Select at least 2 months for bulk creation, or use single month mode.' }
    }
    if (selectedMonths.size > 12) {
      return { valid: false, error: 'Select at most 12 months.' }
    }
  }

  return { valid: true }
}
