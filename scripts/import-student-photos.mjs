import fs from 'fs'
import path from 'path'
import xlsx from 'xlsx'
import sharp from 'sharp'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import {
  computePhotoHash,
  isPhotoUnchanged,
  normalizeNameForMatch,
  parsePhotoFilename,
  verifyStudentMatch,
} from '../src/utils/studentPhotoUtils.js'

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================
const EXCEL_FILE_PATH = path.resolve('data-import/ID card photo/All student ID card list.xlsx')
const PHOTOS_DIR_PATH = path.resolve('data-import/ID card photo')
const SERVICE_ACCOUNT_FILE = 'serviceAccountKey.json'
const PHOTO_OVERRIDES_FILE = 'photo-overrides.json'
const REPORT_OUTPUT_FILE = 'photo-import-report.json'
const REVIEW_CSV_OUTPUT_FILE = 'photo-needs-review.csv'

// Expected students with NO photo (S. No.)
const EXPECTED_STUDENTS_WITHOUT_PHOTO = [
  22, 29, 80, 128, 149, 174, 190, 203, 205, 207, 218, 225, 231, 241, 264, 288, 298, 318, 333, 334, 335,
]

// ============================================================================
// MAIN SCRIPT
// ============================================================================
async function main() {
  const args = process.argv.slice(2)
  const isApply = args.includes('--apply')

  console.log('======================================================================')
  console.log('PARMA ACADEMY — STUDENT PHOTO IMPORT & REPORT CARD INTEGRATION')
  console.log(`Execution Mode: ${isApply ? '🔥 REAL WRITE (--apply active)' : '🛡️ DRY RUN (Simulation only, writes nothing)'}`)
  console.log('======================================================================\n')

  // Step 1: Validate files exist
  if (!fs.existsSync(EXCEL_FILE_PATH)) {
    throw new Error(`HARD STOP: Excel file not found at ${EXCEL_FILE_PATH}`)
  }
  if (!fs.existsSync(PHOTOS_DIR_PATH)) {
    throw new Error(`HARD STOP: Photos directory not found at ${PHOTOS_DIR_PATH}`)
  }

  // Step 2: Read Excel and validate
  console.log('1. Reading and validating All student ID card list.xlsx...')
  const wb = xlsx.readFile(EXCEL_FILE_PATH)
  const sheet = wb.Sheets['Sheet1']
  if (!sheet) {
    throw new Error('HARD STOP: Sheet1 not found in Excel file.')
  }
  const excelData = xlsx.utils.sheet_to_json(sheet, { header: 1 })
  const excelRows = []
  const seenSNos = new Set()

  for (let r = 1; r < excelData.length; r++) {
    const row = excelData[r]
    if (!row || row[0] === undefined || row[0] === null || String(row[0]).trim() === '') continue

    const sNoNum = Number(row[0])
    if (isNaN(sNoNum)) {
      throw new Error(`HARD STOP: Invalid non-numeric S. No. "${row[0]}" at Excel row ${r + 1}`)
    }

    // Hard Stop: Check duplicate S. No. in Excel
    if (seenSNos.has(sNoNum)) {
      throw new Error(`HARD STOP: Duplicate S. No. ${sNoNum} found in Excel at row ${r + 1}`)
    }
    seenSNos.add(sNoNum)

    excelRows.push({
      excelRowNumber: r + 1,
      sNo: sNoNum,
      name: String(row[1] || '').trim(),
      class: String(row[2] || '').trim(),
    })
  }

  console.log(`   ✓ Found ${excelRows.length} valid student rows in Excel.`)

  // Step 3: Scan and parse photo files
  console.log('\n2. Scanning and parsing photo files in directory...')
  const dirFiles = fs.readdirSync(PHOTOS_DIR_PATH)
  const photoFiles = []
  const photoBySNo = new Map()

  for (const filename of dirFiles) {
    const parsed = parsePhotoFilename(filename)
    if (!parsed.isValid) continue

    if (photoBySNo.has(parsed.sNo)) {
      throw new Error(`HARD STOP: Multiple photo files found for S. No. ${parsed.sNo}: "${filename}" and "${photoBySNo.get(parsed.sNo).filename}"`)
    }

    const fullPath = path.join(PHOTOS_DIR_PATH, filename)
    photoFiles.push({
      filename,
      fullPath,
      sNo: parsed.sNo,
    })
    photoBySNo.set(parsed.sNo, { filename, fullPath })
  }

  console.log(`   ✓ Found ${photoFiles.length} valid JPEG photo files.`)

  // Hard stop: photo number with no Excel row
  for (const p of photoFiles) {
    if (!seenSNos.has(p.sNo)) {
      throw new Error(`HARD STOP: Photo file "${p.filename}" (S. No. ${p.sNo}) has no corresponding row in Excel!`)
    }
  }

  // Find students without photo
  const studentsWithoutPhoto = excelRows.filter((r) => !photoBySNo.has(r.sNo))
  console.log(`   ✓ Students without photo: ${studentsWithoutPhoto.length}`)
  const noPhotoSNos = studentsWithoutPhoto.map((s) => s.sNo).sort((a, b) => a - b)
  const matchesExpectedNoPhoto = JSON.stringify(noPhotoSNos) === JSON.stringify(EXPECTED_STUDENTS_WITHOUT_PHOTO.slice().sort((a, b) => a - b))
  if (matchesExpectedNoPhoto) {
    console.log('   ✓ Matches exactly the 21 expected students without photos.')
  } else {
    console.warn('   ⚠️ Note: Students without photos differ from expected list:', noPhotoSNos)
  }

  // Step 4: Initialize Firebase Admin SDK
  console.log('\n3. Initializing Firebase Admin SDK...')
  let app
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const credObj = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    app = initializeApp({ credential: cert(credObj), projectId: 'parma-academy-2002' })
  } else if (fs.existsSync(SERVICE_ACCOUNT_FILE)) {
    const credObj = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'))
    app = initializeApp({ credential: cert(credObj), projectId: 'parma-academy-2002' })
  } else {
    throw new Error('HARD STOP: Firebase service account credentials not found.')
  }
  const db = getFirestore(app)
  console.log('   ✓ Firebase Admin SDK initialized successfully.')

  // Step 5: Fetch students from Firestore
  console.log('\n4. Fetching students from Firestore...')
  const studSnap = await db.collection('students').get()
  const dbStudentsById = new Map()
  const allDbStudents = []

  studSnap.forEach((d) => {
    const data = d.data()
    const obj = { id: d.id, ...data }
    allDbStudents.push(obj)
    dbStudentsById.set(String(d.id).trim(), obj)
    if (data.studentId) {
      dbStudentsById.set(String(data.studentId).trim(), obj)
    }
  })
  console.log(`   ✓ Total students in database: ${allDbStudents.length}`)

  // Load photo overrides if present
  let photoOverrides = {}
  if (fs.existsSync(PHOTO_OVERRIDES_FILE)) {
    try {
      photoOverrides = JSON.parse(fs.readFileSync(PHOTO_OVERRIDES_FILE, 'utf8'))
      console.log(`   ✓ Loaded ${Object.keys(photoOverrides).length} photo overrides from ${PHOTO_OVERRIDES_FILE}`)
    } catch (e) {
      console.warn(`   ⚠️ Could not parse ${PHOTO_OVERRIDES_FILE}: ${e.message}`)
    }
  }

  // Step 6: Verify match for every photo
  console.log('\n5. Matching photos to students and verifying names...')
  const approvedMatches = []
  const reviewItems = []

  for (const p of photoFiles) {
    const excelRow = excelRows.find((r) => r.sNo === p.sNo)
    const dbStud = dbStudentsById.get(String(p.sNo))

    const verification = verifyStudentMatch({
      sNo: p.sNo,
      excelName: excelRow.name,
      excelClass: excelRow.class,
      dbStudent: dbStud,
      photoOverrides,
    })

    if (verification.isApproved) {
      approvedMatches.push({
        ...p,
        excel: excelRow,
        dbStudent: dbStud || dbStudentsById.get(verification.targetStudentId),
        verification,
      })
    } else {
      reviewItems.push({
        ...p,
        excel: excelRow,
        dbStudent: dbStud,
        verification,
      })
    }
  }

  console.log(`   ✓ Photos approved for auto-apply: ${approvedMatches.length}`)
  console.log(`   ⚠️ Photos requiring review: ${reviewItems.length}`)

  // Step 7: Sample checks required by prompt
  console.log('\n======================================================================')
  console.log('REQUIRED SAMPLE CHECKS (Dry-Run Output)')
  console.log('======================================================================')

  const s1 = photoFiles.find((p) => p.sNo === 1)
  const s3 = photoFiles.find((p) => p.sNo === 3)
  const s22 = excelRows.find((r) => r.sNo === 22)

  if (s1) {
    const ex1 = excelRows.find((r) => r.sNo === 1)
    const db1 = dbStudentsById.get('1')
    console.log(`✓ 1.jpg.jpg -> S. No. 1, "${ex1?.name}" (${ex1?.class}), DB: "${db1?.name}" (ID: ${db1?.id})`)
  }
  if (s3) {
    const ex3 = excelRows.find((r) => r.sNo === 3)
    const db3 = dbStudentsById.get('3')
    console.log(`✓ 3.jpg.jpg -> S. No. 3, "${ex3?.name}" (${ex3?.class}), DB: "${db3?.name}" (ID: ${db3?.id})`)
  }
  if (s22) {
    const hasPhoto22 = photoBySNo.has(22)
    console.log(`✓ S. No. 22 -> "${s22.name}" (${s22.class}) has NO photo: ${!hasPhoto22}`)
  }
  console.log(`✓ Totals: ${photoFiles.length} photos found, ${approvedMatches.length} approved, ${reviewItems.length} in review, ${studentsWithoutPhoto.length} without photo.`)

  // Step 8: Generate Review CSV and Import Report JSON
  console.log('\n======================================================================')
  console.log('GENERATING AUDIT REPORTS')
  console.log('======================================================================')

  const csvHeader = 'S_No,Photo_Filename,Excel_Name,Excel_Class,DB_ID,DB_Name,Status,Note\n'
  const csvRows = reviewItems.map((r) => {
    return [
      r.sNo,
      `"${r.filename}"`,
      `"${r.excel?.name || ''}"`,
      `"${r.excel?.class || ''}"`,
      r.dbStudent?.id ? `"${r.dbStudent.id}"` : '',
      r.dbStudent?.name ? `"${r.dbStudent.name}"` : '',
      r.verification.status,
      `"${r.verification.note.replace(/"/g, '""')}"`,
    ].join(',')
  })
  fs.writeFileSync(REVIEW_CSV_OUTPUT_FILE, csvHeader + csvRows.join('\n') + '\n')
  console.log(`   ✓ Wrote review items to ${REVIEW_CSV_OUTPUT_FILE}`)

  const auditReport = {
    executedAt: new Date().toISOString(),
    mode: isApply ? 'APPLY' : 'DRY_RUN',
    storageMode: 'FIRESTORE_FALLBACK_COLLECTION (studentPhotos)',
    totalPhotosFound: photoFiles.length,
    approvedMatchesCount: approvedMatches.length,
    reviewItemsCount: reviewItems.length,
    studentsWithoutPhotoCount: studentsWithoutPhoto.length,
    studentsWithoutPhoto: studentsWithoutPhoto.map((s) => ({ sNo: s.sNo, name: s.name, class: s.class })),
    reviewItems: reviewItems.map((r) => ({
      sNo: r.sNo,
      filename: r.filename,
      excelName: r.excel?.name,
      dbStudentId: r.dbStudent?.id,
      dbStudentName: r.dbStudent?.name,
      status: r.verification.status,
      note: r.verification.note,
    })),
  }
  fs.writeFileSync(REPORT_OUTPUT_FILE, JSON.stringify(auditReport, null, 2))
  console.log(`   ✓ Wrote audit report to ${REPORT_OUTPUT_FILE}`)

  // Step 9: If --apply, process images and write to Firestore
  if (!isApply) {
    console.log('\n======================================================================')
    console.log('🛡️ DRY RUN COMPLETED! No writes made to Firestore.')
    console.log(`Planned uploads on --apply: ${approvedMatches.length} photos.`)
    console.log('Run with --apply to execute actual writes to the database.')
    console.log('======================================================================')
    return
  }

  console.log('\n======================================================================')
  console.log('🔥 EXECUTING REAL WRITES (--apply active)...')
  console.log('======================================================================')

  let processedCount = 0
  let skippedUnchangedCount = 0
  let failedCount = 0

  // Firestore batch handling
  let batch = db.batch()
  let opCount = 0
  let totalBatches = 0

  for (const item of approvedMatches) {
    try {
      const targetId = String(item.dbStudent.id).trim()

      // Process image with sharp:
      // Auto-orient, 3:4 crop keeping top of head, resize to 360x480 (target <= 60 KB)
      const processedBuf = await sharp(item.fullPath)
        .rotate()
        .resize(360, 480, {
          fit: 'cover',
          position: 'top',
        })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer()

      const photoHash = computePhotoHash(processedBuf)
      const dataUrl = `data:image/jpeg;base64,${processedBuf.toString('base64')}`

      // Idempotency check: skip if hash unchanged
      if (isPhotoUnchanged(item.dbStudent.photoHash, photoHash)) {
        skippedUnchangedCount++
        continue
      }

      const photoPath = `studentPhotos/${targetId}`
      const nowIso = new Date().toISOString()

      // 1. Write to studentPhotos collection (fallback private collection)
      const photoRef = db.collection('studentPhotos').doc(targetId)
      batch.set(
        photoRef,
        {
          studentId: targetId,
          dataUrl,
          photoHash,
          updatedAt: nowIso,
          width: 360,
          height: 480,
          sizeBytes: processedBuf.length,
        },
        { merge: true }
      )
      opCount++

      // 2. Add additive fields to students collection
      const studentRef = db.collection('students').doc(targetId)
      batch.set(
        studentRef,
        {
          photoPath,
          photoUpdatedAt: nowIso,
          photoHash,
          hasPhoto: true,
        },
        { merge: true }
      )
      opCount++

      // 3. Attach photoUrl to marksheetRecords doc for instant report card rendering
      const marksheetRef = db.collection('marksheetRecords').doc(targetId)
      batch.set(
        marksheetRef,
        {
          photoUrl: dataUrl,
          photoPath,
          photoHash,
        },
        { merge: true }
      )
      opCount++

      processedCount++

      if (opCount >= 300) {
        await batch.commit()
        totalBatches++
        console.log(`   ✓ Committed batch ${totalBatches} (${processedCount} photos processed so far)...`)
        batch = db.batch()
        opCount = 0
      }
    } catch (err) {
      failedCount++
      console.error(`   ❌ Failed to process photo for S. No. ${item.sNo} (${item.filename}):`, err.message)
    }
  }

  if (opCount > 0) {
    await batch.commit()
    totalBatches++
    console.log(`   ✓ Committed final batch ${totalBatches}`)
  }

  console.log('\n======================================================================')
  console.log('🎉 PHOTO IMPORT EXECUTION SUMMARY:')
  console.log(`   ✓ Processed & uploaded: ${processedCount}`)
  console.log(`   ✓ Skipped (unchanged):  ${skippedUnchangedCount}`)
  console.log(`   ✓ Failed:               ${failedCount}`)
  console.log('======================================================================\n')
}

main().catch((err) => {
  console.error('\n❌ IMPORT FAILED:', err)
  process.exit(1)
})
