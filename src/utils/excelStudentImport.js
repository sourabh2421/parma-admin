import * as XLSX from 'xlsx'

const normalizeKey = (key) => key?.toString().trim().toLowerCase().replace(/[\s_.-]/g, '') || ''

const getCellValue = (row, keys) => {
  const normalizedKeys = Object.keys(row).reduce((acc, key) => {
    acc[normalizeKey(key)] = row[key]
    return acc
  }, {})

  for (const key of keys) {
    if (normalizedKeys[key] !== undefined && normalizedKeys[key] !== null) {
      return String(normalizedKeys[key]).trim()
    }
  }

  return ''
}

const looksLikeStudentId = (value) => /^[a-z]{0,4}\d+$/i.test(String(value || '').trim())
const looksLikePersonName = (value) =>
  /^[a-z][a-z\s.'-]{1,}$/i.test(String(value || '').trim()) && !looksLikeStudentId(value)
const looksLikeClassValue = (value) =>
  /^(ukg|lkg|nur|nsy|nur\.|class\s*\d+|\d+[a-z]?|[ivx]+)$/i.test(String(value || '').trim())

export function normalizeImportedStudent(student, index) {
  let id = String(student.id ?? '').trim()
  let name = String(student.name ?? '').trim()
  let parentName = String(student.parentName ?? '').trim()
  let klass = String(student.class ?? '').trim()

  if (looksLikePersonName(id) && looksLikeStudentId(name)) {
    const t = id
    id = name
    name = t
  }

  if (!parentName && looksLikePersonName(klass) && !looksLikeClassValue(klass)) {
    parentName = klass
    klass = ''
  }

  return {
    id: id || `SID-${index + 1}`,
    name: name || `Student ${index + 1}`,
    parentName: parentName || 'N/A',
    class: klass || 'N/A',
  }
}

function buildImportRow(row, index) {
  const name = getCellValue(row, ['studentsname', 'studentname', 'name'])
  const studentId = getCellValue(row, [
    'studid',
    'studentid',
    'studentcode',
    'id',
    'rollnumber',
    'rollno',
  ])
  const parentName = getCellValue(row, [
    'parentsname',
    'parentname',
    'fathername',
    'guardianname',
  ])
  const studentClass = getCellValue(row, ['class', 'classname', 'studentclass', 'standard', 'grade'])

  if (!name || !studentId || !studentClass) {
    console.warn('Skipping row — missing name, student id, or class:', row)
    return null
  }

  return normalizeImportedStudent(
    {
      id: studentId,
      name,
      parentName,
      class: studentClass,
    },
    index,
  )
}

export function parseStudentImportSheet(sheet) {
  const rowsWithHeaders = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  const mappedFromHeaders = rowsWithHeaders.map(buildImportRow).filter(Boolean)
  if (mappedFromHeaders.length > 0) return mappedFromHeaders

  const rowsAsArray = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const headerRow = Array.isArray(rowsAsArray[0]) ? rowsAsArray[0] : []
  const normalizedHeaderRow = headerRow.map((value) => normalizeKey(value))

  const findColumnIndex = (possibleKeys) =>
    normalizedHeaderRow.findIndex((header) => possibleKeys.includes(header))

  const idIndex = findColumnIndex([
    'studid',
    'studentid',
    'studentcode',
    'id',
    'rollnumber',
    'rollno',
  ])
  const nameIndex = findColumnIndex(['studentsname', 'studentname', 'name'])
  const parentIndex = findColumnIndex([
    'parentsname',
    'parentname',
    'fathername',
    'guardianname',
  ])
  const classIndex = findColumnIndex(['class', 'classname', 'studentclass', 'standard', 'grade'])

  const dataRows = rowsAsArray.slice(1)

  return dataRows
    .map((row, index) => {
      if (!Array.isArray(row)) return null
      const studentId = idIndex >= 0 ? row[idIndex] : row[0]
      const name = nameIndex >= 0 ? row[nameIndex] : row[1]
      const parentName = parentIndex >= 0 ? row[parentIndex] : row[2]
      const studentClass = classIndex >= 0 ? row[classIndex] : row[3]

      if (!name || !studentId || !studentClass) {
        console.warn('Skipping row — missing name, student id, or class:', row)
        return null
      }

      return normalizeImportedStudent(
        {
          id: String(studentId).trim(),
          name: String(name).trim(),
          parentName: String(parentName || '').trim(),
          class: String(studentClass).trim(),
        },
        index,
      )
    })
    .filter(Boolean)
}
