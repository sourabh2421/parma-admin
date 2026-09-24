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
  if (c === 'LKG' || c === 'L.K.G.') return 'LKG'
  if (c === 'UKG' || c === 'U.K.G.') return 'UKG'
  if (c === 'NURSERY' || c === 'NUR' || c === 'NUR.') return 'NURSERY'
  if (c === 'I' || c === '1' || c === 'CLASS 1' || c === '1ST') return 'I'
  if (c === 'II' || c === '2' || c === '2ND') return 'II'
  if (c === 'III' || c === '3' || c === '3RD') return 'III'
  if (c === 'IV' || c === '4' || c === '4TH') return 'IV'
  if (c === 'V' || c === '5' || c === '5TH') return 'V'
  if (c === 'VI' || c === '6' || c === '6TH') return 'VI'
  if (c === 'VII' || c === '7' || c === '7TH') return 'VII'
  if (c === 'VIII' || c === '8' || c === '8TH') return 'VIII'
  return c
}

function sanitizeStudentDocId(studentId) {
  const raw = String(studentId ?? '').trim()
  if (!raw) return '_empty'
  return raw.replace(/[/\\]/g, '_').slice(0, 700)
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

const MONTH_COLS = [
  { name: 'March', colIdx: 15 },
  { name: 'April', colIdx: 4 },
  { name: 'May', colIdx: 5 },
  { name: 'June', colIdx: 6 },
  { name: 'July', colIdx: 7 },
  { name: 'August', colIdx: 8 },
  { name: 'September', colIdx: 9 },
  { name: 'October', colIdx: 10 },
  { name: 'November', colIdx: 11 },
  { name: 'December', colIdx: 12 },
  { name: 'January', colIdx: 13 },
  { name: 'February', colIdx: 14 },
]

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

async function runImport() {
  console.log('=== Step 0: Authenticating as Admin User ===')
  const userCred = await signInWithEmailAndPassword(auth, 'parma.academy.2004@gmail.com', 'parma123')
  console.log(`Successfully authenticated as ${userCred.user.email}`)

  console.log('\n=== Step 1: Cleaning up existing dummy fee records in Firestore ===')
  const existingFeesSnap = await getDocs(collection(db, 'fees'))
  console.log(`Found ${existingFeesSnap.size} existing documents in 'fees' collection.`)

  let deleteBatch = writeBatch(db)
  let countInBatch = 0
  for (const feeDoc of existingFeesSnap.docs) {
    deleteBatch.delete(feeDoc.ref)
    countInBatch++
    if (countInBatch >= BATCH_LIMIT) {
      await deleteBatch.commit()
      deleteBatch = writeBatch(db)
      countInBatch = 0
    }
  }
  if (countInBatch > 0) {
    await deleteBatch.commit()
  }
  console.log('Successfully cleared existing fee documents.')

  console.log('\n=== Step 2: Reading Excel file public/CLASS NUR TO 8.xlsx ===')
  const wb = XLSX.readFile('public/CLASS NUR TO 8.xlsx')
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  console.log(`Loaded ${rows.length - 1} student rows from Excel sheet.`)

  console.log('\n=== Step 3: Fetching existing student directory from Firestore ===')
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
  console.log(`Found ${dbStudents.length} students in Firestore.`)

  const newStudentsToCreate = []
  const resolvedFeeRecords = []
  let matchedStudentCount = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row[1]) continue

    const sno = String(row[0] || '').trim()
    const rawName = String(row[1]).trim()
    const rawClass = String(row[2] || '').trim()
    const totalAmount = parseFloat(row[3]) || 0

    const normN = normStr(rawName)
    const normC = normClass(rawClass)

    // Match Strategy 1: Exact SNO match if name also matches
    let matchedStudent = dbStudents.find(
      (s) => (s.docId === sno || s.id === sno) && normStr(s.name) === normN
    )

    // Match Strategy 2: Match by Name & Class
    if (!matchedStudent) {
      const byNameCls = dbStudents.filter(
        (s) => normStr(s.name) === normN && normClass(s.class) === normC
      )
      if (byNameCls.length > 0) {
        matchedStudent = byNameCls[0]
      }
    }

    // Match Strategy 3: Match by Name only
    if (!matchedStudent) {
      const byName = dbStudents.filter((s) => normStr(s.name) === normN)
      if (byName.length > 0) {
        matchedStudent = byName[0]
      }
    }

    // Match Strategy 4: Known aliases
    if (!matchedStudent) {
      if (normN === 'eklavya singh' && normC === 'IV') {
        matchedStudent = dbStudents.find((s) => normStr(s.name) === 'eklavya' && normClass(s.class) === 'IV')
      }
    }

    // If still no student matched, queue creation of a new student profile in `students`
    if (!matchedStudent) {
      const newId = sno || `EXP_${i}`
      matchedStudent = {
        docId: newId,
        id: newId,
        name: rawName,
        class: normC || rawClass,
        parentName: '',
      }
      newStudentsToCreate.push(matchedStudent)
      dbStudents.push(matchedStudent)
      console.log(`Created student profile for unmatched Excel row: ID ${newId} - ${rawName} (${rawClass})`)
    } else {
      matchedStudentCount++
    }

    // Process month fees
    MONTH_COLS.forEach((m) => {
      const parsed = parseCellVal(row[m.colIdx])
      if (parsed) {
        resolvedFeeRecords.push({
          studentId: matchedStudent.id || matchedStudent.docId,
          studentName: matchedStudent.name || rawName,
          class: matchedStudent.class || rawClass,
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

  console.log(`\nMatching Summary:`)
  console.log(`Matched existing students: ${matchedStudentCount}`)
  console.log(`New students created: ${newStudentsToCreate.length}`)
  console.log(`Total valid fee records to write: ${resolvedFeeRecords.length}`)

  // Write new students if any
  if (newStudentsToCreate.length > 0) {
    let studentBatch = writeBatch(db)
    let sCount = 0
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
      sCount++
      if (sCount >= BATCH_LIMIT) {
        await studentBatch.commit()
        studentBatch = writeBatch(db)
        sCount = 0
      }
    }
    if (sCount > 0) {
      await studentBatch.commit()
    }
    console.log(`Wrote ${newStudentsToCreate.length} new student records to Firestore.`)
  }

  // Write fee records into `fees` collection
  console.log('\n=== Step 4: Writing fee records to Firestore ===')
  let feeBatch = writeBatch(db)
  let fCount = 0
  let totalCommitted = 0

  for (const fee of resolvedFeeRecords) {
    const docId = buildFeeDocId(fee.studentId, fee.year, fee.month)
    const ref = doc(db, 'fees', docId)

    feeBatch.set(ref, {
      ...fee,
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
      console.log(`Committed batch of ${fCount} fee records (Total so far: ${totalCommitted})...`)
      feeBatch = writeBatch(db)
      fCount = 0
    }
  }

  if (fCount > 0) {
    await feeBatch.commit()
    totalCommitted += fCount
    console.log(`Committed final batch of ${fCount} fee records. Total inserted: ${totalCommitted}.`)
  }

  console.log('\n✅ IMPORT COMPLETED SUCCESSFULLY!')
}

runImport()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Import failed:', err)
    process.exit(1)
  })
