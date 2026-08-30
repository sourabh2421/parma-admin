import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { getFirebaseDb } from './config.js'
import { COLLECTION_LEGACY_STUDENT_FEES, COLLECTION_STUDENTS } from './constants.js'
import { assertAdminCanWrite } from './writeGuard.js'

const LEGACY_MIGRATION_KEY = 'parma-academy-legacy-students-imported-v1'

export function sanitizeStudentDocId(studentId) {
  const raw = String(studentId ?? '').trim()
  if (!raw) return '_empty'
  return raw.replace(/[/\\]/g, '_').slice(0, 700)
}

/** Last row wins when the same student ID appears multiple times in one import file. */
export function dedupeStudentsForImport(students) {
  const byDocId = new Map()
  for (const s of students) {
    const key = sanitizeStudentDocId(s.id)
    if (!key || key === '_empty') continue
    byDocId.set(key, { ...s, id: String(s.id).trim() })
  }
  return [...byDocId.values()]
}

function coerceTimestampToIso(value) {
  if (value == null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    try {
      return value.toDate().toISOString()
    } catch {
      return null
    }
  }
  return null
}

export function mapStudentDoc(snapshot) {
  const d = snapshot.data()
  if (!d) return null
  if (d.deleted === true) return null
  const id = String(d.studentId ?? snapshot.id).trim()
  return {
    id,
    name: String(d.name ?? '').trim(),
    parentName: String(d.parentName ?? d.fatherName ?? '').trim(),
    class: String(d.class ?? '').trim(),
    createdAt: coerceTimestampToIso(d.createdAt),
    updatedAt: coerceTimestampToIso(d.updatedAt),
  }
}

export function studentToFirestoreWrite(student) {
  return {
    studentId: student.id,
    name: student.name,
    parentName: student.parentName ?? '',
    class: student.class,
    deleted: false,
    deletedAt: null,
    updatedAt: serverTimestamp(),
  }
}

export function subscribeStudents(onData, onError) {
  const db = getFirebaseDb()
  if (!db) {
    onError?.(new Error('Firestore is not initialized.'))
    return () => {}
  }

  const colRef = collection(db, COLLECTION_STUDENTS)
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map(mapStudentDoc).filter(Boolean)
      onData(list)
    },
    (error) => onError?.(error),
  )
}

const BATCH_LIMIT = 450

function canAttemptAdminWrites() {
  try {
    assertAdminCanWrite()
    return true
  } catch {
    return false
  }
}

/**
 * Upsert students from Excel import. Same Firestore document id = same student (no duplicate profiles).
 */
export async function upsertStudentsFromImport(students) {
  assertAdminCanWrite()
  const db = getFirebaseDb()
  if (!db) throw new Error('Firestore is not initialized.')

  const deduped = dedupeStudentsForImport(students)
  if (deduped.length === 0) {
    throw new Error('No valid students to import. Each row needs a non-empty Student ID.')
  }

  for (let i = 0; i < deduped.length; i += BATCH_LIMIT) {
    const chunk = deduped.slice(i, i + BATCH_LIMIT)
    const refs = chunk.map((s) => doc(db, COLLECTION_STUDENTS, sanitizeStudentDocId(s.id)))
    const snaps = await Promise.all(refs.map((r) => getDoc(r)))
    const batch = writeBatch(db)
    chunk.forEach((student, idx) => {
      const ref = refs[idx]
      const snap = snaps[idx]
      const prev = snap.data()
      const exists = prev != null
      const payload = {
        ...studentToFirestoreWrite(student),
        createdAt: exists && prev.createdAt ? prev.createdAt : serverTimestamp(),
      }
      batch.set(ref, payload, { merge: true })
    })
    await batch.commit()
  }
}

/**
 * One-time: if `students` is empty and legacy `studentFeeRecords` has data, copy profile fields only.
 */
export async function migrateLegacyStudentsIfEmpty() {
  if (typeof window === 'undefined') return
  if (window.localStorage.getItem(LEGACY_MIGRATION_KEY)) return
  if (!canAttemptAdminWrites()) return

  const db = getFirebaseDb()
  if (!db) return

  const studentsProbe = await getDocs(query(collection(db, COLLECTION_STUDENTS), limit(1)))
  if (!studentsProbe.empty) {
    window.localStorage.setItem(LEGACY_MIGRATION_KEY, '1')
    return
  }

  const legacySnap = await getDocs(collection(db, COLLECTION_LEGACY_STUDENT_FEES))
  if (legacySnap.empty) {
    window.localStorage.setItem(LEGACY_MIGRATION_KEY, '1')
    return
  }

  const docs = legacySnap.docs
  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const slice = docs.slice(i, i + BATCH_LIMIT)
    const b = writeBatch(db)
    slice.forEach((snap) => {
      const d = snap.data()
      const id = String(d.studentId ?? snap.id).trim()
      if (!id) return
      const ref = doc(db, COLLECTION_STUDENTS, sanitizeStudentDocId(id))
      b.set(
        ref,
        {
          studentId: id,
          name: String(d.name ?? '').trim(),
          parentName: String(d.fatherName ?? d.parentName ?? '').trim(),
          class: String(d.class ?? '').trim(),
          deleted: false,
          deletedAt: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    })
    await b.commit()
  }

  window.localStorage.setItem(LEGACY_MIGRATION_KEY, '1')
}

export async function softDeleteStudent(studentId) {
  assertAdminCanWrite()
  const db = getFirebaseDb()
  if (!db) throw new Error('Firestore is not initialized.')

  const sid = String(studentId ?? '').trim()
  if (!sid) throw new Error('Student ID is required.')

  const ref = doc(db, COLLECTION_STUDENTS, sanitizeStudentDocId(sid))
  await updateDoc(ref, {
    deleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}
