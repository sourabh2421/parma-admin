import * as XLSX from 'xlsx'

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportStudentsAndFeesJson(students, fees) {
  const payload = {
    exportedAt: new Date().toISOString(),
    students,
    fees,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  downloadBlob(`parma-backup-${Date.now()}.json`, blob)
}

export function exportStudentsAndFeesExcel(students, fees) {
  const wb = XLSX.utils.book_new()
  const wsStudents = XLSX.utils.json_to_sheet(
    students.map((s) => ({
      studentId: s.id,
      name: s.name,
      parentName: s.parentName,
      class: s.class,
      createdAt: s.createdAt ?? '',
      updatedAt: s.updatedAt ?? '',
    })),
  )
  const wsFees = XLSX.utils.json_to_sheet(
    fees.map((f) => ({
      docId: f.docId,
      studentId: f.studentId,
      studentName: f.studentName,
      class: f.class,
      month: f.month,
      year: f.year,
      amount: f.amount,
      status: f.status,
      paymentDate: f.paymentDate ?? '',
      createdAt: f.createdAt ?? '',
      updatedAt: f.updatedAt ?? '',
    })),
  )
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Students')
  XLSX.utils.book_append_sheet(wb, wsFees, 'Fees')
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  downloadBlob(`parma-backup-${Date.now()}.xlsx`, blob)
}
