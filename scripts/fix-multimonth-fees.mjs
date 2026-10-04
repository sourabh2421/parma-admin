#!/usr/bin/env node

/**
 * scripts/fix-multimonth-fees.mjs
 *
 * One-time data repair script for Parma Academy Fee Management.
 * Detects and repairs multi-month fee records where the full total received
 * was mistakenly stored on each individual month document instead of being allocated.
 *
 * SAFETY RULES:
 * - DRY-RUN BY DEFAULT. Will NOT write to Firestore unless --apply AND --approved <file> are passed.
 * - Takes a full backup JSON before applying any changes.
 * - Idempotent: skips docs already migrated.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import admin from 'firebase-admin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')

// Month order in academic year (April to March)
const ACADEMIC_MONTH_ORDER = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March'
]

function getAcademicMonthIndex(monthName) {
  if (!monthName) return 99
  const idx = ACADEMIC_MONTH_ORDER.findIndex(
    (m) => m.toLowerCase() === String(monthName).trim().toLowerCase()
  )
  return idx === -1 ? 99 : idx
}

function sortMonthsAcademic(records) {
  return [...records].sort((a, b) => {
    const yA = Number(a.year) || 0
    const yB = Number(b.year) || 0
    if (yA !== yB) return yA - yB
    return getAcademicMonthIndex(a.month) - getAcademicMonthIndex(b.month)
  })
}

function sanitizeDocId(str) {
  if (!str) return `PAY-${Date.now()}`
  return String(str).replace(/\//g, '-').replace(/[^a-zA-Z0-9_-]/g, '_')
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    apply: false,
    approvedFile: null,
    since: null,
    serviceAccount: null,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--apply') {
      options.apply = true
    } else if (arg === '--approved') {
      options.approvedFile = args[++i]
    } else if (arg === '--since') {
      options.since = args[++i]
    } else if (arg === '--service-account') {
      options.serviceAccount = args[++i]
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    }
  }

  // Default since to 1st of current month (YYYY-MM-01)
  if (!options.since) {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    options.since = `${y}-${m}-01`
  }

  return options
}

function printHelp() {
  console.log(`
Parma Academy - Multi-Month Fee Repair Script
=============================================
Usage:
  node scripts/fix-multimonth-fees.mjs [options]

Options:
  --help, -h               Show this help message.
  --since <YYYY-MM-DD>     Split CSV/display into recent vs older (default: 1st of current month).
  --service-account <path> Path to Firebase Service Account JSON key.
  --apply                  Apply proposed fixes to Firestore (DRY-RUN by default!).
  --approved <file>        JSON file containing approved group IDs (REQUIRED with --apply).

Examples:
  # 1. Run dry-run and generate migration-report.json & affected-students.csv:
  node scripts/fix-multimonth-fees.mjs

  # 2. Dry-run specifying a service account file:
  node scripts/fix-multimonth-fees.mjs --service-account ./serviceAccountKey.json

  # 3. Apply approved fixes after physical receipt book verification:
  node scripts/fix-multimonth-fees.mjs --apply --approved approved-groups.json
`)
}

// Initialize Firebase Admin
function initFirebase(serviceAccountPath) {
  if (admin.apps.length > 0) {
    return admin.firestore()
  }

  let cred = null

  // 1. Check explicit arg
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    console.log(`Using service account from argument: ${serviceAccountPath}`)
    const raw = fs.readFileSync(serviceAccountPath, 'utf8')
    cred = admin.credential.cert(JSON.parse(raw))
  }

  // 2. Check process.env.SERVICE_ACCOUNT_KEY
  if (!cred && process.env.SERVICE_ACCOUNT_KEY) {
    console.log('Using SERVICE_ACCOUNT_KEY from environment variable')
    try {
      if (fs.existsSync(process.env.SERVICE_ACCOUNT_KEY)) {
        const raw = fs.readFileSync(process.env.SERVICE_ACCOUNT_KEY, 'utf8')
        cred = admin.credential.cert(JSON.parse(raw))
      } else {
        cred = admin.credential.cert(JSON.parse(process.env.SERVICE_ACCOUNT_KEY))
      }
    } catch (e) {
      console.error('Failed to parse SERVICE_ACCOUNT_KEY:', e.message)
    }
  }

  // 3. Check process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!cred && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      console.log(`Using GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`)
      const raw = fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')
      cred = admin.credential.cert(JSON.parse(raw))
    }
  }

  // 4. Check known project root paths
  if (!cred) {
    const candidates = [
      path.join(PROJECT_ROOT, 'serviceAccountKey.json'),
      path.join(PROJECT_ROOT, 'service-account.json'),
      path.join(PROJECT_ROOT, 'firebase-service-account.json'),
    ]
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        console.log(`Found service account file at: ${c}`)
        const raw = fs.readFileSync(c, 'utf8')
        cred = admin.credential.cert(JSON.parse(raw))
        break
      }
    }
  }

  if (!cred) {
    console.error(`
[ERROR] No valid Firebase service account credentials found!

To run this script, please provide a Firebase service account key using ONE of:
  1. Place 'serviceAccountKey.json' in the project root:
     ${path.join(PROJECT_ROOT, 'serviceAccountKey.json')}
  2. Set environment variable SERVICE_ACCOUNT_KEY:
     export SERVICE_ACCOUNT_KEY="/path/to/serviceAccountKey.json"
  3. Pass the flag:
     node scripts/fix-multimonth-fees.mjs --service-account /path/to/key.json

(Ensure serviceAccountKey.json is NEVER committed to git. It is already added to .gitignore.)
`)
    process.exit(1)
  }

  admin.initializeApp({
    credential: cred,
    projectId: 'parma-academy-2002',
  })

  return admin.firestore()
}

// Convert Firestore Timestamp / string / number to Date object
function parseDate(val) {
  if (!val) return null
  if (val.toDate && typeof val.toDate === 'function') {
    return val.toDate()
  }
  if (val instanceof Date) {
    return val
  }
  const d = new Date(val)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDate(date) {
  if (!date) return '—'
  const d = parseDate(date)
  if (!d) return '—'
  return d.toISOString().split('T')[0]
}

// Find suspected multi-month groups
function detectBuggyGroups(allDocs) {
  // Exclude soft-deleted records or records already migrated
  const activeDocs = allDocs.filter((d) => !d.deleted && !d.legacyMigrated && !d.migratedAt)

  // Group by studentId
  const byStudent = new Map()
  for (const doc of activeDocs) {
    const sid = doc.studentId || 'UNKNOWN'
    if (!byStudent.has(sid)) byStudent.set(sid, [])
    byStudent.get(sid).push(doc)
  }

  const detectedGroups = []
  let groupCounter = 1
  let usedFallbackCount = 0

  for (const [studentId, studentDocs] of byStudent.entries()) {
    if (studentDocs.length < 2) continue

    // Attempt 1: Group by identical amountPaid AND creation time within 60s
    // Check if createdAt exists
    const hasCreatedAt = studentDocs.some((d) => Boolean(d.createdAt))

    if (hasCreatedAt) {
      // Sort by createdAt
      const sortedByTime = [...studentDocs].sort((a, b) => {
        const tA = parseDate(a.createdAt)?.getTime() || 0
        const tB = parseDate(b.createdAt)?.getTime() || 0
        return tA - tB
      })

      let currentCluster = [sortedByTime[0]]
      for (let i = 1; i < sortedByTime.length; i++) {
        const prev = currentCluster[currentCluster.length - 1]
        const curr = sortedByTime[i]

        const tPrev = parseDate(prev.createdAt)?.getTime() || 0
        const tCurr = parseDate(curr.createdAt)?.getTime() || 0
        const timeDiffSeconds = Math.abs(tCurr - tPrev) / 1000

        const sameAmount = Number(prev.amount) === Number(curr.amount) && Number(curr.amount) > 0
        const sameReceipt = prev.receiptNos?.[0] && curr.receiptNos?.[0] && prev.receiptNos[0] === curr.receiptNos[0]

        // If created within 75 seconds and same amount (or same receipt number)
        if ((timeDiffSeconds <= 75 && sameAmount) || (sameReceipt && sameAmount)) {
          currentCluster.push(curr)
        } else {
          if (currentCluster.length >= 2) {
            processDetectedCluster(currentCluster, studentId, false)
          }
          currentCluster = [curr]
        }
      }
      if (currentCluster.length >= 2) {
        processDetectedCluster(currentCluster, studentId, false)
      }
    } else {
      // Fallback: Group by identical amount + paymentDate / receiptNo
      usedFallbackCount++
      const byAmountAndRef = new Map()
      for (const d of studentDocs) {
        const amt = Number(d.amount) || 0
        if (amt <= 0) continue
        const ref = d.receiptNos?.[0] || d.chequeNo || formatDate(d.paymentDate) || 'NO_REF'
        const key = `${amt}_${ref}`
        if (!byAmountAndRef.has(key)) byAmountAndRef.set(key, [])
        byAmountAndRef.get(key).push(d)
      }

      for (const cluster of byAmountAndRef.values()) {
        if (cluster.length >= 2) {
          processDetectedCluster(cluster, studentId, true)
        }
      }
    }
  }

  function processDetectedCluster(cluster, studentId, isFallback) {
    // Sort cluster in academic order
    const sorted = sortMonthsAcademic(cluster)
    const N = sorted.length
    const sample = sorted[0]
    const fullTotalReceived = Math.round(Number(sample.amount) || 0)
    const currentTotalStored = fullTotalReceived * N
    const inflationAmount = currentTotalStored - fullTotalReceived

    // Determine proposed per-month amounts:
    // If the doc's own due fields (totalAmount) are unreliable (e.g. totalAmount == fullTotalReceived or totalAmount <= 0)
    // fallback to equal split with remainder on last month.
    let needsManualReview = false
    const flags = []

    if (isFallback) {
      flags.push('missingCreatedAt')
      needsManualReview = true
    }

    const sNameUpper = (sample.studentName || '').toUpperCase()
    if (sNameUpper.includes('ANIKA GUPTA') || sNameUpper.includes('RAVEENA')) {
      flags.push('possibleGenuineRepeat')
      needsManualReview = true
    }

    // Check due reliability
    const duesReliable = sorted.every((d) => {
      const tot = Number(d.totalAmount) || 0
      return tot > 0 && tot !== fullTotalReceived
    })

    let proposedAllocations = []
    if (duesReliable) {
      let remaining = fullTotalReceived
      for (let i = 0; i < sorted.length; i++) {
        const doc = sorted[i]
        const due = Math.round(Number(doc.totalAmount) || 0)
        const allocated = Math.min(due, Math.max(0, remaining))
        remaining -= allocated
        const remainingDue = Math.max(0, due - allocated)
        const status = remainingDue === 0 ? 'paid' : allocated > 0 ? 'partial' : 'pending'

        proposedAllocations.push({
          docId: doc.docId,
          month: doc.month,
          year: doc.year,
          due,
          proposedPaid: allocated,
          proposedRemaining: remainingDue,
          proposedStatus: status,
        })
      }
    } else {
      // Fallback: equal split
      needsManualReview = true
      flags.push('needsManualReview')

      const base = Math.floor(fullTotalReceived / N)
      const remainder = fullTotalReceived - base * N

      for (let i = 0; i < sorted.length; i++) {
        const doc = sorted[i]
        const allocated = i === sorted.length - 1 ? base + remainder : base
        const due = allocated // assume due matches allocated
        proposedAllocations.push({
          docId: doc.docId,
          month: doc.month,
          year: doc.year,
          due,
          proposedPaid: allocated,
          proposedRemaining: 0,
          proposedStatus: 'paid',
        })
      }
    }

    const groupId = `GRP-${studentId}-${sample.year || '2026'}-${String(groupCounter++).padStart(3, '0')}`
    const dateEntered = formatDate(sample.createdAt) !== '—' ? formatDate(sample.createdAt) : formatDate(sample.paymentDate)
    const receiptNo = sample.receiptNos?.[0] || sample.chequeNo || ''

    detectedGroups.push({
      groupId,
      studentId,
      studentName: sample.studentName || '',
      class: sample.class || '',
      receiptNo,
      dateEntered,
      fullDateEntered: parseDate(sample.createdAt) || parseDate(sample.paymentDate) || new Date(),
      monthsCovered: sorted.map((d) => `${d.month} ${d.year}`).join(', '),
      monthCount: N,
      amountCurrentlyStoredPerMonth: fullTotalReceived,
      currentTotalStored,
      proposedAmountPerMonth: Math.round(fullTotalReceived / N),
      actualTotalReceived: fullTotalReceived,
      inflationAmount,
      flags,
      needsManualReview,
      rawDocs: sorted,
      allocations: proposedAllocations,
      mode: sample.mode || 'cash',
      reference: sample.chequeNo || '',
      paymentDate: sample.paymentDate || sample.createdAt || new Date().toISOString(),
    })
  }

  // Sort groups by date entered, newest first
  detectedGroups.sort((a, b) => {
    const tA = new Date(a.fullDateEntered).getTime()
    const tB = new Date(b.fullDateEntered).getTime()
    return tB - tA
  })

  return { detectedGroups, usedFallbackCount }
}

// Generate CSV string
function generateCsv(groups, sinceDateStr) {
  const sinceTime = new Date(`${sinceDateStr}T00:00:00`).getTime()

  const recentGroups = groups.filter((g) => new Date(g.fullDateEntered).getTime() >= sinceTime)
  const olderGroups = groups.filter((g) => new Date(g.fullDateEntered).getTime() < sinceTime)

  const headers = [
    'Group ID',
    'Student Name',
    'Class',
    'Receipt No',
    'Date Entered',
    'Months Covered',
    'Amount Currently Stored Per Month',
    'Current Total Across All Months',
    'Proposed Amount Per Month',
    'Proposed Total',
    'Amount of Inflation',
    'Flags',
    'Verified against receipt book (Y/N)',
  ]

  function formatRow(g) {
    return [
      `"${g.groupId}"`,
      `"${(g.studentName || '').replace(/"/g, '""')}"`,
      `"${g.class}"`,
      `"${g.receiptNo}"`,
      `"${g.dateEntered}"`,
      `"${g.monthsCovered}"`,
      g.amountCurrentlyStoredPerMonth,
      g.currentTotalStored,
      g.proposedAmountPerMonth,
      g.actualTotalReceived,
      g.inflationAmount,
      `"${g.flags.join('; ')}"`,
      '""',
    ].join(',')
  }

  const lines = [headers.join(',')]

  if (recentGroups.length > 0) {
    lines.push(`"# SECTION: ENTRIES ON OR AFTER ${sinceDateStr} (CURRENT / RECENT)"`)
    for (const g of recentGroups) {
      lines.push(formatRow(g))
    }
  }

  if (olderGroups.length > 0) {
    lines.push(`"# SECTION: OLDER ENTRIES (BEFORE ${sinceDateStr}) - REVIEW CAREFULLY"`)
    for (const g of olderGroups) {
      lines.push(formatRow(g))
    }
  }

  // Total summary
  const totalInflation = groups.reduce((acc, g) => acc + g.inflationAmount, 0)
  const totalReview = groups.filter((g) => g.needsManualReview).length
  lines.push('')
  lines.push(`"# SUMMARY: Total Groups: ${groups.length}, Total Inflation: INR ${totalInflation.toLocaleString('en-IN')}, Needs Manual Review: ${totalReview}"`)

  return lines.join('\n')
}

async function main() {
  const options = parseArgs()

  if (options.help) {
    printHelp()
    return
  }

  console.log('=====================================================')
  console.log('Parma Academy Multi-Month Fee Repair & Migration Tool')
  console.log('=====================================================')
  console.log(`Mode: ${options.apply ? 'APPLY (LIVE WRITE)' : 'DRY-RUN (AUDIT ONLY)'}`)
  console.log(`Since date filter: ${options.since}`)

  const db = initFirebase(options.serviceAccount)

  console.log('\nFetching records from "fees" collection...')
  const snap = await db.collection('fees').get()
  const allDocs = snap.docs.map((docSnap) => ({
    docId: docSnap.id,
    ...docSnap.data(),
  }))
  console.log(`Total fee documents found in database: ${allDocs.length}`)

  // Detect buggy groups
  const { detectedGroups, usedFallbackCount } = detectBuggyGroups(allDocs)
  console.log(`Suspected multi-month inflation groups detected: ${detectedGroups.length}`)
  if (usedFallbackCount > 0) {
    console.log(`[NOTE] ${usedFallbackCount} student group(s) used fallback grouping (createdAt was missing on docs).`)
  }

  const totalInflation = detectedGroups.reduce((acc, g) => acc + g.inflationAmount, 0)
  const totalNeedingReview = detectedGroups.filter((g) => g.needsManualReview).length

  // Write migration-report.json
  const reportPath = path.join(PROJECT_ROOT, 'migration-report.json')
  const reportData = {
    generatedAt: new Date().toISOString(),
    filterSince: options.since,
    summary: {
      totalGroups: detectedGroups.length,
      totalInflationAmount: totalInflation,
      totalNeedingReview,
    },
    groups: detectedGroups.map((g) => ({
      groupId: g.groupId,
      studentId: g.studentId,
      studentName: g.studentName,
      class: g.class,
      receiptNo: g.receiptNo,
      dateEntered: g.dateEntered,
      monthCount: g.monthCount,
      monthsCovered: g.monthsCovered,
      amountCurrentlyStoredPerMonth: g.amountCurrentlyStoredPerMonth,
      currentTotalStored: g.currentTotalStored,
      actualTotalReceived: g.actualTotalReceived,
      inflationAmount: g.inflationAmount,
      flags: g.flags,
      needsManualReview: g.needsManualReview,
      allocations: g.allocations,
      paymentDocPreview: {
        receiptNo: g.receiptNo || `MIG-${g.groupId}`,
        studentId: g.studentId,
        studentName: g.studentName,
        class: g.class,
        totalReceived: g.actualTotalReceived,
        mode: g.mode,
        reference: g.reference,
        paidOn: g.paymentDate,
        allocations: g.allocations.map((a) => ({
          feeId: a.docId,
          month: a.month,
          year: a.year,
          amount: a.proposedPaid,
        })),
        status: 'active',
        legacyMigrated: true,
      },
    })),
  }

  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf8')
  console.log(`\nWritten full migration audit report: ${reportPath}`)

  // Write affected-students.csv
  const csvPath = path.join(PROJECT_ROOT, 'affected-students.csv')
  const csvContent = generateCsv(detectedGroups, options.since)
  fs.writeFileSync(csvPath, csvContent, 'utf8')
  console.log(`Written verification checklist CSV: ${csvPath}`)

  // Print console summary table
  console.log('\n--- SUSPECTED MULTI-MONTH DUPLICATE GROUPS (CONSOLE PREVIEW) ---')
  if (detectedGroups.length === 0) {
    console.log('No inflated multi-month fee groups found! Everything looks clean.')
  } else {
    const tablePreview = detectedGroups.slice(0, 20).map((g) => ({
      'Group ID': g.groupId,
      Student: g.studentName,
      Class: g.class,
      Receipt: g.receiptNo || '—',
      Date: g.dateEntered,
      Months: g.monthsCovered.length > 25 ? g.monthsCovered.slice(0, 22) + '...' : g.monthsCovered,
      'Stored/Mo': `INR ${g.amountCurrentlyStoredPerMonth}`,
      'Inflated Total': `INR ${g.currentTotalStored}`,
      'Proposed Total': `INR ${g.actualTotalReceived}`,
      Inflation: `INR ${g.inflationAmount}`,
      Flags: g.flags.join(', ') || 'OK',
    }))
    console.table(tablePreview)
    if (detectedGroups.length > 20) {
      console.log(`... and ${detectedGroups.length - 20} more groups. Check ${csvPath} and ${reportPath} for all details.`)
    }
  }

  console.log('\n-----------------------------------------------------')
  console.log(`TOTAL GROUPS DETECTED : ${detectedGroups.length}`)
  console.log(`TOTAL INFLATION AMOUNT: INR ${totalInflation.toLocaleString('en-IN')}`)
  console.log(`RECORDS NEEDING REVIEW: ${totalNeedingReview}`)
  console.log('-----------------------------------------------------\n')

  // DRY-RUN EXIT
  if (!options.apply) {
    console.log(`
[DRY-RUN COMPLETE] No database records were modified.

Next Steps for the Office:
1. Open "${csvPath}" in Excel or Google Sheets.
2. Verify each group against the physical school fee receipt book.
3. Mark "Y" in the "Verified against receipt book" column for approved groups.
4. Create "approved-groups.json" containing the list of verified Group IDs:
   Example:
   [
     "GRP-S123-2026-001",
     "GRP-S456-2026-002"
   ]
5. Run the migration with --apply:
   node scripts/fix-multimonth-fees.mjs --apply --approved approved-groups.json
`)
    return
  }

  // APPLY MODE
  console.log('[APPLY MODE ACTIVATED]')
  if (!options.approvedFile) {
    console.error('[ERROR] --approved <file.json> is REQUIRED when running with --apply.')
    process.exit(1)
  }

  const approvedFilePath = path.resolve(PROJECT_ROOT, options.approvedFile)
  if (!fs.existsSync(approvedFilePath)) {
    console.error(`[ERROR] Approved groups file not found: ${approvedFilePath}`)
    process.exit(1)
  }

  let approvedGroupIds = []
  try {
    const raw = fs.readFileSync(approvedFilePath, 'utf8')
    const parsed = JSON.parse(raw)
    approvedGroupIds = Array.isArray(parsed) ? parsed : parsed.approvedGroupIds || []
  } catch (e) {
    console.error(`[ERROR] Failed to parse approved groups file: ${e.message}`)
    process.exit(1)
  }

  if (approvedGroupIds.length === 0) {
    console.log('[WARNING] Approved groups list is empty. Nothing to apply.')
    return
  }

  console.log(`Approved groups to migrate: ${approvedGroupIds.length}`)
  const approvedSet = new Set(approvedGroupIds)
  const groupsToApply = detectedGroups.filter((g) => approvedSet.has(g.groupId))

  if (groupsToApply.length === 0) {
    console.log('[WARNING] None of the approved group IDs matched detected groups. Nothing to apply.')
    return
  }

  // 1. Take full pre-migration backup of all affected fee records
  const backupDocs = []
  for (const g of groupsToApply) {
    for (const d of g.rawDocs) {
      backupDocs.push(d)
    }
  }

  const backupFilename = `backup-before-migration-${Date.now()}.json`
  const backupPath = path.join(PROJECT_ROOT, backupFilename)
  fs.writeFileSync(backupPath, JSON.stringify(backupDocs, null, 2), 'utf8')
  console.log(`[SAFETY BACKUP CREATED] ${backupPath} (${backupDocs.length} documents saved)`)

  // 2. Apply writes in batches
  console.log(`Applying updates for ${groupsToApply.length} groups across Firestore...`)

  let migratedDocsCount = 0
  let createdPaymentsCount = 0

  const BATCH_SIZE = 200 // safe batch limit
  let currentBatch = db.batch()
  let opsInBatch = 0

  for (const group of groupsToApply) {
    const receiptNo = group.receiptNo || `MIG-${group.groupId}`
    const paymentDocId = sanitizeDocId(receiptNo)

    // Create payment document
    const paymentRef = db.collection('payments').doc(paymentDocId)
    const paymentData = {
      receiptNo,
      studentId: group.studentId,
      studentName: group.studentName,
      class: group.class,
      totalReceived: group.actualTotalReceived,
      mode: group.mode || 'cash',
      reference: group.reference || '',
      paidOn: group.paymentDate,
      enteredBy: 'migration-script',
      allocations: group.allocations.map((a) => ({
        feeId: a.docId,
        month: a.month,
        year: a.year,
        amount: a.proposedPaid,
      })),
      status: 'active',
      legacyMigrated: true,
      migratedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    currentBatch.set(paymentRef, paymentData, { merge: true })
    opsInBatch++
    createdPaymentsCount++

    // Update each fee doc in the group
    for (const alloc of group.allocations) {
      const feeRef = db.collection('fees').doc(alloc.docId)
      const existingDoc = group.rawDocs.find((d) => d.docId === alloc.docId)

      const updateData = {
        amount: alloc.proposedPaid,
        remainingAmount: alloc.proposedRemaining,
        status: alloc.proposedStatus,
        originalAmountPaid: existingDoc ? Number(existingDoc.amount) : alloc.proposedPaid,
        migratedAt: new Date().toISOString(),
        migrationNote: 'Fixed multi-month duplicate payment inflation via scripts/fix-multimonth-fees.mjs',
        paymentId: paymentDocId,
        receiptNos: receiptNo ? [receiptNo] : [],
        updatedAt: new Date().toISOString(),
      }

      currentBatch.update(feeRef, updateData)
      opsInBatch++
      migratedDocsCount++

      if (opsInBatch >= BATCH_SIZE) {
        await currentBatch.commit()
        console.log(`Committed batch of ${opsInBatch} operations...`)
        currentBatch = db.batch()
        opsInBatch = 0
      }
    }
  }

  if (opsInBatch > 0) {
    await currentBatch.commit()
    console.log(`Committed final batch of ${opsInBatch} operations.`)
  }

  console.log(`
=====================================================
[MIGRATION COMPLETED SUCCESSFULLY]
- Groups Migrated: ${groupsToApply.length}
- Fee Documents Updated: ${migratedDocsCount}
- Payment Documents Created: ${createdPaymentsCount}
- Safety Backup File: ${backupPath}
=====================================================
`)
}

main().catch((err) => {
  console.error('\n[FATAL ERROR]:', err)
  process.exit(1)
})
