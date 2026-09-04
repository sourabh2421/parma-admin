import { describe, expect, it } from 'vitest'
import {
  cleanFatherName,
  createEmptyMarksheetForStudent,
  filterStudentsByClass,
  getMergedStudentsList,
  saveExamMarks,
} from './marksheetRepository.js'

describe('marksheetRepository student class linking & exam system', () => {
  it('filters students by normalized class key', () => {
    const students = [
      { id: 'S1', name: 'Alice', class: 'V' },
      { id: 'S2', name: 'Bob', class: 'Class 5-A' },
      { id: 'S3', name: 'Charlie', class: 'IX' },
      { id: 'S4', name: 'David', class: '11 Science' },
    ]

    const classV = filterStudentsByClass(students, 'V')
    expect(classV.map((s) => s.id)).toEqual(['S1', 'S2'])

    const classIX = filterStudentsByClass(students, 'IX')
    expect(classIX.map((s) => s.id)).toEqual(['S3'])

    const classXISci = filterStudentsByClass(students, 'XI Science')
    expect(classXISci.map((s) => s.id)).toEqual(['S4'])
  })

  it('merges students repository list with stored marks and scrubs class string from father name', () => {
    const repoStudents = [
      { id: 'STUD001', name: 'Rohan Gupta', class: 'I', parentName: 'Sanjay Gupta' },
      { id: 'STUD002', name: 'Priya Singh', class: 'IX', parentName: 'Vikram Singh' },
      { id: 'STUD003', name: 'Vasu Kumar', class: 'XI Science', parentName: 'XI' },
    ]

    const merged = getMergedStudentsList(repoStudents)
    expect(merged.some((s) => s.id === 'STUD001' && s.class === 'I')).toBe(true)
    expect(merged.some((s) => s.id === 'STUD002' && s.class === 'IX')).toBe(true)

    const vasu = merged.find((s) => s.id === 'STUD003')
    expect(vasu).toBeDefined()
    expect(vasu.fatherName).toBe('Arvind kumar')
  })

  it('cleanFatherName rejects class strings and keeps actual names', () => {
    expect(cleanFatherName('XI')).toBe('')
    expect(cleanFatherName('V')).toBe('')
    expect(cleanFatherName('Class 11')).toBe('')
    expect(cleanFatherName('UKG')).toBe('')
    expect(cleanFatherName('Mr. Rajesh Kumar')).toBe('Mr. Rajesh Kumar')
    expect(cleanFatherName('XI', 'Mr. Ramesh Sharma')).toBe('Mr. Ramesh Sharma')
  })

  it('creates empty marksheet with FA-1 to SA-2 periodic schema', () => {
    const record = createEmptyMarksheetForStudent({
      id: 'TEST_STUD_1',
      name: 'Rohan Verma',
      class: 'V',
    })

    expect(record.scholastic.length).toBeGreaterThan(0)
    const firstSub = record.scholastic[0]
    expect(firstSub.fa1Max).toBe(20)
    expect(firstSub.fa1Obt).toBe(0)
    expect(firstSub.fa2Max).toBe(20)
    expect(firstSub.sa1Max).toBe(80)
    expect(firstSub.fa3Max).toBe(20)
    expect(firstSub.fa4Max).toBe(20)
    expect(firstSub.sa2Max).toBe(80)
  })

  it('saveExamMarks updates only the targeted exam without overwriting other exams', async () => {
    const student = {
      id: 'ST_EXAM_TEST_100',
      name: 'Simran Kaur',
      class: 'I',
    }

    // 1. Enter FA-1 marks
    const fa1Marks = [
      { name: 'English', fa1Obt: 18, fa1Max: 20 },
      { name: 'Hindi', fa1Obt: 19, fa1Max: 20 },
    ]
    const savedAfterFa1 = await saveExamMarks(student, 'FA-1', fa1Marks)
    expect(savedAfterFa1.scholastic.find((s) => s.name === 'English').fa1Obt).toBe(18)

    // 2. Later enter FA-2 marks
    const fa2Marks = [
      { name: 'English', fa2Obt: 17, fa2Max: 20 },
      { name: 'Hindi', fa2Obt: 20, fa2Max: 20 },
    ]
    const savedAfterFa2 = await saveExamMarks(student, 'FA-2', fa2Marks)
    const english = savedAfterFa2.scholastic.find((s) => s.name === 'English')
    // FA-1 is preserved!
    expect(english.fa1Obt).toBe(18)
    // FA-2 is updated!
    expect(english.fa2Obt).toBe(17)

    // 3. Later enter SA-1 (Half-Yearly)
    const sa1Marks = [
      { name: 'English', sa1Obt: 74, sa1Max: 80 },
    ]
    const savedAfterSa1 = await saveExamMarks(student, 'SA-1', sa1Marks)
    const englishFinal = savedAfterSa1.scholastic.find((s) => s.name === 'English')
    expect(englishFinal.fa1Obt).toBe(18)
    expect(englishFinal.fa2Obt).toBe(17)
    expect(englishFinal.sa1Obt).toBe(74)
  })
})
