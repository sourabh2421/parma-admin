import { describe, expect, it } from 'vitest'
import {
  allocateMultiMonthPayment,
  calculateMultiMonthSchedule,
  compareAcademicPeriod,
  formatReceiptNumber,
  getAcademicMonthIndex,
  getAcademicSession,
  getYearForAcademicMonth,
  sanitizeReceiptDocId,
  sortMonthsInAcademicOrder,
  toRupees,
} from './feeAllocation.js'

describe('Fee Allocation Module (Pure Engine)', () => {
  describe('Academic Order & Session Derivation', () => {
    it('indexes months in April-to-March sequence', () => {
      expect(getAcademicMonthIndex('April')).toBe(0)
      expect(getAcademicMonthIndex('December')).toBe(8)
      expect(getAcademicMonthIndex('January')).toBe(9)
      expect(getAcademicMonthIndex('February')).toBe(10)
      expect(getAcademicMonthIndex('March')).toBe(11)
      expect(getAcademicMonthIndex('unknown')).toBe(-1)
    })

    it('derives session label across year boundaries', () => {
      expect(getAcademicSession(2026, 'April')).toBe('2026-27')
      expect(getAcademicSession(2026, 'December')).toBe('2026-27')
      expect(getAcademicSession(2027, 'January')).toBe('2026-27')
      expect(getAcademicSession(2027, 'March')).toBe('2026-27')
    })

    it('determines calendar year for academic months given a session', () => {
      expect(getYearForAcademicMonth('2026-27', 'April')).toBe(2026)
      expect(getYearForAcademicMonth('2026-27', 'December')).toBe(2026)
      expect(getYearForAcademicMonth('2026-27', 'January')).toBe(2027)
      expect(getYearForAcademicMonth('2026-27', 'March')).toBe(2027)
    })

    it('sorts months in academic order across calendar year boundary (e.g. Nov 2026 -> Feb 2027)', () => {
      const input = [
        { month: 'March', year: 2027 },
        { month: 'April', year: 2026 },
        { month: 'January', year: 2027 },
        { month: 'December', year: 2026 },
      ]

      const sorted = sortMonthsInAcademicOrder(input)
      expect(sorted.map((m) => `${m.month} ${m.year}`)).toEqual([
        'April 2026',
        'December 2026',
        'January 2027',
        'March 2027',
      ])
    })
  })

  describe('Recurring vs Non-Recurring Fee Heads', () => {
    it('applies recurring fees to all months and non-recurring fees to first month by default', () => {
      const months = [
        { month: 'April', year: 2026 },
        { month: 'May', year: 2026 },
        { month: 'June', year: 2026 },
      ]

      const schedule = calculateMultiMonthSchedule({
        months,
        breakdown: {
          tuitionFee: 3000,
          conveyanceFee: 500,
          annualFee: 2000,
          admissionFee: 1000,
          examFee: 400,
          lateFee: 100,
        },
      })

      expect(schedule).toHaveLength(3)

      // First month: recurring (3500) + all non-recurring (3500) = 7000
      expect(schedule[0].month).toBe('April')
      expect(schedule[0].totalAmount).toBe(7000)
      expect(schedule[0].annualFee).toBe(2000)
      expect(schedule[0].admissionFee).toBe(1000)
      expect(schedule[0].examFee).toBe(400)
      expect(schedule[0].lateFee).toBe(100)

      // Subsequent months: only recurring (3500)
      expect(schedule[1].month).toBe('May')
      expect(schedule[1].totalAmount).toBe(3500)
      expect(schedule[1].annualFee).toBe(0)
      expect(schedule[1].examFee).toBe(0)

      expect(schedule[2].month).toBe('June')
      expect(schedule[2].totalAmount).toBe(3500)
    })

    it('respects non-recurring overrides for specific heads', () => {
      const months = [
        { month: 'April', year: 2026 },
        { month: 'May', year: 2026 },
      ]

      const schedule = calculateMultiMonthSchedule({
        months,
        breakdown: {
          tuitionFee: 2000,
          examFee: 500,
        },
        nonRecurringOverrides: {
          examFee: 'May',
        },
      })

      expect(schedule[0].month).toBe('April')
      expect(schedule[0].examFee).toBe(0)
      expect(schedule[0].totalAmount).toBe(2000)

      expect(schedule[1].month).toBe('May')
      expect(schedule[1].examFee).toBe(500)
      expect(schedule[1].totalAmount).toBe(2500)
    })
  })

  describe('Allocation Engine', () => {
    it('handles full payment for equal months correctly (e.g. 6 months x 4200 = 25200)', () => {
      const months = [
        { month: 'April', year: 2026 },
        { month: 'May', year: 2026 },
        { month: 'June', year: 2026 },
        { month: 'July', year: 2026 },
        { month: 'August', year: 2026 },
        { month: 'September', year: 2026 },
      ]

      const schedule = calculateMultiMonthSchedule({
        months,
        breakdown: { tuitionFee: 4200 },
      })

      const res = allocateMultiMonthPayment({
        scheduledMonths: schedule,
        totalReceived: 25200,
      })

      expect(res.isValid).toBe(true)
      expect(res.totalNetDue).toBe(25200)
      expect(res.totalAllocated).toBe(25200)
      expect(res.unallocatedAmount).toBe(0)

      res.allocations.forEach((m) => {
        expect(m.allocatedPaid).toBe(4200)
        expect(m.remainingAmount).toBe(0)
        expect(m.status).toBe('paid')
      })
    })

    it('handles part payment oldest-first (e.g. 10000 paid for 3 months of 4200 each = 12600)', () => {
      const months = [
        { month: 'April', year: 2026 },
        { month: 'May', year: 2026 },
        { month: 'June', year: 2026 },
      ]

      const schedule = calculateMultiMonthSchedule({
        months,
        breakdown: { tuitionFee: 4200 },
      })

      const res = allocateMultiMonthPayment({
        scheduledMonths: schedule,
        totalReceived: 10000,
      })

      expect(res.isValid).toBe(true)
      expect(res.totalAllocated).toBe(10000)

      // April: 4200 paid, 0 remaining -> paid
      expect(res.allocations[0].allocatedPaid).toBe(4200)
      expect(res.allocations[0].remainingAmount).toBe(0)
      expect(res.allocations[0].status).toBe('paid')

      // May: 4200 paid, 0 remaining -> paid
      expect(res.allocations[1].allocatedPaid).toBe(4200)
      expect(res.allocations[1].remainingAmount).toBe(0)
      expect(res.allocations[1].status).toBe('paid')

      // June: remaining 1600 paid (out of 4200), 2600 remaining -> partial
      expect(res.allocations[2].allocatedPaid).toBe(1600)
      expect(res.allocations[2].remainingAmount).toBe(2600)
      expect(res.allocations[2].status).toBe('partial')
    })

    it('handles uneven months with non-recurring fee on month 1', () => {
      const months = [
        { month: 'April', year: 2026 },
        { month: 'May', year: 2026 },
      ]

      const schedule = calculateMultiMonthSchedule({
        months,
        breakdown: {
          tuitionFee: 3000,
          annualFee: 2000,
        },
      })
      // Month 1 due = 5000, Month 2 due = 3000. Total = 8000.

      const res = allocateMultiMonthPayment({
        scheduledMonths: schedule,
        totalReceived: 6500,
      })

      expect(res.allocations[0].allocatedPaid).toBe(5000)
      expect(res.allocations[0].remainingAmount).toBe(0)
      expect(res.allocations[0].status).toBe('paid')

      expect(res.allocations[1].allocatedPaid).toBe(1500)
      expect(res.allocations[1].remainingAmount).toBe(1500)
      expect(res.allocations[1].status).toBe('partial')
    })

    it('enforces whole rupees (integer rounding)', () => {
      expect(toRupees(4200.75)).toBe(4201)
      expect(toRupees('3500.20')).toBe(3500)
      expect(toRupees(-50)).toBe(0)
      expect(toRupees('invalid')).toBe(0)
    })

    it('handles an existing part-paid month (top-up)', () => {
      const months = [
        {
          month: 'April',
          year: 2026,
          existingRecord: {
            amount: 2000,
            totalAmount: 5000,
            remainingAmount: 3000,
            status: 'paid',
          },
        },
        {
          month: 'May',
          year: 2026,
        },
      ]

      const schedule = calculateMultiMonthSchedule({
        months,
        breakdown: { tuitionFee: 5000 },
      })

      // April only needs 3000 top-up; May needs 5000. Total net due = 8000.
      expect(schedule[0].netDue).toBe(3000)
      expect(schedule[0].existingPaid).toBe(2000)
      expect(schedule[1].netDue).toBe(5000)

      const res = allocateMultiMonthPayment({
        scheduledMonths: schedule,
        totalReceived: 4000,
      })

      // 3000 goes to April to complete it
      expect(res.allocations[0].allocatedPaid).toBe(3000)
      expect(res.allocations[0].cumulativePaid).toBe(5000)
      expect(res.allocations[0].remainingAmount).toBe(0)
      expect(res.allocations[0].status).toBe('paid')

      // 1000 goes to May
      expect(res.allocations[1].allocatedPaid).toBe(1000)
      expect(res.allocations[1].remainingAmount).toBe(4000)
      expect(res.allocations[1].status).toBe('partial')
    })

    it('skips and preserves an existing fully-paid month', () => {
      const months = [
        {
          month: 'April',
          year: 2026,
          existingRecord: {
            amount: 5000,
            totalAmount: 5000,
            remainingAmount: 0,
            status: 'paid',
          },
        },
        {
          month: 'May',
          year: 2026,
        },
      ]

      const schedule = calculateMultiMonthSchedule({
        months,
        breakdown: { tuitionFee: 5000 },
      })

      expect(schedule[0].isFullyPaid).toBe(true)
      expect(schedule[0].netDue).toBe(0)
      expect(schedule[1].netDue).toBe(5000)

      const res = allocateMultiMonthPayment({
        scheduledMonths: schedule,
        totalReceived: 5000,
      })

      // April gets 0 allocated, stays paid
      expect(res.allocations[0].allocatedPaid).toBe(0)
      expect(res.allocations[0].cumulativePaid).toBe(5000)
      expect(res.allocations[0].remainingAmount).toBe(0)
      expect(res.allocations[0].status).toBe('paid')

      // May gets 5000
      expect(res.allocations[1].allocatedPaid).toBe(5000)
      expect(res.allocations[1].remainingAmount).toBe(0)
      expect(res.allocations[1].status).toBe('paid')
    })

    it('blocks over-payment (totalReceived > totalNetDue)', () => {
      const months = [
        { month: 'April', year: 2026 },
        { month: 'May', year: 2026 },
      ]

      const schedule = calculateMultiMonthSchedule({
        months,
        breakdown: { tuitionFee: 2000 },
      })
      // Total due = 4000

      const res = allocateMultiMonthPayment({
        scheduledMonths: schedule,
        totalReceived: 5000,
      })

      expect(res.exceedsTotalDue).toBe(true)
      expect(res.isValid).toBe(false)
      expect(res.unallocatedAmount).toBe(1000)
    })

    it('supports and validates manual cell edits', () => {
      const months = [
        { month: 'April', year: 2026 },
        { month: 'May', year: 2026 },
      ]

      const schedule = calculateMultiMonthSchedule({
        months,
        breakdown: { tuitionFee: 3000 },
      })

      // Parent pays 5000, but staff manually sets April to 2000 and May to 3000
      const res = allocateMultiMonthPayment({
        scheduledMonths: schedule,
        totalReceived: 5000,
        manualAllocations: {
          April_2026: 2000,
          May_2026: 3000,
        },
      })

      expect(res.isValid).toBe(true)
      expect(res.allocations[0].allocatedPaid).toBe(2000)
      expect(res.allocations[0].remainingAmount).toBe(1000)
      expect(res.allocations[0].status).toBe('partial')

      expect(res.allocations[1].allocatedPaid).toBe(3000)
      expect(res.allocations[1].remainingAmount).toBe(0)
      expect(res.allocations[1].status).toBe('paid')
    })

    it('flags under-allocation if manual cells do not sum to totalReceived', () => {
      const months = [
        { month: 'April', year: 2026 },
        { month: 'May', year: 2026 },
      ]

      const schedule = calculateMultiMonthSchedule({
        months,
        breakdown: { tuitionFee: 3000 },
      })

      const res = allocateMultiMonthPayment({
        scheduledMonths: schedule,
        totalReceived: 5000,
        manualAllocations: {
          April_2026: 1500,
          May_2026: 2000,
        },
      })

      expect(res.isValid).toBe(false)
      expect(res.isUnderAllocated).toBe(true)
      expect(res.unallocatedAmount).toBe(1500)
    })
  })

  describe('Receipt Formatting and Doc ID Sanitization', () => {
    it('formats sequential receipt numbers correctly', () => {
      expect(formatReceiptNumber('2026-27', 1)).toBe('PA-2026-27/0001')
      expect(formatReceiptNumber('2026-27', 143)).toBe('PA-2026-27/0143')
    })

    it('sanitizes receipt document IDs by replacing slash with hyphen', () => {
      expect(sanitizeReceiptDocId('PA-2026-27/0143')).toBe('PA-2026-27-0143')
    })
  })
})
