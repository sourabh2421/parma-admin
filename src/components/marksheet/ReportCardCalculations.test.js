import { describe, expect, it } from 'vitest'
import {
  calculateAnnualSubjectMarks,
  calculateDivision,
  calculateScholasticGrade,
  calculateTermMarks,
  createScholasticTemplateForClass,
  matchClassKey,
} from '../../utils/marksheetDefaults.js'
import {
  cleanFatherName,
  createEmptyMarksheetForStudent,
  migrateOldRecord,
  resolveFatherName,
} from '../../firebase/marksheetRepository.js'

describe('Marksheet Calculations & Logical Integrity Test Suite', () => {
  describe('1. 8-Point Scholastic Grade Thresholds', () => {
    it('correctly maps all grade percentage boundaries', () => {
      expect(calculateScholasticGrade(100)).toBe('A1')
      expect(calculateScholasticGrade(95.5)).toBe('A1')
      expect(calculateScholasticGrade(91)).toBe('A1')
      expect(calculateScholasticGrade(90.9)).toBe('A2')
      expect(calculateScholasticGrade(81)).toBe('A2')
      expect(calculateScholasticGrade(80.9)).toBe('B1')
      expect(calculateScholasticGrade(71)).toBe('B1')
      expect(calculateScholasticGrade(70.9)).toBe('B2')
      expect(calculateScholasticGrade(61)).toBe('B2')
      expect(calculateScholasticGrade(60.9)).toBe('C1')
      expect(calculateScholasticGrade(51)).toBe('C1')
      expect(calculateScholasticGrade(50.9)).toBe('C2')
      expect(calculateScholasticGrade(41)).toBe('C2')
      expect(calculateScholasticGrade(40.9)).toBe('D')
      expect(calculateScholasticGrade(33)).toBe('D')
      expect(calculateScholasticGrade(32.9)).toBe('E')
      expect(calculateScholasticGrade(0)).toBe('E')
      expect(calculateScholasticGrade(-5)).toBe('E')
      expect(calculateScholasticGrade(NaN)).toBe('E')
      expect(calculateScholasticGrade(null)).toBe('E')
      expect(calculateScholasticGrade(undefined)).toBe('E')
    })
  })

  describe('2. Division Assignments', () => {
    it('correctly assigns divisions according to standard academic rules', () => {
      expect(calculateDivision(100)).toBe('First')
      expect(calculateDivision(60)).toBe('First')
      expect(calculateDivision(59.9)).toBe('Second')
      expect(calculateDivision(45)).toBe('Second')
      expect(calculateDivision(44.9)).toBe('Third')
      expect(calculateDivision(33)).toBe('Third')
      expect(calculateDivision(32.9)).toBe('Failed')
      expect(calculateDivision(0)).toBe('Failed')
      expect(calculateDivision(NaN)).toBe('Failed')
      expect(calculateDivision(null)).toBe('Failed')
    })
  })

  describe('3. Zero Scores & Falsy Value Handling', () => {
    it('preserves genuine 0 score and does not overwrite with fallbacks', () => {
      const studentWithZero = createEmptyMarksheetForStudent({
        id: 'TEST_ZERO_STUDENT',
        name: 'Test Student',
        class: 'I',
      })

      studentWithZero.scholastic[0].fa1Obt = 0
      studentWithZero.scholastic[0].fa1Max = 20

      const migrated = migrateOldRecord(studentWithZero)
      expect(migrated.scholastic[0].fa1Obt).toBe(0)
    })

    it('migrates legacy t1IntObt / t1MainObt correctly when FA fields are missing', () => {
      const legacyRecord = {
        id: 'LEGACY_STUD',
        name: 'Old Record Student',
        scholastic: [
          { name: 'English', t1IntMax: 20, t1IntObt: 18, t1MainMax: 80, t1MainObt: 65, t2IntMax: 20, t2IntObt: 19, t2MainMax: 80, t2MainObt: 72 },
        ],
      }

      const migrated = migrateOldRecord(legacyRecord)
      const eng = migrated.scholastic[0]
      expect(eng.fa1Obt).toBe(18)
      expect(eng.fa1Max).toBe(20)
      expect(eng.fa2Obt).toBe(0)
      expect(eng.fa2Max).toBe(20)
      expect(eng.sa1Obt).toBe(65)
      expect(eng.sa1Max).toBe(80)
      expect(eng.fa3Obt).toBe(19)
      expect(eng.fa4Obt).toBe(0)
      expect(eng.sa2Obt).toBe(72)
    })
  })

  describe('4. Class Matching & Stream Integrity', () => {
    it('accurately resolves pre-primary and stream classes without defaulting to Class V', () => {
      expect(matchClassKey('Playgroup')).toBe('Playgroup')
      expect(matchClassKey('PG')).toBe('Playgroup')
      expect(matchClassKey('Nursery')).toBe('Nursery')
      expect(matchClassKey('NUR')).toBe('Nursery')
      expect(matchClassKey('LKG')).toBe('LKG')
      expect(matchClassKey('UKG')).toBe('UKG')
      expect(matchClassKey('Class 1')).toBe('I')
      expect(matchClassKey('Class 5')).toBe('V')
      expect(matchClassKey('Class 10')).toBe('X')
      expect(matchClassKey('11th Science')).toBe('XI Science')
      expect(matchClassKey('11 Commerce')).toBe('XI Commerce')
      expect(matchClassKey('11 Humanities')).toBe('XI Humanities')
      expect(matchClassKey('12th Science')).toBe('XII Science')
      expect(matchClassKey('12 Commerce')).toBe('XII Commerce')
      expect(matchClassKey('12 Humanities')).toBe('XII Humanities')
      expect(matchClassKey('INVALID_CLASS_NAME')).toBeNull()
    })
  })

  describe('5. Father Name Extraction & Excel Master Lookup', () => {
    it('correctly extracts father name from master lookup and rejects class names', () => {
      expect(cleanFatherName('Mr. Surendra Sharma')).toBe('Mr. Surendra Sharma')
      expect(cleanFatherName('XI')).toBe('')
      expect(cleanFatherName('Class 5')).toBe('')
      expect(cleanFatherName('UKG')).toBe('')
      expect(resolveFatherName('277', 'VASU KUMAR', 'XI')).toBe('Arvind kumar')
    })
  })

  describe('6. Scholastic Template Generation', () => {
    it('generates correct subject list and initial 0 scores for Class XI Science', () => {
      const template = createScholasticTemplateForClass('XI Science')
      const subNames = template.map((s) => s.name)
      expect(subNames).toEqual(['English-I', 'English-II', 'Physics', 'Chemistry', 'Maths', 'Biology', 'Physical Education'])
      for (const sub of template) {
        expect(sub.fa1Max).toBe(20)
        expect(sub.fa1Obt).toBe(0)
        expect(sub.fa2Max).toBe(20)
        expect(sub.fa2Obt).toBe(0)
        expect(sub.sa1Obt).toBe(0)
        expect(sub.sa2Obt).toBe(0)
      }
    })

    it('generates correct subject list for Pre-Primary classes', () => {
      const template = createScholasticTemplateForClass('Nursery')
      const subNames = template.map((s) => s.name)
      expect(subNames).toEqual([
        'English Written', 'English Oral', 'English Dictation',
        'Hindi Written', 'Hindi Oral', 'Hindi Dictation',
        'Maths Written', 'Maths Oral', 'E.V.S.', 'Drawing',
      ])
    })
  })

  // =========================================================
  //  7. UNIFIED FORMULA TESTS  (source: Excel "2026-27" sheet)
  //
  //  FORMULA: internalObt = SUM(FA1, FA2, Assign, Oral) / divisor
  //  Term Total = internalObt + SA marks.
  // =========================================================
  describe('7. Excel Workbook Syllabus Evaluation System (All 6 Sheets)', () => {

    // ---- Sheet 1: NUR to UKG ----
    it('NUR-UKG: standard subject (Dictation+Oral) — FA avg + DictOral avg => Internal 40', () => {
      // FA avg = (20+20)/2=20, DictOral avg=(20+20)/2=20 => Internal=40, SA=60 => Total=100
      const eng = calculateTermMarks(20, 20, 60, 20, 20, 60, 20, 20, 20, 20, 'Nursery', 'English Written')
      expect(eng.internalObt).toBe(40)
      expect(eng.totalObt).toBe(100)
      expect(eng.maxMarks).toBe(100)
    })

    it('NUR-UKG: E.V.S. (no Dictation/Oral) — FA1+FA2 directly => Internal 40', () => {
      // EVS: FA1=20, FA2=20 => Internal=40, SA=60 => Total=100
      const evs = calculateTermMarks(20, 20, 60, 20, 20, 60, 0, 0, 0, 0, 'UKG', 'E.V.S.')
      expect(evs.internalObt).toBe(40)
      expect(evs.totalObt).toBe(100)
      expect(evs.maxMarks).toBe(100)
    })

    it('NUR-UKG: Drawing (no Dictation/Oral) — FA1+FA2 directly => Internal 33 (partial)', () => {
      // FA1=15, FA2=18 => Internal=33, SA=45 => Total=78
      const draw = calculateTermMarks(15, 18, 45, 20, 20, 60, 0, 0, 0, 0, 'LKG', 'Drawing')
      expect(draw.internalObt).toBe(33)
      expect(draw.totalObt).toBe(78)
      expect(draw.maxMarks).toBe(100)
    })

    // ---- Class 1-8: 100-mark subjects ----
    it('Class 1-2: standard 100-mark subject (divisor=3) — (FA1+FA2+Assign+Oral)/3 + SA', () => {
      // (20+20+10+10)/3 = 20, SA=80 => Total=100
      const eng = calculateTermMarks(20, 20, 80, 20, 20, 80, 10, 10, 10, 10, 'I', 'English-I')
      expect(eng.internalObt).toBe(20)
      expect(eng.totalObt).toBe(100)
      expect(eng.maxMarks).toBe(100)
    })

    it('Class 1-2: G.K. (50-mark, divisor=3) — (FA1+FA2+Assign+Oral)/3 + SA', () => {
      // (20+20+10+10)/3 = 20, SA=30 => Total=50
      const gk = calculateTermMarks(20, 20, 30, 20, 20, 30, 10, 10, 10, 10, 'I', 'G.K.')
      expect(gk.internalObt).toBe(20)
      expect(gk.totalObt).toBe(50)
      expect(gk.maxMarks).toBe(50)
    })

    it('Class 1-8: Drawing (50-mark, divisor=2, NO Assign/Oral) — (FA1+FA2)/2 + SA', () => {
      // Full marks: (20+20)/2 = 20, SA=30 => Total=50
      const drawFull = calculateTermMarks(20, 20, 30, 20, 20, 30, 0, 0, 0, 0, 'I', 'Drawing')
      expect(drawFull.internalObt).toBe(20)
      expect(drawFull.totalObt).toBe(50)
      expect(drawFull.maxMarks).toBe(50)

      // Partial: FA1=14, FA2=16 => (14+16)/2=15, SA=22 => Total=37
      const drawPartial = calculateTermMarks(14, 16, 22, 20, 20, 30, 0, 0, 0, 0, 'III', 'Drawing')
      expect(drawPartial.internalObt).toBe(15)
      expect(drawPartial.totalObt).toBe(37)
    })

    it('Class 3-5: Sanskrit (50-mark, divisor=3) — (FA1+FA2+Assign+Oral)/3 + SA', () => {
      // (16+20+8+10)/3 = 54/3 = 18, SA=25 => Total=43
      const sanskrit = calculateTermMarks(16, 20, 25, 20, 20, 30, 8, 10, 10, 10, 'V', 'Sanskrit')
      expect(sanskrit.internalObt).toBe(18)
      expect(sanskrit.totalObt).toBe(43)
      expect(sanskrit.maxMarks).toBe(50)
    })

    // ---- Class 9 & 10 ----
    it('Class 9 & 10: standard 100-mark subject (divisor=3) — (FA1+FA2+Assign+Oral)/3 + SA', () => {
      // Maths: (18+18+10+8)/3 = 54/3 = 18, SA=72 => Total=90
      const maths = calculateTermMarks(18, 18, 72, 20, 20, 80, 10, 8, 10, 10, 'X', 'Maths')
      expect(maths.internalObt).toBe(18)
      expect(maths.totalObt).toBe(90)
      expect(maths.maxMarks).toBe(100)
    })

    // ---- Class 11 & 12 ----
    it('Class 11/12: Physics PRACTICAL (divisor=2) — (FA1+FA2+Assign+Oral)/2 + SA = Internal 30', () => {
      // Full: (20+20+10+10)/2 = 30, SA=70 => Total=100
      const phy = calculateTermMarks(20, 20, 70, 20, 20, 70, 10, 10, 10, 10, 'XI Science', 'Physics')
      expect(phy.internalObt).toBe(30)
      expect(phy.internalMax).toBe(30)
      expect(phy.totalObt).toBe(100)
      expect(phy.maxMarks).toBe(100)

      // Partial: (16+14+8+6)/2 = 22, SA=55 => Total=77
      const phyPartial = calculateTermMarks(16, 14, 55, 20, 20, 70, 8, 6, 10, 10, 'XII Science', 'Physics')
      expect(phyPartial.internalObt).toBe(22)
      expect(phyPartial.totalObt).toBe(77)
    })

    it('Class 11/12: Non-practical Accounts (divisor=3) — (FA1+FA2+Assign+Oral)/3 + SA = Internal 20', () => {
      // Full: (20+20+10+10)/3 = 20, SA=80 => Total=100
      const acc = calculateTermMarks(20, 20, 80, 20, 20, 80, 10, 10, 10, 10, 'XII Commerce', 'Accounts')
      expect(acc.internalObt).toBe(20)
      expect(acc.internalMax).toBe(20)
      expect(acc.totalObt).toBe(100)
      expect(acc.maxMarks).toBe(100)
    })
  })

  // =========================================================
  //  8. CLASS X ABHILASHA SINGH BUG-FIX VERIFICATION
  //     All subjects: Assignment=10, Oral=10
  //     formula: (FA1+FA2+10+10)/3 + SA, divisor=3
  // =========================================================
  describe('8. Class X Grand Total Bug Fix (ABHILASHA SINGH — 813/1000 = 81.30%)', () => {
    const rd = (n) => (Number.isInteger(n) ? n : Number(n.toFixed(2)))

    it('English-I: (15+15+10+10)/3 + 69 = 16.67 + 69 = 85.67', () => {
      const r = calculateTermMarks(15, 15, 69, 20, 20, 80, 10, 10, 10, 10, 'X', 'English-I')
      expect(rd(r.internalObt)).toBe(16.67)
      expect(rd(r.totalObt)).toBe(85.67)
    })

    it('English-II: (18+18+10+10)/3 + 62 = 18.67 + 62 = 80.67', () => {
      const r = calculateTermMarks(18, 18, 62, 20, 20, 80, 10, 10, 10, 10, 'X', 'English-II')
      expect(rd(r.internalObt)).toBe(18.67)
      expect(rd(r.totalObt)).toBe(80.67)
    })

    it('Hindi: (17+20+10+10)/3 + 70 = 19 + 70 = 89', () => {
      const r = calculateTermMarks(17, 20, 70, 20, 20, 80, 10, 10, 10, 10, 'X', 'Hindi')
      expect(rd(r.internalObt)).toBe(19)
      expect(rd(r.totalObt)).toBe(89)
    })

    it('Maths: (19+12+10+10)/3 + 72 = 17 + 72 = 89', () => {
      const r = calculateTermMarks(19, 12, 72, 20, 20, 80, 10, 10, 10, 10, 'X', 'Maths')
      expect(rd(r.internalObt)).toBe(17)
      expect(rd(r.totalObt)).toBe(89)
    })

    it('Physics: (8+15+10+10)/3 + 61 = 14.33 + 61 = 75.33', () => {
      const r = calculateTermMarks(8, 15, 61, 20, 20, 80, 10, 10, 10, 10, 'X', 'Physics')
      expect(rd(r.internalObt)).toBe(14.33)
      expect(rd(r.totalObt)).toBe(75.33)
    })

    it('Chemistry: (10+12+10+10)/3 + 53 = 14 + 53 = 67', () => {
      const r = calculateTermMarks(10, 12, 53, 20, 20, 80, 10, 10, 10, 10, 'X', 'Chemistry')
      expect(rd(r.internalObt)).toBe(14)
      expect(rd(r.totalObt)).toBe(67)
    })

    it('Biology: (18+11+10+10)/3 + 59 = 16.33 + 59 = 75.33', () => {
      const r = calculateTermMarks(18, 11, 59, 20, 20, 80, 10, 10, 10, 10, 'X', 'Biology')
      expect(rd(r.internalObt)).toBe(16.33)
      expect(rd(r.totalObt)).toBe(75.33)
    })

    it('History & Civics: (20+18+10+10)/3 + 70 = 19.33 + 70 = 89.33', () => {
      const r = calculateTermMarks(20, 18, 70, 20, 20, 80, 10, 10, 10, 10, 'X', 'History & Civics')
      expect(rd(r.internalObt)).toBe(19.33)
      expect(rd(r.totalObt)).toBe(89.33)
    })

    it('Geography: (9+17+10+10)/3 + 63 = 15.33 + 63 = 78.33', () => {
      const r = calculateTermMarks(9, 17, 63, 20, 20, 80, 10, 10, 10, 10, 'X', 'Geography')
      expect(rd(r.internalObt)).toBe(15.33)
      expect(rd(r.totalObt)).toBe(78.33)
    })

    it('Physical Education: (10+10+10+10)/3 + 70 = 13.33 + 70 = 83.33', () => {
      const r = calculateTermMarks(10, 10, 70, 20, 20, 80, 10, 10, 10, 10, 'X', 'Physical Education')
      expect(rd(r.internalObt)).toBe(13.33)
      expect(rd(r.totalObt)).toBe(83.33)
    })

    it('GRAND TOTAL: all 10 subjects = 813/1000 = 81.30%', () => {
      const subjects = [
        { name: 'English-I',           fa1: 15, fa2: 15, sa: 69 },
        { name: 'English-II',          fa1: 18, fa2: 18, sa: 62 },
        { name: 'Hindi',               fa1: 17, fa2: 20, sa: 70 },
        { name: 'Maths',               fa1: 19, fa2: 12, sa: 72 },
        { name: 'Physics',             fa1: 8,  fa2: 15, sa: 61 },
        { name: 'Chemistry',           fa1: 10, fa2: 12, sa: 53 },
        { name: 'Biology',             fa1: 18, fa2: 11, sa: 59 },
        { name: 'History & Civics',    fa1: 20, fa2: 18, sa: 70 },
        { name: 'Geography',           fa1: 9,  fa2: 17, sa: 63 },
        { name: 'Physical Education',  fa1: 10, fa2: 10, sa: 70 },
      ]
      let grandScored = 0, grandMax = 0
      for (const s of subjects) {
        const r = calculateTermMarks(s.fa1, s.fa2, s.sa, 20, 20, 80, 10, 10, 10, 10, 'X', s.name)
        grandScored += r.totalObt
        grandMax += r.maxMarks
      }
      expect(Math.round(grandScored)).toBe(813)
      expect(grandMax).toBe(1000)
      expect(Number(((grandScored / grandMax) * 100).toFixed(2))).toBe(81.30)
      expect(calculateScholasticGrade((grandScored / grandMax) * 100)).toBe('A2')
    })
  })

  describe('9. Annual (Full Year) Calculation', () => {
    it('T1 + T2 yields correct annual total out of 200', () => {
      const t1 = calculateTermMarks(16, 20, 60, 20, 20, 80, 10, 10, 10, 10, 'V', 'English-I')
      const t2 = calculateTermMarks(18, 20, 70, 20, 20, 80, 10, 10, 10, 10, 'V', 'English-I')
      // t1: (16+20+10+10)/3 + 60 = 56/3 + 60
      // t2: (18+20+10+10)/3 + 70 = 58/3 + 70
      // sum of fractional parts: 56/3 + 58/3 = 114/3 = 38, total = 38 + 130 = 168 exactly

      const annual = calculateAnnualSubjectMarks(t1.totalObt, t2.totalObt, t1.maxMarks, t2.maxMarks)
      expect(Math.round(annual.totalObt * 1000) / 1000).toBeCloseTo(168, 2)
      expect(annual.maxMarks).toBe(200)
      expect(calculateScholasticGrade((annual.totalObt / annual.maxMarks) * 100)).toBe('A2')
    })

    it('50-mark subject annual total is out of 100', () => {
      // G.K. t1: (20+20+10+10)/3+28 = 20+28=48
      // G.K. t2: (18+16+8+9)/3+25 = 51/3+25=17+25=42
      const t1 = calculateTermMarks(20, 20, 28, 20, 20, 30, 10, 10, 10, 10, 'V', 'G.K.')
      const t2 = calculateTermMarks(18, 16, 25, 20, 20, 30, 8, 9, 10, 10, 'V', 'G.K.')
      expect(t1.totalObt).toBe(48)
      expect(t1.maxMarks).toBe(50)
      expect(t2.totalObt).toBe(42)

      const annual = calculateAnnualSubjectMarks(t1.totalObt, t2.totalObt, t1.maxMarks, t2.maxMarks)
      expect(annual.totalObt).toBe(90)
      expect(annual.maxMarks).toBe(100)
    })
  })
})
