import { describe, expect, it } from 'vitest'
import {
  ALL_CLASSES,
  DEFAULT_CLASS_SUBJECTS,
  calculateDivision,
  calculateScholasticGrade,
  matchClassKey,
} from './marksheetDefaults.js'

describe('marksheetDefaults utils', () => {
  it('has default main subjects configured for all class entries', () => {
    expect(ALL_CLASSES).toHaveLength(20)
    expect(DEFAULT_CLASS_SUBJECTS['Nursery']).toBeDefined()
    expect(DEFAULT_CLASS_SUBJECTS['LKG']).toBeDefined()
    expect(DEFAULT_CLASS_SUBJECTS['UKG']).toBeDefined()
    expect(DEFAULT_CLASS_SUBJECTS['I']).toEqual(['English', 'Hindi', 'Maths', 'EVS', 'GK', 'Computer'])
    expect(DEFAULT_CLASS_SUBJECTS['III']).toEqual(['English', 'Hindi', 'Maths', 'Science', 'Social Studies', 'Sanskrit'])
    expect(DEFAULT_CLASS_SUBJECTS['V']).toEqual(['English', 'Hindi', 'Maths', 'Science', 'Social Studies', 'Sanskrit'])
    expect(DEFAULT_CLASS_SUBJECTS['IX']).toEqual(['English', 'Hindi', 'Maths', 'Science (Phy+Chem+Bio)', 'Social Science', 'Health & Phy. Edu.'])
    expect(DEFAULT_CLASS_SUBJECTS['XI Science']).toEqual(['English', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Physical Education'])
    expect(DEFAULT_CLASS_SUBJECTS['XI Commerce']).toEqual(['English', 'Accountancy', 'Business Studies', 'Economics', 'Hindi', 'Physical Education'])
    expect(DEFAULT_CLASS_SUBJECTS['XI Humanities']).toEqual(['English', 'History', 'Political Science', 'Economics', 'Hindi', 'Physical Education'])
    expect(DEFAULT_CLASS_SUBJECTS['XII Humanities']).toEqual(['English', 'History', 'Political Science', 'Economics', 'Physical Education'])
  })

  it('correctly matches input class string and never wrongly dumps into Class V', () => {
    // Class 5 / V matches
    expect(matchClassKey('Class 5')).toBe('V')
    expect(matchClassKey('5-A')).toBe('V')
    expect(matchClassKey('5th')).toBe('V')
    expect(matchClassKey('Class 5th B')).toBe('V')
    expect(matchClassKey('V')).toBe('V')

    // Pre-primary classes do NOT match V
    expect(matchClassKey('LKG')).toBe('LKG')
    expect(matchClassKey('L.K.G.')).toBe('LKG')
    expect(matchClassKey('UKG')).toBe('UKG')
    expect(matchClassKey('NURSERY')).toBe('Nursery')
    expect(matchClassKey('Pre-Nursery')).toBe('Nursery')
    expect(matchClassKey('Playgroup')).toBe('Playgroup')
    expect(matchClassKey('PG')).toBe('Playgroup')

    // Secondary & Senior Secondary
    expect(matchClassKey('XI Science')).toBe('XI Science')
    expect(matchClassKey('Class 11 Commerce')).toBe('XI Commerce')
    expect(matchClassKey('XII-Humanities')).toBe('XII Humanities')
    expect(matchClassKey('Class VIII')).toBe('VIII')

    // Empty or unknown strings do NOT match Class V
    expect(matchClassKey('')).toBeNull()
    expect(matchClassKey(null)).toBeNull()
    expect(matchClassKey('UnassignedUnknown')).toBeNull()
  })

  it('calculates 8-point scholastic grades correctly', () => {
    expect(calculateScholasticGrade(95)).toBe('A1')
    expect(calculateScholasticGrade(85)).toBe('A2')
    expect(calculateScholasticGrade(75)).toBe('B1')
    expect(calculateScholasticGrade(65)).toBe('B2')
    expect(calculateScholasticGrade(55)).toBe('C1')
    expect(calculateScholasticGrade(45.94)).toBe('C2')
    expect(calculateScholasticGrade(35)).toBe('D')
    expect(calculateScholasticGrade(30)).toBe('E')
  })

  it('calculates division correctly based on percentage', () => {
    expect(calculateDivision(75)).toBe('First')
    expect(calculateDivision(60)).toBe('First')
    expect(calculateDivision(45.94)).toBe('Second')
    expect(calculateDivision(38)).toBe('Third')
    expect(calculateDivision(30)).toBe('Failed')
  })
})
