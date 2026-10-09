import fs from 'fs'
import path from 'path'
import xlsx from 'xlsx'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// ============================================================================
// CONFIGURATION & GROUND RULES CONSTANTS
// ============================================================================
const EXCEL_FILE_PATH = path.resolve('public/NUR to UKG I.A. 1 2026-27.xlsx')
const TARGET_CLASS = 'NURSERY'
const EXPECTED_NURSERY_ROW_COUNT = 26
const ACADEMIC_SESSION = '2026-27'
const IMPORT_SOURCE_TAG = 'excel-import-IA1-2026-27'
const SERVICE_ACCOUNT_FILE = 'serviceAccountKey.json'
const NAME_OVERRIDES_FILE = 'name-overrides.json'
const REPORT_OUTPUT_FILE = 'nursery-import-report.json'
const REVIEW_CSV_OUTPUT_FILE = 'nursery-needs-review.csv'

// The 10 official Nursery subjects in order
const EXPECTED_SUBJECTS = [
  'English Written',
  'English Oral',
  'English Dictation',
  'Hindi Written',
  'Hindi Oral',
  'Hindi Dictation',
  'Maths Written',
  'Maths Oral',
  'E.V.S.',
  'Drawing',
]

// ============================================================================
// NAME NORMALIZATION & SIMILARITY
// ============================================================================
export function normalizeName(name) {
  if (!name) return ''
  return String(name)
    .trim()
    .toUpperCase()
    .replace(/[^\w\s]/g, '') // strip punctuation
    .replace(/\s+/g, ' ') // collapse repeated spaces
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export function computeNameSimilarity(s1, s2) {
  const n1 = normalizeName(s1)
  const n2 = normalizeName(s2)
  if (n1 === n2) return 1.0
  const maxLen = Math.max(n1.length, n2.length)
  if (maxLen === 0) return 1.0
  const dist = levenshtein(n1, n2)
  return Number((1 - dist / maxLen).toFixed(4))
}

// ============================================================================
// EXCEL PARSER WITH HARD STOPS
// ============================================================================
export function parseNurseryExcelData(filePath = EXCEL_FILE_PATH) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`HARD STOP: Excel file not found at ${filePath}`)
  }

  const wb = xlsx.readFile(filePath)
  const sheetName = 'NUR LKG UKG I.A. 1'
  if (!wb.SheetNames.includes(sheetName)) {
    throw new Error(
      `HARD STOP: Expected sheet "${sheetName}" not found. Available sheets: ${wb.SheetNames.join(', ')}`
    )
  }

  const sheet = wb.Sheets[sheetName]
  const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1:AX93')

  // 1. Locate Subject blocks and Component columns from header rows (Row 2 & Row 3)
  // Row 2 is index 1, Row 3 is index 2
  const subjectMap = new Map() // subjectName -> { fa1Col, fa2Col, intTotCol, dictCol, oralCol }
  let currentSubject = null

  for (let C = range.s.c; C <= range.e.c; C++) {
    const colLetter = xlsx.utils.encode_col(C)
    const headerRow2Cell = sheet[colLetter + '2']
    const headerRow3Cell = sheet[colLetter + '3']

    const r2Val = headerRow2Cell ? String(headerRow2Cell.v).trim() : ''
    const r3Val = headerRow3Cell ? String(headerRow3Cell.v).trim() : ''

    // Match known subject name from Row 2
    for (const expectedSub of EXPECTED_SUBJECTS) {
      const cleanSub = expectedSub.replace(/[^\w]/g, '').toLowerCase()
      const cleanR2 = r2Val.replace(/[^\w]/g, '').toLowerCase()
      if (cleanR2 && (cleanR2 === cleanSub || cleanSub.includes(cleanR2))) {
        currentSubject = expectedSub
        if (!subjectMap.has(currentSubject)) {
          subjectMap.set(currentSubject, {})
        }
        break
      }
    }

    if (currentSubject && subjectMap.has(currentSubject)) {
      const entry = subjectMap.get(currentSubject)
      const cleanR3 = r3Val.toUpperCase()

      if (cleanR3.includes('F.A.-1') || cleanR3.includes('FA-1') || cleanR3.includes('FA 1') || cleanR3.includes('F.A. 1')) {
        entry.fa1Col = colLetter
      } else if (cleanR3.includes('F.A.-2') || cleanR3.includes('FA-2') || cleanR3.includes('FA 2') || cleanR3.includes('F.A. 2')) {
        entry.fa2Col = colLetter
      } else if (cleanR3.includes('DICTATION')) {
        entry.dictCol = colLetter
      } else if (cleanR3.includes('ORAL')) {
        entry.oralCol = colLetter
      } else if (cleanR3.includes('INTERNAL') && cleanR3.includes('TOTAL')) {
        entry.intTotCol = colLetter
      }
    }
  }

  // Verify all 10 subjects located with FA-1 and FA-2 columns
  for (const expectedSub of EXPECTED_SUBJECTS) {
    const entry = subjectMap.get(expectedSub)
    if (!entry || !entry.fa1Col || !entry.fa2Col) {
      throw new Error(
        `HARD STOP: Could not locate FA-1 and FA-2 columns for subject "${expectedSub}". Located map: ${JSON.stringify(
          Array.from(subjectMap.entries())
        )}`
      )
    }
  }

  // 2. Extract and Validate Nursery rows
  const nurseryRows = []
  let totalFA1Checksum = 0
  let totalFA2Checksum = 0

  for (let R = 3; R <= range.e.r; R++) {
    const rowNum = R + 1
    const classCell = sheet['B' + rowNum]
    if (!classCell) continue

    const cls = String(classCell.v).trim().toUpperCase()
    if (cls !== TARGET_CLASS) continue

    const sNo = sheet['A' + rowNum]?.v ?? null
    const studentIdInSheet = sheet['C' + rowNum]?.v ?? null
    const rawName = sheet['D' + rowNum]?.v ? String(sheet['D' + rowNum].v).trim() : ''

    if (!rawName) {
      throw new Error(`HARD STOP: Nursery row at Excel row ${rowNum} has empty student name.`)
    }

    const marks = {}
    for (const subName of EXPECTED_SUBJECTS) {
      const cols = subjectMap.get(subName)
      const fa1Raw = sheet[cols.fa1Col + rowNum]?.v
      const fa2Raw = sheet[cols.fa2Col + rowNum]?.v
      const sheetIntTotRaw = cols.intTotCol ? sheet[cols.intTotCol + rowNum]?.v : null

      // Validate FA-1
      if (fa1Raw === undefined || fa1Raw === null || fa1Raw === '') {
        throw new Error(
          `HARD STOP: Row ${rowNum} (${rawName}) ${subName} FA-1 is blank or missing.`
        )
      }
      if (typeof fa1Raw !== 'number' || !Number.isInteger(fa1Raw) || fa1Raw < 0 || fa1Raw > 20) {
        throw new Error(
          `HARD STOP: Row ${rowNum} (${rawName}) ${subName} FA-1 value (${fa1Raw}) is not an integer from 0 to 20.`
        )
      }

      // Validate FA-2
      if (fa2Raw === undefined || fa2Raw === null || fa2Raw === '') {
        throw new Error(
          `HARD STOP: Row ${rowNum} (${rawName}) ${subName} FA-2 is blank or missing.`
        )
      }
      if (typeof fa2Raw !== 'number' || !Number.isInteger(fa2Raw) || fa2Raw < 0 || fa2Raw > 20) {
        throw new Error(
          `HARD STOP: Row ${rowNum} (${rawName}) ${subName} FA-2 value (${fa2Raw}) is not an integer from 0 to 20.`
        )
      }

      // Warning check: confirm Dictation and Oral component columns are empty for Nursery
      if (cols.dictCol && sheet[cols.dictCol + rowNum]?.v !== undefined && sheet[cols.dictCol + rowNum]?.v !== '') {
        throw new Error(
          `HARD STOP: Row ${rowNum} (${rawName}) has non-empty Dictation component cell (${sheet[cols.dictCol + rowNum].v}) for ${subName}.`
        )
      }
      if (cols.oralCol && sheet[cols.oralCol + rowNum]?.v !== undefined && sheet[cols.oralCol + rowNum]?.v !== '') {
        throw new Error(
          `HARD STOP: Row ${rowNum} (${rawName}) has non-empty Oral component cell (${sheet[cols.oralCol + rowNum].v}) for ${subName}.`
        )
      }

      const computedInternal = fa1Raw + fa2Raw
      marks[subName] = {
        fa1: fa1Raw,
        fa2: fa2Raw,
        computedInternal,
        sheetInternalTotal: sheetIntTotRaw,
      }

      totalFA1Checksum += fa1Raw
      totalFA2Checksum += fa2Raw
    }

    nurseryRows.push({
      excelRowNumber: rowNum,
      sNo,
      studentIdInSheet,
      name: rawName,
      normName: normalizeName(rawName),
      marks,
    })
  }

  // Hard stop on Nursery row count
  if (nurseryRows.length !== EXPECTED_NURSERY_ROW_COUNT) {
    throw new Error(
      `HARD STOP: Expected exactly ${EXPECTED_NURSERY_ROW_COUNT} Nursery rows in Excel, but found ${nurseryRows.length}.`
    )
  }

  const computedIAChecksum = totalFA1Checksum + totalFA2Checksum

  return {
    nurseryRows,
    subjectMap,
    totalFA1Checksum,
    totalFA2Checksum,
    computedIAChecksum,
  }
}

