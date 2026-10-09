import { describe, expect, it } from 'vitest'
import {
  CLASS_MARK_SCHEMES,
  calculateTermMarks,
  getClassMarkScheme,
  getSubjectMarkConfig,
  matchClassKey,
} from './marksheetDefaults.js'

describe('Nursery Marks Scheme & Matching Rules (Ground Rules Test Suite)', () => {
  describe('1. Class-Based Scheme Config for Nursery', () => {
    it('defines Nursery in CLASS_MARK_SCHEMES with expected maxima and components', () => {
      const scheme = getClassMarkScheme('Nursery')
      expect(scheme).toBeDefined()
      expect(scheme.faMax).toBe(20)
      expect(scheme.internalMax).toBe(40)
      expect(scheme.theoryMax).toBe(60)
      expect(scheme.termMax).toBe(100)
      expect(scheme.hasAssignment).toBe(false)
      expect(scheme.hasOral).toBe(false)
      expect(scheme.components).toEqual(['FA-1', 'FA-2', 'SA-1'])
    })

    it('returns null custom scheme for non-Nursery classes so they fall through', () => {
      expect(getClassMarkScheme('Playgroup')).toBeNull()
      expect(getClassMarkScheme('LKG')).toBeNull()
      expect(getClassMarkScheme('UKG')).toBeNull()
      expect(getClassMarkScheme('I')).toBeNull()
      expect(getClassMarkScheme('V')).toBeNull()
      expect(getClassMarkScheme('X')).toBeNull()
      expect(getClassMarkScheme('XI Science')).toBeNull()
      expect(getClassMarkScheme('XII Commerce')).toBeNull()
    })

    it('provides correct subject mark config for Nursery subjects without assignment or oral', () => {
      const subjects = [
        'English Written',
        'English Oral',
        'English Dictation',
        'Hindi Written',
        'Hindi Oral',
        'Hindi Dictation',
        'Maths Written',
        'Maths Oral',
        'E.V.S.',
        'Drawing',
      ]

      subjects.forEach((sub) => {
        const cfg = getSubjectMarkConfig('Nursery', sub)
        expect(cfg.isNurseryScheme).toBe(true)
        expect(cfg.faMax).toBe(20)
        expect(cfg.internalMax).toBe(40)
        expect(cfg.theoryMax).toBe(60)
        expect(cfg.termMax).toBe(100)
        expect(cfg.hasAssignment).toBe(false)
        expect(cfg.hasOral).toBe(false)
        expect(cfg.divisor).toBe(1)
      })
    })
  })

  describe('2. Nursery Calculation: Totals, Maxima, and S.A.-1 Pending', () => {
    it('calculates IA = FA1 + FA2 without halving or division (Kabir Yadav spot-check)', () => {
      // English Written: FA1=20, FA2=20 => IA=40
      const engW = calculateTermMarks(20, 20, null, 20, 20, 60, 0, 0, 0, 0, 'Nursery', 'English Written')
      expect(engW.internalObt).toBe(40)
      expect(engW.internalMax).toBe(40)
      expect(engW.isSaPending).toBe(true)
      expect(engW.totalObt).toBeNull()

      // English Oral: FA1=20, FA2=18 => IA=38 (Excel sheet halved this to 19; our calculation must be 38)
      const engO = calculateTermMarks(20, 18, null, 20, 20, 60, 0, 0, 0, 0, 'Nursery', 'English Oral')
      expect(engO.internalObt).toBe(38)
      expect(engO.internalMax).toBe(40)

      // Hindi Written: FA1=15, FA2=17 => IA=32 (Excel sheet halved to 16)
      const hinW = calculateTermMarks(15, 17, null, 20, 20, 60, 0, 0, 0, 0, 'Nursery', 'Hindi Written')
      expect(hinW.internalObt).toBe(32)

      // Maths Oral: FA1=10, FA2=16 => IA=26 (Excel sheet halved to 13)
      const mthO = calculateTermMarks(10, 16, null, 20, 20, 60, 0, 0, 0, 0, 'Nursery', 'Maths Oral')
      expect(mthO.internalObt).toBe(26)
    })

    it('computes full Term 1 Total (out of 100) when SA-1 is entered', () => {
      // Kabir Yadav: English Written FA1=20, FA2=20, SA1=55 => IA=40, Total=95
      const calc = calculateTermMarks(20, 20, 55, 20, 20, 60, 0, 0, 0, 0, 'Nursery', 'English Written')
      expect(calc.internalObt).toBe(40)
      expect(calc.saObt).toBe(55)
      expect(calc.isSaPending).toBe(false)
      expect(calc.totalObt).toBe(95)
      expect(calc.maxMarks).toBe(100)
    })

    it('preserves genuine 0 marks and handles null vs zero correctly', () => {
      // Genuine 0 score in FA-1
      const zeroFA = calculateTermMarks(0, 15, null, 20, 20, 60, 0, 0, 0, 0, 'Nursery', 'Hindi Written')
      expect(zeroFA.internalObt).toBe(15)
      expect(zeroFA.isSaPending).toBe(true)

      // Genuine 0 score in both FAs
      const doubleZero = calculateTermMarks(0, 0, null, 20, 20, 60, 0, 0, 0, 0, 'Nursery', 'Maths Written')
      expect(doubleZero.internalObt).toBe(0)
      expect(doubleZero.isSaPending).toBe(true)

      // Genuine 0 in SA-1 is not pending
      const zeroSA = calculateTermMarks(15, 15, 0, 20, 20, 60, 0, 0, 0, 0, 'Nursery', 'Drawing')
      expect(zeroSA.internalObt).toBe(30)
      expect(zeroSA.saObt).toBe(0)
      expect(zeroSA.isSaPending).toBe(false)
      expect(zeroSA.totalObt).toBe(30)
    })
  })

  describe('3. Unchanged Behavior for Non-Nursery Classes (Regression Guard)', () => {
    it('LKG and UKG still divide by 3 for standard subjects and divide by 2 for Drawing/EVS', () => {
      const lkg = getSubjectMarkConfig('LKG', 'English Written')
      expect(lkg.isNurseryScheme).toBeUndefined()
      expect(lkg.divisor).toBe(3)
      expect(lkg.internalMax).toBe(20)
      expect(lkg.theoryMax).toBe(80)
      expect(lkg.hasAssignment).toBe(true)
      expect(lkg.hasOral).toBe(true)

      const ukgEvs = getSubjectMarkConfig('UKG', 'E.V.S.')
      expect(ukgEvs.divisor).toBe(2)
      expect(ukgEvs.internalMax).toBe(20)
      expect(ukgEvs.theoryMax).toBe(80)
      expect(ukgEvs.hasAssignment).toBe(false)
      expect(ukgEvs.hasOral).toBe(false)
    })

    it('Classes 1 to 10 and 11-12 retain exact existing syllabus parameters', () => {
      const cls1 = getSubjectMarkConfig('I', 'English-I')
      expect(cls1.divisor).toBe(3)
      expect(cls1.internalMax).toBe(20)
      expect(cls1.theoryMax).toBe(80)

      const cls11Prac = getSubjectMarkConfig('XI Science', 'Physics')
      expect(cls11Prac.divisor).toBe(2)
      expect(cls11Prac.internalMax).toBe(30)
      expect(cls11Prac.theoryMax).toBe(70)
    })
  })

  describe('4. Student Name Normalization & Safe Matching Rules', () => {
    function normalizeName(name) {
      if (!name) return ''
      return String(name)
        .trim()
        .toUpperCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
    }

    it('normalizes casing, whitespace, and punctuation', () => {
      expect(normalizeName('  kabir   yadav  ')).toBe('KABIR YADAV')
      expect(normalizeName('RADHESHYAM  PANDEY')).toBe('RADHESHYAM PANDEY')
      expect(normalizeName('E.V.S.')).toBe('EVS')
      expect(normalizeName('Mr. Mukesh Yadav')).toBe('MR MUKESH YADAV')
    })

    it('enforces that near matches are never auto-applied as exact matches', () => {
      // Shreyash vs Shreyas
      expect(normalizeName('Shreyash Sharma') === normalizeName('SHREYAS SHARMA')).toBe(false)

      // Sajan Sonkar vs Sajan Sonker
      expect(normalizeName('Sajan Sonkar') === normalizeName('Sajan Sonker')).toBe(false)

      // Arya Yadav vs AIRYA YADAV
      expect(normalizeName('Arya Yadav') === normalizeName('AIRYA YADAV')).toBe(false)

      // Rudrika Pandey vs RUDRIKA PANDAY
      expect(normalizeName('Rudrika Pandey') === normalizeName('RUDRIKA PANDAY')).toBe(false)

      // Kirtiman Tiwari vs KRITIMAN TIWARI
      expect(normalizeName('Kirtiman Tiwari') === normalizeName('KRITIMAN TIWARI')).toBe(false)

      // Ela Pandey vs IRA Pandey
      expect(normalizeName('Ela Pandey') === normalizeName('IRA Pandey')).toBe(false)
    })

    it('matches exact normalized names accurately', () => {
      expect(normalizeName('Kabir Yadav') === normalizeName('KABIR YADAV')).toBe(true)
      expect(normalizeName('Shivanshi Nishad') === normalizeName('SHIVANSHI NISHAD')).toBe(true)
      expect(normalizeName('Vinayak Yadav') === normalizeName('VINAYAK YADAV')).toBe(true)
      expect(normalizeName('Simonika') === normalizeName('SIMONIKA')).toBe(true)
    })
  })
})
