import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { getFirebaseDb } from './config.js'
import {
  COLLECTION_COUNTERS,
  COLLECTION_FEES,
  COLLECTION_PAYMENTS,
  DOC_RECEIPT_COUNTER,
} from './constants.js'
import { sanitizeStudentDocId } from './studentRepository.js'
import { assertAdminCanWrite } from './writeGuard.js'
import {
  allocateMultiMonthPayment,
  calculateMultiMonthSchedule,
  compareAcademicPeriod,
  formatReceiptNumber,
  getAcademicSession,
  sanitizeReceiptDocId,
  sortMonthsInAcademicOrder,
  toRupees,
  validateMultiMonthWaivers,
} from '../utils/feeAllocation.js'
import { numberToWordsIndian } from '../utils/numberToWords.js'

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

  const amount = Number(d.amount) || 0
  const tuitionFee = d.tuitionFee != null ? Number(d.tuitionFee) : amount
  const conveyanceFee = d.conveyanceFee != null ? Number(d.conveyanceFee) : 0
  const examFee = d.examFee != null ? Number(d.examFee) : 0
  const annualFee = d.annualFee != null ? Number(d.annualFee) : 0
  const admissionFee = d.admissionFee != null ? Number(d.admissionFee) : 0
  const lateFee = d.lateFee != null ? Number(d.lateFee) : 0

  const computedScheduleTotal =
    tuitionFee + conveyanceFee + examFee + annualFee + admissionFee + lateFee

  const totalAmount =
    d.totalAmount != null
      ? Number(d.totalAmount)
      : computedScheduleTotal > 0
        ? computedScheduleTotal
        : d.remainingAmount != null
          ? amount + Number(d.remainingAmount)
          : amount

  const remainingAmount =
    d.remainingAmount != null
      ? Number(d.remainingAmount)
      : Math.max(0, totalAmount - amount)

  // Status derivation:
  // - If stored as 'paid' but remainingAmount > 0, it is 'partial'
  // - If explicitly 'partial', it is 'partial'
  // - Otherwise 'paid' or 'pending'
  let status = 'pending'
  const rawStatus = String(d.status ?? 'pending').toLowerCase()
  if (rawStatus === 'paid') {
    status = remainingAmount > 0 ? 'partial' : 'paid'
  } else if (rawStatus === 'partial') {
    status = 'partial'
  } else if (amount > 0 && remainingAmount > 0) {
    status = 'partial'
  } else if (amount > 0 && remainingAmount === 0) {
    status = 'paid'
  }

  const receiptNos = Array.isArray(d.receiptNos)
    ? d.receiptNos
    : d.chequeNo && String(d.chequeNo).startsWith('PA-')
      ? [d.chequeNo]
      : []

  return {
    docId: snapshot.id,
    studentId: String(d.studentId ?? '').trim(),
    studentName: String(d.studentName ?? '').trim(),
    class: String(d.class ?? '').trim(),
    month: String(d.month ?? '').trim(),
    year: Number(d.year) || 0,
    amount,
    grossFee: d.grossFee != null ? Number(d.grossFee) : totalAmount,
    waiverTotal: d.waiverTotal != null ? Number(d.waiverTotal) : 0,
    waivers: Array.isArray(d.waivers) ? d.waivers : [],
    totalAmount,
    remainingAmount,
    tuitionFee,
    conveyanceFee,
    examFee,
    annualFee,
    admissionFee,
    lateFee,
    chequeNo: String(d.chequeNo ?? '').trim(),
    amountInWords: String(d.amountInWords ?? '').trim(),
    status,
    rawStatus,
    paymentDate: coerceTimestamp(d.paymentDate),
    session: String(d.session ?? '').trim(),
    receiptNos,
    paymentId: String(d.paymentId ?? '').trim(),
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

  const sid = String(studentId ?? '').trim()
  if (!sid) {
    onData([])
    return () => {}
  }

  const q = query(collection(db, COLLECTION_FEES), where('studentId', '==', sid))

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map(mapFeeDoc).filter(Boolean).sort(compareAcademicPeriod)
      onData(list)
    },
    (error) => onError?.(error),
  )
}

