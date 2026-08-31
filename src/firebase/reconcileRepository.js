import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { getFirebaseDb } from './config.js'
import { COLLECTION_FEES, COLLECTION_STUDENTS } from './constants.js'
import { buildFeeDocId, mapFeeDoc } from './feeRepository.js'
import { mapStudentDoc, sanitizeStudentDocId } from './studentRepository.js'
import { assertAdminCanWrite } from './writeGuard.js'
import { buildReconciliationPlan } from '../utils/studentReconcile.js'

const BATCH_LIMIT = 400

function toFirestoreDateTimestamp(isoString) {
  if (!isoString) return null
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return null
    return Timestamp.fromDate(d)
  } catch {
    return null
  }
}

/**
 * Loads current students and fees from Firestore, detects duplicate legacy S-prefixed profiles,
 * and executes a safe batch migration to clean profiles while preserving all fee records.
 */
export async function reconcileStudentsAndFees() {
  assertAdminCanWrite()
  const db = getFirebaseDb()
  if (!db) throw new Error('Firestore is not initialized.')

  // 1. Fetch current students
  const studentsSnap = await getDocs(collection(db, COLLECTION_STUDENTS))
  const allStudents = studentsSnap.docs.map(mapStudentDoc).filter(Boolean)

  // 2. Fetch current fees
  const feesSnap = await getDocs(collection(db, COLLECTION_FEES))
  const allFees = feesSnap.docs.map(mapFeeDoc).filter(Boolean)

  // 3. Build plan
  const plan = buildReconciliationPlan(allStudents, allFees)

  if (plan.studentsToDelete.length === 0 && plan.feesToMigrate.length === 0) {
    return {
      success: true,
      mergedCount: 0,
      feesMigratedCount: 0,
      totalActiveStudents: plan.summary.totalActiveStudents,
      message: 'No duplicate legacy student records found.',
    }
  }

  // 4. Execute migrations in safe batches
  // Queue of operations
  const operations = []

  // A. Migrate fees
  for (const fee of plan.feesToMigrate) {
    const newDocId = buildFeeDocId(fee.targetStudentId, fee.year, fee.month)
    const targetFeeRef = doc(db, COLLECTION_FEES, newDocId)
    const oldFeeRef = doc(db, COLLECTION_FEES, fee.oldFeeDocId)

    const paymentTs = toFirestoreDateTimestamp(fee.paymentDate)
    const createdTs = toFirestoreDateTimestamp(fee.createdAt) || serverTimestamp()

    operations.push((batch) => {
      batch.set(
        targetFeeRef,
        {
          studentId: fee.targetStudentId,
          studentName: fee.targetStudentName,
          class: fee.targetClass,
          month: fee.month,
          year: Number(fee.year),
          amount: Number(fee.amount),
          status: fee.status === 'paid' ? 'paid' : 'pending',
          paymentDate: paymentTs,
          deleted: false,
          deletedAt: null,
          createdAt: createdTs,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )

      if (fee.oldFeeDocId !== newDocId) {
        batch.update(oldFeeRef, {
          deleted: true,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
    })
  }

  // B. Soft-delete duplicate legacy students
  for (const oldStudentId of plan.studentsToDelete) {
    const studentRef = doc(db, COLLECTION_STUDENTS, sanitizeStudentDocId(oldStudentId))
    operations.push((batch) => {
      batch.update(studentRef, {
        deleted: true,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })
  }

  // Execute operations in batch chunks
  for (let i = 0; i < operations.length; i += BATCH_LIMIT) {
    const chunk = operations.slice(i, i + BATCH_LIMIT)
    const batch = writeBatch(db)
    for (const op of chunk) {
      op(batch)
    }
    await batch.commit()
  }

  return {
    success: true,
    mergedCount: plan.studentsToDelete.length,
    feesMigratedCount: plan.feesToMigrate.length,
    totalActiveStudents: plan.summary.remainingStudentsCount,
    message: `Successfully merged ${plan.studentsToDelete.length} duplicate student profile(s) and preserved ${plan.feesToMigrate.length} fee payment record(s).`,
  }
}
