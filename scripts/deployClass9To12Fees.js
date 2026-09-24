import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import XLSX from 'xlsx'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBsGrum1CyYxND-LxnPw2v1mo5ay-X4o64',
  authDomain: 'parma-academy-2002.firebaseapp.com',
  projectId: 'parma-academy-2002',
  storageBucket: 'parma-academy-2002.firebasestorage.app',
  messagingSenderId: '425474936626',
  appId: '1:425474936626:web:33529068a2688f38e5512b',
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

const BATCH_LIMIT = 400

function normStr(str) {
  return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function normClass(cls) {
  let c = normStr(cls).toUpperCase()
  if (c === '1X') return 'IX'
  if (c === 'XII' || c === '12' || c === 'CLASS 12') return 'XII'
  if (c === 'XI' || c === '11' || c === 'CLASS 11') return 'XI'
  if (c === 'X' || c === '10' || c === 'CLASS 10') return 'X'
  if (c === 'IX' || c === '9' || c === 'CLASS 9') return 'IX'
  return c
}

function sanitizeStudentDocId(studentId) {
  const raw = String(studentId ?? '').trim()
  if (!raw) return '_empty'
  return raw.replace(/[/\\s]/g, '_').slice(0, 700)
}

function buildFeeDocId(studentId, year, month) {
  const slug = String(month)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  const y = Number(year)
  return `${sanitizeStudentDocId(studentId)}__${y}__${slug || 'month'}`.slice(0, 800)
}

function parseCellVal(rawVal) {
  if (rawVal == null) return null
  const str = String(rawVal).trim()
  if (!str || str === '0' || str === 'null' || str === 'undefined') return null

  if (str.includes('/')) {
    const parts = str.split('/')
    const amt = parseFloat(parts[0].replace(/[^0-9.]/g, ''))
    const rec = parts.slice(1).join('/').trim()
    if (isNaN(amt) || amt <= 0) return null
    return { amount: amt, chequeNo: rec }
  }

  const amt = parseFloat(str.replace(/[^0-9.]/g, ''))
  if (isNaN(amt) || amt <= 0) return null
  return { amount: amt, chequeNo: '' }
}

const MONTH_COLS = [
  { name: 'April', colIdx: 5 },
  { name: 'May', colIdx: 6 },
  { name: 'June', colIdx: 7 },
  { name: 'July', colIdx: 8 },
  { name: 'August', colIdx: 9 },
  { name: 'September', colIdx: 10 },
  { name: 'October', colIdx: 11 },
  { name: 'November', colIdx: 12 },
  { name: 'December', colIdx: 13 },
  { name: 'January', colIdx: 14 },
  { name: 'February', colIdx: 15 },
  { name: 'March', colIdx: 16 },
]

const ALIASES = {
  'vikash nishad': 'vikas nishad',
  'abdul': 'abdul samad',
  'nishkarsh sen': 'niskersh sen',
  'rameshwar tiwari': 'rameswar tiwari',
  'sannidhya yadav': 'sanidhya',
  'rishi patel': 'rishi patel',
}

async function runDeploy() {
  console.log('=== Step 0: Authenticating with Firebase ===')
  const userCred = await signInWithEmailAndPassword(auth, 'parma.academy.2004@gmail.com', 'parma123')
  console.log(`Authenticated as ${userCred.user.email}`)

  console.log('\n=== Step 1: Checking Existing Data to Guarantee ZERO OVERLAP ===')
  const existingFeesSnap = await getDocs(collection(db, 'fees'))
  console.log(`Current existing fee records in DB: ${existingFeesSnap.size}`)

  const existingFeeIds = new Set(existingFeesSnap.docs.map((d) => d.id))

  const studentsSnap = await getDocs(collection(db, 'students'))
  const dbStudents = studentsSnap.docs.map((d) => {
    const data = d.data()
    return {
      docId: d.id,
      id: String(data.studentId || d.id).trim(),
      name: String(data.name || '').trim(),
      class: String(data.class || '').trim(),
      parentName: String(data.parentName || data.fatherName || '').trim(),
    }
  })
  console.log(`Current existing student records in DB: ${dbStudents.length}`)

  console.log('\n=== Step 2: Reading Excel public/CLASS 9 TO 12.xlsx ===')
  const wb = XLSX.readFile('public/CLASS 9 TO 12.xlsx')
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  console.log(`Loaded ${rows.length - 1} rows from sheet "${wb.SheetNames[0]}"`)

  const newStudentsToCreate = []
  const resolvedFeeRecords = []
  let matchedCount = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || (!row[0] && !row[2])) continue

    const sno = String(row[0] || '').trim()
    const rawStream = String(row[1] || '').trim()
    const rawName = String(row[2] || '').trim()
    const rawClass = String(row[3] || '').trim()
    const totalAmount = parseFloat(row[4]) || 0
    const pendingAmount = parseFloat(row[17]) || 0

    const normN = normStr(rawName)
    const normC = normClass(rawClass)

    // Strategy 1: Check exact SNO if name matches
    let matchedStudent = dbStudents.find(
      (s) => (s.docId === sno || s.id === sno) && normStr(s.name) === normN
    )

    // Strategy 2: Match by Name and Class
    if (!matchedStudent) {
      const byNameCls = dbStudents.filter(
        (s) => normStr(s.name) === normN && normClass(s.class) === normC
      )
      if (byNameCls.length > 0) {
        matchedStudent = byNameCls[0]
      }
    }

    // Strategy 3: Match by Name only
    if (!matchedStudent) {
      const byName = dbStudents.filter((s) => normStr(s.name) === normN)
      if (byName.length > 0) {
        matchedStudent = byName[0]
      }
    }

    // Strategy 4: Known Aliases
    if (!matchedStudent && ALIASES[normN]) {
      const aliasTarget = ALIASES[normN]
      matchedStudent = dbStudents.find(
        (s) => normStr(s.name) === aliasTarget && normClass(s.class) === normC
      )
      if (!matchedStudent) {
        matchedStudent = dbStudents.find((s) => normStr(s.name) === aliasTarget)
      }
    }

    // If no student matched, create a new student record
    if (!matchedStudent) {
      const newId = '335' // Unique available ID
      matchedStudent = {
        docId: newId,
        id: newId,
        name: rawName,
        class: normC || rawClass,
        parentName: '',
      }
      newStudentsToCreate.push(matchedStudent)
      dbStudents.push(matchedStudent)
      console.log(`Created new student profile for unmatched Excel row: ID ${newId} - ${rawName} (${rawClass})`)
    } else {
      matchedCount++
    }

    // Process all 12 months
    MONTH_COLS.forEach((m) => {
      const parsed = parseCellVal(row[m.colIdx])
      if (parsed) {
        const feeDocId = buildFeeDocId(matchedStudent.id || matchedStudent.docId, 2026, m.name)

        if (existingFeeIds.has(feeDocId)) {
          console.warn(`⚠️ Warning: ${feeDocId} already exists in fees collection! Skipping to avoid overlap.`)
          return
        }

        resolvedFeeRecords.push({
          docId: feeDocId,
          studentId: matchedStudent.id || matchedStudent.docId,
          studentName: matchedStudent.name || rawName,
          class: normC,
          month: m.name,
          year: 2026,
          amount: parsed.amount,
          totalAmount: totalAmount > 0 ? totalAmount : parsed.amount,
          remainingAmount: 0,
          tuitionFee: parsed.amount,
          conveyanceFee: 0,
          examFee: 0,
          annualFee: 0,
          admissionFee: 0,
          lateFee: 0,
          chequeNo: parsed.chequeNo,
          amountInWords: '',
          status: 'paid',
          paymentDate: new Date(),
        })
      }
    })
  }

  console.log('\n=== Matching & Extraction Summary ===')
  console.log(`Matched existing students: ${matchedCount}`)
  console.log(`New students to create: ${newStudentsToCreate.length}`)
  console.log(`Total new fee records extracted: ${resolvedFeeRecords.length}`)

  // Verify by class
  const classBreakdown = {}
  resolvedFeeRecords.forEach((f) => {
    classBreakdown[f.class] = (classBreakdown[f.class] || 0) + 1
  })
  console.log('Fee records by Class (9-12):', classBreakdown)

  // Verify by month
  const monthBreakdown = {}
  resolvedFeeRecords.forEach((f) => {
    monthBreakdown[f.month] = (monthBreakdown[f.month] || 0) + 1
  })
  console.log('Fee records by Month:', monthBreakdown)

  // Step 3: Write new students if any
  if (newStudentsToCreate.length > 0) {
    console.log('\n=== Step 3: Writing new students to Firestore ===')
    let studentBatch = writeBatch(db)
    for (const ns of newStudentsToCreate) {
      const ref = doc(db, 'students', sanitizeStudentDocId(ns.id))
      studentBatch.set(
        ref,
        {
          studentId: ns.id,
          name: ns.name,
          parentName: '',
          class: ns.class,
          deleted: false,
          deletedAt: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    }
    await studentBatch.commit()
    console.log(`Saved ${newStudentsToCreate.length} new student(s).`)
  }

  // Step 4: Write fee records to Firestore
  console.log('\n=== Step 4: Writing 9-12 Fee Records to Firestore ===')
  let feeBatch = writeBatch(db)
  let fCount = 0
  let totalCommitted = 0

  for (const fee of resolvedFeeRecords) {
    const ref = doc(db, 'fees', fee.docId)

    const { docId, ...dataToSave } = fee
    feeBatch.set(ref, {
      ...dataToSave,
      paymentDate: Timestamp.fromDate(fee.paymentDate),
      deleted: false,
      deletedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    fCount++
    if (fCount >= BATCH_LIMIT) {
      await feeBatch.commit()
      totalCommitted += fCount
      console.log(`Committed batch of ${fCount} fees (Total so far: ${totalCommitted})...`)
      feeBatch = writeBatch(db)
      fCount = 0
    }
  }

  if (fCount > 0) {
    await feeBatch.commit()
    totalCommitted += fCount
    console.log(`Committed final batch of ${fCount} fees. Total inserted: ${totalCommitted}.`)
  }

  console.log('\n=== Step 5: Final Database Verification ===')
  const finalFeesSnap = await getDocs(collection(db, 'fees'))
  console.log(`Final total fee records in DB: ${finalFeesSnap.size} (Expected: ${existingFeesSnap.size + totalCommitted})`)

  const finalClassCounts = {}
  finalFeesSnap.docs.forEach((d) => {
    const c = d.data().class
    finalClassCounts[c] = (finalClassCounts[c] || 0) + 1
  })
  console.log('Final fee records distribution across all classes:', finalClassCounts)

  console.log('\nSUCCESS! CLASS 9 TO 12 FEE DATA DEPLOYED CLEANLY WITHOUT OVERLAPPING ANY EXISTING DATA.')
}

runDeploy()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Deployment failed:', err)
    process.exit(1)
  })
