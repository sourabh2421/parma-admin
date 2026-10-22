import marksConfig from '../config/marks-config.json'

export type MarkEntry = number | "AB" | "NA" | null;

export interface SchemeComponent {
  name?: string;
  term1Key: string;
  term2Key: string;
  max: number;
}

export interface Scheme {
  id?: string;
  description?: string;
  components: SchemeComponent[];
  internalRawMax: number;
  internalMax: number;
  internalDivisor?: number;
  examMax: number;
  termMax: number;
  subjectMax: number;
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface TermInput {
  components: Record<string, MarkEntry>; // keys: fa1/fa2/assignment/oral (term1) or fa3/fa4/... (term2)
  exam: MarkEntry;                       // half-yearly (term1) or annual (term2)
}

export interface TermResult {
  internalRaw: number;
  internalScaled: number;
  exam: number;
  termTotal: number;
  termMax: number;
  complete: boolean;
}

export function calcTerm(scheme: Scheme, term: 1 | 2, input: TermInput): TermResult {
  let raw = 0;
  let complete = true;
  for (const c of scheme.components) {
    const key = term === 1 ? c.term1Key : c.term2Key;
    const v = input?.components ? input.components[key] : null;
    if (v === null || v === undefined) {
      complete = false;
      continue;
    }
    if (v === "AB" || v === "NA") continue; // counts as 0
    const num = typeof v === 'string' ? Number(v) : v;
    if (isNaN(num) || num < 0 || num > c.max) {
      throw new Error(`${key} must be between 0 and ${c.max}`);
    }
    raw += num;
  }
  const ex = input?.exam;
  let exam = 0;
  if (ex === null || ex === undefined) {
    complete = false;
  } else if (ex !== "AB" && ex !== "NA") {
    const numEx = typeof ex === 'string' ? Number(ex) : ex;
    if (isNaN(numEx) || numEx < 0 || numEx > scheme.examMax) {
      throw new Error(`exam must be between 0 and ${scheme.examMax}`);
    }
    exam = numEx;
  }
  const divisor = scheme.internalDivisor || (scheme.internalRawMax / scheme.internalMax);
  const internalScaled = round2(raw / divisor);
  return {
    internalRaw: raw,
    internalScaled,
    exam,
    termTotal: round2(internalScaled + exam),
    termMax: scheme.termMax,
    complete,
  };
}

export function calcSubject(scheme: Scheme, t1: TermInput, t2: TermInput) {
  const r1 = calcTerm(scheme, 1, t1);
  const r2 = calcTerm(scheme, 2, t2);
  return {
    term1: r1,
    term2: r2,
    grandTotal: round2(r1.termTotal + r2.termTotal),
    grandMax: scheme.subjectMax,
    complete: r1.complete && r2.complete,
  };
}

export function calcStudent(subjects: ReturnType<typeof calcSubject>[]) {
  const obtained = round2(subjects.reduce((a, s) => a + s.grandTotal, 0));
  const max = subjects.reduce((a, s) => a + s.grandMax, 0);
  return {
    obtained,
    max,
    percentage: max ? round2((obtained / max) * 100) : 0,
  };
}

/**
 * Normalizes subject name for dictionary lookups
 */
export function normalizeSubKey(name: string): string {
  return String(name || '').trim().toLowerCase();
}

/**
 * Retrieve a scheme definition by its ID
 */
export function getScheme(schemeId: string): Scheme {
  const scheme = (marksConfig.schemes as Record<string, Scheme>)[schemeId];
  if (!scheme) {
    throw new Error(`Scheme with ID "${schemeId}" not found in marks-config.json`);
  }
  return scheme;
}

/**
 * Resolve scheme for a given class and subject from marks-config.json
 */
export function getSubjectScheme(className: string, subjectName: string): Scheme {
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

  // Fallback to STD_80_20 if not explicitly matched
  return getScheme('STD_80_20')
}

export default {
  round2,
  calcTerm,
  calcSubject,
  calcStudent,
  getScheme,
  getSubjectScheme,
};
