/**
 * Utilities for detecting and reconciling duplicate students created by legacy ID prefix mismatches
 * (e.g. `S92` vs `92`, `SID-101` vs `101`) and re-linking past fee payment records.
 */

const normalizeKey = (str) =>
  String(str ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_.-]/g, '')

export function extractNumericSuffix(id) {
  const str = String(id ?? '').trim()
  const match = str.match(/^(?:s|sid|roll)?[-_#]?(\d+)$/i)
  return match ? match[1] : null
}

export function isLegacyPrefixedId(id) {
  const str = String(id ?? '').trim()
  return /^(?:s|sid)[-_]?\d+$/i.test(str)
}

/**
 * Builds a safe reconciliation plan between legacy prefixed student profiles and newly imported clean profiles.
 *
 * @param {Array} students List of all active students
 * @param {Array} fees List of all active fee records
 * @returns {Object} { mappings, studentsToDelete, feesToMigrate, summary }
 */
export function buildReconciliationPlan(students = [], fees = []) {
  const activeStudents = students.filter((s) => s && s.deleted !== true)
  const activeFees = fees.filter((f) => f && f.deleted !== true)

  // Split into clean/target candidates and legacy candidates
  const cleanStudents = []
  const legacyStudents = []

  for (const s of activeStudents) {
    const rawId = String(s.id ?? '').trim()
    if (isLegacyPrefixedId(rawId)) {
      legacyStudents.push(s)
    } else {
      cleanStudents.push(s)
    }
  }

  // Maps: oldStudentId -> targetStudent
  const mappings = new Map()

  // 1. Match by numeric ID suffix (e.g. "S92" -> "92")
  const cleanByNumericId = new Map()
  for (const cs of cleanStudents) {
    const num = extractNumericSuffix(cs.id)
    if (num) {
      cleanByNumericId.set(num, cs)
    }
  }

  for (const ls of legacyStudents) {
    const num = extractNumericSuffix(ls.id)
    if (num && cleanByNumericId.has(num)) {
      mappings.set(String(ls.id).trim(), cleanByNumericId.get(num))
    }
  }

  // 2. For any remaining unmapped legacy students, match by exact name + class
  const cleanByNameAndClass = new Map()
  for (const cs of cleanStudents) {
    const key = `${normalizeKey(cs.name)}__${normalizeKey(cs.class)}`
    cleanByNameAndClass.set(key, cs)
  }

  for (const ls of legacyStudents) {
    const oldId = String(ls.id).trim()
    if (mappings.has(oldId)) continue

    const key = `${normalizeKey(ls.name)}__${normalizeKey(ls.class)}`
    if (cleanByNameAndClass.has(key)) {
      mappings.set(oldId, cleanByNameAndClass.get(key))
    }
  }

  // 3. For any remaining unmapped legacy students, match by name only (if unique)
  const cleanByNameCounts = new Map()
  const cleanByName = new Map()
  for (const cs of cleanStudents) {
    const k = normalizeKey(cs.name)
    cleanByNameCounts.set(k, (cleanByNameCounts.get(k) || 0) + 1)
    cleanByName.set(k, cs)
  }

  for (const ls of legacyStudents) {
    const oldId = String(ls.id).trim()
    if (mappings.has(oldId)) continue

    const k = normalizeKey(ls.name)
    if (cleanByNameCounts.get(k) === 1) {
      mappings.set(oldId, cleanByName.get(k))
    }
  }

  // Students to delete/archive
  const studentsToDelete = [...mappings.keys()]

  // Fees to migrate to target students
  const feesToMigrate = []
  for (const fee of activeFees) {
    const oldSid = String(fee.studentId ?? '').trim()
    if (mappings.has(oldSid)) {
      const targetStudent = mappings.get(oldSid)
      feesToMigrate.push({
        oldFeeDocId: fee.docId,
        oldStudentId: oldSid,
        targetStudentId: targetStudent.id,
        targetStudentName: targetStudent.name,
        targetClass: targetStudent.class,
        month: fee.month,
        year: fee.year,
        amount: fee.amount,
        status: fee.status,
        paymentDate: fee.paymentDate,
        createdAt: fee.createdAt,
        updatedAt: fee.updatedAt,
      })
    }
  }

  return {
    mappings,
    studentsToDelete,
    feesToMigrate,
    summary: {
      totalActiveStudents: activeStudents.length,
      legacyDuplicatesCount: studentsToDelete.length,
      remainingStudentsCount: activeStudents.length - studentsToDelete.length,
      feesToMigrateCount: feesToMigrate.length,
    },
  }
}
