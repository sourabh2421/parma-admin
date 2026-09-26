/**
 * Default Main Subjects Configuration per Class:
 * Pre-Primary (Playgroup, Nursery, LKG, UKG) + Class I to XII (Science, Commerce, Humanities)
 */
export const DEFAULT_CLASS_SUBJECTS = {
  'Playgroup': ['English Written', 'English Oral', 'English Dictation', 'Hindi Written', 'Hindi Oral', 'Hindi Dictation', 'Maths Written', 'Maths Oral', 'E.V.S.', 'Drawing'],
  'Nursery': ['English Written', 'English Oral', 'English Dictation', 'Hindi Written', 'Hindi Oral', 'Hindi Dictation', 'Maths Written', 'Maths Oral', 'E.V.S.', 'Drawing'],
  'LKG': ['English Written', 'English Oral', 'English Dictation', 'Hindi Written', 'Hindi Oral', 'Hindi Dictation', 'Maths Written', 'Maths Oral', 'E.V.S.', 'Drawing'],
  'UKG': ['English Written', 'English Oral', 'English Dictation', 'Hindi Written', 'Hindi Oral', 'Hindi Dictation', 'Maths Written', 'Maths Oral', 'E.V.S.', 'Drawing'],
  'I': ['English-I', 'English-II', 'Hindi', 'Maths', 'E.V.S.', 'G.K.', 'Computer', 'Drawing'],
  'II': ['English-I', 'English-II', 'Hindi', 'Maths', 'E.V.S.', 'G.K.', 'Computer', 'Drawing'],
  'III': ['English-I', 'English-II', 'Hindi', 'Maths', 'Science', 'Social Studies', 'Sanskrit', 'G.K.', 'Computer', 'Drawing'],
  'IV': ['English-I', 'English-II', 'Hindi', 'Maths', 'Science', 'Social Studies', 'Sanskrit', 'G.K.', 'Computer', 'Drawing'],
  'V': ['English-I', 'English-II', 'Hindi', 'Maths', 'Science', 'Social Studies', 'Sanskrit', 'G.K.', 'Computer', 'Drawing'],
  'VI': ['English-I', 'English-II', 'Hindi', 'Maths', 'Physics', 'Chemistry', 'Biology', 'History & Civics', 'Geography', 'Sanskrit', 'G.K.', 'Computer', 'Drawing'],
  'VII': ['English-I', 'English-II', 'Hindi', 'Maths', 'Physics', 'Chemistry', 'Biology', 'History & Civics', 'Geography', 'Sanskrit', 'G.K.', 'Computer', 'Drawing'],
  'VIII': ['English-I', 'English-II', 'Hindi', 'Maths', 'Physics', 'Chemistry', 'Biology', 'History & Civics', 'Geography', 'Sanskrit', 'G.K.', 'Computer', 'Drawing'],
  'IX': ['English-I', 'English-II', 'Hindi', 'Maths', 'Physics', 'Chemistry', 'Biology', 'History & Civics', 'Geography', 'Physical Education'],
  'X': ['English-I', 'English-II', 'Hindi', 'Maths', 'Physics', 'Chemistry', 'Biology', 'History & Civics', 'Geography', 'Physical Education'],
  'XI Science': ['English-I', 'English-II', 'Physics', 'Chemistry', 'Maths', 'Biology', 'Physical Education'],
  'XI Commerce': ['English-I', 'English-II', 'Hindi', 'Accounts', 'Commerce', 'Economics', 'Physical Education'],
  'XI Humanities': ['English-I', 'English-II', 'Hindi', 'History & Civics', 'Political Science', 'Economics', 'Physical Education'],
  'XII Science': ['English-I', 'English-II', 'Physics', 'Chemistry', 'Maths', 'Biology', 'Physical Education'],
  'XII Commerce': ['English-I', 'English-II', 'Hindi', 'Accounts', 'Commerce', 'Economics', 'Physical Education'],
  'XII Humanities': ['English-I', 'English-II', 'Hindi', 'History & Civics', 'Political Science', 'Economics', 'Physical Education'],
}

export const ALL_CLASSES = Object.keys(DEFAULT_CLASS_SUBJECTS)

