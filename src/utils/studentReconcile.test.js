import { describe, expect, it } from 'vitest'
import {
  buildReconciliationPlan,
  extractNumericSuffix,
  isLegacyPrefixedId,
} from './studentReconcile.js'

describe('studentReconcile helpers', () => {
  it('extractNumericSuffix extracts numbers from various formats', () => {
    expect(extractNumericSuffix('S92')).toBe('92')
    expect(extractNumericSuffix('s-92')).toBe('92')
    expect(extractNumericSuffix('SID-101')).toBe('101')
    expect(extractNumericSuffix('101')).toBe('101')
    expect(extractNumericSuffix('abc-xyz')).toBe(null)
  })

  it('isLegacyPrefixedId detects legacy formats', () => {
    expect(isLegacyPrefixedId('S92')).toBe(true)
    expect(isLegacyPrefixedId('s100')).toBe(true)
    expect(isLegacyPrefixedId('SID-101')).toBe(true)
    expect(isLegacyPrefixedId('92')).toBe(false)
    expect(isLegacyPrefixedId('320')).toBe(false)
  })

  it('buildReconciliationPlan matches legacy students to clean students and maps fees', () => {
    const students = [
      { id: '92', name: 'Rishabh Yadav', class: 'III' },
      { id: '320', name: 'Aryan Tripathi', class: 'II' },
      { id: 'S92', name: 'Rishabh Yadav', class: 'III' },
    ]

    const fees = [
      {
        docId: 'S92__2026__august',
        studentId: 'S92',
        studentName: 'Rishabh Yadav',
        month: 'August',
        year: 2026,
        amount: 2000,
        status: 'paid',
      },
    ]

    const plan = buildReconciliationPlan(students, fees)

    expect(plan.summary.legacyDuplicatesCount).toBe(1)
    expect(plan.summary.remainingStudentsCount).toBe(2)
    expect(plan.studentsToDelete).toEqual(['S92'])
    expect(plan.feesToMigrate).toHaveLength(1)
    expect(plan.feesToMigrate[0].targetStudentId).toBe('92')
    expect(plan.feesToMigrate[0].amount).toBe(2000)
  })

  it('buildReconciliationPlan matches by Name and Class if ID format differs', () => {
    const students = [
      { id: '999', name: 'Ayanshi Yadav', class: 'III' },
      { id: 'S94', name: 'Ayanshi Yadav', class: 'III' },
    ]

    const fees = [
      {
        docId: 'S94__2026__august',
        studentId: 'S94',
        studentName: 'Ayanshi Yadav',
        month: 'August',
        year: 2026,
        amount: 1500,
        status: 'paid',
      },
    ]

    const plan = buildReconciliationPlan(students, fees)
    expect(plan.studentsToDelete).toEqual(['S94'])
    expect(plan.feesToMigrate[0].targetStudentId).toBe('999')
  })
})
