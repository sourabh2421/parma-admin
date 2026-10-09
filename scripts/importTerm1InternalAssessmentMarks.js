import fs from 'fs'
import path from 'path'
import xlsx from 'xlsx'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// ============================================================================
// CONFIGURATION
// ============================================================================
const EXCEL_FILE_PATH = path.resolve('public/Parma Academy - Term-I Internal Assessment Marks Entry (1).xlsx')
const ACADEMIC_SESSION = '2026-27'
const IMPORT_SOURCE_TAG = 'excel-import-term1-internal-2026-27'
const SERVICE_ACCOUNT_FILE = 'serviceAccountKey.json'
const REPORT_OUTPUT_FILE = 'term1-internal-import-report.json'

// Known aliases mapping Excel student names to specific DB student IDs
const KNOWN_OVERRIDES = {
  // Class IX
  'Mohammad Soyab': '329',      // Md Soeb
  'Shahzad': '332',             // Md sehzad
  'Vikas Nishad': 'S188',       // Restored from legacy Class VIII
  'Abdul Samad': 'S191',        // Restored from legacy Class VIII
  'Sunny Yadav': '328',         // Shani yadav
  // Class X
  'Rudransh Mishra': '265',     // Rudransh Pandey in DB (S.No 12 in X)
  // Class XI
  'Anika Agrahari': '278',      // ANIKA GUPTA (S.No 2 in XI)
  // Class XII
  'Rishi Patel': 'S242',        // Restored from legacy Class XI
  'Sanidhya Yadav': '3171',     // Sanidhya in DB
  // Class VI
  'Aayush Yadav -1': '183',
  'Aayush Yadav-2': '195',
  // Class III
  'Adya Tiwari': '125',         // Aadya Tiwari
  'Aastha Tiwari': '109',       // Astha Tiwari
  'Anshuda Chauhan': '121',     // Ansuda
  'Mayra Yadav': '116',         // Myra Yadav
  'Prasiddhi Singh': '114',     // Prasidhi Singh
  'Priya': '129',               // Priya singh
  'Ananay Mishra': '110',       // Ananya Mishra
  'Chavvi Upadhyaya': '119',    // Chhavi
  'Akriti Sharma': '123',       // Akriti
  'Surabhi Yadav': '122',       // Surabi Yadav
  'Siya Yadav': '111',          // Sia Yadav
  'Rajanandini Pandey': '113',  // Raj Nandini Pandey
  'Watsalya Singh': '126',      // Vatsal
  'Krititva Mandal': '124',     // KritIWA
  'Prince Yadav': '127',        // Kritika / Prince Yadav
  'Vidhi': '112',               // Vidhi Yadav
  'Aradhya Yadav': '115',       // Ardhya Yadav
  'Adarsh Choudhry': '117',     // Aadarsh Chaudhary
  'Shalok': '310',              // Shlok yadav
  // Class IV
  'Siddharth': '139',           // Siddharth Kumar
  'Ganesh Chauhan': '151',      // Ganesh
  'Aarushi Gupta': '148',       // Arushi Gupta
  'Shourya': '149',             // Shourya Pratap Mishra
  'Raghvendram': '150',         // Raghvendra Yadav
  'Rudranarayan Shukla': '144', // Rudra Narayan Shukla
  'Anand Tiwari': '152',        // Anand
  'Ansh Yadav': '154',          // Ansh
  'Eklavya Singh': '315',       // Eklavya
  'Vikas Yadav': '312',         // Vikas
  'Ananya Yadav': '313',        // Ananya
  'Ankur Pal': '314',           // Ankur pal
  // Class V
  'Dharna Divedi': '157',       // Dharna Dwivedi
  'Lakshya Srivtastava': '163', // Lakshya Srivastava
  'Vedita Singh': '167',        // Vedika Singh
  'Saurabh Yadav': '169',       // Shaurabh Yadav
  'Prabhu Pandey': '171',       // Prabhu Narayan Pandey
  'Aayushi Gupta': '172',       // Ayushi Gupta
  'Abhishek Pandey': '173',     // Abhishek Kr. Pandey
  'Alok Kumar Pandey': '174',   // Alok Kr. Pandey
  'Humay Habiba': '176',        // Humay Habib
  'Nandini': '334',             // Nandini Yadav
  // Class I
  'Devansh': '72',              // Devansh Singh
  'Akhand': '73',               // Akhand Tripathi
  'Vibhu Narayan': '75',        // Vibhunarayan Pandey
  'Darshika': '76',             // Darshika Tiwari
  'Satvik': '78',               // Satvik Tiwari
  'Mohm. Adnan': '79',          // Mohd Adnan Ansari
  'Prabal': '80',               // Prabal Gupta
  'Aadarsh': '83',              // Adarsh Tripathi
  'Pragyan': '84',              // Pragyan Chauhan
  'Rudra': '85',                // Rudra Yadav
  'Vedanjali': '89',            // Vedanjli
  'Pushpendra': '90',           // Pushpendra Chauhan
  'Avyaan Sharma': '304',       // Avyansh Sharma
  'Deveshana Singh': '92',      // Deveshna Singh
  'Atharva': '93',              // Athrav
  'Aditya': '303',              // Aditiya Yadav
  // Class II
  'Aadarah Gupta': '105',       // Aadarsh Gupta
  'Aradhya Choudhary': '104',   // Aradhya Chaudhary
  'Divya Chauhan': '321',       // Divya
  'Rudra Pratap Singh': '106',  // Rudrapratap Singh
  'Shiksha Chauhan': '322',     // Shiksha
  'Swastik Yadav': '100',       // Swastik Pratap Singh Yadav
  'Shitiza Srivastava': '99',    // Sitiza Srivastava
  'Sakshi': '325',              // Sakshi Yadav
  'Sitaram': '107',             // Sita ram panday
}