export const CURRENT_ACADEMIC_SESSION = '2026-27'

/**
 * Exam types in order. FA = Formative Assessment, SA = Summative Assessment.
 * Half-Yearly Report Card: FA-1 + FA-2 + SA-1
 * Annual Report Card: full year (FA-1 + FA-2 + SA-1 + FA-3 + FA-4 + SA-2)
 */
export const EXAM_TYPES = ['FA-1', 'FA-2', 'SA-1', 'FA-3', 'FA-4', 'SA-2']
export const HALF_YEARLY_EXAMS = ['FA-1', 'FA-2', 'SA-1']
export const ANNUAL_EXAMS = ['FA-1', 'FA-2', 'SA-1', 'FA-3', 'FA-4', 'SA-2']

/** Map exam type to its max marks defaults */
export const EXAM_DEFAULT_MAX = {
  'FA-1': 20,
  'FA-2': 20,
  'SA-1': 80,
  'FA-3': 20,
  'FA-4': 20,
  'SA-2': 80,
}

/** Exam schedule (for display in UI) */
export const EXAM_SCHEDULE = {
  'FA-1': 'May',
  'FA-2': 'July',
  'SA-1': 'September (Half-Yearly)',
  'FA-3': 'November',
  'FA-4': 'January',
  'SA-2': 'March (Annual)',
}

export const CO_SCHOLASTIC_SKILLS = [
  'Reading Skill',
  'Writing Skill',
  'Art Education',
  'Music and Instrumentation',
  'Games',
  'S.U.P.W.',
  'Good Manners',
  'Attentive in the Class',
  'Fluency in English',
  'Co-curricular Activities',
]

/**
 * Get Mark Evaluation Configuration for a specific Subject in a Class.
 * Adheres strictly to the 6 Excel sheets of the 2026-27 academic syllabus:
 * - Pre-Primary (NUR to UKG): FA1 (20) + FA2 (20) + Dictation (10) + Oral (10) / 3 => Internal = 20, Half Yearly / Annual = 80 => Total = 100. (Drawing & EVS: FA1 + FA2 / 2 = 20)
 * - 11 & 12 Practicals (Physics, Chemistry, Biology, Physical Education): FA (10) + Assign (10) + Oral/Prc (10) = 30, Half Yearly = 70 => Total = 100.
 * - 11 & 12 Non-Practicals: FA (10) + Assign (5) + Oral/Prc (5) = 20, Half Yearly = 80 => Total = 100.
 * - 50-mark subjects in 1 to 8 (Sanskrit, GK, Computer, Drawing): FA (10) + Assign (5) + Oral (5) = 20, Half Yearly = 30 => Total = 50. (Drawing: Assign/Oral NA)
 * - Standard 100-mark subjects (1 to 10): FA (10) + Assign (5) + Oral (5) = 20, Half Yearly = 80 => Total = 100.
 */
