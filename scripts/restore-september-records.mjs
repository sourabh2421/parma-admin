import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import fs from 'fs'

const cred = cert(JSON.parse(fs.readFileSync('serviceAccountKey.json', 'utf8')))
initializeApp({ credential: cred, projectId: 'parma-academy-2002' })
const db = getFirestore()

const backup1 = JSON.parse(fs.readFileSync('backup-before-migration-1791150562920.json', 'utf8'))
const backup2 = JSON.parse(fs.readFileSync('backup-before-migration-1791150587265.json', 'utf8'))
const allBackup = [...backup1, ...backup2]

// All docs created before 2026-10-01 were genuine Excel ledger imports
const septDocs = allBackup.filter((d) => {
  const sec = d.createdAt?._seconds || 0
  return new Date(sec * 1000).toISOString() < '2026-10-01'
})

console.log(`Restoring ${septDocs.length} historical September records to original state...`)

async function run() {
  const BATCH_SIZE = 250
  let batch = db.batch()
  let count = 0
  let totalRestored = 0

  for (const orig of septDocs) {
    const ref = db.collection('fees').doc(orig.docId)

    // Restore exact original document state
    const restoredData = {
      studentId: orig.studentId,
      studentName: orig.studentName,
      class: orig.class,
      month: orig.month,
      year: orig.year,
      amount: orig.amount,
      totalAmount: orig.totalAmount,
      remainingAmount: orig.remainingAmount ?? 0,
      tuitionFee: orig.tuitionFee ?? orig.amount,
      conveyanceFee: orig.conveyanceFee ?? 0,
      examFee: orig.examFee ?? 0,
      annualFee: orig.annualFee ?? 0,
      admissionFee: orig.admissionFee ?? 0,
      lateFee: orig.lateFee ?? 0,
      chequeNo: orig.chequeNo ?? '',
      amountInWords: orig.amountInWords ?? '',
      status: orig.status || 'paid',
      paymentDate: orig.paymentDate,
      deleted: orig.deleted ?? false,
      deletedAt: orig.deletedAt ?? null,
      createdAt: orig.createdAt,
      updatedAt: orig.updatedAt,
      // Remove migration fields
      migratedAt: FieldValue.delete(),
      migrationNote: FieldValue.delete(),
      originalAmountPaid: FieldValue.delete(),
      paymentId: FieldValue.delete(),
    }

    batch.update(ref, restoredData)
    count++
    totalRestored++

    if (count >= BATCH_SIZE) {
      await batch.commit()
      console.log(`Committed ${totalRestored} restored records...`)
      batch = db.batch()
      count = 0
    }
  }

  if (count > 0) {
    await batch.commit()
    console.log(`Committed final ${totalRestored} restored records.`)
  }

  // Also remove payment docs created for September
  console.log('Cleaning up September payment records from payments collection...')
  const paymentsSnap = await db.collection('payments').where('legacyMigrated', '==', true).get()
  let delBatch = db.batch()
  let delCount = 0
  for (const doc of paymentsSnap.docs) {
    const data = doc.data()
    const paidOn = data.paidOn
    let isSept = false
    if (paidOn && typeof paidOn === 'string' && paidOn < '2026-10-01') isSept = true
    if (paidOn && paidOn._seconds && new Date(paidOn._seconds * 1000).toISOString() < '2026-10-01') isSept = true
    if (isSept) {
      delBatch.delete(doc.ref)
      delCount++
      if (delCount >= BATCH_SIZE) {
        await delBatch.commit()
        delBatch = db.batch()
        delCount = 0
      }
    }
  }
  if (delCount > 0) {
    await delBatch.commit()
  }

  console.log(`Successfully restored all ${totalRestored} September documents!`)
}

run().catch(console.error)