export function buildPaymentTimestamp(status, paymentDate) {
  if (status !== 'paid' && status !== 'partial') return null
  if (paymentDate instanceof Date) return Timestamp.fromDate(paymentDate)
  if (paymentDate) return Timestamp.fromDate(new Date(paymentDate))
  return null
}

/**
 * Fetches a single payment handover record by ID
 */
export async function getPaymentDoc(paymentDocId) {
  const db = getFirebaseDb()
  if (!db || !paymentDocId) return null
  const snap = await getDoc(doc(db, COLLECTION_PAYMENTS, sanitizeReceiptDocId(paymentDocId)))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

/**
 * Subscribes to payments collection
 */
export function subscribePayments(onData, onError) {
  const db = getFirebaseDb()
  if (!db) {
    onError?.(new Error('Firestore is not initialized.'))
    return () => {}
  }

  return onSnapshot(
    collection(db, COLLECTION_PAYMENTS),
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      onData(list)
    },
    (error) => onError?.(error),
  )
}

/**
 * Executes an atomic Firestore transaction to record fee payments (single-month or multi-month).
 *
 * Guarantees:
 * 1. Reads counter document & increments sequentially.
 * 2. Creates a single `payments` document for the handover.
 * 3. Saves or tops up each month's `fees` document with proper allocations.
 * 4. Never stores multi-month total received on any month record.
 */