export function getSubjectMarkConfig(clsKey, subjectName = '') {
  const normCls = matchClassKey(clsKey) || clsKey || 'I'
  const sub = String(subjectName || '').trim().toLowerCase()
  const isPrePrimary = ['Playgroup', 'Nursery', 'LKG', 'UKG'].includes(normCls)
  const isClass1To8 = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'].includes(normCls)
  const is11_12 = normCls.startsWith('XI') || normCls.startsWith('XII')

  // 1. Pre-Primary (NUR to UKG): FA1 (20) + FA2 (20) + Dictation (10) + Oral (10) / 3 => Internal = 20, Half Yearly / Annual = 80 => Total = 100
  if (isPrePrimary) {
    const isDrawingOrEvs = sub.includes('drawing') || sub.includes('e.v.s') || sub.includes('evs')
    return {
      isPrePrimary: true,
      isPractical: false,
      hasAssignment: !isDrawingOrEvs,
      hasOral: !isDrawingOrEvs,
      assignLabel: 'Dictation',
      oralLabel: 'Oral',
      faMax: 20,
      assignMax: isDrawingOrEvs ? 0 : 10,
      oralMax: isDrawingOrEvs ? 0 : 10,
      divisor: isDrawingOrEvs ? 2 : 3,
      internalMax: 20,
      theoryMax: 80,
      termMax: 100,
      annualMax: 200,
    }
  }

  // 2. Class 11 & 12 Practicals (Physics, Chemistry, Biology, Physical Education)
  //    divisor = 2: (FA1 + FA2 + Assign + Oral) / 2 => max (20+20+10+10)/2 = 30
  if (is11_12) {
    const isPractical =
      sub.includes('physics') ||
      sub.includes('chemistry') ||
      sub.includes('biology') ||
      sub.includes('physical') ||
      sub.includes('physical education')

    if (isPractical) {
      return {
        isPrePrimary: false,
        isPractical: true,
        hasAssignment: true,
        hasOral: true,
        assignLabel: 'Assignment',
        oralLabel: 'Oral/Prc/Game',
        faMax: 20,
        assignMax: 10,
        oralMax: 10,
        divisor: 2,
        internalMax: 30,
        theoryMax: 70,
        termMax: 100,
        annualMax: 200,
      }
    }

    // Class 11 & 12 Non-Practicals (Maths, English, Hindi, Accounts, Commerce, Economics, History, Pol Science)
    //   divisor = 3: (FA1 + FA2 + Assign + Oral) / 3 => max (20+20+10+10)/3 = 20
    return {
      isPrePrimary: false,
      isPractical: false,
      hasAssignment: true,
      hasOral: true,
      assignLabel: 'Assignment',
      oralLabel: 'Oral/Prc/Game',
      faMax: 20,
      assignMax: 10,
      oralMax: 10,
      divisor: 3,
      internalMax: 20,
      theoryMax: 80,
      termMax: 100,
      annualMax: 200,
    }
  }

  // 3. 50-mark subjects in Classes 1 to 8 (Sanskrit, GK, Computer, Drawing)
  if (isClass1To8) {
    const is50MarkSub =
      sub.includes('sanskrit') ||
      sub.includes('g.k') ||
      sub.includes('gk') ||
      sub.includes('general knowledge') ||
      sub.includes('computer') ||
      sub.includes('drawing')

    if (is50MarkSub) {
      const isDrawing = sub.includes('drawing')
      // Drawing: divisor=2 on FA1+FA2 only; Others: divisor=3 on FA1+FA2+Assign+Oral
      // Both give internalMax=20 when inputs are at max: Drawing=(20+20)/2=20, Others=(20+20+10+10)/3=20
      return {
        isPrePrimary: false,
        isPractical: false,
        hasAssignment: !isDrawing,
        hasOral: !isDrawing,
        assignLabel: 'Assignment',
        oralLabel: 'Oral/Practical',
        faMax: 20,
        assignMax: isDrawing ? 0 : 10,
        oralMax: isDrawing ? 0 : 10,
        divisor: isDrawing ? 2 : 3,
        internalMax: 20,
        theoryMax: 30,
        termMax: 50,
        annualMax: 100,
      }
    }
  }

  // 4. Standard 100-mark subjects for Class 1 to 10 (and any class not matched above)
  //    divisor = 3: (FA1 + FA2 + Assign + Oral) / 3 => max (20+20+10+10)/3 = 20
  const isDrawing = sub.includes('drawing')
  return {
    isPrePrimary: false,
    isPractical: false,
    hasAssignment: !isDrawing,
    hasOral: !isDrawing,
    assignLabel: 'Assignment',
    oralLabel: normCls.startsWith('IX') || normCls.startsWith('X') ? 'Oral/Prc/Game' : 'Oral/Practical',
    faMax: 20,
    assignMax: isDrawing ? 0 : 10,
    oralMax: isDrawing ? 0 : 10,
    divisor: isDrawing ? 2 : 3,
    internalMax: 20,
    theoryMax: 80,
    termMax: 100,
    annualMax: 200,
  }
}

/**
 * Match arbitrary class string to standard class key.
 * Strictly resolves class names and NEVER blindly defaults to Class V.
 */
