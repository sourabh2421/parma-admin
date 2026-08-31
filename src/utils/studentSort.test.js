import { describe, expect, it } from 'vitest'
import {
  compareClasses,
  getClassSortMeta,
  sortClassNames,
  sortStudentsByClassThenId,
} from './studentSort.js'

describe('studentSort class hierarchy', () => {
  it('correctly assigns numeric levels in educational order', () => {
    expect(getClassSortMeta('Nursery').numericLevel).toBe(2)
    expect(getClassSortMeta('Nur').numericLevel).toBe(2)
    expect(getClassSortMeta('LKG').numericLevel).toBe(3)
    expect(getClassSortMeta('L.K.G').numericLevel).toBe(3)
    expect(getClassSortMeta('UKG').numericLevel).toBe(4)
    expect(getClassSortMeta('1').numericLevel).toBe(101)
    expect(getClassSortMeta('I').numericLevel).toBe(101)
    expect(getClassSortMeta('Class 1').numericLevel).toBe(101)
    expect(getClassSortMeta('II').numericLevel).toBe(102)
    expect(getClassSortMeta('Class II').numericLevel).toBe(102)
    expect(getClassSortMeta('III').numericLevel).toBe(103)
    expect(getClassSortMeta('IV').numericLevel).toBe(104)
    expect(getClassSortMeta('V').numericLevel).toBe(105)
    expect(getClassSortMeta('X').numericLevel).toBe(110)
  })

  it('sorts class names in exact requested order: nursery, LKG, UKG, 1, II, III, IV...', () => {
    const rawClasses = ['III', 'UKG', 'II', 'Nursery', '1', 'LKG', 'IV', 'V']
    const sorted = sortClassNames(rawClasses)
    expect(sorted).toEqual(['Nursery', 'LKG', 'UKG', '1', 'II', 'III', 'IV', 'V'])
  })

  it('sorts students by Class hierarchy first, then by ID', () => {
    const students = [
      { id: '10', name: 'Student C', class: 'III' },
      { id: '5', name: 'Student A', class: 'Nursery' },
      { id: '2', name: 'Student B', class: 'LKG' },
      { id: '1', name: 'Student D', class: 'UKG' },
      { id: '3', name: 'Student E', class: 'II' },
      { id: '4', name: 'Student F', class: '1' },
    ]

    const sorted = sortStudentsByClassThenId(students)
    expect(sorted.map((s) => s.class)).toEqual(['Nursery', 'LKG', 'UKG', '1', 'II', 'III'])
  })
})
