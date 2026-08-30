import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { getFirebaseDb } from './config.js'
import { COLLECTION_FEES } from './constants.js'
import { sanitizeStudentDocId } from './studentRepository.js'
import { assertAdminCanWrite } from './writeGuard.js'

const MAX_FEE_INR = 50_000_000

const MONTHS = new Set([
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
])

function coerceTimestamp(value) {
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

function sortFeeRowsDesc(a, b) {
  const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0
  const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0
  return tb - ta
}

export function buildFeeDocId(studentId, year, month) {
  const slug = String(month)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  const y = Number(year)
  return `${sanitizeStudentDocId(studentId)}__${y}__${slug || 'month'}`.slice(0, 800)
}

export function mapFeeDoc(snapshot) {
  const d = snapshot.data()
  if (!d) return null
  if (d.deleted === true) return null
  return {
    docId: snapshot.id,
    studentId: String(d.studentId ?? '').trim(),
    studentName: String(d.studentName ?? '').trim(),
    class: String(d.class ?? '').trim(),
    month: String(d.month ?? '').trim(),
    year: Number(d.year) || 0,
    amount: Number(d.amount) || 0,
    status: String(d.status ?? 'pending').toLowerCase() === 'paid' ? 'paid' : 'pending',
    paymentDate: coerceTimestamp(d.paymentDate),
    createdAt: coerceTimestamp(d.createdAt),
    updatedAt: coerceTimestamp(d.updatedAt),
  }
}

function validateFeePayload({ month, year, amount }) {
  if (!MONTHS.has(String(month).trim())) {
    throw new Error('Invalid month. Use a full month name (e.g. January).')
  }
  const y = Number(year)
  if (!Number.isInteger(y) || y < 2000 || y > 2100) {
    throw new Error('Year must be between 2000 and 2100.')
  }
  const amt = Number(amount)
  if (!Number.isFinite(amt) || amt < 0 || amt > MAX_FEE_INR) {
    throw new Error(`Amount must be between 0 and ${MAX_FEE_INR.toLocaleString()} INR.`)
  }
}

export function subscribeAllFees(onData, onError) {
  const db = getFirebaseDb()
  if (!db) {
    onError?.(new Error('Firestore is not initialized.'))
    return () => {}
  }

  return onSnapshot(
    collection(db, COLLECTION_FEES),
    (snapshot) => {
      const list = snapshot.docs.map(mapFeeDoc).filter(Boolean).sort(sortFeeRowsDesc)
      onData(list)
    },
    (error) => onError?.(error),
  )
}

export function subscribeFeesForStudent(studentId, onData, onError) {
  const db = getFirebaseDb()
  if (!db) {
    onError?.(new Error('Firestore is not initialized.'))
    return () => {}
  }

  const q = query(collection(db, COLLECTION_FEES), where('studentId', '==', studentId))

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map(mapFeeDoc).filter(Boolean).sort(sortFeeRowsDesc)
      onData(list)
    },
    (error) => onError?.(error),
  )
}

function buildPaymentTimestamp(status, paymentDate) {
  if (status !== 'paid') return null
  if (paymentDate instanceof Date) return Timestamp.fromDate(paymentDate)
  if (paymentDate) return Timestamp.fromDate(new Date(paymentDate))
  return null
}

/**
 * Upsert by student + month + year. Collapses multiple active rows (legacy duplicates) into one.
 */
export async function createFeeRecord({
  studentId,
  studentName,
  class: className,
  month,
  year,
  amount,
  status,
  paymentDate,
}) {
  assertAdminCanWrite()
  const db = getFirebaseDb()
  if (!db) throw new Error('Firestore is not initialized.')

  validateFeePayload({ month, year, amount })

  const sid = String(studentId ?? '').trim()
  if (!sid) throw new Error('Student ID is required.')

  const m = String(month).trim()
  const y = Number(year)
  const paymentTs = buildPaymentTimestamp(status === 'paid' ? 'paid' : 'pending', paymentDate)

  const baseFields = {
    studentId: sid,
    studentName: String(studentName ?? '').trim(),
    class: String(className ?? '').trim(),
    month: m,
    year: y,
    amount: Number(amount) || 0,
    status: status === 'paid' ? 'paid' : 'pending',
    paymentDate: paymentTs,
    deleted: false,
    deletedAt: null,
    updatedAt: serverTimestamp(),
  }

  const col = collection(db, COLLECTION_FEES)
  const qExisting = query(col, where('studentId', '==', sid), where('month', '==', m), where('year', '==', y))
  const existingSnap = await getDocs(qExisting)
  const docs = existingSnap.docs

  const active = docs.filter((d) => d.data()?.deleted !== true)
  if (active.length > 0) {
    const primary = active[0]
    const ex = primary.data()
    const mergedDuplicates = Math.max(0, active.length - 1)

    if (active.length > 1) {
      const batch = writeBatch(db)
      batch.update(primary.ref, {
        ...baseFields,
        createdAt: ex?.createdAt ?? serverTimestamp(),
      })
      for (let i = 1; i < active.length; i++) {
        batch.update(active[i].ref, {
          deleted: true,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      await batch.commit()
    } else {
      await updateDoc(primary.ref, {
        ...baseFields,
        createdAt: ex?.createdAt ?? serverTimestamp(),
      })
    }

    return { isUpdate: true, mergedDuplicates }
  }

  const softDeleted = docs.find((d) => d.data()?.deleted === true)
  if (softDeleted) {
    const ex = softDeleted.data()
    await updateDoc(softDeleted.ref, {
      ...baseFields,
      createdAt: ex?.createdAt ?? serverTimestamp(),
    })
    return { isUpdate: true, revived: true }
  }

  const docId = buildFeeDocId(sid, y, m)
  const ref = doc(db, COLLECTION_FEES, docId)
  await setDoc(ref, {
    ...baseFields,
    createdAt: serverTimestamp(),
  })

  return { isUpdate: false }
}

export async function softDeleteFeeRecord(feeDocId) {
  assertAdminCanWrite()
  const db = getFirebaseDb()
  if (!db) throw new Error('Firestore is not initialized.')

  const ref = doc(db, COLLECTION_FEES, feeDocId)
  await updateDoc(ref, {
    deleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}