export function matchClassKey(classInput) {
  if (!classInput) return null
  const raw = String(classInput).trim()
  if (!raw) return null
  const upper = raw.toUpperCase()

  // Clean common prefixes like 'CLASS', 'STD', 'STANDARD', 'GRADE'
  const cleaned = upper
    .replace(/^(?:CLASS|STD|STANDARD|GRADE)\s*/i, '')
    .trim()

  // 1. Playgroup / PG
  if (
    /^(?:PLAYGROUP|PG|PLAY\s*GROUP)(?:\b|[\s-_]|$)/i.test(cleaned) ||
    upper === 'PG' ||
    upper.includes('PLAYGROUP')
  ) {
    return 'Playgroup'
  }

  // 2. Nursery / Nur / Nsy / Pre-Nursery
  if (
    /^(?:PRE[-_\s]?NURSERY|NURSERY|NUR\.?|NSY)(?:\b|[\s-_]|$)/i.test(cleaned) ||
    upper.includes('NURSERY') ||
    upper.includes('PRE-NURSERY')
  ) {
    return 'Nursery'
  }

  // 3. LKG / Lower KG / Jr KG / KG 1
  if (
    /^(?:L\.?K\.?G\.?|LOWER\s*K\.?G\.?|JR\.?\s*K\.?G\.?|JUNIOR\s*K\.?G\.?|KG\s*1)(?:\b|[\s-_]|$)/i.test(cleaned) ||
    upper.includes('LKG') ||
    upper.includes('L.K.G')
  ) {
    return 'LKG'
  }

  // 4. UKG / Upper KG / Sr KG / Senior KG / KG 2 / KG
  if (
    /^(?:U\.?K\.?G\.?|UPPER\s*K\.?G\.?|SR\.?\s*K\.?G\.?|SENIOR\s*K\.?G\.?|KG\s*2|KG)(?:\b|[\s-_]|$)/i.test(cleaned) ||
    upper.includes('UKG') ||
    upper.includes('U.K.G')
  ) {
    return 'UKG'
  }

  // 5. Match XII Streams first (before XI)
  if (/\b(?:XII|12)(?:TH)?\b/i.test(upper) || /^(?:XII|12)(?:TH)?(?:\b|[\s-_]|$)/i.test(cleaned)) {
    if (upper.includes('COMMERCE') || upper.includes('COMM')) return 'XII Commerce'
    if (upper.includes('HUMANITIES') || upper.includes('ARTS') || upper.includes('HUM')) return 'XII Humanities'
    return 'XII Science'
  }

  // 6. Match XI Streams
  if (/\b(?:XI|11)(?:TH)?\b/i.test(upper) || /^(?:XI|11)(?:TH)?(?:\b|[\s-_]|$)/i.test(cleaned)) {
    if (upper.includes('COMMERCE') || upper.includes('COMM')) return 'XI Commerce'
    if (upper.includes('HUMANITIES') || upper.includes('ARTS') || upper.includes('HUM')) return 'XI Humanities'
    return 'XI Science'
  }

  // 7. Exact match with standard keys
  for (const k of ALL_CLASSES) {
    if (upper === k.toUpperCase() || cleaned === k.toUpperCase()) return k
  }

  // 8. Arabic numerals with optional section: e.g. "5", "5-A", "Class 5th B", "5TH", "10"
  const digitMatch = cleaned.match(/^(\d{1,2})(?:ST|ND|RD|TH)?(?:\b|[\s-_]|$)/i)
  if (digitMatch) {
    const num = digitMatch[1]
    const numMap = {
      '1': 'I',
      '2': 'II',
      '3': 'III',
      '4': 'IV',
      '5': 'V',
      '6': 'VI',
      '7': 'VII',
      '8': 'VIII',
      '9': 'IX',
      '10': 'X',
      '11': 'XI Science',
      '12': 'XII Science',
    }
    if (numMap[num]) return numMap[num]
  }

  // 9. Roman numerals at start: e.g. "V", "V-A", "Class VIII", "IX B"
  const romanMatch = cleaned.match(/^(XII|XI|VIII|VII|VI|IV|III|II|IX|X|V|I)(?:\b|[\s-_]|$)/i)
  if (romanMatch) {
    const key = romanMatch[1].toUpperCase()
    if (key === 'XII') return 'XII Science'
    if (key === 'XI') return 'XI Science'
    if (DEFAULT_CLASS_SUBJECTS[key]) return key
  }

  // 10. Check each word token to avoid partial string false matches
  const tokens = cleaned.split(/[\s-_,]+/)
  for (const token of tokens) {
    const t = token.toUpperCase()
    if (/^(XII|XI|VIII|VII|VI|IV|III|II|IX|X|V|I)$/.test(t)) {
      if (t === 'XII') return 'XII Science'
      if (t === 'XI') return 'XI Science'
      if (DEFAULT_CLASS_SUBJECTS[t]) return t
    }
    const dMatch = t.match(/^(\d{1,2})(?:ST|ND|RD|TH)?$/i)
    if (dMatch) {
      const num = dMatch[1]
      const numMap = {
        '1': 'I',
        '2': 'II',
        '3': 'III',
        '4': 'IV',
        '5': 'V',
        '6': 'VI',
        '7': 'VII',
        '8': 'VIII',
        '9': 'IX',
        '10': 'X',
        '11': 'XI Science',
        '12': 'XII Science',
      }
      if (numMap[num]) return numMap[num]
    }
  }

  // Unknown class strings must NOT default to Class V
  return null
}

