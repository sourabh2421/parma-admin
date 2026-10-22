import marksConfig from '../config/marks-config.json'

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

/**
 * Calculates a single Term (Term 1 or Term 2) for a subject scheme
 * @param {object} scheme 
 * @param {1 | 2} term 
 * @param {object} input 
 */
export function calcTerm(scheme, term, input) {
  let raw = 0
  let complete = true
  for (const c of scheme.components) {
    const key = term === 1 ? c.term1Key : c.term2Key
    const v = input?.components ? input.components[key] : null
    if (v === null || v === undefined) {
      complete = false
      continue
    }
    if (v === 'AB' || v === 'NA') continue // counts as 0
    const num = typeof v === 'string' ? Number(v) : v
    if (isNaN(num) || num < 0 || num > c.max) {
      throw new Error(`${key} must be between 0 and ${c.max}`)
    }
    raw += num
  }

  const ex = input?.exam
  let exam = 0
  if (ex === null || ex === undefined) {
    complete = false
  } else if (ex !== 'AB' && ex !== 'NA') {
    const numEx = typeof ex === 'string' ? Number(ex) : ex
    if (isNaN(numEx) || numEx < 0 || numEx > scheme.examMax) {
      throw new Error(`exam must be between 0 and ${scheme.examMax}`)
    }
    exam = numEx
  }

  // internalDivisor computed from config (internalRawMax / internalMax)
  const divisor = scheme.internalDivisor || (scheme.internalRawMax / scheme.internalMax)
  const internalScaled = round2(raw / divisor)
  return {
    internalRaw: raw,
    internalScaled,
    exam,
    termTotal: round2(internalScaled + exam),
    termMax: scheme.termMax,
    complete,
  }
}

/**
 * Calculates full year for a subject from Term 1 and Term 2 inputs
 * @param {object} scheme 
 * @param {object} t1 
 * @param {object} t2 
 */
export function calcSubject(scheme, t1, t2) {
  const r1 = calcTerm(scheme, 1, t1)
  const r2 = calcTerm(scheme, 2, t2)
  return {
    term1: r1,
    term2: r2,
    grandTotal: round2(r1.termTotal + r2.termTotal),
    grandMax: scheme.subjectMax,
    complete: r1.complete && r2.complete,
  }
}

/**
 * Calculates overall student total and percentage from array of calcSubject results
 * @param {Array} subjects 
 */
export function calcStudent(subjects) {
  const obtained = round2(subjects.reduce((a, s) => a + s.grandTotal, 0))
  const max = subjects.reduce((a, s) => a + s.grandMax, 0)
  return {
    obtained,
    max,
    percentage: max ? round2((obtained / max) * 100) : 0,
  }
}

export function normalizeSubKey(name) {
  return String(name || '').trim().toLowerCase()
}

export function getScheme(schemeId) {
  const scheme = marksConfig.schemes[schemeId]
  if (!scheme) {
    throw new Error(`Scheme with ID "${schemeId}" not found in marks-config.json`)
  }
  return scheme
}

export function getSubjectScheme(className, subjectName) {
  const rawClass = String(className || '').trim()
  const cUpper = rawClass.toUpperCase()
  const cCleaned = cUpper.replace(/^(?:CLASS|STD|STANDARD|GRADE)\s*/i, '').trim()
  const sNorm = normalizeSubKey(subjectName)

  // Search class groups
  for (const group of Object.values(marksConfig.classGroups)) {
    const matchedClass = group.classes.some((c) => {
      const cu = c.toUpperCase()
      return (
        cu === cUpper ||
        cu === cCleaned ||
        cUpper.startsWith(cu + ' ') ||
        cUpper.endsWith(' ' + cu) ||
        cCleaned.startsWith(cu + ' ') ||
        cCleaned.endsWith(' ' + cu) ||
        (cu.startsWith('XI') && (cUpper.includes('11') || cUpper.includes('XI'))) ||
        (cu.startsWith('XII') && (cUpper.includes('12') || cUpper.includes('XII')))
      )
    })

    if (matchedClass) {
      for (const [sub, schemeId] of Object.entries(group.subjects)) {
        if (normalizeSubKey(sub) === sNorm) {
          return getScheme(schemeId)
        }
      }
    }
  }

  return getScheme('STD_80_20')
}

export default {
  round2,
  calcTerm,
  calcSubject,
  calcStudent,
  getScheme,
  getSubjectScheme,
}
