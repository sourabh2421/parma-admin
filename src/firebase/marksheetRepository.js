import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
} from 'firebase/firestore'
import { getFirebaseDb } from './config.js'
import {
  CO_SCHOLASTIC_SKILLS,
  CURRENT_ACADEMIC_SESSION,
  DEFAULT_CLASS_SUBJECTS,
  INITIAL_SAMPLE_STUDENTS,
  matchClassKey,
} from '../utils/marksheetDefaults.js'
import studentFatherLookup from '../data/studentFatherLookup.json'

const LOCAL_STORAGE_SUBJECTS_KEY = 'parma_marksheet_class_subjects_v2'
const LOCAL_STORAGE_MARKS_KEY = 'parma_marksheet_student_records_v9'
const FIRESTORE_COLLECTION_MARKS = 'marksheetRecords'

export function isClassLikeString(val) {
  if (!val) return false
  const raw = String(val).trim()
  if (!raw) return false
  if (matchClassKey(raw) !== null) return true
  return /^(?:UKG|LKG|NUR|NSY|NURSERY|CLASS\s*[\d\w]+|\d{1,2}(?:ST|ND|RD|TH)?|[IVX]+(?:\s*(?:SCIENCE|COMMERCE|HUMANITIES|ARTS))?)$/i.test(raw)
}

export function cleanFatherName(...candidates) {
  for (const c of candidates) {
    if (!c) continue
    const trimmed = String(c).trim()
    if (!trimmed) continue
    if (!isClassLikeString(trimmed)) return trimmed
  }
  return ''
}

export function resolveFatherName(id, name, ...candidates) {
  const direct = cleanFatherName(...candidates)
  if (direct) return direct
  if (id) {
    const rawId = String(id).trim()
    const fromId = studentFatherLookup?.byId?.[rawId]
    if (fromId && !isClassLikeString(fromId)) return fromId
  }
  if (name) {
    const cleanName = String(name).trim().toLowerCase()
    const fromName = studentFatherLookup?.byName?.[cleanName]
    if (fromName && !isClassLikeString(fromName)) return fromName
  }
  return ''
}

function buildDefaultCoScholastic() {
  const defaults = {}
  for (const skill of CO_SCHOLASTIC_SKILLS) {
    defaults[skill] = 'A'
  }
  return defaults
}

/**
 * Migrate old T1/T2 record format to new FA/SA schema.
 */