/**
 * Calculate 8-point Scholastic Grade based on percentage.
 */
export function calculateScholasticGrade(percentage) {
  const p = Number(percentage)
  if (isNaN(p)) return 'E'
  if (p >= 91) return 'A1'
  if (p >= 81) return 'A2'
  if (p >= 71) return 'B1'
  if (p >= 61) return 'B2'
  if (p >= 51) return 'C1'
  if (p >= 41) return 'C2'
  if (p >= 33) return 'D'
  return 'E'
}

/**
 * Calculate Term Marks (Half-Yearly or Term 2 / Annual) according to the Excel syllabus.
 *
 * UNIFIED FORMULA: internalObt = SUM(FA1, FA2, Assignment, Oral) / config.divisor
 * Where divisor is defined per class group + subject in getSubjectMarkConfig:
 *   - Standard 100-mark subjects (Classes 1-10, XI/XII non-practicals): divisor=3, internalMax=20
 *   - XI/XII Practicals (Physics/Chemistry/Biology/PE):                   divisor=2, internalMax=30
 *   - 50-mark Drawing (Classes 1-8, no Assign/Oral):                      divisor=2, internalMax=20
 *   - 50-mark others (Sanskrit/GK/Computer, Classes 1-8):                 divisor=3, internalMax=20
 *   - Pre-Primary EVS/Drawing (no Dictation/Oral):                        FA1+FA2 (no divisor)
 *   - Pre-Primary others (Dictation+Oral available):                      FA avg + DictOral avg
 *
 * Term Total = internalObt + saObt
 * Grand Total = Term1 Total + Term2 Total
 */
