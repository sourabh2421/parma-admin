import { describe, it, expect } from 'vitest'
import { formatMonthRange } from './monthRangeFormatter.js'

describe('formatMonthRange', () => {
  describe('edge cases', () => {
    it('returns empty string for empty array', () => {
      expect(formatMonthRange([], 2026)).toBe('')
    })

    it('returns empty string for null', () => {
      expect(formatMonthRange(null, 2026)).toBe('')
    })

    it('returns empty string for undefined', () => {
      expect(formatMonthRange(undefined, 2026)).toBe('')
    })

    it('returns single month with year for one month', () => {
      expect(formatMonthRange(['April'], 2026)).toBe('April 2026')
    })
  })

  describe('consecutive months', () => {
    it('formats 2 consecutive months as range', () => {
      expect(formatMonthRange(['April', 'May'], 2026)).toBe('April–May 2026')
    })

    it('formats 3 consecutive months as range', () => {
      expect(formatMonthRange(['April', 'May', 'June'], 2026)).toBe('April–June 2026')
    })

    it('formats 6 consecutive months as range', () => {
      expect(formatMonthRange(['January', 'February', 'March', 'April', 'May', 'June'], 2026))
        .toBe('January–June 2026')
    })

    it('formats 12 consecutive months (full year) as range', () => {
      const allMonths = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]
      expect(formatMonthRange(allMonths, 2026)).toBe('January–December 2026')
    })

    it('formats consecutive months spanning year end correctly', () => {
      expect(formatMonthRange(['November', 'December'], 2026)).toBe('November–December 2026')
    })

    it('formats consecutive months starting from January', () => {
      expect(formatMonthRange(['January', 'February', 'March'], 2026)).toBe('January–March 2026')
    })
  })

  describe('non-consecutive months', () => {
    it('formats 2 non-consecutive months with count and first/last', () => {
      expect(formatMonthRange(['January', 'March'], 2026))
        .toBe('2 months (January, ..., March) 2026')
    })

    it('formats 3 non-consecutive months with count and first/last', () => {
      expect(formatMonthRange(['January', 'March', 'June'], 2026))
        .toBe('3 months (January, ..., June) 2026')
    })

    it('formats 5 non-consecutive months with count and first/last', () => {
      expect(formatMonthRange(['January', 'March', 'June', 'September', 'December'], 2026))
        .toBe('5 months (January, ..., December) 2026')
    })

    it('formats months with gaps in the middle', () => {
      expect(formatMonthRange(['April', 'May', 'July', 'August'], 2026))
        .toBe('4 months (April, ..., August) 2026')
    })
  })

  describe('calendar order sorting', () => {
    it('sorts unordered consecutive months correctly', () => {
      expect(formatMonthRange(['June', 'April', 'May'], 2026)).toBe('April–June 2026')
    })

    it('sorts unordered non-consecutive months correctly', () => {
      expect(formatMonthRange(['December', 'January', 'June'], 2026))
        .toBe('3 months (January, ..., December) 2026')
    })

    it('sorts months in reverse order', () => {
      expect(formatMonthRange(['December', 'November', 'October'], 2026))
        .toBe('October–December 2026')
    })

    it('sorts randomly ordered months', () => {
      expect(formatMonthRange(['September', 'March', 'June', 'December'], 2026))
        .toBe('4 months (March, ..., December) 2026')
    })
  })

  describe('year parameter', () => {
    it('includes year in single month format', () => {
      expect(formatMonthRange(['July'], 2024)).toBe('July 2024')
    })

    it('includes year in consecutive range format', () => {
      expect(formatMonthRange(['April', 'May', 'June'], 2024)).toBe('April–June 2024')
    })

    it('includes year in non-consecutive format', () => {
      expect(formatMonthRange(['January', 'June'], 2024))
        .toBe('2 months (January, ..., June) 2024')
    })

    it('works with different year values', () => {
      expect(formatMonthRange(['April', 'May'], 2030)).toBe('April–May 2030')
    })
  })

  describe('Requirements 8.2 validation', () => {
    it('validates requirement: sort by calendar order', () => {
      // Unordered input should be sorted before processing
      const result = formatMonthRange(['June', 'April', 'May'], 2026)
      expect(result).toBe('April–June 2026')
    })

    it('validates requirement: check consecutive', () => {
      // Consecutive months should use range format
      const consecutive = formatMonthRange(['April', 'May', 'June'], 2026)
      expect(consecutive).toBe('April–June 2026')
      
      // Non-consecutive should use count format
      const nonConsecutive = formatMonthRange(['April', 'June'], 2026)
      expect(nonConsecutive).toBe('2 months (April, ..., June) 2026')
    })

    it('validates requirement: format as "FirstMonth–LastMonth Year" for consecutive', () => {
      const result = formatMonthRange(['January', 'February', 'March'], 2026)
      expect(result).toMatch(/^[A-Za-z]+–[A-Za-z]+ \d{4}$/)
      expect(result).toBe('January–March 2026')
    })

    it('validates requirement: format as "N months (First, ..., Last) Year" for non-consecutive', () => {
      const result = formatMonthRange(['January', 'March', 'May'], 2026)
      expect(result).toMatch(/^\d+ months \([A-Za-z]+, \.\.\., [A-Za-z]+\) \d{4}$/)
      expect(result).toBe('3 months (January, ..., May) 2026')
    })
  })
})
