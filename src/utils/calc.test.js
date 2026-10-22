import { describe, expect, it } from 'vitest'
import {
  calcStudent,
  calcSubject,
  calcTerm,
  getScheme,
  getSubjectScheme,
  round2,
} from './calc.ts'
import marksConfig from '../config/marks-config.json'

describe('School App 2026-27 — Marks Calculation Rules & Verification Suite', () => {
  describe('Config Integrity', () => {
    it('verifies all 6 schemes exist and compute internalDivisor from config', () => {
      const schemeIds = [
        'STD_80_20',
        'PRACTICAL_70_30',
        'HALF_30_20',
        'DRAWING_30_20',
        'EARLY_60_40',
        'EARLY_NO_DIV_60_40',
      ]

      for (const id of schemeIds) {
        const s = getScheme(id)
        expect(s).toBeDefined()
        const computedDivisor = s.internalRawMax / s.internalMax
        if (id === 'STD_80_20' || id === 'HALF_30_20') {
          expect(computedDivisor).toBe(3)
        } else if (id === 'PRACTICAL_70_30' || id === 'DRAWING_30_20' || id === 'EARLY_60_40') {
          expect(computedDivisor).toBe(2)
        } else if (id === 'EARLY_NO_DIV_60_40') {
          expect(computedDivisor).toBe(1)
        }
      }
    })

    it('resolves subject schemes by class from marks-config.json', () => {
      expect(getSubjectScheme('Class 11 Science', 'Physics').id).toBe('PRACTICAL_70_30')
      expect(getSubjectScheme('Class 11 Science', 'Maths').id).toBe('STD_80_20')
      expect(getSubjectScheme('Class 1', 'Drawing').id).toBe('DRAWING_30_20')
      expect(getSubjectScheme('Class 1', 'Computer').id).toBe('HALF_30_20')
      expect(getSubjectScheme('Class 1', 'English-I').id).toBe('STD_80_20')
      expect(getSubjectScheme('NUR', 'English Written').id).toBe('EARLY_60_40')
      expect(getSubjectScheme('UKG', 'E.V.S.').id).toBe('EARLY_NO_DIV_60_40')
    })
  })

  describe('The Nine Canonical Test Cases from Section 7', () => {
    // Test Case 1: STD_80_20
    it('Case 1: STD_80_20 calculation', () => {
      const scheme = getScheme('STD_80_20')
      const t1 = {
        components: { fa1: 18, fa2: 15, assignment: 8, oral: 9 },
        exam: 62,
      }
      const t2 = {
        components: { fa3: 20, fa4: 20, assignment: 10, oral: 10 },
        exam: 70,
      }

      const res = calcSubject(scheme, t1, t2)
      // T-I internal 50÷3 = 16.67, T-I total 78.67, T-II total 90, grand 168.67 / 200
      expect(res.term1.internalRaw).toBe(50)
      expect(res.term1.internalScaled).toBe(16.67)
      expect(res.term1.termTotal).toBe(78.67)
      expect(res.term2.internalRaw).toBe(60)
      expect(res.term2.internalScaled).toBe(20)
      expect(res.term2.termTotal).toBe(90)
      expect(res.grandTotal).toBe(168.67)
      expect(res.grandMax).toBe(200)
      expect(res.complete).toBe(true)
    })

    // Test Case 2: PRACTICAL_70_30
    it('Case 2: PRACTICAL_70_30 calculation', () => {
      const scheme = getScheme('PRACTICAL_70_30')
      const t1 = {
        components: { fa1: 18, fa2: 15, assignment: 8, oral: 9 },
        exam: 55,
      }
      const t2 = {
        components: { fa3: 20, fa4: 20, assignment: 10, oral: 10 },
        exam: 60,
      }

      const res = calcSubject(scheme, t1, t2)
      // T-I internal 50÷2 = 25, T-I total 80, T-II total 90, grand 170 / 200
      expect(res.term1.internalRaw).toBe(50)
      expect(res.term1.internalScaled).toBe(25)
      expect(res.term1.termTotal).toBe(80)
      expect(res.term2.internalRaw).toBe(60)
      expect(res.term2.internalScaled).toBe(30)
      expect(res.term2.termTotal).toBe(90)
      expect(res.grandTotal).toBe(170)
      expect(res.grandMax).toBe(200)
      expect(res.complete).toBe(true)
    })

    // Test Case 3: HALF_30_20
    it('Case 3: HALF_30_20 calculation', () => {
      const scheme = getScheme('HALF_30_20')
      const t1 = {
        components: { fa1: 12, fa2: 14, assignment: 6, oral: 7 },
        exam: 24,
      }
      const t2 = {
        components: { fa3: 20, fa4: 20, assignment: 10, oral: 10 },
        exam: 30,
      }

      const res = calcSubject(scheme, t1, t2)
      // T-I internal 13, T-I total 37, grand 87 / 100
      expect(res.term1.internalRaw).toBe(39)
      expect(res.term1.internalScaled).toBe(13)
      expect(res.term1.termTotal).toBe(37)
      expect(res.term2.termTotal).toBe(50)
      expect(res.grandTotal).toBe(87)
      expect(res.grandMax).toBe(100)
      expect(res.complete).toBe(true)
    })

    // Test Case 4: DRAWING_30_20
    it('Case 4: DRAWING_30_20 calculation', () => {
      const scheme = getScheme('DRAWING_30_20')
      const t1 = {
        components: { fa1: 17, fa2: 19 },
        exam: 25,
      }
      const t2 = {
        components: { fa3: 15, fa4: 20 },
        exam: 28,
      }

      const res = calcSubject(scheme, t1, t2)
      // T-I internal 36÷2 = 18, T-I total 43, T-II internal 17.5, grand 88.5 / 100
      expect(res.term1.internalRaw).toBe(36)
      expect(res.term1.internalScaled).toBe(18)
      expect(res.term1.termTotal).toBe(43)
      expect(res.term2.internalRaw).toBe(35)
      expect(res.term2.internalScaled).toBe(17.5)
      expect(res.term2.termTotal).toBe(45.5)
      expect(res.grandTotal).toBe(88.5)
      expect(res.grandMax).toBe(100)
      expect(res.complete).toBe(true)
    })

    // Test Case 5: EARLY_60_40
    it('Case 5: EARLY_60_40 calculation', () => {
      const scheme = getScheme('EARLY_60_40')
      const t1 = {
        components: { fa1: 15, fa2: 16, dictation: 18, oral: 17 },
        exam: 48,
      }
      const t2 = {
        components: { fa3: 20, fa4: 20, dictation: 20, oral: 20 },
        exam: 55,
      }

      const res = calcSubject(scheme, t1, t2)
      // T-I internal 66÷2 = 33, T-I total 81, grand 176 / 200
      expect(res.term1.internalRaw).toBe(66)
      expect(res.term1.internalScaled).toBe(33)
      expect(res.term1.termTotal).toBe(81)
      expect(res.term2.termTotal).toBe(95)
      expect(res.grandTotal).toBe(176)
      expect(res.grandMax).toBe(200)
      expect(res.complete).toBe(true)
    })

    // Test Case 6: EARLY_NO_DIV_60_40
    it('Case 6: EARLY_NO_DIV_60_40 calculation', () => {
      const scheme = getScheme('EARLY_NO_DIV_60_40')
      const t1 = {
        components: { fa1: 17, fa2: 18 },
        exam: 50,
      }
      const t2 = {
        components: { fa3: 20, fa4: 20 },
        exam: 52,
      }

      const res = calcSubject(scheme, t1, t2)
      // T-I internal 35 (no division), T-I total 85, grand 177 / 200
      expect(res.term1.internalRaw).toBe(35)
      expect(res.term1.internalScaled).toBe(35)
      expect(res.term1.termTotal).toBe(85)
      expect(res.term2.termTotal).toBe(92)
      expect(res.grandTotal).toBe(177)
      expect(res.grandMax).toBe(200)
      expect(res.complete).toBe(true)
    })

    // Test Case 7: Student with #1 + #2
    it('Case 7: Student with #1 + #2', () => {
      const scheme1 = getScheme('STD_80_20')
      const sub1 = calcSubject(
        scheme1,
        { components: { fa1: 18, fa2: 15, assignment: 8, oral: 9 }, exam: 62 },
        { components: { fa3: 20, fa4: 20, assignment: 10, oral: 10 }, exam: 70 }
      )

      const scheme2 = getScheme('PRACTICAL_70_30')
      const sub2 = calcSubject(
        scheme2,
        { components: { fa1: 18, fa2: 15, assignment: 8, oral: 9 }, exam: 55 },
        { components: { fa3: 20, fa4: 20, assignment: 10, oral: 10 }, exam: 60 }
      )

      const studentRes = calcStudent([sub1, sub2])
      // obtained 338.67, max 400, 84.67 %
      expect(studentRes.obtained).toBe(338.67)
      expect(studentRes.max).toBe(400)
      expect(studentRes.percentage).toBe(84.67)
    })

    // Test Case 8: STD_80_20, F.A.1 = AB
    it('Case 8: STD_80_20 with F.A.1 = "AB" and Term-II empty', () => {
      const scheme = getScheme('STD_80_20')
      const t1 = {
        components: { fa1: 'AB', fa2: 15, assignment: 8, oral: 9 },
        exam: 62,
      }
      const t2 = {
        components: {},
        exam: null,
      }

      const res = calcSubject(scheme, t1, t2)
      // internalRaw = 32 (AB = 0), result flagged incomplete
      expect(res.term1.internalRaw).toBe(32)
      expect(res.term1.complete).toBe(true)
      expect(res.term2.complete).toBe(false)
      expect(res.complete).toBe(false)
    })

    // Test Case 9: STD_80_20, F.A.1 = 21 (rejected, out of bounds)
    it('Case 9: STD_80_20 with F.A.1 = 21 throws out-of-bounds error', () => {
      const scheme = getScheme('STD_80_20')
      const t1 = {
        components: { fa1: 21, fa2: 15, assignment: 8, oral: 9 },
        exam: 62,
      }

      expect(() => calcTerm(scheme, 1, t1)).toThrow(/fa1 must be between 0 and 20/i)
    })
  })

  describe('Pending state & missing component handling', () => {
    it('marks term as pending (complete=false) when component is missing or null', () => {
      const scheme = getScheme('STD_80_20')
      const t1 = {
        components: { fa1: 15, fa2: null, assignment: 8, oral: 9 },
        exam: 60,
      }
      const res = calcTerm(scheme, 1, t1)
      expect(res.complete).toBe(false)
    })

    it('marks term as pending (complete=false) when exam is missing or null', () => {
      const scheme = getScheme('STD_80_20')
      const t1 = {
        components: { fa1: 15, fa2: 15, assignment: 8, oral: 9 },
        exam: null,
      }
      const res = calcTerm(scheme, 1, t1)
      expect(res.complete).toBe(false)
    })
  })
})