export function calculateTermMarks(
  faAObt = 0,
  faBObt = 0,
  saObt = 0,
  faAMax = 20,
  faBMax = 20,
  saMax = 80,
  assignObt = null,
  oralObt = null,
  assignMax = null,
  oralMax = null,
  clsKey = null,
  subjectName = null
) {
  const faA = Number(faAObt) || 0
  const faB = Number(faBObt) || 0
  const sa = Number(saObt) || 0

  // If class/subject or assignment/oral context is present, use the exact Excel system
  if (clsKey || subjectName || (assignObt !== null && assignObt !== undefined) || (oralObt !== null && oralObt !== undefined)) {
    const config = getSubjectMarkConfig(clsKey, subjectName)
    const effectiveTermMax = config.termMax

    const assign = config.hasAssignment ? (Number(assignObt) || 0) : 0
    const oral = config.hasOral ? (Number(oralObt) || 0) : 0

    // UNIFIED divisor formula:
    //   internalObt = (FA1 + FA2 + Assignment + Oral) / divisor
    // Divisor comes from config (2 for practicals/drawing/evs, 3 for standard subjects).
    // When hasAssignment/hasOral is false (e.g. Drawing/EVS), those terms contribute 0.
    const divisor = config.divisor || 3
    const internalObt = (faA + faB + assign + oral) / divisor

    const totalObt = internalObt + sa
    const cleanInternalObt = Number.isInteger(internalObt) ? internalObt : Number(internalObt.toFixed(4))
    const cleanTotalObt = Number.isInteger(totalObt) ? totalObt : Number(totalObt.toFixed(4))

    return {
      faWeighted: (faA + faB) / 2,
      internalObt: cleanInternalObt,
      internalMax: config.internalMax,
      totalObt: cleanTotalObt,
      maxMarks: effectiveTermMax,
    }
  }

  // Fallback / legacy calculation when no class/subject context is provided
  const faWeighted = (faA + faB) / 2
  const totalObt = sa + faWeighted
  const maxMarks = (Number(saMax) || 80) + ((Number(faAMax) || 20) + (Number(faBMax) || 20)) / 2
  const cleanTotalObt = Number.isInteger(totalObt) ? totalObt : Number(totalObt.toFixed(4))

  return {
    faWeighted,
    internalObt: faWeighted,
    internalMax: ((Number(faAMax) || 20) + (Number(faBMax) || 20)) / 2,
    totalObt: cleanTotalObt,
    maxMarks: maxMarks || 100,
  }
}

/**
 * Calculate Annual / Final Marks for a subject:
 * Term 1 Total (out of 100) + Term 2 Total (out of 100) => Total out of 200.
 */
export function calculateAnnualSubjectMarks(t1Obt = 0, t2Obt = 0, t1Max = 100, t2Max = 100) {
  const t1 = Number(t1Obt) || 0
  const t2 = Number(t2Obt) || 0
  const totalObt = t1 + t2
  const maxMarks = (Number(t1Max) || 100) + (Number(t2Max) || 100)

  const cleanTotalObt = Number.isInteger(totalObt) ? totalObt : Number(totalObt.toFixed(2))

  return {
    totalObt: cleanTotalObt,
    maxMarks: maxMarks || 200,
  }
}

/**
 * Calculate Division based on percentage.
 */
export function calculateDivision(percentage) {
  const p = Number(percentage)
  if (isNaN(p) || p < 33) return 'Failed'
  if (p >= 60) return 'First'
  if (p >= 45) return 'Second'
  return 'Third'
}

/**
 * Helper to generate default empty scholastic marks for a class.
 * Uses the new FA-1/FA-2/SA-1 (with Assignment & Oral)/FA-3/FA-4/SA-2 (with Assignment & Oral) schema.
 */
export function createScholasticTemplateForClass(clsKey) {
  const normKey = matchClassKey(clsKey) || clsKey || 'I'
  const subjects = DEFAULT_CLASS_SUBJECTS[normKey] || DEFAULT_CLASS_SUBJECTS['I']
  return subjects.map((sub) => {
    const config = getSubjectMarkConfig(normKey, sub)
    return {
      name: sub,
      // Term 1 — Half-Yearly
      fa1Max: 20, fa1Obt: 0,   // F.A.-1 (May)
      fa2Max: 20, fa2Obt: 0,   // F.A.-2 (July)
      sa1AssignMax: config.assignMax, sa1AssignObt: 0, // Assignment / Dictation
      sa1OralMax: config.oralMax, sa1OralObt: 0,       // Oral / Practical / Game
      sa1Max: config.theoryMax, sa1Obt: 0,             // S.A.-1 Half-Yearly Theory (September)
      // Term 2 — Annual
      fa3Max: 20, fa3Obt: 0,   // F.A.-3 (November)
      fa4Max: 20, fa4Obt: 0,   // F.A.-4 (January)
      sa2AssignMax: config.assignMax, sa2AssignObt: 0, // Assignment / Dictation
      sa2OralMax: config.oralMax, sa2OralObt: 0,       // Oral / Practical / Game
      sa2Max: config.theoryMax, sa2Obt: 0,             // S.A.-2 Annual Theory (March)
    }
  })
}

