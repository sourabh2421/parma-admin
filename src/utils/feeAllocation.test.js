import { describe, expect, it } from 'vitest'
import {
  allocateMultiMonthPayment,
  buildMonthDues,
  calculateMultiMonthSchedule,
  compareAcademicPeriod,
  formatReceiptNumber,
  getAcademicMonthIndex,
  getAcademicSession,
  getYearForAcademicMonth,
  sanitizeReceiptDocId,
  sortMonthsInAcademicOrder,
  toRupees,
  validateMultiMonthWaivers,
  WAIVER_REASONS,
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

  describe('Per-Month Customizations & Tracked Waivers', () => {
    it('outputs identical results when no customizations are provided (regression)', () => {
      const months = [
        { month: 'April', year: 2026 },
        { month: 'May', year: 2026 },
      ]
      const breakdown = {
        tuitionFee: 3000,
        conveyanceFee: 500,
        examFee: 400,
      }

      const schedule = calculateMultiMonthSchedule({ months, breakdown })
      expect(schedule).toHaveLength(2)
      expect(schedule[0].grossFee).toBe(3900)
      expect(schedule[0].waiverTotal).toBe(0)
      expect(schedule[0].waivers).toEqual([])
      expect(schedule[0].totalAmount).toBe(3900)
      expect(schedule[0].netDue).toBe(3900)
      expect(schedule[0].isCustomized).toBe(false)

      expect(schedule[1].grossFee).toBe(3500)
      expect(schedule[1].waiverTotal).toBe(0)
      expect(schedule[1].totalAmount).toBe(3500)
      expect(schedule[1].netDue).toBe(3500)
      expect(schedule[1].isCustomized).toBe(false)
    })

    it('handles conveyance Rs 200 & tuition Rs 2,400 over 5 months with 2 months conveyance waived (net due 12,600, full payment marks all 5 Paid)', () => {
      const months = [
        { month: 'April', year: 2026 },
        { month: 'May', year: 2026 },
        { month: 'June', year: 2026 },
        { month: 'July', year: 2026 },
        { month: 'August', year: 2026 },
      ]

      const perMonthCustomizations = {
        July_2026: {
          waiveConveyance: true,
          reason: 'Vacation month',
          approvedBy: 'Principal',
        },
        August_2026: {
          waiveConveyance: true,
          reason: 'Vacation month',
          approvedBy: 'Principal',
        },
      }

      const scheduled = buildMonthDues({
        months,
        rates: { tuitionFee: 2400, conveyanceFee: 200 },
        perMonthCustomizations,
      })

      expect(scheduled).toHaveLength(5)

      // Apr, May, Jun: 2400 tuition + 200 conv = 2600 due
      ;[0, 1, 2].forEach((i) => {
        expect(scheduled[i].tuitionFee).toBe(2400)
        expect(scheduled[i].conveyanceFee).toBe(200)
        expect(scheduled[i].grossFee).toBe(2600)
        expect(scheduled[i].waiverTotal).toBe(0)
        expect(scheduled[i].totalAmount).toBe(2600)
        expect(scheduled[i].netDue).toBe(2600)
        expect(scheduled[i].isCustomized).toBe(false)
      })

      // Jul, Aug: 2400 tuition + 0 conv (200 waived) = 2400 due
      ;[3, 4].forEach((i) => {
        expect(scheduled[i].tuitionFee).toBe(2400)
        expect(scheduled[i].conveyanceFee).toBe(0)
        expect(scheduled[i].grossFee).toBe(2600)
        expect(scheduled[i].waiverTotal).toBe(200)
        expect(scheduled[i].totalAmount).toBe(2400)
        expect(scheduled[i].netDue).toBe(2400)
        expect(scheduled[i].isCustomized).toBe(true)
        expect(scheduled[i].waivers).toHaveLength(1)
        expect(scheduled[i].waivers[0]).toEqual({
          head: 'conveyance',
          amount: 200,
          reason: 'Vacation month',
          approvedBy: 'Principal',
        })
      })

      const totalNetDue = scheduled.reduce((sum, m) => sum + m.netDue, 0)
      expect(totalNetDue).toBe(12600)

      // Paying full 12,600 marks all five months Paid
      const res = allocateMultiMonthPayment({
        scheduledMonths: scheduled,
        totalReceived: 12600,
      })

      expect(res.isValid).toBe(true)
      expect(res.totalNetDue).toBe(12600)
      expect(res.totalAllocated).toBe(12600)
      expect(res.unallocatedAmount).toBe(0)

      res.allocations.forEach((a) => {
        expect(a.allocatedPaid).toBe(a.netDue)
        expect(a.remainingAmount).toBe(0)
        expect(a.status).toBe('paid')
      })
    })

    it('handles the same waiver with part payment (oldest months fill first)', () => {
      const months = [
        { month: 'April', year: 2026 },
        { month: 'May', year: 2026 },
        { month: 'June', year: 2026 },
        { month: 'July', year: 2026 },
        { month: 'August', year: 2026 },
      ]

      const perMonthCustomizations = {
        July_2026: { waiveConveyance: true, reason: 'Vacation month', approvedBy: 'Principal' },
        August_2026: { waiveConveyance: true, reason: 'Vacation month', approvedBy: 'Principal' },
      }

      const scheduled = buildMonthDues({
        months,
        rates: { tuitionFee: 2400, conveyanceFee: 200 },
        perMonthCustomizations,
      })

      // Parent pays 6000:
      // Month 1 (April, due 2600): paid 2600 -> Paid
      // Month 2 (May, due 2600): paid 2600 -> Paid
      // Month 3 (June, due 2600): paid 800, remaining 1800 -> Partial
      // Month 4 (July, due 2400): paid 0, remaining 2400 -> Pending
      // Month 5 (August, due 2400): paid 0, remaining 2400 -> Pending
      const res = allocateMultiMonthPayment({
        scheduledMonths: scheduled,
        totalReceived: 6000,
      })

      expect(res.isValid).toBe(true)
      expect(res.allocations[0].allocatedPaid).toBe(2600)
      expect(res.allocations[0].remainingAmount).toBe(0)
      expect(res.allocations[0].status).toBe('paid')

      expect(res.allocations[1].allocatedPaid).toBe(2600)
      expect(res.allocations[1].remainingAmount).toBe(0)
      expect(res.allocations[1].status).toBe('paid')

      expect(res.allocations[2].allocatedPaid).toBe(800)
      expect(res.allocations[2].remainingAmount).toBe(1800)
      expect(res.allocations[2].status).toBe('partial')

      expect(res.allocations[3].allocatedPaid).toBe(0)
      expect(res.allocations[3].remainingAmount).toBe(2400)
      expect(res.allocations[3].status).toBe('pending')

      expect(res.allocations[4].allocatedPaid).toBe(0)
      expect(res.allocations[4].remainingAmount).toBe(2400)
      expect(res.allocations[4].status).toBe('pending')
    })

    it('tracks manual tuition override on one month', () => {
      const months = [
        { month: 'April', year: 2026 },
        { month: 'May', year: 2026 },
      ]

      // May tuition manually reduced from 2400 to 2000
      const perMonthCustomizations = {
        May_2026: {
          tuitionFee: 2000,
          reason: 'Management waiver',
          approvedBy: 'Director',
        },
      }

      const scheduled = buildMonthDues({
        months,
        rates: { tuitionFee: 2400, conveyanceFee: 200 },
        perMonthCustomizations,
      })

      expect(scheduled[0].tuitionFee).toBe(2400)
      expect(scheduled[0].waiverTotal).toBe(0)

      expect(scheduled[1].tuitionFee).toBe(2000)
      expect(scheduled[1].conveyanceFee).toBe(200)
      expect(scheduled[1].grossFee).toBe(2600)
      expect(scheduled[1].waiverTotal).toBe(400)
      expect(scheduled[1].totalAmount).toBe(2200)
      expect(scheduled[1].netDue).toBe(2200)
      expect(scheduled[1].waivers).toEqual([
        {
          head: 'tuition',
          amount: 400,
          reason: 'Management waiver',
          approvedBy: 'Director',
        },
      ])
    })

    it('handles waiver on an existing Pending month (due reduced, status & remaining recomputed)', () => {
      const months = [
        {
          month: 'April',
          year: 2026,
          existingRecord: {
            amount: 0,
            totalAmount: 2600,
            remainingAmount: 2600,
            status: 'pending',
          },
        },
      ]

      // Waive conveyance (200) on existing pending month
      const perMonthCustomizations = {
        April_2026: {
          waiveConveyance: true,
          reason: 'Transport not used',
          approvedBy: 'Accountant',
        },
      }

      const scheduled = buildMonthDues({
        months,
        rates: { tuitionFee: 2400, conveyanceFee: 200 },
        perMonthCustomizations,
      })

      expect(scheduled[0].grossFee).toBe(2600)
      expect(scheduled[0].waiverTotal).toBe(200)
      expect(scheduled[0].totalAmount).toBe(2400)
      expect(scheduled[0].netDue).toBe(2400)

      const res = allocateMultiMonthPayment({
        scheduledMonths: scheduled,
        totalReceived: 2400,
      })

      expect(res.isValid).toBe(true)
      expect(res.allocations[0].allocatedPaid).toBe(2400)
      expect(res.allocations[0].remainingAmount).toBe(0)
      expect(res.allocations[0].status).toBe('paid')
    })

    it('rejects a waiver that would push net due below the amount already paid', () => {
      const months = [
        {
          month: 'April',
          year: 2026,
          existingRecord: {
            amount: 2500,
            totalAmount: 2600,
            remainingAmount: 100,
            status: 'partial',
          },
        },
      ]

      // Attempting to waive conveyance (200), bringing net fee to 2400, which is below 2500 already paid
      const perMonthCustomizations = {
        April_2026: {
          waiveConveyance: true,
          reason: 'Management waiver',
          approvedBy: 'Manager',
        },
      }

      const scheduled = buildMonthDues({
        months,
        rates: { tuitionFee: 2400, conveyanceFee: 200 },
        perMonthCustomizations,
      })

      expect(scheduled[0].waiverExceedsPaid).toBe(true)

      const val = validateMultiMonthWaivers({
        scheduledMonths: scheduled,
        approvedBy: 'Manager',
      })
      expect(val.valid).toBe(false)
      expect(val.error).toContain('reduces due (₹2,400) below already paid amount (₹2,500)')

      const alloc = allocateMultiMonthPayment({
        scheduledMonths: scheduled,
        totalReceived: 0,
      })
      expect(alloc.hasInvalidWaiver).toBe(true)
      expect(alloc.isValid).toBe(false)
    })

    it('locks rows for fully paid months', () => {
      const months = [
        {
          month: 'April',
          year: 2026,
          existingRecord: {
            amount: 2600,
            totalAmount: 2600,
            remainingAmount: 0,
            status: 'paid',
          },
        },
      ]

      const scheduled = buildMonthDues({
        months,
        rates: { tuitionFee: 2400, conveyanceFee: 200 },
      })

      expect(scheduled[0].isFullyPaid).toBe(true)
      expect(scheduled[0].netDue).toBe(0)

      const res = allocateMultiMonthPayment({
        scheduledMonths: scheduled,
        totalReceived: 0,
      })

      expect(res.allocations[0].allocatedPaid).toBe(0)
      expect(res.allocations[0].remainingAmount).toBe(0)
      expect(res.allocations[0].status).toBe('paid')
    })

    it('updates only non-customized rows when rate fields change, and supports reset', () => {
      const months = [
        { month: 'April', year: 2026 },
        { month: 'May', year: 2026 },
      ]

      let perMonthCustomizations = {
        May_2026: { tuitionFee: 2000 },
      }

      // Initial schedule at rate 2400
      let scheduled = buildMonthDues({
        months,
        rates: { tuitionFee: 2400, conveyanceFee: 200 },
        perMonthCustomizations,
      })
      expect(scheduled[0].tuitionFee).toBe(2400)
      expect(scheduled[1].tuitionFee).toBe(2000)

      // Rate changes to 2800 -> April updates to 2800, May remains custom 2000
      scheduled = buildMonthDues({
        months,
        rates: { tuitionFee: 2800, conveyanceFee: 200 },
        perMonthCustomizations,
      })
      expect(scheduled[0].tuitionFee).toBe(2800)
      expect(scheduled[1].tuitionFee).toBe(2000)

      // Resetting customizations restores May to 2800
      perMonthCustomizations = {}
      scheduled = buildMonthDues({
        months,
        rates: { tuitionFee: 2800, conveyanceFee: 200 },
        perMonthCustomizations,
      })
      expect(scheduled[0].tuitionFee).toBe(2800)
      expect(scheduled[1].tuitionFee).toBe(2800)
      expect(scheduled[1].isCustomized).toBe(false)
    })

    it('requires waiver reason and approver to save', () => {
      const months = [{ month: 'April', year: 2026 }]
      const perMonthCustomizations = {
        April_2026: {
          waiveConveyance: true,
          reason: '',
          approvedBy: '',
        },
      }

      const scheduled = buildMonthDues({
        months,
        rates: { tuitionFee: 2400, conveyanceFee: 200 },
        perMonthCustomizations,
      })

      // Missing reason
      let val = validateMultiMonthWaivers({ scheduledMonths: scheduled, approvedBy: 'Principal' })
      expect(val.valid).toBe(false)
      expect(val.error).toContain('Please select or enter a waiver reason')

      // Reason provided, but missing approver
      scheduled[0].waiverReason = 'Vacation month'
      val = validateMultiMonthWaivers({ scheduledMonths: scheduled, approvedBy: '' })
      expect(val.valid).toBe(false)
      expect(val.error).toContain('Please enter who approved the waiver')

      // Both provided -> Valid
      val = validateMultiMonthWaivers({ scheduledMonths: scheduled, approvedBy: 'Principal' })
      expect(val.valid).toBe(true)
      expect(val.approvedBy).toBe('Principal')
    })

    it('maintains academic ordering across year boundary and sanitizes negative amounts', () => {
      const months = [
        { month: 'February', year: 2027 },
        { month: 'November', year: 2026 },
      ]

      const perMonthCustomizations = {
        February_2027: {
          tuitionFee: -500, // Negative input
          conveyanceFee: -200,
        },
      }

      const scheduled = buildMonthDues({
        months,
        rates: { tuitionFee: 2400, conveyanceFee: 200 },
        perMonthCustomizations,
      })

      // Oldest first: Nov 2026 before Feb 2027
      expect(scheduled[0].month).toBe('November')
      expect(scheduled[0].year).toBe(2026)
      expect(scheduled[1].month).toBe('February')
      expect(scheduled[1].year).toBe(2027)

      // Sanitized negative amounts
      expect(scheduled[1].tuitionFee).toBe(0)
      expect(scheduled[1].conveyanceFee).toBe(0)
      expect(scheduled[1].totalAmount).toBe(0)
      expect(scheduled[1].netDue).toBe(0)
    })
  })
})

