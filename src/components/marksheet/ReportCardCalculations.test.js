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

      // Set explicit 0 marks
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
      // Direct valid father name
      expect(cleanFatherName('Mr. Surendra Sharma')).toBe('Mr. Surendra Sharma')
      
      // Class name rejected
      expect(cleanFatherName('XI')).toBe('')
      expect(cleanFatherName('Class 5')).toBe('')
      expect(cleanFatherName('UKG')).toBe('')

      // Master lookup by student ID 277 (Vasu Kumar)
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
      ])
    })
  })

  describe('7. Excel Workbook Syllabus Evaluation System (All 6 Sheets)', () => {
    it('Sheet 1: NUR to UKG — calculates Pre-Primary marks (Dictation & Oral max 20, Internal 40, Theory 60 => Total 100)', () => {
      // English Written: FA1=20, FA2=20, Dictation=20, Oral=20 => Internal=40, Theory=60 => Total=100
      const eng = calculateTermMarks(20, 20, 60, 20, 20, 60, 20, 20, 20, 20, 'Nursery', 'English Written')
      expect(eng.internalObt).toBe(40)
      expect(eng.totalObt).toBe(100)
      expect(eng.maxMarks).toBe(100)

      // Drawing: Dictation & Oral NA => FA1(20) + FA2(20) = 40, Theory=60 => Total=100
      const drawing = calculateTermMarks(20, 20, 60, 20, 20, 60, 0, 0, 0, 0, 'Nursery', 'Drawing')
      expect(drawing.internalObt).toBe(40)
      expect(drawing.totalObt).toBe(100)
      expect(drawing.maxMarks).toBe(100)
    })

    it('Sheet 2: 1 & 2 — calculates Class 1-2 marks (100-mark main and 50-mark GK/Computer/Drawing)', () => {
      // English-I: FA1=20, FA2=20, Assignment=10, Oral=10 => Internal=20, Theory=80 => Total=100
      const eng1 = calculateTermMarks(20, 20, 80, 20, 20, 80, 10, 10, 10, 10, 'I', 'English-I')
      expect(eng1.internalObt).toBe(20)
      expect(eng1.totalObt).toBe(100)
      expect(eng1.maxMarks).toBe(100)

      // G.K. (50-mark subject): FA1=20, FA2=20, Assignment=10, Oral=10 => Internal=20, Theory=30 => Total=50
      const gk = calculateTermMarks(20, 20, 30, 20, 20, 30, 10, 10, 10, 10, 'I', 'G.K.')
      expect(gk.internalObt).toBe(20)
      expect(gk.totalObt).toBe(50)
      expect(gk.maxMarks).toBe(50)

      // Drawing (50-mark subject, NA for Assign/Oral): FA1=20, FA2=20 => Internal=20, Theory=30 => Total=50
      const draw = calculateTermMarks(20, 20, 30, 20, 20, 30, 0, 0, 0, 0, 'I', 'Drawing')
      expect(draw.internalObt).toBe(20)
      expect(draw.totalObt).toBe(50)
      expect(draw.maxMarks).toBe(50)
    })

    it('Sheet 3: 3 to 5 — calculates Sanskrit (50) and Science (100)', () => {
      const sanskrit = calculateTermMarks(16, 20, 25, 20, 20, 30, 8, 10, 10, 10, 'V', 'Sanskrit')
      // FA portion = (16+20)/4 = 9, Assign portion = 8/2 = 4, Oral portion = 10/2 = 5 => Internal = 18. Theory = 25 => Total = 43/50
      expect(sanskrit.internalObt).toBe(18)
      expect(sanskrit.totalObt).toBe(43)
      expect(sanskrit.maxMarks).toBe(50)
    })

    it('Sheet 5: 9 & 10 — calculates 100-mark subjects with Assignment & Oral', () => {
      const maths = calculateTermMarks(18, 18, 72, 20, 20, 80, 10, 8, 10, 10, 'X', 'Maths')
      // FA portion = 36/4 = 9, Assign portion = 10/2 = 5, Oral portion = 8/2 = 4 => Internal = 18. Theory = 72 => Total = 90/100
      expect(maths.internalObt).toBe(18)
      expect(maths.totalObt).toBe(90)
      expect(maths.maxMarks).toBe(100)
    })

    it('Sheet 6: 11 & 12 — calculates Practicals (Internal 30, Theory 70) and Non-practicals (Internal 20, Theory 80)', () => {
      // Physics (Practical): FA1=20, FA2=20, Assign=10, Oral/Prc=10 => Internal=30, Theory=70 => Total=100
      const phy = calculateTermMarks(20, 20, 70, 20, 20, 70, 10, 10, 10, 10, 'XI Science', 'Physics')
      expect(phy.internalObt).toBe(30)
      expect(phy.totalObt).toBe(100)
      expect(phy.maxMarks).toBe(100)

      // Accounts (Non-practical): FA1=20, FA2=20, Assign=10, Oral=10 => Internal=20, Theory=80 => Total=100
      const acc = calculateTermMarks(20, 20, 80, 20, 20, 80, 10, 10, 10, 10, 'XII Commerce', 'Accounts')
      expect(acc.internalObt).toBe(20)
      expect(acc.totalObt).toBe(100)
      expect(acc.maxMarks).toBe(100)
    })

    it('Annual full year calculates subject total out of 200 (or 100 for 50-mark subjects)', () => {
      const t1 = calculateTermMarks(16, 20, 60, 20, 20, 80, 10, 10, 10, 10, 'V', 'English-I')
      const t2 = calculateTermMarks(18, 20, 70, 20, 20, 80, 10, 10, 10, 10, 'V', 'English-I')

      const annual = calculateAnnualSubjectMarks(t1.totalObt, t2.totalObt, t1.maxMarks, t2.maxMarks)
      expect(annual.totalObt).toBe(168.5)
      expect(annual.maxMarks).toBe(200)

      const percent = (annual.totalObt / annual.maxMarks) * 100
      expect(calculateScholasticGrade(percent)).toBe('A2')
    })
  })
})
