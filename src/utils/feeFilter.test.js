import { describe, expect, it } from 'vitest'
import {
  calculatePeriodMetrics,
  filterFeesByPeriod,
  getDiffInMonths,
  getFeeMonthIndex,
} from './feeFilter.js'

describe('feeFilter utilities', () => {
  const refDate = new Date(2026, 7, 31) // August 2026

  const sampleFees = [
    {
      docId: 'fee-1',
      studentName: 'Aarav',
      month: 'August',
      year: 2026,
      amount: 2000,
      totalAmount: 2000,
      remainingAmount: 0,
      status: 'paid',
    },
    {
      docId: 'fee-2',
      studentName: 'Vivaan',
      month: 'July',
      year: 2026,
      amount: 1500,
      totalAmount: 2000,
      remainingAmount: 500,
      status: 'paid',
    },
    {
      docId: 'fee-3',
      studentName: 'Diya',
      month: 'June',
      year: 2026,
      amount: 1800,
      totalAmount: 1800,
      remainingAmount: 0,
      status: 'paid',
    },
    {
      docId: 'fee-4',
      studentName: 'Kabir',
      month: 'March',
      year: 2026,
      amount: 2000,
      totalAmount: 2000,
      remainingAmount: 0,
      status: 'paid',
    },
    {
      docId: 'fee-5',
      studentName: 'Ananya',
      month: 'November',
      year: 2025,
      amount: 1200,
      totalAmount: 1200,
      remainingAmount: 0,
      status: 'paid',
    },
    {
      docId: 'fee-6',
      studentName: 'Rohan',
      month: 'August',
      year: 2024,
      amount: 1000,
      totalAmount: 1000,
      remainingAmount: 0,
      status: 'paid',
    },
  ]

  it('calculates linear month index correctly', () => {
    expect(getFeeMonthIndex('January', 2026)).toBe(2026 * 12 + 0)
    expect(getFeeMonthIndex('August', 2026)).toBe(2026 * 12 + 7)
    expect(getFeeMonthIndex('December', 2026)).toBe(2026 * 12 + 11)
    expect(getFeeMonthIndex('Invalid', 2026)).toBe(null)
  })

  it('calculates month differences across years correctly', () => {
    expect(getDiffInMonths(refDate, 'August', 2026)).toBe(0)
    expect(getDiffInMonths(refDate, 'July', 2026)).toBe(1)
    expect(getDiffInMonths(refDate, 'December', 2025)).toBe(8)
  })

  it('filters fees for running month', () => {
    const res = filterFeesByPeriod(sampleFees, 'running', refDate)
    expect(res.map((f) => f.studentName)).toEqual(['Aarav'])
  })

  it('filters fees for last 3 months (August, July, June 2026)', () => {
    const res = filterFeesByPeriod(sampleFees, '3months', refDate)
    expect(res.map((f) => f.studentName)).toEqual(['Aarav', 'Vivaan', 'Diya'])
  })

  it('filters fees for last 6 months (August, July, June, March 2026)', () => {
    const res = filterFeesByPeriod(sampleFees, '6months', refDate)
    expect(res.map((f) => f.studentName)).toEqual(['Aarav', 'Vivaan', 'Diya', 'Kabir'])
  })

  it('filters fees for last 1 year (past 12 months)', () => {
    const res = filterFeesByPeriod(sampleFees, '1year', refDate)
    expect(res.map((f) => f.studentName)).toEqual([
      'Aarav',
      'Vivaan',
      'Diya',
      'Kabir',
      'Ananya',
    ])
  })

  it('returns all fees for "all" period', () => {
    const res = filterFeesByPeriod(sampleFees, 'all', refDate)
    expect(res.length).toBe(sampleFees.length)
  })

  it('calculates financial metrics accurately', () => {
    const filtered = filterFeesByPeriod(sampleFees, '3months', refDate)
    const metrics = calculatePeriodMetrics(filtered)

    expect(metrics.totalRecords).toBe(3)
    expect(metrics.totalCollected).toBe(2000 + 1500 + 1800) // 5300
    expect(metrics.totalDue).toBe(500)
    expect(metrics.totalExpected).toBe(5800)
    expect(metrics.partialCount).toBe(1)
    expect(metrics.paidCount).toBe(2)
  })
})
