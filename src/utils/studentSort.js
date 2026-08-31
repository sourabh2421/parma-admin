const textCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

const ROMAN_MAP = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
  xi: 11,
  xii: 12,
}

export function getClassSortMeta(className = '') {
  const normalized = String(className).trim().toLowerCase()
  if (!normalized) {
    return {
      numericLevel: Number.MAX_SAFE_INTEGER,
      section: '',
      raw: '',
    }
  }

  const cleaned = normalized.replace(/^(?:class|std|standard|grade)\s*/i, '').trim()

  // 1. Playgroup / PG
  if (/^(?:playgroup|pg)(?:\b|[\s-_]|$)/i.test(cleaned)) {
    const section = cleaned.replace(/^(?:playgroup|pg)\s*/i, '').trim()
    return { numericLevel: 1, section, raw: cleaned }
  }

  // 2. Nursery / Nur / Nsy / Pre-Nursery
  if (/^(?:pre[-_\s]?nursery|nursery|nur\.?|nsy)(?:\b|[\s-_]|$)/i.test(cleaned)) {
    const section = cleaned.replace(/^(?:pre[-_\s]?nursery|nursery|nur\.?|nsy)\s*/i, '').trim()
    return { numericLevel: 2, section, raw: cleaned }
  }

  // 3. LKG / Lower KG / Jr KG
  if (/^(?:l\.?k\.?g\.?|lower\s*k\.?g\.?|jr\.?\s*k\.?g\.?|junior\s*k\.?g\.?)(?:\b|[\s-_]|$)/i.test(cleaned)) {
    const section = cleaned
      .replace(/^(?:l\.?k\.?g\.?|lower\s*k\.?g\.?|jr\.?\s*k\.?g\.?|junior\s*k\.?g\.?)\s*/i, '')
      .trim()
    return { numericLevel: 3, section, raw: cleaned }
  }

  // 4. UKG / Upper KG / Sr KG / KG
  if (/^(?:u\.?k\.?g\.?|upper\s*k\.?g\.?|sr\.?\s*k\.?g\.?|senior\s*k\.?g\.?|kg)(?:\b|[\s-_]|$)/i.test(cleaned)) {
    const section = cleaned
      .replace(/^(?:u\.?k\.?g\.?|upper\s*k\.?g\.?|sr\.?\s*k\.?g\.?|senior\s*k\.?g\.?|kg)\s*/i, '')
      .trim()
    return { numericLevel: 4, section, raw: cleaned }
  }

  // 5. Roman numerals: I to XII
  const romanMatch = cleaned.match(/^(xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)(?:\b|[\s-_]|$)/i)
  if (romanMatch) {
    const romanVal = ROMAN_MAP[romanMatch[1].toLowerCase()]
    const section = cleaned.slice(romanMatch[0].length).trim()
    return {
      numericLevel: 100 + romanVal,
      section,
      raw: cleaned,
    }
  }

  // 6. Arabic numerals: 1, 2, 3, 1st, 2nd, etc.
  const digitMatch = cleaned.match(/^(\d+)(?:st|nd|rd|th)?(?:\b|[\s-_]|$)/i)
  if (digitMatch) {
    const digitVal = Number(digitMatch[1])
    const section = cleaned.slice(digitMatch[0].length).trim()
    return {
      numericLevel: 100 + digitVal,
      section,
      raw: cleaned,
    }
  }

  // Fallback for custom or unknown class strings
  return {
    numericLevel: Number.MAX_SAFE_INTEGER,
    section: cleaned,
    raw: cleaned,
  }
}

export function getIdSortNumber(id = '') {
  const match = String(id).match(/\d+/)
  if (!match) return Number.MAX_SAFE_INTEGER
  return Number(match[0])
}

export function compareClasses(classA = '', classB = '') {
  const metaA = getClassSortMeta(classA)
  const metaB = getClassSortMeta(classB)

  if (metaA.numericLevel !== metaB.numericLevel) {
    return metaA.numericLevel - metaB.numericLevel
  }

  const sectionComp = textCollator.compare(metaA.section, metaB.section)
  if (sectionComp !== 0) return sectionComp

  return textCollator.compare(metaA.raw, metaB.raw)
}

export function sortClassNames(classList = []) {
  return [...classList].sort((a, b) => compareClasses(a, b))
}

export function sortStudentsByClassThenId(studentList) {
  return [...studentList].sort((a, b) => {
    const classComp = compareClasses(a.class, b.class)
    if (classComp !== 0) return classComp

    const idNum = getIdSortNumber(a.id) - getIdSortNumber(b.id)
    if (idNum !== 0) return idNum
    return textCollator.compare(String(a.id), String(b.id))
  })
}

export function sortStudentsByStudentId(studentList) {
  return [...studentList].sort((a, b) => {
    const idNum = getIdSortNumber(a.id) - getIdSortNumber(b.id)
    if (idNum !== 0) return idNum
    return textCollator.compare(String(a.id), String(b.id))
  })
}