export function normalizeName(name) {
  if (!name) return ''
  return String(name)
    .trim()
    .toUpperCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export function similarity(s1, s2) {
  const n1 = normalizeName(s1)
  const n2 = normalizeName(s2)
  if (n1 === n2) return 1.0
  const maxLen = Math.max(n1.length, n2.length)
  if (maxLen === 0) return 1.0
  return Number((1 - levenshtein(n1, n2) / maxLen).toFixed(4))
}

function parseMark(val, maxVal = 20) {
  if (val === undefined || val === null || val === '') return null
  if (typeof val === 'string') {
    const trimmed = val.trim().toUpperCase()
    if (!trimmed) return null
    if (trimmed === 'A' || trimmed === 'AB' || trimmed === 'ABSENT') return 'A'
    if (trimmed === 'M/L' || trimmed === 'ML') return 'ML'
    const num = Number(trimmed)
    if (!isNaN(num)) return num
    return null
  }
  if (typeof val === 'number') {
    return val
  }
  return null
}

export function parseExcelWorkbook(filePath = EXCEL_FILE_PATH) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`HARD STOP: File not found at ${filePath}`)
  }
  const wb = xlsx.readFile(filePath)
  const targetSheets = ['1 & 2', '3 to 5', '6 to 8', '9 & 10', '11 & 12']

  const allStudents = []
  let checksumFA1 = 0
  let checksumFA2 = 0
  let checksumAssign = 0
  let checksumOral = 0

  for (const sheetName of targetSheets) {
    if (!wb.SheetNames.includes(sheetName)) {
      throw new Error(`HARD STOP: Expected sheet "${sheetName}" not found in workbook.`)
    }
    const sheet = wb.Sheets[sheetName]
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 })
    if (data.length < 4) continue

    const row1 = data[1] || []
    const row2 = data[2] || []

    // Build column-to-subject mapping
    const colMap = []
    let curSub = null
    for (let c = 0; c < Math.max(row1.length, row2.length); c++) {
      if (row1[c]) {
        curSub = String(row1[c]).trim()
      }
      const compRaw = row2[c] ? String(row2[c]).trim().replace(/\r?\n/g, ' ') : ''
      colMap[c] = { subject: curSub, comp: compRaw }
    }

    for (let r = 3; r < data.length; r++) {
      const row = data[r]
      if (!row || (!row[1] && !row[3])) continue

      const sNo = row[0]
      const cls = String(row[1] || '').trim().toUpperCase()
      const rawName = String(row[3] || '').trim()
      if (!rawName) continue

      const subjectsMarks = {}

      for (let c = 4; c < colMap.length; c++) {
        const info = colMap[c]
        if (!info || !info.subject) continue

        const subName = info.subject
        const comp = info.comp.toUpperCase()
        const cellVal = row[c]

        if (!subjectsMarks[subName]) {
          subjectsMarks[subName] = {
            name: subName,
            fa1: null,
            fa2: null,
            assignment: null,
            oral: null,
            prcGame: null,
            internalTotal: null,
          }
        }

        const subEntry = subjectsMarks[subName]

        if (comp.includes('F.A.-1') || comp.includes('FA-1') || comp.includes('F.A. 1') || comp.includes('FA 1')) {
          const parsed = parseMark(cellVal, 20)
          subEntry.fa1 = parsed
          if (typeof parsed === 'number') checksumFA1 += parsed
        } else if (comp.includes('F.A.-2') || comp.includes('FA-2') || comp.includes('F.A. 2') || comp.includes('FA 2')) {
          const parsed = parseMark(cellVal, 20)
          subEntry.fa2 = parsed
          if (typeof parsed === 'number') checksumFA2 += parsed
        } else if (comp.includes('ASSIGNMENT') || comp.includes('ASSINGMENT')) {
          const parsed = parseMark(cellVal, 10)
          subEntry.assignment = parsed
          if (typeof parsed === 'number') checksumAssign += parsed
        } else if (comp.includes('ORAL/PRC/GAME') || comp.includes('ORAL/PRACTICAL') || comp === 'ORAL (MAX 10)' || comp.startsWith('ORAL')) {
          const parsed = parseMark(cellVal, 10)
          subEntry.oral = parsed
          if (typeof parsed === 'number') checksumOral += parsed
        } else if (comp.includes('PRC/GAME (MAX 40)') || comp.includes('PRC/GAME')) {
          const parsed = parseMark(cellVal, 40)
          subEntry.prcGame = parsed
        } else if (comp.includes('INTERNAL') && comp.includes('TOTAL')) {
          subEntry.internalTotal = (cellVal !== undefined && cellVal !== null && cellVal !== '') ? Number(cellVal) : null
        }
      }

      // If student in XI/XII has no recorded marks in sheet, use their stream subjects (e.g. Humanities)
      const streamFallback = ['English-I', 'English-II', 'Hindi', 'History & Civics', 'Political Science', 'Economics', 'Physical Education'];
      // Filter subjects:
      // For Classes 1-10, keep all subjects that exist in that class sheet.
      // For Classes 11-12, keep subjects where the student has at least one recorded mark component.
      const studentSubjects = {}
      for (const [sub, m] of Object.entries(subjectsMarks)) {
        if (cls === 'XI' || cls === 'XII') {
          const hasAny = m.fa1 !== null || m.fa2 !== null || m.assignment !== null || m.oral !== null || m.prcGame !== null
          if (hasAny) {
            studentSubjects[sub] = m
          }
        } else {
          studentSubjects[sub] = m
        }
      }

      if ((cls === 'XI' || cls === 'XII') && Object.keys(studentSubjects).length === 0) {
        for (const sub of streamFallback) {
          studentSubjects[sub] = {
            name: sub,
            fa1: 0,
            fa2: 0,
            assignment: 0,
            oral: 0,
            prcGame: null,
            internalTotal: 0,
          };
        }
      }

      allStudents.push({
        sheetName,
        excelRow: r + 1,
        sNo: Number(sNo) || sNo,
        class: cls,
        name: rawName,
        normName: normalizeName(rawName),
        marks: studentSubjects,
      })
    }
  }

  return {
    allStudents,
    checksumFA1,
    checksumFA2,
    checksumAssign,
    checksumOral,
  }
}

