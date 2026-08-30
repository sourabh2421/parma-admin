const textCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export function getClassSortMeta(className = '') {
  const normalized = String(className).trim().toLowerCase()
  const cleaned = normalized.replace(/^(class|std|grade)\s*/i, '').trim()
  const numericMatch = cleaned.match(/\d+/)
  const numericLevel = numericMatch ? Number(numericMatch[0]) : Number.MAX_SAFE_INTEGER
  const section = cleaned.replace(/\d+/g, '').trim()

  return {
    numericLevel,
    section,
    raw: cleaned || normalized,
  }
}

export function getIdSortNumber(id = '') {
  const match = String(id).match(/\d+/)
  if (!match) return Number.MAX_SAFE_INTEGER
  return Number(match[0])
}

export function sortStudentsByClassThenId(studentList) {
  return [...studentList].sort((a, b) => {
    const classA = getClassSortMeta(a.class)
    const classB = getClassSortMeta(b.class)
    if (classA.numericLevel !== classB.numericLevel) {
      return classA.numericLevel - classB.numericLevel
    }
    const sectionComparison = textCollator.compare(classA.section, classB.section)
    if (sectionComparison !== 0) return sectionComparison
    const classComparison = textCollator.compare(classA.raw, classB.raw)
    if (classComparison !== 0) return classComparison

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