export function migrateOldRecord(record) {
  if (!record) return record
  const scholastic = (record.scholastic || []).map((sub) => {
    const migrated = { ...sub }
    if (migrated.fa1Obt === undefined && sub.t1IntObt !== undefined) {
      migrated.fa1Max = Number(sub.t1IntMax) || 20
      migrated.fa1Obt = Number(sub.t1IntObt) || 0
    }
    if (migrated.fa2Obt === undefined) { migrated.fa2Max = 20; migrated.fa2Obt = 0 }
    if (migrated.sa1Obt === undefined && sub.t1MainObt !== undefined) {
      migrated.sa1Max = Number(sub.t1MainMax) || 80
      migrated.sa1Obt = Number(sub.t1MainObt) || 0
    }
    if (migrated.fa3Obt === undefined && sub.t2IntObt !== undefined) {
      migrated.fa3Max = Number(sub.t2IntMax) || 20
      migrated.fa3Obt = Number(sub.t2IntObt) || 0
    }
    if (migrated.fa4Obt === undefined) { migrated.fa4Max = 20; migrated.fa4Obt = 0 }
    if (migrated.sa2Obt === undefined && sub.t2MainObt !== undefined) {
      const raw = sub.t2MainObt
      migrated.sa2Max = Number(sub.t2MainMax) || 80
      migrated.sa2Obt = (raw === 'M/L' || raw === 'ML' || raw === 'NA') ? 0 : (Number(raw) || 0)
    }
    if (migrated.fa1Max === undefined) migrated.fa1Max = 20
    if (migrated.fa1Obt === undefined) migrated.fa1Obt = 0
    if (migrated.fa2Max === undefined) migrated.fa2Max = 20
    if (migrated.fa2Obt === undefined) migrated.fa2Obt = 0
    if (migrated.sa1Max === undefined) migrated.sa1Max = 80
    if (migrated.sa1Obt === undefined) migrated.sa1Obt = 0
    if (migrated.fa3Max === undefined) migrated.fa3Max = 20
    if (migrated.fa3Obt === undefined) migrated.fa3Obt = 0
    if (migrated.fa4Max === undefined) migrated.fa4Max = 20
    if (migrated.fa4Obt === undefined) migrated.fa4Obt = 0
    if (migrated.sa2Max === undefined) migrated.sa2Max = 80
    if (migrated.sa2Obt === undefined) migrated.sa2Obt = 0
    return migrated
  })

  const coHY = record.coScholasticHalfYearly || record.coScholasticTerm1 || buildDefaultCoScholastic()
  const coAnn = record.coScholasticAnnual || record.coScholasticTerm2 || buildDefaultCoScholastic()
  const attHY = record.attendanceHalfYearly ||
    (record.attendance ? { attended: record.attendance.term1Attended || 0, total: record.attendance.term1Total || 110 } : { attended: 0, total: 110 })
  const attAnn = record.attendanceAnnual ||
    (record.attendance ? { attended: (record.attendance.term1Attended || 0) + (record.attendance.term2Attended || 0), total: (record.attendance.term1Total || 110) + (record.attendance.term2Total || 105) } : { attended: 0, total: 215 })

  return {
    ...record,
    scholastic,
    coScholasticHalfYearly: coHY,
    coScholasticAnnual: coAnn,
    disciplineHalfYearly: record.disciplineHalfYearly || (record.discipline?.term1) || 'A',
    disciplineAnnual: record.disciplineAnnual || (record.discipline?.term2) || 'A',
    attendanceHalfYearly: attHY,
    attendanceAnnual: attAnn,
    teacherRemarksHalfYearly: record.teacherRemarksHalfYearly || record.teacherRemarks || '',
    teacherRemarksAnnual: record.teacherRemarksAnnual || record.teacherRemarks || '',
  }
}

/**
 * Real-time Firestore subscription to all marksheet records.
 */
export function subscribeMarksheetRecords(onSuccess, onError) {
  const db = getFirebaseDb()
  if (!db) {
    if (typeof onSuccess === 'function') onSuccess(getStoredStudentMarks())
    return () => {}
  }

  try {
    const colRef = collection(db, FIRESTORE_COLLECTION_MARKS)
    return onSnapshot(
      colRef,
      (snapshot) => {
        const records = snapshot.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            ...data,
          }
        })

        if (records.length > 0) {
          // Cache to localStorage
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(LOCAL_STORAGE_MARKS_KEY, JSON.stringify(records))
          }
        }

        if (typeof onSuccess === 'function') {
          onSuccess(records)
        }
      },
      (err) => {
        console.warn('Firestore marksheet subscribe notice:', err?.message)
        if (typeof onError === 'function') onError(err)
        // Fallback to local cache
        if (typeof onSuccess === 'function') onSuccess(getStoredStudentMarks())
      }
    )
  } catch (err) {
    console.warn('Firestore subscription failed:', err)
    if (typeof onSuccess === 'function') onSuccess(getStoredStudentMarks())
    return () => {}
  }
}

export function getStoredClassSubjects() {
  if (typeof window === 'undefined') return DEFAULT_CLASS_SUBJECTS
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_SUBJECTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_CLASS_SUBJECTS, ...parsed }
    }
  } catch (err) {
    console.error('Failed to parse cached class subjects', err)
  }
  return DEFAULT_CLASS_SUBJECTS
}

export async function saveClassSubjectsConfig(subjectsMap) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCAL_STORAGE_SUBJECTS_KEY, JSON.stringify(subjectsMap))
  }
  const db = getFirebaseDb()
  if (db) {
    try {
      const ref = doc(db, 'marksheetConfig', 'classSubjects')
      await setDoc(ref, { subjectsMap, updatedAt: new Date().toISOString() }, { merge: true })
    } catch (err) {
      console.warn('Firestore write failed for classSubjects config:', err.message)
    }
  }
  return subjectsMap
}