function makeStudent(id, srNo, parentId, name, father, mother, dob, cls) {
  return {
    id,
    studentId: id,
    name,
    fatherName: father,
    motherName: '',
    dob,
    class: cls,
    session: CURRENT_ACADEMIC_SESSION,
    scholastic: createScholasticTemplateForClass(cls),
    coScholasticHalfYearly: { 'Reading Skill': 'A', 'Writing Skill': 'A', 'Art Education': 'B', 'Music and Instrumentation': 'B', 'Games': 'A', 'S.U.P.W.': 'A', 'Good Manners': 'A', 'Attentive in the Class': 'A', 'Fluency in English': 'B', 'Co-curricular Activities': 'A' },
    coScholasticAnnual: { 'Reading Skill': 'A', 'Writing Skill': 'A', 'Art Education': 'B', 'Music and Instrumentation': 'B', 'Games': 'A', 'S.U.P.W.': 'A', 'Good Manners': 'A', 'Attentive in the Class': 'A', 'Fluency in English': 'B', 'Co-curricular Activities': 'A' },
    disciplineHalfYearly: 'A',
    disciplineAnnual: 'A',
    attendanceHalfYearly: { attended: 104, total: 110 },
    attendanceAnnual: { attended: 195, total: 215 },
    teacherRemarksHalfYearly: 'Good performance.',
    teacherRemarksAnnual: 'Excellent performance and regular attendance.',
    promotedClass: 'Promoted to Next Higher Class',
    place: 'Ayodhya',
    date: '29/03/2027',
  }
}

/**
 * Realistic student records per class for offline sample fallback.
 */