export async function recordFeePaymentTransaction({
  student,
  months = [],
  breakdown = {},
  nonRecurringOverrides = {},
  perMonthCustomizations = {},
  totalReceived = 0,
  manualAllocations = null,
  waiverApprovedBy = '',
  paymentMode = 'cash',
  reference = '',
  paymentDate = new Date(),
  enteredBy = '',
  explicitStatus = null,
}) {
  assertAdminCanWrite()
  const db = getFirebaseDb()
  if (!db) throw new Error('Firestore is not initialized.')

  if (!student || !student.id) {
    throw new Error('Student information is required.')
  }
  if (!months || months.length === 0) {
    throw new Error('At least one month must be selected.')
  }

  const sid = sanitizeStudentDocId(student.id)
  const sortedMonths = sortMonthsInAcademicOrder(months)
  const firstMonth = sortedMonths[0]
  const session = getAcademicSession(firstMonth.year, firstMonth.month) || '2026-27'

  return await runTransaction(db, async (transaction) => {
    // 1. Read receipt counter document
    const counterRef = doc(db, COLLECTION_COUNTERS, DOC_RECEIPT_COUNTER)
    const counterSnap = await transaction.get(counterRef)
    const currentCount = counterSnap.exists() ? Number(counterSnap.data()?.current || 0) : 0
    const nextCount = currentCount + 1
    const receiptNo = formatReceiptNumber(session, nextCount)
    const paymentDocId = sanitizeReceiptDocId(receiptNo)

    // 2. Read existing fee documents for the selected months
    const monthDocReads = []
    for (const m of sortedMonths) {
      validateFeePayload({ month: m.month, year: m.year, amount: 0 })
      const docId = buildFeeDocId(sid, m.year, m.month)
      const feeRef = doc(db, COLLECTION_FEES, docId)
      const snap = await transaction.get(feeRef)
      monthDocReads.push({
        month: m.month,
        year: Number(m.year),
        ref: feeRef,
        docId,
        exists: snap.exists(),
        data: snap.exists() ? snap.data() : null,
      })
    }

    // 3. Prepare schedule with existing record information & customizations
    const monthsWithExisting = monthDocReads.map((read) => ({
      month: read.month,
      year: read.year,
      existingRecord: read.data,
    }))

    const scheduled = calculateMultiMonthSchedule({
      months: monthsWithExisting,
      breakdown,
      nonRecurringOverrides,
      perMonthCustomizations,
    })

    // Validate waivers (ensure reason + approver, and net due >= existingPaid)
    const waiverVal = validateMultiMonthWaivers({
      scheduledMonths: scheduled,
      approvedBy: waiverApprovedBy,
    })
    if (!waiverVal.valid) {
      throw new Error(waiverVal.error)
    }

    // 4. Allocate payment
    const allocationResult = allocateMultiMonthPayment({
      scheduledMonths: scheduled,
      totalReceived,
      manualAllocations,
    })

    if (!allocationResult.isValid && totalReceived > 0) {
      if (allocationResult.hasInvalidWaiver) {
        throw new Error('A waiver cannot reduce due below the amount already paid.')
      }
      if (allocationResult.exceedsTotalDue) {
        throw new Error(
          `Amount received (₹${totalReceived}) exceeds total due (₹${allocationResult.totalNetDue}).`,
        )
      }
      if (allocationResult.isOverAllocated || allocationResult.isUnderAllocated) {
        throw new Error(
          `Allocated amount (₹${allocationResult.totalAllocated}) does not match amount received (₹${totalReceived}).`,
        )
      }
      throw new Error('Invalid fee allocation.')
    }

    const paymentTs =
      totalReceived > 0
        ? buildPaymentTimestamp('paid', paymentDate) || Timestamp.now()
        : null

    const totalWaivedInPayment = allocationResult.allocations.reduce(
      (sum, a) => sum + (a.waiverTotal || 0),
      0,
    )

    // 5. Create Payment Document (only when money was actually received)
    if (totalReceived > 0) {
      const paymentRef = doc(db, COLLECTION_PAYMENTS, paymentDocId)
      const paymentPayload = {
        receiptNo,
        studentId: sid,
        studentName: String(student.name ?? '').trim(),
        class: String(student.class ?? '').trim(),
        totalReceived: allocationResult.totalReceived,
        totalWaived: totalWaivedInPayment,
        mode: String(paymentMode || 'cash').toLowerCase(),
        reference: String(reference || '').trim(),
        paidOn: paymentTs,
        enteredBy: String(enteredBy || '').trim(),
        session,
        allocations: allocationResult.allocations.map((a) => ({
          feeId: buildFeeDocId(sid, a.year, a.month),
          month: a.month,
          year: a.year,
          amount: a.allocatedPaid,
          grossFee: a.grossFee ?? a.totalAmount,
          totalAmount: a.totalAmount, // net total
          remainingAmount: a.remainingAmount,
          status: a.status,
          waived: a.waiverTotal || 0,
          waivers: (a.waivers || []).map((w) => ({
            ...w,
            enteredBy: String(enteredBy || '').trim(),
            at: paymentTs || Timestamp.now(),
            receiptNo,
          })),
          tuitionFee: a.tuitionFee,
          conveyanceFee: a.conveyanceFee,
        })),
        status: 'active',
        createdAt: serverTimestamp(),
      }
      transaction.set(paymentRef, paymentPayload)
    }

    // 6. Create or update each month's fee document
    let updateCount = 0
    for (let i = 0; i < allocationResult.allocations.length; i++) {
      const a = allocationResult.allocations[i]
      const read = monthDocReads[i]
      const ex = read.data

      const prevReceiptNos = Array.isArray(ex?.receiptNos)
        ? ex.receiptNos
        : ex?.chequeNo && String(ex.chequeNo).startsWith('PA-')
          ? [ex.chequeNo]
          : []

      const updatedReceiptNos =
        totalReceived > 0 && !prevReceiptNos.includes(receiptNo)
          ? [...prevReceiptNos, receiptNo]
          : prevReceiptNos

      // Append newly granted waivers to any existing waivers on this fee document
      const prevWaivers = Array.isArray(ex?.waivers) ? ex.waivers : []
      const newMonthWaivers = (a.waivers || []).map((w) => ({
        ...w,
        enteredBy: String(enteredBy || '').trim(),
        at: paymentTs || Timestamp.now(),
        receiptNo: totalReceived > 0 ? receiptNo : null,
      }))
      const updatedWaivers = [...prevWaivers, ...newMonthWaivers]
      const updatedWaiverTotal = updatedWaivers.reduce(
        (sum, w) => sum + (Number(w.amount) || 0),
        0,
      )

      // Status determination
      let computedStatus = a.status
      if (explicitStatus && allocationResult.allocations.length === 1) {
        // Single-month radio override backward compatibility
        computedStatus = explicitStatus
      }

      const feePayload = {
        studentId: sid,
        studentName: String(student.name ?? '').trim(),
        class: String(student.class ?? '').trim(),
        month: a.month,
        year: a.year,
        amount: a.cumulativePaid,
        grossFee: a.grossFee ?? a.totalAmount,
        waiverTotal: updatedWaiverTotal,
        waivers: updatedWaivers,
        totalAmount: a.totalAmount, // NET due
        remainingAmount: a.remainingAmount, // NET remaining
        tuitionFee: a.grossTuition ?? a.tuitionFee, // GROSS rate charged
        conveyanceFee: a.grossConveyance ?? a.conveyanceFee, // GROSS rate charged
        examFee: a.examFee,
        annualFee: a.annualFee,
        admissionFee: a.admissionFee,
        lateFee: a.lateFee,
        chequeNo: String(reference || ex?.chequeNo || '').trim(),
        amountInWords: numberToWordsIndian(a.cumulativePaid),
        status: computedStatus === 'pending' ? 'pending' : 'paid',
        paymentDate: a.cumulativePaid > 0 ? paymentTs || ex?.paymentDate || null : null,
        session,
        receiptNos: updatedReceiptNos,
        paymentId: totalReceived > 0 ? paymentDocId : ex?.paymentId || '',
        deleted: false,
        deletedAt: null,
        updatedAt: serverTimestamp(),
      }

      if (read.exists) {
        updateCount++
        transaction.update(read.ref, {
          ...feePayload,
          createdAt: ex?.createdAt ?? serverTimestamp(),
        })
      } else {
        transaction.set(read.ref, {
          ...feePayload,
          createdAt: serverTimestamp(),
        })
      }
    }

    // 7. Update Counter Document (if a receipt number was generated)
    if (totalReceived > 0) {
      transaction.set(
        counterRef,
        {
          current: nextCount,
          session,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    }

    return {
      receiptNo: totalReceived > 0 ? receiptNo : null,
      paymentDocId: totalReceived > 0 ? paymentDocId : null,
      session,
      allocations: allocationResult.allocations,
      totalReceived: allocationResult.totalReceived,
      isUpdate: updateCount > 0,
      updateCount,
    }
  })
}

/**
 * Backward-compatible single-month fee record creator.
 * Routes through the transaction engine so single month entries also produce a payment doc.
 */
export async function createFeeRecord({
  studentId,
  studentName,
  class: className,
  month,
  year,
  amount,
  totalAmount,
  remainingAmount,
  tuitionFee,
  conveyanceFee,
  examFee,
  annualFee,
  admissionFee,
  lateFee,
  chequeNo,
  amountInWords,
  status,
  paymentDate,
  mode = 'cash',
  enteredBy = '',
}) {
  assertAdminCanWrite()
  validateFeePayload({ month, year, amount })

  const paidNum = toRupees(amount)
  const tFee = tuitionFee != null ? toRupees(tuitionFee) : paidNum
  const cFee = conveyanceFee != null ? toRupees(conveyanceFee) : 0
  const eFee = examFee != null ? toRupees(examFee) : 0
  const anFee = annualFee != null ? toRupees(annualFee) : 0
  const adFee = admissionFee != null ? toRupees(admissionFee) : 0
  const lFee = lateFee != null ? toRupees(lateFee) : 0

  return await recordFeePaymentTransaction({
    student: {
      id: studentId,
      name: studentName,
      class: className,
    },
    months: [{ month, year: Number(year) }],
    breakdown: {
      tuitionFee: tFee,
      conveyanceFee: cFee,
      examFee: eFee,
      annualFee: anFee,
      admissionFee: adFee,
      lateFee: lFee,
    },
    totalReceived: paidNum,
    paymentMode: mode,
    reference: chequeNo || '',
    paymentDate: paymentDate || new Date(),
    enteredBy,
    explicitStatus: status,
  })
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