export function getStoredStudentMarks() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_MARKS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map((r) => ({
          ...migrateOldRecord(r),
          fatherName: resolveFatherName(r.id || r.studentId, r.name, r.fatherName),
        }))
      }
    }
  } catch (err) {
    console.error('Failed to parse cached student marks', err)
  }
  return []
}

export async function saveStudentMarksheet(record) {
  if (!record || !record.id) throw new Error('Student record must have an ID')

  const existing = getStoredStudentMarks()
  const idx = existing.findIndex(
    (r) =>
      String(r.id).trim().toLowerCase() === String(record.id).trim().toLowerCase() ||
      String(r.studentId).trim().toLowerCase() === String(record.studentId).trim().toLowerCase()
  )

  const updatedRecord = migrateOldRecord({
    ...record,
    fatherName: resolveFatherName(record.id || record.studentId, record.name, record.fatherName),
    session: record.session || CURRENT_ACADEMIC_SESSION,
    updatedAt: new Date().toISOString(),
  })

  let newList = []
  if (idx >= 0) {
    newList = [...existing]
    newList[idx] = { ...newList[idx], ...updatedRecord }
  } else {
    newList = [updatedRecord, ...existing]
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCAL_STORAGE_MARKS_KEY, JSON.stringify(newList))
  }

  const db = getFirebaseDb()
  if (db) {
    try {
      const ref = doc(db, FIRESTORE_COLLECTION_MARKS, String(record.id))
      await setDoc(ref, updatedRecord, { merge: true })
    } catch (err) {
      console.warn('Firestore write notice for student marksheet record:', err.message)
    }
  }

  return updatedRecord
}

/**
 * Save only a specific exam's marks for a student.
 * examType: 'FA-1' | 'FA-2' | 'SA-1' | 'FA-3' | 'FA-4' | 'SA-2'
 */
