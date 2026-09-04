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
      expect(subNames).toEqual(['English', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Physical Education'])

      for (const sub of template) {
        expect(sub.fa1Max).toBe(20)
        expect(sub.fa1Obt).toBe(0)
        expect(sub.sa1Max).toBe(80)
        expect(sub.sa1Obt).toBe(0)
        expect(sub.sa2Max).toBe(80)
        expect(sub.sa2Obt).toBe(0)
      }
    })
  })

  describe('7. Term 1 (Half-Yearly out of 100) & Annual (out of 200) Mark Calculations', () => {
    it('calculates Half-Yearly marks using SA-1 + (FA-1 + FA-2) / 2 matching user example', () => {
      // User example: FA-1 = 16, FA-2 = 20, SA-1 = 60 => 60 + ((16 + 20) / 2) = 78 out of 100
      const t1 = calculateTermMarks(16, 20, 60, 20, 20, 80)
      expect(t1.faWeighted).toBe(18)
      expect(t1.totalObt).toBe(78)
      expect(t1.maxMarks).toBe(100)
    })

    it('calculates perfect 100 in Term 1 when student gets full marks in FA-1 (20), FA-2 (20), SA-1 (80)', () => {
      const t1 = calculateTermMarks(20, 20, 80, 20, 20, 80)
      expect(t1.faWeighted).toBe(20)
      expect(t1.totalObt).toBe(100)
      expect(t1.maxMarks).toBe(100)
    })

    it('handles decimal fractions accurately in Term 1 (e.g. FA-1 = 15, FA-2 = 20, SA-1 = 60 => 77.5)', () => {
      const t1 = calculateTermMarks(15, 20, 60, 20, 20, 80)
      expect(t1.faWeighted).toBe(17.5)
      expect(t1.totalObt).toBe(77.5)
      expect(t1.maxMarks).toBe(100)
    })

    it('calculates Annual / Final marksheet subject total out of 200 (100 from Term 1 + 100 from Term 2)', () => {
      // Term 1: 78 out of 100
      const t1 = calculateTermMarks(16, 20, 60, 20, 20, 80)
      // Term 2: FA-3: 18, FA-4: 20, SA-2: 70 => 70 + ((18 + 20) / 2) = 89 out of 100
      const t2 = calculateTermMarks(18, 20, 70, 20, 20, 80)
      expect(t2.totalObt).toBe(89)
      expect(t2.maxMarks).toBe(100)

      // Annual Subject Marks: 78 + 89 = 167 out of 200
      const annual = calculateAnnualSubjectMarks(t1.totalObt, t2.totalObt, t1.maxMarks, t2.maxMarks)
      expect(annual.totalObt).toBe(167)
      expect(annual.maxMarks).toBe(200)

      const percent = (annual.totalObt / annual.maxMarks) * 100
      expect(percent).toBe(83.5)
      expect(calculateScholasticGrade(percent)).toBe('A2')
    })
  })
})