// ============================================================================
// STUDENT MATCHER & RECONCILER
// ============================================================================
export function reconcileStudents({
  excelRows,
  dbStudents,
  nameOverrides = {},
}) {
  const exactMatches = []
  const overrideMatches = []
  const reviewItems = []
  const unmatchedExcel = []
  const matchedDbIds = new Set()

  // Build DB lookup maps
  const activeNurseryDb = dbStudents.filter((s) => {
    if (s.deleted) return false
    const c = String(s.class || '').trim().toUpperCase()
    return c === 'NURSERY' || c === 'NUR' || c === 'NSY'
  })

  const dbByNormName = new Map()
  for (const dbStud of activeNurseryDb) {
    const norm = normalizeName(dbStud.name)
    if (!dbByNormName.has(norm)) {
      dbByNormName.set(norm, [])
    }
    dbByNormName.get(norm).push(dbStud)
  }

  const dbById = new Map()
  for (const dbStud of activeNurseryDb) {
    dbById.set(String(dbStud.id).trim(), dbStud)
    if (dbStud.studentId) {
      dbById.set(String(dbStud.studentId).trim(), dbStud)
    }
  }

  for (const exRow of excelRows) {
    // 1. Check optional manual name override first
    const overrideTargetId = nameOverrides[exRow.name] || nameOverrides[exRow.normName]
    if (overrideTargetId) {
      const targetDb = dbById.get(String(overrideTargetId).trim())
      if (!targetDb) {
        throw new Error(
          `HARD STOP: name-overrides.json specified target student ID "${overrideTargetId}" for "${exRow.name}", but no active Nursery student in DB has that ID.`
        )
      }
      if (matchedDbIds.has(targetDb.id)) {
        throw new Error(
          `HARD STOP: Ambiguous mapping! DB Student ID "${targetDb.id}" (${targetDb.name}) matched multiple Excel rows.`
        )
      }
      overrideMatches.push({ excel: exRow, db: targetDb, reason: 'MANUAL_OVERRIDE' })
      matchedDbIds.add(targetDb.id)
      continue
    }

    // 2. Exact normalized match
    const exactDbList = dbByNormName.get(exRow.normName) || []
    if (exactDbList.length === 1) {
      const candidate = exactDbList[0]
      if (matchedDbIds.has(candidate.id)) {
        throw new Error(
          `HARD STOP: One-to-one violation! DB Student ID "${candidate.id}" matched multiple times.`
        )
      }
      exactMatches.push({ excel: exRow, db: candidate })
      matchedDbIds.add(candidate.id)
      continue
    }

    if (exactDbList.length > 1) {
      // Ambiguous: multiple DB students with the exact same name
      reviewItems.push({
        excelRow: exRow.excelRowNumber,
        sheetName: exRow.name,
        status: 'AMBIGUOUS_MULTIPLE_DB_MATCHES',
        suggestedDbId: '',
        suggestedDbName: '',
        similarity: 1.0,
        note: `Multiple database students share the normalized name "${exRow.normName}". Manual override required.`,
      })
      unmatchedExcel.push(exRow)
      continue
    }

    // 3. Near-match suggestion (NEVER auto-apply)
    let bestCandidate = null
    let bestSimilarity = 0
    for (const dbStud of activeNurseryDb) {
      if (matchedDbIds.has(dbStud.id)) continue
      const sim = computeNameSimilarity(exRow.name, dbStud.name)
      if (sim > bestSimilarity) {
        bestSimilarity = sim
        bestCandidate = dbStud
      }
    }

    if (bestCandidate && bestSimilarity >= 0.7) {
      reviewItems.push({
        excelRow: exRow.excelRowNumber,
        sheetName: exRow.name,
        status: 'NEEDS_REVIEW_NEAR_MATCH',
        suggestedDbId: bestCandidate.id,
        suggestedDbName: bestCandidate.name,
        similarity: bestSimilarity,
        note: `Spelling variant / near match: Sheet "${exRow.name}" vs DB "${bestCandidate.name}" (similarity: ${Math.round(
          bestSimilarity * 100
        )}%). Add to name-overrides.json to apply.`,
      })
    } else {
      reviewItems.push({
        excelRow: exRow.excelRowNumber,
        sheetName: exRow.name,
        status: 'UNMATCHED_IN_DB',
        suggestedDbId: '',
        suggestedDbName: '',
        similarity: 0,
        note: 'No suitable student found in database for Class Nursery.',
      })
    }
    unmatchedExcel.push(exRow)
  }

  // 4. Report DB Nursery students who are not in the Excel sheet
  const unmatchedDb = activeNurseryDb.filter((d) => !matchedDbIds.has(d.id))
  for (const dbStud of unmatchedDb) {
    reviewItems.push({
      excelRow: 'N/A',
      sheetName: 'N/A',
      status: 'IN_DB_NOT_IN_SHEET',
      suggestedDbId: dbStud.id,
      suggestedDbName: dbStud.name,
      similarity: 0,
      note: `Student exists in database Class Nursery (ID: ${dbStud.id}), but does not appear in this Excel sheet.`,
    })
  }

  return {
    exactMatches,
    overrideMatches,
    allMatched: [...exactMatches, ...overrideMatches],
    unmatchedExcel,
    unmatchedDb,
    reviewItems,
  }
}