export async function saveExamMarks(studentRecord, examType, examScholastic) {
  if (!studentRecord?.id) throw new Error('Student record must have an ID')

  const examFieldMap = {
    'FA-1': { obt: 'fa1Obt', max: 'fa1Max' },
    'FA-2': { obt: 'fa2Obt', max: 'fa2Max' },
    'SA-1': { obt: 'sa1Obt', max: 'sa1Max' },
    'FA-3': { obt: 'fa3Obt', max: 'fa3Max' },
    'FA-4': { obt: 'fa4Obt', max: 'fa4Max' },
    'SA-2': { obt: 'sa2Obt', max: 'sa2Max' },
  }
  const fields = examFieldMap[examType]
  if (!fields) throw new Error(`Unknown exam type: ${examType}`)

  const existing = getStoredStudentMarks()
  const existingRecord = existing.find(
    (r) => String(r.id).trim().toLowerCase() === String(studentRecord.id).trim().toLowerCase()
  ) || createEmptyMarksheetForStudent(studentRecord)

  const mergedScholastic = (existingRecord.scholastic || []).map((sub) => {
    const incoming = (examScholastic || []).find((s) => s.name === sub.name)
    if (!incoming) return sub
    return {
      ...sub,
      [fields.obt]: incoming[fields.obt] !== undefined ? incoming[fields.obt] : sub[fields.obt],
      [fields.max]: incoming[fields.max] !== undefined ? incoming[fields.max] : sub[fields.max],
    }
  })

  const updatedRecord = {
    ...existingRecord,
    ...studentRecord,
    scholastic: mergedScholastic,
    fatherName: resolveFatherName(studentRecord.id, studentRecord.name, studentRecord.fatherName, existingRecord.fatherName),
    [`examSaved_${examType.replace(/-/g, '')}`]: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return saveStudentMarksheet(updatedRecord)
}

export function getStudentMarksheetById(studentId) {
  const all = getStoredStudentMarks()
  const key = String(studentId || '').trim().toLowerCase()
  const found = all.find(
    (r) =>
      String(r.id).trim().toLowerCase() === key ||
      String(r.studentId).trim().toLowerCase() === key
  )
  if (!found) return null
  return { ...found, fatherName: resolveFatherName(found.id || found.studentId, found.name, found.fatherName) }
}

export function getMergedStudentsList(studentsFromRepo = [], firestoreMarks = null) {
  const storedMarks = firestoreMarks && firestoreMarks.length > 0 ? firestoreMarks : getStoredStudentMarks()
  const storedMap = new Map()
  for (const m of storedMarks) {
    if (m && (m.id || m.studentId)) {
      const key = String(m.id || m.studentId).trim().toLowerCase()
      const migrated = migrateOldRecord(m)
      storedMap.set(key, { ...migrated, fatherName: resolveFatherName(m.id || m.studentId, m.name, m.fatherName) })
    }
  }

  if (studentsFromRepo && studentsFromRepo.length > 0) {
    const dedupeMap = new Map()
    for (const s of studentsFromRepo) {
      if (!s || (!s.id && !s.studentId)) continue
      const rawId = String(s.id || s.studentId).trim()
      const key = rawId.toLowerCase()
      if (dedupeMap.has(key)) continue
      const safeFather = resolveFatherName(rawId, s.name, s.fatherName, s.parentName)
      if (storedMap.has(key)) {
        const existing = storedMap.get(key)
        dedupeMap.set(key, {
          ...existing,
          name: s.name || existing.name,
          fatherName: resolveFatherName(rawId, s.name, existing.fatherName, safeFather),
          class: s.class || existing.class,
        })
      } else {
        dedupeMap.set(key, createEmptyMarksheetForStudent(s))
      }
    }
    return Array.from(dedupeMap.values())
  }

  const fallbackMap = new Map()
  for (const s of INITIAL_SAMPLE_STUDENTS) {
    fallbackMap.set(String(s.id).trim().toLowerCase(), {
      ...migrateOldRecord(s),
      fatherName: resolveFatherName(s.id, s.name, s.fatherName),
    })
  }
  for (const m of storedMarks) {
    if (m && (m.id || m.studentId)) {
      const migrated = migrateOldRecord(m)
      fallbackMap.set(String(m.id || m.studentId).trim().toLowerCase(), {
        ...migrated,
        fatherName: resolveFatherName(m.id || m.studentId, m.name, m.fatherName),
      })
    }
  }
  return Array.from(fallbackMap.values())
}

export function filterStudentsByClass(students = [], selectedClassKey = 'ALL') {
  if (!selectedClassKey || selectedClassKey === 'ALL') return students
  return students.filter((s) => matchClassKey(s.class) === selectedClassKey)
}

export function createEmptyMarksheetForStudent(student) {
  const stdClassKey = matchClassKey(student?.class) || student?.class || 'I'
  const classSubjects = getStoredClassSubjects()[stdClassKey] || DEFAULT_CLASS_SUBJECTS['I']
  const scholastic = classSubjects.map((subName) => ({
    name: subName,
    fa1Max: 20, fa1Obt: 0,
    fa2Max: 20, fa2Obt: 0,
    sa1Max: 80, sa1Obt: 0,
    fa3Max: 20, fa3Obt: 0,
    fa4Max: 20, fa4Obt: 0,
    sa2Max: 80, sa2Obt: 0,
  }))
  const rawId = String(student?.id || student?.studentId || 'STUD_' + Math.floor(1000 + Math.random() * 9000)).trim()
  const defaultCo = buildDefaultCoScholastic()
  return {
    id: rawId,
    studentId: rawId,
    name: student?.name || 'New Student',
    fatherName: resolveFatherName(rawId, student?.name, student?.fatherName, student?.parentName),
    motherName: '',
    dob: student?.dob || '',
    class: stdClassKey,
    session: CURRENT_ACADEMIC_SESSION,
    scholastic,
    coScholasticHalfYearly: { ...defaultCo },
    coScholasticAnnual: { ...defaultCo },
    disciplineHalfYearly: 'A',
    disciplineAnnual: 'A',
    attendanceHalfYearly: { attended: 0, total: 110 },
    attendanceAnnual: { attended: 0, total: 215 },
    teacherRemarksHalfYearly: '',
    teacherRemarksAnnual: '',
    promotedClass: 'Promoted to Next Higher Class',
    place: 'Ayodhya',
    date: '29/03/2027',
  }
}
