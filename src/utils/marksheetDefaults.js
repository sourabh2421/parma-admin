/**
 * Default Main Subjects Configuration per Class:
 * Pre-Primary (Playgroup, Nursery, LKG, UKG) + Class I to XII (Science, Commerce, Humanities)
 */
export const DEFAULT_CLASS_SUBJECTS = {
  'Playgroup': ['English', 'Number Work', 'Rhymes', 'Drawing & Colouring', 'Art & Craft', 'General Awareness'],
  'Nursery': ['English', 'Hindi', 'Maths', 'Rhymes & Story', 'Drawing & Colouring', 'General Knowledge'],
  'LKG': ['English', 'Hindi', 'Maths', 'EVS', 'Drawing', 'Rhymes & Conversation'],
  'UKG': ['English', 'Hindi', 'Maths', 'EVS', 'Drawing', 'General Knowledge'],
  'I': ['English', 'Hindi', 'Maths', 'EVS', 'GK', 'Computer'],
  'II': ['English', 'Hindi', 'Maths', 'EVS', 'GK', 'Computer'],
  'III': ['English', 'Hindi', 'Maths', 'Science', 'Social Studies', 'Sanskrit'],
  'IV': ['English', 'Hindi', 'Maths', 'Science', 'Social Studies', 'Sanskrit'],
  'V': ['English', 'Hindi', 'Maths', 'Science', 'Social Studies', 'Sanskrit'],
  'VI': ['English', 'Hindi', 'Maths', 'Science', 'Social Studies', 'Sanskrit'],
  'VII': ['English', 'Hindi', 'Maths', 'Science', 'Social Studies', 'Sanskrit'],
  'VIII': ['English', 'Hindi', 'Maths', 'Science', 'Social Studies', 'Sanskrit'],
  'IX': ['English', 'Hindi', 'Maths', 'Science (Phy+Chem+Bio)', 'Social Science', 'Health & Phy. Edu.'],
  'X': ['English', 'Hindi', 'Maths', 'Science (Phy+Chem+Bio)', 'Social Science', 'Health & Phy. Edu.'],
  'XI Science': ['English', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Physical Education'],
  'XI Commerce': ['English', 'Accountancy', 'Business Studies', 'Economics', 'Hindi', 'Physical Education'],
  'XI Humanities': ['English', 'History', 'Political Science', 'Economics', 'Hindi', 'Physical Education'],
  'XII Science': ['English', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Physical Education'],
  'XII Commerce': ['English', 'Accountancy', 'Business Studies', 'Economics', 'Hindi', 'Physical Education'],
  'XII Humanities': ['English', 'History', 'Political Science', 'Economics', 'Physical Education'],
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
 * Calculate Term Marks (Half-Yearly or Term 2):
 * FA-1 (20) & FA-2 (20) combined and divided by 2 (max 20).
 * Combined FA is added to SA (80) -> Total is out of 100.
 * Example: FA-1: 16, FA-2: 20, SA-1: 60 => 60 + ((16 + 20) / 2) = 78 out of 100.
 */
export function calculateTermMarks(faAObt = 0, faBObt = 0, saObt = 0, faAMax = 20, faBMax = 20, saMax = 80) {
  const faA = Number(faAObt) || 0
  const faB = Number(faBObt) || 0
  const sa = Number(saObt) || 0

  const faWeighted = (faA + faB) / 2
  const totalObt = sa + faWeighted
  const maxMarks = (Number(saMax) || 80) + ((Number(faAMax) || 20) + (Number(faBMax) || 20)) / 2

  // Format cleanly (e.g. 78 or 77.5)
  const cleanTotalObt = Number.isInteger(totalObt) ? totalObt : Number(totalObt.toFixed(2))

  return {
    faWeighted,
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
 * Uses the new FA-1/FA-2/SA-1/FA-3/FA-4/SA-2 schema.
 */
export function createScholasticTemplateForClass(clsKey) {
  const subjects = DEFAULT_CLASS_SUBJECTS[clsKey] || DEFAULT_CLASS_SUBJECTS['I']
  return subjects.map((sub) => ({
    name: sub,
    // Term 1 — Half-Yearly
    fa1Max: 20, fa1Obt: 0,   // F.A.-1 (May)
    fa2Max: 20, fa2Obt: 0,   // F.A.-2 (July)
    sa1Max: 80, sa1Obt: 0,   // S.A.-1 Half-Yearly (September)
    // Term 2 — Annual
    fa3Max: 20, fa3Obt: 0,   // F.A.-3 (November)
    fa4Max: 20, fa4Obt: 0,   // F.A.-4 (January)
    sa2Max: 80, sa2Obt: 0,   // S.A.-2 Annual (March)
  }))
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