export function matchExcelStudentsWithDb(excelStudents, dbStudents) {
  const matchedStudentIds = new Set()
  const matched = []
  const unmatched = []

  for (const ex of excelStudents) {
    const cls = ex.class

    // 1. Check known override
    let targetDbId = KNOWN_OVERRIDES[ex.name]
    let matchedStud = null

    if (targetDbId) {
      matchedStud = dbStudents.find((s) => s.id === targetDbId)
      if (matchedStud && matchedStudentIds.has(matchedStud.id)) {
        throw new Error(`HARD STOP: Conflict on DB ID ${matchedStud.id} for "${ex.name}"`)
      }
    }

    if (!matchedStud) {
      // Find candidate in same class
      const candidates = dbStudents.filter((s) => {
        const c = String(s.class || '').trim().toUpperCase()
        if (s.id === 'S188' && cls === 'IX') return true
        if (s.id === 'S191' && cls === 'IX') return true
        if (s.id === 'S242' && cls === 'XII') return true
        return c === cls && !s.deleted && !matchedStudentIds.has(s.id)
      })

      // Exact normalized match
      matchedStud = candidates.find((s) => normalizeName(s.name) === ex.normName)

      // Prefix / StartsWith match
      if (!matchedStud) {
        matchedStud = candidates.find((s) => {
          const n1 = normalizeName(s.name)
          const n2 = ex.normName
          return n1.startsWith(n2) || n2.startsWith(n1)
        })
      }

      // Fuzzy match
      if (!matchedStud) {
        let bestSim = 0
        let bestCand = null
        for (const cand of candidates) {
          const sim = similarity(ex.name, cand.name)
          if (sim > bestSim) {
            bestSim = sim
            bestCand = cand
          }
        }
        if (bestCand && bestSim >= 0.6) {
          matchedStud = bestCand
        }
      }
    }

    if (matchedStud) {
      matchedStudentIds.add(matchedStud.id)
      matched.push({
        excel: ex,
        dbStudent: matchedStud,
      })
    } else {
      unmatched.push(ex)
    }
  }

  return { matched, unmatched, matchedStudentIds }
}

