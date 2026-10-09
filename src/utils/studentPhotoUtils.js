import crypto from 'crypto'

/**
 * Parses photo filenames like '1.jpg.jpg', '10.jpg', '3171.jpg.jpg'
 * Returns the numeric S. No. and validity.
 */
export function parsePhotoFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return { sNo: null, isValid: false }
  }
  const clean = filename.trim()
  const match = clean.match(/^(\d+)(?:\.jpg|\.jpeg)?\.(?:jpg|jpeg)$/i)
  if (!match) {
    return { sNo: null, isValid: false }
  }
  const num = parseInt(match[1], 10)
  return {
    sNo: isNaN(num) ? null : num,
    isValid: !isNaN(num),
  }
}

/**
 * Normalizes a name string for verification:
 * trims, collapses multiple spaces, ignores case, removes punctuation.
 */
export function normalizeNameForMatch(name) {
  if (!name) return ''
  return String(name)
    .trim()
    .toUpperCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Computes SHA-256 hash of a buffer or base64 string.
 */
export function computePhotoHash(bufferOrString) {
  if (!bufferOrString) return ''
  const hash = crypto.createHash('sha256')
  hash.update(bufferOrString)
  return hash.digest('hex')
}

/**
 * Checks whether an existing photo is unchanged based on hash.
 */
export function isPhotoUnchanged(existingHash, newHash) {
  if (!existingHash || !newHash) return false
  return String(existingHash).trim() === String(newHash).trim()
}

/**
 * Verifies match between Excel record and database student by S. No. and Name.
 */
export function verifyStudentMatch({
  sNo,
  excelName,
  excelClass,
  dbStudent,
  photoOverrides = {},
}) {
  const sNoStr = String(sNo).trim()

  // 1. Check manual override first
  if (photoOverrides && photoOverrides[sNoStr]) {
    const overrideTargetId = String(photoOverrides[sNoStr]).trim()
    return {
      status: 'OVERRIDE_MATCH',
      isApproved: true,
      targetStudentId: overrideTargetId,
      sNo: Number(sNoStr),
      excelName,
      excelClass,
      note: `Applied manual override from photo-overrides.json -> DB ID ${overrideTargetId}`,
    }
  }

  // 2. Special case check for S.No 3171 if not explicitly in overrides
  if (sNoStr === '3171' && (!photoOverrides || !photoOverrides['3171'])) {
    return {
      status: 'REVIEW_3171',
      isApproved: false,
      sNo: 3171,
      excelName,
      excelClass,
      dbStudentId: dbStudent ? dbStudent.id : null,
      dbStudentName: dbStudent ? dbStudent.name : null,
      note: 'S. No. 3171 requires explicit confirmation via photo-overrides.json before apply.',
    }
  }

  // 3. Check if DB student exists
  if (!dbStudent) {
    return {
      status: 'MISSING_IN_DB',
      isApproved: false,
      sNo: Number(sNoStr),
      excelName,
      excelClass,
      note: `No database student found with ID/Student ID "${sNoStr}".`,
    }
  }

  // 4. Verify normalized names
  const normEx = normalizeNameForMatch(excelName)
  const normDb = normalizeNameForMatch(dbStudent.name)

  if (normEx === normDb) {
    return {
      status: 'MATCHED_EXACT',
      isApproved: true,
      targetStudentId: String(dbStudent.id).trim(),
      sNo: Number(sNoStr),
      excelName,
      excelClass,
      dbStudentName: dbStudent.name,
      note: 'Exact normalized name match.',
    }
  }

  return {
    status: 'NAME_MISMATCH',
    isApproved: false,
    targetStudentId: String(dbStudent.id).trim(),
    sNo: Number(sNoStr),
    excelName,
    excelClass,
    dbStudentName: dbStudent.name,
    note: `Name difference: Excel "${excelName}" vs Database "${dbStudent.name}". Requires review.`,
  }
}