// ============================================================================
// MAIN RUNNER
// ============================================================================
async function run() {
  const args = process.argv.slice(2)
  const isApply = args.includes('--apply')
  const isOverwrite = args.includes('--overwrite')

  console.log('======================================================================')
  console.log('PARMA ACADEMY — NURSERY TERM-I INTERNAL ASSESSMENT IMPORT')
  console.log(`Execution Mode: ${isApply ? '🔥 REAL WRITE (--apply active)' : '🛡️ DRY RUN (Simulation only, writes nothing)'}`)
  console.log(`Allow Overwrite: ${isOverwrite ? 'YES (--overwrite)' : 'NO (Skip on conflict)'}`)
  console.log('======================================================================\n')

  // Step 1: Parse Excel
  console.log(`1. Reading and validating Excel file: ${EXCEL_FILE_PATH}...`)
  const excelData = parseNurseryExcelData(EXCEL_FILE_PATH)
  console.log(`   ✓ Found ${excelData.nurseryRows.length} Nursery student rows.`)
  console.log(`   ✓ All 10 subjects located with valid FA-1 and FA-2 columns.`)
  console.log(`   ✓ Checksum: Sum(FA-1) = ${excelData.totalFA1Checksum}, Sum(FA-2) = ${excelData.totalFA2Checksum}`)
  console.log(`   ✓ Checksum: Total IA Sum = ${excelData.computedIAChecksum} (FA-1 + FA-2)`)

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
    throw new Error(
      `HARD STOP: Neither process.env.FIREBASE_SERVICE_ACCOUNT_KEY nor ${SERVICE_ACCOUNT_FILE} found.`
    )
  }
  const db = getFirestore(app)
  console.log('   ✓ Firebase Admin SDK initialized successfully.')

  // Step 3: Fetch active DB students
  console.log('\n3. Fetching active students from Firestore...')
  const studSnap = await db.collection('students').get()
  const dbStudents = []
  studSnap.forEach((d) => {
    const data = d.data()
    dbStudents.push({ id: d.id, ...data })
  })
  console.log(`   ✓ Total students in database: ${dbStudents.length}`)

  // Step 4: Load name overrides if present
  let nameOverrides = {}
  if (fs.existsSync(NAME_OVERRIDES_FILE)) {
    try {
      nameOverrides = JSON.parse(fs.readFileSync(NAME_OVERRIDES_FILE, 'utf8'))
      console.log(`   ✓ Loaded ${Object.keys(nameOverrides).length} manual name overrides from ${NAME_OVERRIDES_FILE}`)
    } catch (e) {
      console.warn(`   ⚠️ Could not parse ${NAME_OVERRIDES_FILE}: ${e.message}`)
    }
  }

  // Step 5: Reconcile and Match Students
  console.log('\n4. Reconciling Nursery students between Excel and Firestore...')
  const matchResult = reconcileStudents({
    excelRows: excelData.nurseryRows,
    dbStudents,
    nameOverrides,
  })

  console.log(`   ✓ Exact Normalized Matches: ${matchResult.exactMatches.length}`)
  console.log(`   ✓ Manual Override Matches: ${matchResult.overrideMatches.length}`)
  console.log(`   ✓ Total Ready to Import: ${matchResult.allMatched.length} of ${excelData.nurseryRows.length}`)
  console.log(`   ⚠️ Items Requiring Review: ${matchResult.reviewItems.length}`)
  console.log(`   ⚠️ Unmatched Excel Rows: ${matchResult.unmatchedExcel.length}`)
  console.log(`   ⚠️ Unmatched DB Nursery Students: ${matchResult.unmatchedDb.length}`)

  // Step 6: Fetch existing marksheet records for matched students
  console.log('\n5. Checking existing marksheet records in Firestore...')
  const marksCol = db.collection('marksheetRecords')
  const matchedDbIds = matchResult.allMatched.map((m) => m.db.id)
  const existingRecordsMap = new Map()

  for (const id of matchedDbIds) {
    const docSnap = await marksCol.doc(id).get()
    if (docSnap.exists) {
      existingRecordsMap.set(id, docSnap.data())
    }
  }
  console.log(`   ✓ Existing marksheet records found in DB for matched students: ${existingRecordsMap.size}`)

  // Step 7: Build document payloads, check conflicts and verify values
  const docsToWrite = []
  const conflicts = []
  let totalMarkValuesCount = 0
  let totalIASumToWrite = 0

  for (const match of matchResult.allMatched) {
    const { excel, db: dbStud } = match
    const existingDoc = existingRecordsMap.get(dbStud.id) || null

    const existingScholasticMap = new Map()
    if (existingDoc && Array.isArray(existingDoc.scholastic)) {
      for (const sub of existingDoc.scholastic) {
        existingScholasticMap.set(sub.name, sub)
      }
    }

    const mergedScholastic = []
    const savedKeys = {}

    for (const subName of EXPECTED_SUBJECTS) {
      const incoming = excel.marks[subName]
      const existingSub = existingScholasticMap.get(subName) || {}

      // Conflict check
      let fa1Final = incoming.fa1
      let fa2Final = incoming.fa2

      if (existingSub.fa1Obt !== undefined && existingSub.fa1Obt !== null && existingSub.fa1Obt !== '') {
        if (Number(existingSub.fa1Obt) !== incoming.fa1) {
          conflicts.push({
            studentId: dbStud.id,
            studentName: dbStud.name,
            subject: subName,
            component: 'FA-1',
            existingValue: existingSub.fa1Obt,
            incomingValue: incoming.fa1,
          })
          if (!isOverwrite) {
            fa1Final = Number(existingSub.fa1Obt)
          }
        }
      }

      if (existingSub.fa2Obt !== undefined && existingSub.fa2Obt !== null && existingSub.fa2Obt !== '') {
        if (Number(existingSub.fa2Obt) !== incoming.fa2) {
          conflicts.push({
            studentId: dbStud.id,
            studentName: dbStud.name,
            subject: subName,
            component: 'FA-2',
            existingValue: existingSub.fa2Obt,
            incomingValue: incoming.fa2,
          })
          if (!isOverwrite) {
            fa2Final = Number(existingSub.fa2Obt)
          }
        }
      }

      mergedScholastic.push({
        ...existingSub,
        name: subName,
        fa1Max: 20,
        fa1Obt: fa1Final,
        fa2Max: 20,
        fa2Obt: fa2Final,
        sa1AssignMax: 0,
        sa1AssignObt: 0,
        sa1OralMax: 0,
        sa1OralObt: 0,
        sa1Max: 60,
        sa1Obt: existingSub.sa1Obt !== undefined ? existingSub.sa1Obt : null, // S.A.-1 stays null/empty
      })

      // Keys to lock teacher mode
      const cleanSub = subName.replace(/[\s.-]/g, '_')
      savedKeys[`saved_FA1_${cleanSub}`] = true
      savedKeys[`saved_FA2_${cleanSub}`] = true

      totalMarkValuesCount += 2 // 1 for FA1, 1 for FA2
      totalIASumToWrite += fa1Final + fa2Final
    }

    const payload = {
      ...(existingDoc || {}),
      id: String(dbStud.id),
      studentId: String(dbStud.studentId || dbStud.id),
      name: dbStud.name,
      class: 'Nursery',
      session: ACADEMIC_SESSION,
      fatherName: dbStud.parentName || dbStud.fatherName || existingDoc?.fatherName || '',
      scholastic: mergedScholastic,
      saved_exam_FA1: true,
      saved_exam_FA2: true,
      source: IMPORT_SOURCE_TAG,
      importedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...savedKeys,
    }

    docsToWrite.push({
      docId: String(dbStud.id),
      payload,
      studentName: dbStud.name,
      excelRow: excel.excelRowNumber,
    })
  }

  // Step 8: Spot check three sample students
  console.log('\n======================================================================')
  console.log('SPOT CHECK: 3 SAMPLE STUDENTS (Sheet Values vs Computed IA Totals)')
  console.log('======================================================================')

  const sampleNamesToSpotCheck = ['Kabir Yadav', 'Vinayak Yadav', 'Shivanshi Nishad']
  for (const sampleName of sampleNamesToSpotCheck) {
    const found = matchResult.allMatched.find(
      (m) => normalizeName(m.excel.name) === normalizeName(sampleName)
    )
    if (found) {
      console.log(`\nStudent: "${found.excel.name}" (Matched DB ID: ${found.db.id}):`)
      console.log('  ------------------------------------------------------------------')
      console.log('  Subject Name         | FA-1 | FA-2 | Computed IA (FA1+FA2) | Excel Total')
      console.log('  ------------------------------------------------------------------')
      for (const subName of EXPECTED_SUBJECTS) {
        const m = found.excel.marks[subName]
        const padSub = subName.padEnd(20, ' ')
        const padFA1 = String(m.fa1).padStart(4, ' ')
        const padFA2 = String(m.fa2).padStart(4, ' ')
        const padIA = String(m.computedInternal).padStart(21, ' ')
        const padSheet = String(m.sheetInternalTotal).padStart(11, ' ')
        console.log(`  ${padSub} | ${padFA1} | ${padFA2} | ${padIA} | ${padSheet}`)
      }
    }
  }

  // Step 9: Write Review CSV and Import Report JSON
  console.log('\n======================================================================')
  console.log('OUTPUT REPORTS & AUDIT LOGS')
  console.log('======================================================================')

  // Generate Review CSV
  const csvHeader = 'Sheet_Row,Sheet_Name,Status,Suggested_DB_ID,Suggested_DB_Name,Similarity,Note\n'
  const csvRows = matchResult.reviewItems.map((r) => {
    return [
      r.excelRow,
      `"${r.sheetName}"`,
      r.status,
      r.suggestedDbId ? `"${r.suggestedDbId}"` : '',
      r.suggestedDbName ? `"${r.suggestedDbName}"` : '',
      r.similarity,
      `"${r.note.replace(/"/g, '""')}"`,
    ].join(',')
  })
  fs.writeFileSync(REVIEW_CSV_OUTPUT_FILE, csvHeader + csvRows.join('\n') + '\n')
  console.log(`   ✓ Wrote review items to: ${REVIEW_CSV_OUTPUT_FILE}`)

  // Generate Report JSON
  const reportPayload = {
    executedAt: new Date().toISOString(),
    mode: isApply ? 'APPLY' : 'DRY_RUN',
    excelFile: EXCEL_FILE_PATH,
    excelNurseryRowsFound: excelData.nurseryRows.length,
    exactMatchesCount: matchResult.exactMatches.length,
    overrideMatchesCount: matchResult.overrideMatches.length,
    totalMatchedCount: matchResult.allMatched.length,
    unmatchedExcelCount: matchResult.unmatchedExcel.length,
    unmatchedDbCount: matchResult.unmatchedDb.length,
    reviewItemsCount: matchResult.reviewItems.length,
    markValuesToImportCount: totalMarkValuesCount,
    computedIATotalsCount: totalMarkValuesCount / 2,
    conflictsCount: conflicts.length,
    conflicts,
    checksums: {
      sheetTotalFA1: excelData.totalFA1Checksum,
      sheetTotalFA2: excelData.totalFA2Checksum,
      sheetTotalFA1AndFA2Sum: excelData.computedIAChecksum,
      matchedIATotalSumToWrite: totalIASumToWrite,
      checksumValid: excelData.computedIAChecksum === 7814,
    },
    matchedStudents: matchResult.allMatched.map((m) => ({
      excelRow: m.excel.excelRowNumber,
      sheetName: m.excel.name,
      dbId: m.db.id,
      dbName: m.db.name,
    })),
  }
  fs.writeFileSync(REPORT_OUTPUT_FILE, JSON.stringify(reportPayload, null, 2))
  console.log(`   ✓ Wrote detailed import report to: ${REPORT_OUTPUT_FILE}`)

  // Step 10: Apply Writes if requested
  if (isApply) {
    if (conflicts.length > 0 && !isOverwrite) {
      console.warn(
        `\n⚠️ WARNING: Found ${conflicts.length} conflict(s). Overwrite is disabled. Skipping conflicting fields.`
      )
    }

    // Full Backup before write
    const backupFileName = `nursery-backup-${Date.now()}.json`
    console.log(`\n6. Creating full backup of existing documents: ${backupFileName}...`)
    const existingBackup = Array.from(existingRecordsMap.entries()).map(([id, data]) => ({
      id,
      data,
    }))
    fs.writeFileSync(backupFileName, JSON.stringify(existingBackup, null, 2))
    console.log(`   ✓ Backup saved with ${existingBackup.length} existing document(s).`)

    console.log(`\n7. Executing Firestore batched writes for ${docsToWrite.length} students...`)
    const BATCH_SIZE = 450
    let batch = db.batch()
    let batchCount = 0
    let totalWritten = 0

    for (const item of docsToWrite) {
      const docRef = marksCol.doc(item.docId)
      batch.set(docRef, item.payload, { merge: true })
      batchCount++
      totalWritten++

      if (batchCount >= BATCH_SIZE) {
        await batch.commit()
        console.log(`   ✓ Committed batch of ${batchCount} records.`)
        batch = db.batch()
        batchCount = 0
      }
    }

    if (batchCount > 0) {
      await batch.commit()
      console.log(`   ✓ Committed final batch of ${batchCount} records.`)
    }

    console.log(`\n🎉 SUCCESS: Successfully wrote ${totalWritten} student marksheet documents to Firestore!`)
  } else {
    console.log('\n🛡️ DRY RUN COMPLETE: No data was written to Firestore.')
    console.log('To apply changes to database, run with: node scripts/importNurseryTerm1InternalMarks.js --apply')
  }
}

// Execute if called directly from CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error('\n❌ SCRIPT TERMINATED WITH ERROR:', err.message)
    process.exit(1)
  })
}
