import { describe, it, expect } from 'vitest'

// Test formatSuccessMessage and formatMonthRange functions
// Note: These are internal functions in AddFeeModal component
// For testing purposes, we'll replicate the logic here

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

const formatMonthRange = (months, year) => {
  if (months.length === 0) return ''
  if (months.length === 1) return months[0]
  
  // Sort by calendar order using MONTH_OPTIONS
  const ordered = months.slice().sort((a, b) => {
    return MONTH_OPTIONS.indexOf(a) - MONTH_OPTIONS.indexOf(b)
  })
  
  // Check if consecutive in calendar
  const firstIdx = MONTH_OPTIONS.indexOf(ordered[0])
  const lastIdx = MONTH_OPTIONS.indexOf(ordered[ordered.length - 1])
  const isConsecutive = lastIdx - firstIdx === ordered.length - 1
  
  if (isConsecutive) {
    // Consecutive months: display as range
    return `${ordered[0]}–${ordered[ordered.length - 1]} ${year}`
  } else {
    // Non-consecutive: list count with first and last month
    return `${ordered.length} months (${ordered[0]}, ..., ${ordered[ordered.length - 1]}) ${year}`
  }
}

const formatSuccessMessage = (results, year) => {
  const { successes, failures, mergedCount, revivedCount, updateCount } = results
  
  if (failures.length === 0) {
    // Full success: all months created successfully
    const count = successes.length
    const monthRange = formatMonthRange(successes, year)
    let msg = `${count} fee record${count > 1 ? 's' : ''} created for ${monthRange}`
    
    // Append metadata if present - add period before first metadata item
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
    // Partial success: some months succeeded, some failed
    const totalCount = successes.length + failures.length
    const failedMonths = failures.map(f => f.month).join(', ')
    return `${successes.length} of ${totalCount} fee records created. Failed months: ${failedMonths}`
  } else {
    // Total failure: all months failed
    return 'Failed to create fee records for all selected months. Check console for details.'
  }
}

describe('formatMonthRange', () => {
  it('should return empty string for empty array', () => {
    expect(formatMonthRange([], 2026)).toBe('')
  })

  it('should return single month for array with one month', () => {
    expect(formatMonthRange(['April'], 2026)).toBe('April')
  })

  it('should format consecutive months as range', () => {
    expect(formatMonthRange(['April', 'May', 'June'], 2026)).toBe('April–June 2026')
  })

  it('should format consecutive months as range even when unsorted', () => {
    expect(formatMonthRange(['June', 'April', 'May'], 2026)).toBe('April–June 2026')
  })

  it('should format non-consecutive months with count', () => {
    expect(formatMonthRange(['January', 'March', 'June'], 2026)).toBe('3 months (January, ..., June) 2026')
  })

  it('should handle cross-year consecutive check correctly', () => {
    // December is not consecutive with January within the same year
    expect(formatMonthRange(['December', 'January'], 2026)).toBe('2 months (January, ..., December) 2026')
  })
})

describe('formatSuccessMessage', () => {
  it('should format full success message with consecutive months', () => {
    const results = {
      successes: ['April', 'May', 'June'],
      failures: [],
      mergedCount: 0,
      revivedCount: 0,
      updateCount: 0,
    }
    expect(formatSuccessMessage(results, 2026)).toBe('3 fee records created for April–June 2026')
  })

  it('should format full success message with single month', () => {
    const results = {
      successes: ['April'],
      failures: [],
      mergedCount: 0,
      revivedCount: 0,
      updateCount: 0,
    }
    expect(formatSuccessMessage(results, 2026)).toBe('1 fee record created for April')
  })

  it('should include merged duplicates metadata', () => {
    const results = {
      successes: ['April', 'May'],
      failures: [],
      mergedCount: 3,
      revivedCount: 0,
      updateCount: 0,
    }
    expect(formatSuccessMessage(results, 2026)).toBe('2 fee records created for April–May 2026. 3 duplicate row(s) were archived.')
  })

  it('should include revived records metadata', () => {
    const results = {
      successes: ['April', 'May'],
      failures: [],
      mergedCount: 0,
      revivedCount: 1,
      updateCount: 0,
    }
    expect(formatSuccessMessage(results, 2026)).toBe('2 fee records created for April–May 2026. 1 record(s) were restored from archive.')
  })

  it('should include updated records metadata', () => {
    const results = {
      successes: ['April', 'May'],
      failures: [],
      mergedCount: 0,
      revivedCount: 0,
      updateCount: 2,
    }
    expect(formatSuccessMessage(results, 2026)).toBe('2 fee records created for April–May 2026. 2 existing record(s) were updated.')
  })

  it('should include all metadata when present', () => {
    const results = {
      successes: ['April', 'May', 'June'],
      failures: [],
      mergedCount: 2,
      revivedCount: 1,
      updateCount: 1,
    }
    expect(formatSuccessMessage(results, 2026)).toBe('3 fee records created for April–June 2026. 2 duplicate row(s) were archived. 1 record(s) were restored from archive. 1 existing record(s) were updated.')
  })

  it('should format partial success message', () => {
    const results = {
      successes: ['April', 'May'],
      failures: [
        { month: 'June', error: 'Permission denied' },
        { month: 'July', error: 'Network error' }
      ],
      mergedCount: 0,
      revivedCount: 0,
      updateCount: 0,
    }
    expect(formatSuccessMessage(results, 2026)).toBe('2 of 4 fee records created. Failed months: June, July')
  })

  it('should format total failure message', () => {
    const results = {
      successes: [],
      failures: [
        { month: 'April', error: 'Permission denied' },
        { month: 'May', error: 'Network error' }
      ],
      mergedCount: 0,
      revivedCount: 0,
      updateCount: 0,
    }
    expect(formatSuccessMessage(results, 2026)).toBe('Failed to create fee records for all selected months. Check console for details.')
  })

  it('should format non-consecutive months correctly', () => {
    const results = {
      successes: ['January', 'March', 'June'],
      failures: [],
      mergedCount: 0,
      revivedCount: 0,
      updateCount: 0,
    }
    expect(formatSuccessMessage(results, 2026)).toBe('3 fee records created for 3 months (January, ..., June) 2026')
  })
})