async function run() {
  const args = process.argv.slice(2)
  const isApply = args.includes('--apply')
  const isOverwrite = args.includes('--overwrite')

  console.log('======================================================================')
  console.log('PARMA ACADEMY — TERM-I INTERNAL ASSESSMENT MARKS IMPORT (CLASSES I-XII)')
  console.log(`Execution Mode: ${isApply ? '🔥 REAL WRITE (--apply active)' : '🛡️ DRY RUN (Simulation only, writes nothing)'}`)
  console.log(`Allow Overwrite: ${isOverwrite ? 'YES (--overwrite)' : 'NO (Preserves existing conflict marks)'}`)
  console.log('======================================================================\n')

  // Step 1: Parse Excel
  console.log(`1. Parsing Excel Workbook: ${EXCEL_FILE_PATH}...`)
  const parsed = parseExcelWorkbook(EXCEL_FILE_PATH)
  console.log(`   ✓ Found ${parsed.allStudents.length} student rows across 5 sheets (Classes I to XII).`)
  console.log(`   ✓ Checksums:`)
  console.log(`       Sum(F.A.-1)     = ${parsed.checksumFA1}`)
  console.log(`       Sum(F.A.-2)     = ${parsed.checksumFA2}`)
  console.log(`       Sum(Assignment) = ${parsed.checksumAssign}`)
  console.log(`       Sum(Oral)       = ${parsed.checksumOral}`)

  if (parsed.allStudents.length !== 260) {
    throw new Error(`HARD STOP: Expected exactly 260 student rows across Classes I-XII, found ${parsed.allStudents.length}`)
  }

  // Step 2: Initialize Firebase Admin
  console.log('\n2. Initializing Firebase Admin SDK...')
  let app
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const credObj = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    app = initializeApp({ credential: cert(credObj), projectId: 'parma-academy-2002' })
  } else if (fs.existsSync(SERVICE_ACCOUNT_FILE)) {
    const credObj = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'))
    app = initializeApp({ credential: cert(credObj), projectId: 'parma-academy-2002' })
  } else {
    throw new Error(`HARD STOP: Service account credentials not found.`)
  }
  const db = getFirestore(app)
  console.log('   ✓ Firebase Admin SDK initialized successfully.')

  // Step 3: Fetch DB students
  console.log('\n3. Fetching students from Firestore...')
  const studSnap = await db.collection('students').get()
  const dbStudents = []
  studSnap.forEach((d) => {
    dbStudents.push({ id: d.id, ...d.data() })
  })
  console.log(`   ✓ Total students in database: ${dbStudents.length}`)

  // Step 4: Match students
  console.log('\n4. Matching Excel student rows to database students...')
  const matchResult = matchExcelStudentsWithDb(parsed.allStudents, dbStudents)
  console.log(`   ✓ Matched: ${matchResult.matched.length} / ${parsed.allStudents.length} students`)
  if (matchResult.unmatched.length > 0) {
    console.error('❌ Unmatched students:', matchResult.unmatched)
    throw new Error(`HARD STOP: ${matchResult.unmatched.length} students could not be matched.`)
  }

  // Step 5: Check existing marksheet records in DB
  console.log('\n5. Fetching existing marksheetRecords...')
  const existingMarksMap = new Map()
  for (const m of matchResult.matched) {
    const docSnap = await db.collection('marksheetRecords').doc(m.dbStudent.id).get()
    if (docSnap.exists) {
      existingMarksMap.set(m.dbStudent.id, docSnap.data())
    }
  }
  console.log(`   ✓ Existing marksheetRecords found for matched students: ${existingMarksMap.size}`)

  // Step 6: Prepare student directory updates and marksheet records payloads
  console.log('\n6. Preparing database payloads...')
  const studentUpdates = []
  const marksheetDocs = []

  for (const item of matchResult.matched) {
    const { excel, dbStudent } = item
    const existingMarkDoc = existingMarksMap.get(dbStudent.id) || null

    // Determine target class
    let finalClass = dbStudent.class || excel.class
    if (dbStudent.id === 'S188' || dbStudent.id === 'S191') finalClass = 'IX'
    if (dbStudent.id === 'S242') finalClass = 'XII'

    // Student directory update payload
    const studentUpdatePayload = {
      rollNo: excel.sNo,
      rollNumber: excel.sNo,
      updatedAt: new Date(),
    }
    if (dbStudent.deleted) {
      studentUpdatePayload.deleted = false
      studentUpdatePayload.deletedAt = null
      studentUpdatePayload.class = finalClass
    }
    studentUpdates.push({
      id: dbStudent.id,
      payload: studentUpdatePayload,
      name: dbStudent.name,
    })

    // Existing scholastic mapping
    const existingScholasticMap = new Map()
    if (existingMarkDoc && Array.isArray(existingMarkDoc.scholastic)) {
      for (const s of existingMarkDoc.scholastic) {
        existingScholasticMap.set(s.name, s)
      }
    }

    const mergedScholastic = []
    const savedKeys = {}

    for (const [subName, subMarks] of Object.entries(excel.marks)) {
      const existingSub = existingScholasticMap.get(subName) || {}

      const isDrawing = subName.toLowerCase().includes('drawing')
      const assignMax = isDrawing ? 0 : 10
      const oralMax = isDrawing ? 0 : 10

      // FA-1
      let fa1Final = subMarks.fa1 !== null ? subMarks.fa1 : (existingSub.fa1Obt ?? 0)
      if (existingSub.fa1Obt !== undefined && existingSub.fa1Obt !== null && !isOverwrite && subMarks.fa1 !== null) {
        fa1Final = existingSub.fa1Obt
      }

      // FA-2
      let fa2Final = subMarks.fa2 !== null ? subMarks.fa2 : (existingSub.fa2Obt ?? 0)
      if (existingSub.fa2Obt !== undefined && existingSub.fa2Obt !== null && !isOverwrite && subMarks.fa2 !== null) {
        fa2Final = existingSub.fa2Obt
      }

      // Assignment
      let assignFinal = subMarks.assignment !== null ? subMarks.assignment : (existingSub.sa1AssignObt ?? 0)
      if (existingSub.sa1AssignObt !== undefined && existingSub.sa1AssignObt !== null && !isOverwrite && subMarks.assignment !== null) {
        assignFinal = existingSub.sa1AssignObt
      }

      // Oral
      let oralFinal = subMarks.oral !== null ? subMarks.oral : (existingSub.sa1OralObt ?? 0)
      if (existingSub.sa1OralObt !== undefined && existingSub.sa1OralObt !== null && !isOverwrite && subMarks.oral !== null) {
        oralFinal = existingSub.sa1OralObt
      }

      const cleanSub = subName.replace(/[\s.-]/g, '_')
      savedKeys[`saved_FA1_${cleanSub}`] = true
      savedKeys[`saved_FA2_${cleanSub}`] = true

      const scholasticEntry = {
        ...existingSub,
        name: subName,
        fa1Max: 20,
        fa1Obt: fa1Final,
        fa2Max: 20,
        fa2Obt: fa2Final,
        sa1AssignMax: assignMax,
        sa1AssignObt: assignFinal,
        sa1OralMax: oralMax,
        sa1OralObt: oralFinal,
        sa1Max: existingSub.sa1Max || 80,
        sa1Obt: existingSub.sa1Obt !== undefined ? existingSub.sa1Obt : null,
      }

      if (subMarks.prcGame !== null) {
        scholasticEntry.sa1PrcGameMax = 40
        scholasticEntry.sa1PrcGameObt = subMarks.prcGame
      }

      if (subMarks.internalTotal !== null) {
        scholasticEntry.sheetInternalTotal = subMarks.internalTotal
      }

      mergedScholastic.push(scholasticEntry)
    }

    const fatherName = dbStudent.parentName || dbStudent.fatherName || existingMarkDoc?.fatherName || ''

    const marksheetPayload = {
      ...(existingMarkDoc || {}),
      id: String(dbStudent.id),
      studentId: String(dbStudent.studentId || dbStudent.id),
      name: dbStudent.name,
      rollNo: excel.sNo,
      srNo: excel.sNo,
      class: finalClass,
      session: ACADEMIC_SESSION,
      fatherName,
      scholastic: mergedScholastic,
      saved_exam_FA1: true,
      saved_exam_FA2: true,
      source: IMPORT_SOURCE_TAG,
      importedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...savedKeys,
    }

    marksheetDocs.push({
      id: String(dbStudent.id),
      payload: marksheetPayload,
      studentName: dbStudent.name,
      sNo: excel.sNo,
      class: finalClass,
    })
  }

  // Spot check 3 sample students
  console.log('\n======================================================================')
  console.log('SPOT CHECK: 3 SAMPLE STUDENTS')
  console.log('======================================================================')
  const samples = [
    marksheetDocs.find((m) => m.class === 'I' && m.sNo === 1),
    marksheetDocs.find((m) => m.class === 'IX' && m.sNo === 1),
    marksheetDocs.find((m) => m.class === 'XI' && m.sNo === 1),
  ].filter(Boolean)

  for (const s of samples) {
    console.log(`\nStudent: "${s.studentName}" (Class ${s.class}, Roll No: ${s.sNo}, DB ID: ${s.id}):`)
    console.log('  Subject              | FA-1 | FA-2 | Assign | Oral | Internal Tot')
    console.log('  -----------------------------------------------------------------')
    for (const sub of s.payload.scholastic.slice(0, 6)) {
      console.log(
        `  ${sub.name.padEnd(20)} | ${String(sub.fa1Obt).padStart(4)} | ${String(sub.fa2Obt).padStart(4)} | ${String(sub.sa1AssignObt).padStart(6)} | ${String(sub.sa1OralObt).padStart(4)} | ${String(sub.sheetInternalTotal ?? '—').padStart(12)}`
      )
    }
  }

  // Audit report writing
  const auditReport = {
    executedAt: new Date().toISOString(),
    mode: isApply ? 'APPLY' : 'DRY_RUN',
    excelFile: EXCEL_FILE_PATH,
    totalExcelRows: parsed.allStudents.length,
    matchedCount: matchResult.matched.length,
    checksums: {
      fa1: parsed.checksumFA1,
      fa2: parsed.checksumFA2,
      assignment: parsed.checksumAssign,
      oral: parsed.checksumOral,
    },
    students: marksheetDocs.map((m) => ({
      id: m.id,
      name: m.studentName,
      class: m.class,
      rollNo: m.sNo,
      subjectsCount: m.payload.scholastic.length,
    })),
  }
  fs.writeFileSync(REPORT_OUTPUT_FILE, JSON.stringify(auditReport, null, 2))
  console.log(`\n✓ Audit report written to ${REPORT_OUTPUT_FILE}`)

  // Apply writes to Firestore if --apply is set
  if (isApply) {
    console.log('\n======================================================================')
    console.log('🔥 APPLYING WRITES TO FIRESTORE...')
    console.log('======================================================================')

    // Firestore batch writes (batches of 400 operations)
    let batch = db.batch()
    let opCount = 0
    let totalBatches = 0

    // 1. Update students collection
    for (const su of studentUpdates) {
      const ref = db.collection('students').doc(su.id)
      batch.set(ref, su.payload, { merge: true })
      opCount++
      if (opCount >= 400) {
        await batch.commit()
        totalBatches++
        console.log(`   ✓ Committed student batch ${totalBatches}`)
        batch = db.batch()
        opCount = 0
      }
    }

    // 2. Update marksheetRecords collection
    for (const md of marksheetDocs) {
      const ref = db.collection('marksheetRecords').doc(md.id)
      batch.set(ref, md.payload, { merge: true })
      opCount++
      if (opCount >= 400) {
        await batch.commit()
        totalBatches++
        console.log(`   ✓ Committed marksheet batch ${totalBatches}`)
        batch = db.batch()
        opCount = 0
      }
    }

    if (opCount > 0) {
      await batch.commit()
      totalBatches++
      console.log(`   ✓ Committed final batch ${totalBatches}`)
    }

    console.log(`\n🎉 SUCCESS! Successfully imported marks and roll numbers for ${marksheetDocs.length} students into Firestore!`)
  } else {
    console.log('\n🛡️ DRY RUN COMPLETED! No writes made to Firestore.')
    console.log('Run with --apply to execute actual writes to the database.')
  }
}

run().catch((e) => {
  console.error('\n❌ IMPORT FAILED:', e)
  process.exit(1)
})
