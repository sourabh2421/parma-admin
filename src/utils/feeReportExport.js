import * as XLSX from 'xlsx'

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function formatCurrency(num) {
  const n = Number(num) || 0
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Sanitizes cell values to prevent CSV / Spreadsheet Formula Injection.
 */
export function sanitizeExcelCell(val) {
  if (typeof val === 'string' && /^[=+\-@\t\r]/.test(val)) {
    return `'${val}`
  }
  return val
}

/**
 * Escapes HTML entities to prevent Cross-Site Scripting (XSS).
 */
export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Exports fee records to Excel (.xlsx) file with financial summary.
 */
export function exportFeesToExcel(fees = [], periodLabel = 'All Time') {
  const wb = XLSX.utils.book_new()

  const formattedRows = fees.map((f, idx) => ({
    'Sr No': idx + 1,
    'Student ID': sanitizeExcelCell(f.studentId || ''),
    'Student Name': sanitizeExcelCell(f.studentName || ''),
    'Class': sanitizeExcelCell(f.class || ''),
    'Month': sanitizeExcelCell(f.month || ''),
    'Year': f.year || '',
    'Gross Fee (INR)': f.grossFee ?? (f.totalAmount ?? f.amount ?? 0),
    'Waiver Total (INR)': f.waiverTotal ?? 0,
    'Waiver Reason(s)': sanitizeExcelCell(
      Array.isArray(f.waivers) && f.waivers.length > 0
        ? f.waivers
            .map((w) => `${w.head ? w.head + ': ' : ''}${w.reason || 'Waiver'}`)
            .filter(Boolean)
            .join('; ')
        : f.waiverReason || '',
    ),
    'Total Fee (INR)': f.totalAmount ?? f.amount ?? 0,
    'Amount Paid (INR)': f.amount ?? 0,
    'Remaining Due (INR)': f.remainingAmount ?? 0,
    'Tuition Fee': f.tuitionFee ?? 0,
    'Conveyance Fee': f.conveyanceFee ?? 0,
    'Exam Fee': f.examFee ?? 0,
    'Annual/Transfer Fee': f.annualFee ?? 0,
    'Admission Fee': f.admissionFee ?? 0,
    'Late Fee': f.lateFee ?? 0,
    'Status': f.status === 'paid' && (!f.remainingAmount || f.remainingAmount <= 0) ? 'Paid' : (f.status === 'partial' || f.remainingAmount > 0 ? 'Partial' : 'Pending'),
    'Payment Date': formatDate(f.paymentDate),
    'Cheque / Ref No': sanitizeExcelCell(f.chequeNo || ''),
  }))

  const ws = XLSX.utils.json_to_sheet(formattedRows)
  XLSX.utils.book_append_sheet(wb, ws, 'Fee Records')

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const cleanPeriod = periodLabel.toLowerCase().replace(/\s+/g, '_')
  downloadBlob(`parma_fee_records_${cleanPeriod}_${Date.now()}.xlsx`, blob)
}

/**
 * Exports fee records to CSV.
 */
export function exportFeesToCsv(fees = [], periodLabel = 'All Time') {
  const wb = XLSX.utils.book_new()

  const formattedRows = fees.map((f, idx) => ({
    'Sr No': idx + 1,
    'Student ID': sanitizeExcelCell(f.studentId || ''),
    'Student Name': sanitizeExcelCell(f.studentName || ''),
    'Class': sanitizeExcelCell(f.class || ''),
    'Month': sanitizeExcelCell(f.month || ''),
    'Year': f.year || '',
    'Gross Fee (INR)': f.grossFee ?? (f.totalAmount ?? f.amount ?? 0),
    'Waiver Total (INR)': f.waiverTotal ?? 0,
    'Waiver Reason(s)': sanitizeExcelCell(
      Array.isArray(f.waivers) && f.waivers.length > 0
        ? f.waivers
            .map((w) => `${w.head ? w.head + ': ' : ''}${w.reason || 'Waiver'}`)
            .filter(Boolean)
            .join('; ')
        : f.waiverReason || '',
    ),
    'Total Fee (INR)': f.totalAmount ?? f.amount ?? 0,
    'Amount Paid (INR)': f.amount ?? 0,
    'Remaining Due (INR)': f.remainingAmount ?? 0,
    'Status': f.status === 'paid' && (!f.remainingAmount || f.remainingAmount <= 0) ? 'Paid' : (f.status === 'partial' || f.remainingAmount > 0 ? 'Partial' : 'Pending'),
    'Payment Date': formatDate(f.paymentDate),
    'Cheque / Ref No': sanitizeExcelCell(f.chequeNo || ''),
  }))

  const ws = XLSX.utils.json_to_sheet(formattedRows)
  XLSX.utils.book_append_sheet(wb, ws, 'Fee Records')

  const csvOutput = XLSX.utils.sheet_to_csv(ws)
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' })
  const cleanPeriod = periodLabel.toLowerCase().replace(/\s+/g, '_')
  downloadBlob(`parma_fee_records_${cleanPeriod}_${Date.now()}.csv`, blob)
}

/**
 * Exports fee records to JSON.
 */
export function exportFeesToJson(fees = [], periodLabel = 'All Time') {
  const jsonRows = fees.map((f, idx) => ({
    srNo: idx + 1,
    studentId: f.studentId || '',
    studentName: f.studentName || '',
    class: f.class || '',
    month: f.month || '',
    year: f.year || '',
    grossFee: f.grossFee ?? (f.totalAmount ?? f.amount ?? 0),
    waiverTotal: f.waiverTotal ?? 0,
    waiverReasons:
      Array.isArray(f.waivers) && f.waivers.length > 0
        ? f.waivers
            .map((w) => `${w.head ? w.head + ': ' : ''}${w.reason || 'Waiver'}`)
            .filter(Boolean)
            .join('; ')
        : f.waiverReason || '',
    waivers: f.waivers || [],
    totalFee: f.totalAmount ?? f.amount ?? 0,
    amountPaid: f.amount ?? 0,
    remainingDue: f.remainingAmount ?? 0,
    tuitionFee: f.tuitionFee ?? 0,
    conveyanceFee: f.conveyanceFee ?? 0,
    examFee: f.examFee ?? 0,
    annualFee: f.annualFee ?? 0,
    admissionFee: f.admissionFee ?? 0,
    lateFee: f.lateFee ?? 0,
    status:
      f.status === 'paid' && (!f.remainingAmount || f.remainingAmount <= 0)
        ? 'Paid'
        : f.status === 'partial' || f.remainingAmount > 0
          ? 'Partial'
          : 'Pending',
    paymentDate: formatDate(f.paymentDate),
    chequeNo: f.chequeNo || '',
  }))

  const blob = new Blob([JSON.stringify(jsonRows, null, 2)], { type: 'application/json' })
  const cleanPeriod = periodLabel.toLowerCase().replace(/\s+/g, '_')
  downloadBlob(`parma_fee_records_${cleanPeriod}_${Date.now()}.json`, blob)
}

/**
 * Generates an official printable Fee Collection & Audit Statement
 */
export function printFeeCollectionReport(fees = [], metrics = {}, periodLabel = 'Current Period') {
  const printTimestamp = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const totalCollected = metrics.totalCollected ?? fees.reduce((acc, f) => acc + (f.status === 'paid' || f.status === 'partial' ? Number(f.amount || 0) : 0), 0)
  const totalDue = metrics.totalDue ?? fees.reduce((acc, f) => acc + (Number(f.remainingAmount || 0)), 0)
  const totalExpected = totalCollected + totalDue

  const rowsHtml = fees.length === 0
    ? `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #666;">No fee records found for this period.</td></tr>`
    : fees.map((f, idx) => {
        const isPaid = f.status === 'paid' && (!f.remainingAmount || f.remainingAmount <= 0)
        const isPartial = f.status === 'partial' || (f.status === 'paid' && f.remainingAmount > 0)
        const statusBadge = isPaid
          ? '<span style="color: #15803d; font-weight: bold;">Paid</span>'
          : (isPartial ? '<span style="color: #92400e; font-weight: bold;">Partial</span>' : '<span style="color: #b91c1c; font-weight: bold;">Pending</span>')

        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 8.5pt;">
            <td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
            <td style="padding: 6px 8px; font-weight: bold;">${escapeHtml(f.studentId || '—')}</td>
            <td style="padding: 6px 8px;">${escapeHtml(f.studentName || '—')}</td>
            <td style="padding: 6px 8px; text-align: center;">${escapeHtml(f.class || '—')}</td>
            <td style="padding: 6px 8px; text-align: center;">${escapeHtml(f.month)} ${escapeHtml(f.year)}</td>
            <td style="padding: 6px 8px; text-align: right;">₹ ${formatCurrency(f.totalAmount ?? f.amount)}</td>
            <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #15803d;">₹ ${formatCurrency(f.amount)}</td>
            <td style="padding: 6px 8px; text-align: right; color: ${f.remainingAmount > 0 ? '#b91c1c' : '#555'};">₹ ${formatCurrency(f.remainingAmount)}</td>
            <td style="padding: 6px 8px; text-align: center;">${statusBadge}</td>
          </tr>
        `
      }).join('')

  const reportHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Parma Academy - Fee Collection Report (${escapeHtml(periodLabel)})</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 9pt; color: #1e293b; background: #fff; padding: 10px; }
        .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
        .header h1 { font-size: 18pt; font-weight: bold; letter-spacing: 1px; color: #0f172a; margin-bottom: 2px; }
        .header .sub { font-size: 9.5pt; color: #475569; }
        .meta-bar { display: flex; justify-content: space-between; font-size: 8.5pt; margin-bottom: 12px; color: #334155; }
        .badge { background: #0f172a; color: #fff; padding: 3px 8px; border-radius: 4px; font-weight: bold; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
        .summary-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; background: #f8fafc; }
        .summary-title { font-size: 7.5pt; text-transform: uppercase; font-weight: bold; color: #64748b; }
        .summary-val { font-size: 13pt; font-weight: 900; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th { background: #0f172a; color: #fff; font-size: 8pt; text-transform: uppercase; padding: 6px 8px; text-align: left; }
        .footer { margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 8pt; color: #64748b; }
        .signature { border-top: 1px solid #0f172a; width: 180px; text-align: center; padding-top: 4px; font-weight: bold; color: #0f172a; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>PARMA ACADEMY</h1>
        <div class="sub">ICSE Affiliated · Parikrama Marg, Parmapuram, Ayodhya · Phone: 9559993008</div>
        <div style="font-weight: bold; font-size: 11pt; margin-top: 4px; color: #0f172a;">FEE COLLECTION & AUDIT STATEMENT</div>
      </div>

      <div class="meta-bar">
        <div><strong>Period:</strong> <span class="badge">${escapeHtml(periodLabel)}</span></div>
        <div><strong>Total Records:</strong> ${fees.length}</div>
        <div><strong>Generated On:</strong> ${escapeHtml(printTimestamp)}</div>
      </div>

      <div class="summary-grid">
        <div class="summary-card" style="border-left: 4px solid #16a34a;">
          <div class="summary-title">Total Fees Collected</div>
          <div class="summary-val" style="color: #15803d;">₹ ${formatCurrency(totalCollected)}</div>
        </div>
        <div class="summary-card" style="border-left: 4px solid #f59e0b;">
          <div class="summary-title">Total Remaining Due</div>
          <div class="summary-val" style="color: #b45309;">₹ ${formatCurrency(totalDue)}</div>
        </div>
        <div class="summary-card" style="border-left: 4px solid #0284c7;">
          <div class="summary-title">Total Expected Amount</div>
          <div class="summary-val" style="color: #0369a1;">₹ ${formatCurrency(totalExpected)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 4%; text-align: center;">#</th>
            <th style="width: 10%;">Student ID</th>
            <th style="width: 20%;">Student Name</th>
            <th style="width: 8%; text-align: center;">Class</th>
            <th style="width: 12%; text-align: center;">Month/Year</th>
            <th style="width: 12%; text-align: right;">Total Fee</th>
            <th style="width: 12%; text-align: right;">Paid</th>
            <th style="width: 12%; text-align: right;">Due</th>
            <th style="width: 10%; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <div>Parma Academy Management Portal · Official Document</div>
        <div class="signature">Authorized Signatory</div>
      </div>
    </body>
    </html>
  `

  const printWindow = window.open('', '_blank', 'width=1000,height=700')
  if (!printWindow) {
    alert('Please allow popups to print fee reports.')
    return
  }

  printWindow.document.write(reportHtml)
  printWindow.document.close()

  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
  }, 300)
}