export const INITIAL_SAMPLE_STUDENTS = [
  // Class I
  makeStudent('STUD001001', '1001', 'PAR001001', 'AARAV SHARMA', 'MR. RAJESH SHARMA', 'MRS. POOJA SHARMA', '15/05/2020', 'I'),
  makeStudent('STUD001002', '1002', 'PAR001002', 'ANANYA GUPTA', 'MR. MANOJ GUPTA', 'MRS. SUNITA GUPTA', '18/08/2020', 'I'),
  makeStudent('STUD001003', '1003', 'PAR001003', 'ADWIK VERMA', 'MR. SANJAY VERMA', 'MRS. REENA VERMA', '12/03/2020', 'I'),
  makeStudent('STUD001004', '1004', 'PAR001004', 'BHOOMI SINGH', 'MR. VIKRAM SINGH', 'MRS. KAVITA SINGH', '04/11/2020', 'I'),

  // Class II
  makeStudent('STUD002001', '2001', 'PAR002001', 'DEV MISHRA', 'MR. ALOK MISHRA', 'MRS. SARITA MISHRA', '10/01/2019', 'II'),
  makeStudent('STUD002002', '2002', 'PAR002002', 'ISHITA PANDEY', 'MR. ANIL PANDEY', 'MRS. MEENA PANDEY', '22/06/2019', 'II'),
  makeStudent('STUD002003', '2003', 'PAR002003', 'KAVYA SRIVASTAVA', 'MR. PANKAJ SRIVASTAVA', 'MRS. RITU SRIVASTAVA', '05/09/2019', 'II'),
  makeStudent('STUD002004', '2004', 'PAR002004', 'MANAV JOSHI', 'MR. HARISH JOSHI', 'MRS. LATA JOSHI', '30/12/2019', 'II'),

  // Class III
  makeStudent('STUD003001', '3001', 'PAR003001', 'NAVYA DUBEY', 'MR. RAVI DUBEY', 'MRS. SHALINI DUBEY', '14/04/2018', 'III'),
  makeStudent('STUD003002', '3002', 'PAR003002', 'PRANAV YADAV', 'MR. BALRAM YADAV', 'MRS. URMILA YADAV', '08/07/2018', 'III'),

  // Class IV
  makeStudent('STUD004001', '4001', 'PAR004001', 'TANVI AGRAWAL', 'MR. VINOD AGRAWAL', 'MRS. RITU AGRAWAL', '11/03/2017', 'IV'),
  makeStudent('STUD004002', '4002', 'PAR004002', 'UTKARSH TIWARI', 'MR. SURESH TIWARI', 'MRS. MAMTA TIWARI', '02/09/2017', 'IV'),

  // Class V (Contains ONLY actual Class V sample entries)
  makeStudent('STUD005001', '5001', 'PAR005001', 'ABHINAV KUMAR', 'MR. MANOJ KUMAR', 'MRS. ARCHANA KUMAR', '18/01/2016', 'V'),
  makeStudent('STUD005002', '5002', 'PAR005002', 'BHAWNA SINGH', 'MR. VIKRAM SINGH', 'MRS. KAVITA SINGH', '05/11/2016', 'V'),
  makeStudent('STUD005003', '5003', 'PAR005003', 'CHETAN PATEL', 'MR. DEEPAK PATEL', 'MRS. MONIKA PATEL', '14/06/2016', 'V'),
  makeStudent('STUD005004', '5004', 'PAR005004', 'DIVYA MISHRA', 'MR. ALOK MISHRA', 'MRS. SHALINI MISHRA', '02/09/2016', 'V'),
  makeStudent('STUD005005', '5005', 'PAR005005', 'EKANSH CHAUHAN', 'MR. YASHWANT CHAUHAN', 'MRS. KANCHAN CHAUHAN', '20/12/2016', 'V'),

  // Class VI
  makeStudent('STUD006001', '6001', 'PAR006001', 'HARSH SRIVASTAVA', 'MR. ANAND SRIVASTAVA', 'MRS. SUMAN SRIVASTAVA', '15/05/2015', 'VI'),
  makeStudent('STUD006002', '6002', 'PAR006002', 'JANHAVI MISHRA', 'MR. ALOK MISHRA', 'MRS. SARITA MISHRA', '18/08/2015', 'VI'),

  // Class VII
  makeStudent('STUD007001', '7001', 'PAR007001', 'NIKHIL VERMA', 'MR. SANJAY VERMA', 'MRS. REENA VERMA', '10/01/2014', 'VII'),

  // Class VIII
  makeStudent('STUD008001', '8001', 'PAR008001', 'SHORYA TANDON', 'MR. DEEPAK TANDON', 'MRS. MONIKA TANDON', '14/06/2013', 'VIII'),

  // Class IX
  makeStudent('STUD009001', '9001', 'PAR009001', 'RAHUL TIWARI', 'MR. SURESH TIWARI', 'MRS. MAMTA TIWARI', '20/12/2012', 'IX'),

  // Class X
  makeStudent('STUD010001', '10001', 'PAR010001', 'PRIYA AGRAWAL', 'MR. VINOD AGRAWAL', 'MRS. RITU AGRAWAL', '11/04/2011', 'X'),

  // Class XI Science
  makeStudent('STUD011001', '11001', 'PAR011001', 'AMAN RAJPUT', 'MR. PRATAP RAJPUT', 'MRS. SARITA RAJPUT', '08/07/2010', 'XI Science'),

  // Class XI Commerce
  makeStudent('STUD011101', '11101', 'PAR011101', 'MUSKAN JAIN', 'MR. PANKAJ JAIN', 'MRS. MEENA JAIN', '25/02/2010', 'XI Commerce'),

  // Class XI Humanities
  makeStudent('STUD011201', '11201', 'PAR011201', 'HARSHVARDHAN YADAV', 'MR. BALRAM YADAV', 'MRS. URMILA YADAV', '19/10/2010', 'XI Humanities'),

  // Class XII Science
  makeStudent('STUD012001', '12001', 'PAR012001', 'ROHIT SRIVASTAVA', 'MR. ANAND SRIVASTAVA', 'MRS. SUMAN SRIVASTAVA', '30/03/2009', 'XII Science'),

  // Class XII Commerce
  makeStudent('STUD012101', '12101', 'PAR012101', 'NEHA RATHORE', 'MR. SURAJ RATHORE', 'MRS. LATA RATHORE', '12/12/2009', 'XII Commerce'),

  // Class XII Humanities
  makeStudent('STUD012201', '12201', 'PAR012201', 'SAKSHI CHAUHAN', 'MR. YASHWANT CHAUHAN', 'MRS. KANCHAN CHAUHAN', '04/04/2009', 'XII Humanities'),
]
