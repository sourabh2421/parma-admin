import { useEffect } from 'react'
import { numberToWordsIndian } from '../../utils/numberToWords.js'

/**
 * ReceiptPrint Component
 * 
 * Opens a new window with a printable fee receipt containing two copies:
 * 1. Parent Copy
 * 2. School Copy
 * 
 * Styled to accurately match Parma Academy's official physical fee receipt book.
 */

function generateReceiptNumber(year, month, studentId) {
  const monthMap = {
    'January': '01',
    'February': '02',
    'March': '03',
    'April': '04',
    'May': '05',
    'June': '06',
    'July': '07',
    'August': '08',
    'September': '09',
    'October': '10',
    'November': '11',
    'December': '12',
  }
  
  const monthNum = monthMap[month] || '00'
  const truncatedId = studentId && studentId.length > 20 
    ? studentId.slice(0, 20) 
    : studentId || ''
  
  return `PA-${year}${monthNum}-${truncatedId}`
}

function formatPaymentDate(paymentDate) {
  if (!paymentDate) {
    const today = new Date()
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
  }
  
  const date = paymentDate instanceof Date 
    ? paymentDate 
    : new Date(paymentDate)
  
  if (isNaN(date.getTime())) {
    return 'N/A'
  }
  
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  
  return `${day}/${month}/${year}`
}

function formatAmount(amount) {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    return '0.00'
  }
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function parseClassAndSection(classStr = '') {
  const cleaned = String(classStr || '').trim()
  const match = cleaned.match(/^(.*?)(?:\s+|-)(Section\s+|Sec\s+)?([A-Z])$/i)
  if (match) {
    return {
      className: match[1].trim(),
      section: match[3].toUpperCase(),
    }
  }
  return {
    className: cleaned,
    section: 'A',
  }
}

export default function ReceiptPrint({ student, fee, onClose }) {
  if (!student || !fee) {
    console.error('ReceiptPrint: Missing required props', { student, fee })
    return null
  }
  
  useEffect(() => {
    const safeValue = (value, fallback = '—') => {
      return (value !== undefined && value !== null && String(value).trim() !== '')
        ? String(value).trim()
        : fallback
    }
    
    const receiptNumber = generateReceiptNumber(fee.year, fee.month, student.id)
    const formattedDate = formatPaymentDate(fee.paymentDate)

    const paidAmount = Number(fee.amount) || 0
    const tFee = fee.tuitionFee != null ? Number(fee.tuitionFee) : paidAmount
    const cFee = fee.conveyanceFee != null ? Number(fee.conveyanceFee) : 0
    const eFee = fee.examFee != null ? Number(fee.examFee) : 0
    const anFee = fee.annualFee != null ? Number(fee.annualFee) : 0
    const adFee = fee.admissionFee != null ? Number(fee.admissionFee) : 0
    const lFee = fee.lateFee != null ? Number(fee.lateFee) : 0

    const scheduleSum = tFee + cFee + eFee + anFee + adFee + lFee
    const totalFee =
      fee.totalAmount != null
        ? Number(fee.totalAmount)
        : scheduleSum > 0
          ? scheduleSum
          : fee.remainingAmount != null
            ? paidAmount + Number(fee.remainingAmount)
            : paidAmount

    const remainingFee =
      fee.remainingAmount != null
        ? Number(fee.remainingAmount)
        : Math.max(0, totalFee - paidAmount)

    const wordsText =
      fee.amountInWords || numberToWordsIndian(paidAmount || totalFee)
    const chequeText = fee.chequeNo
      ? fee.chequeNo
      : fee.status === 'paid'
        ? 'Cash / Online'
        : '—'

    const { className, section } = parseClassAndSection(student.class)

    const renderCopyHtml = (copyTitle) => `
      <div class="receipt-copy">
        <div class="header-container">
          <div class="top-meta-row">
            <span class="copy-badge">${copyTitle}</span>
            <span class="school-phone">📞 9559993008</span>
          </div>
          <h1 class="school-title">PARMA ACADEMY</h1>
          <div class="school-subtitle">Affiliated to ICSE New Delhi</div>
        </div>

        <div class="student-meta-table">
          <div class="meta-row">
            <div class="meta-cell" style="width: 55%;">
              <span class="meta-label">Sr. No.</span>
              <span class="meta-value underline">${receiptNumber}</span>
            </div>
            <div class="meta-cell" style="width: 45%; text-align: right;">
              <span class="meta-label">Date:</span>
              <span class="meta-value underline">${formattedDate}</span>
            </div>
          </div>

          <div class="meta-row">
            <div class="meta-cell" style="width: 100%;">
              <span class="meta-label">Name of Student:</span>
              <span class="meta-value underline bold">${safeValue(student.name)}</span>
            </div>
          </div>

          <div class="meta-row">
            <div class="meta-cell" style="width: 100%;">
              <span class="meta-label">Father's Name:</span>
              <span class="meta-value underline">${safeValue(student.parentName || student.fatherName)}</span>
            </div>
          </div>

          <div class="meta-row">
            <div class="meta-cell" style="width: 55%;">
              <span class="meta-label">Class:</span>
              <span class="meta-value underline bold">${safeValue(className)}</span>
            </div>
            <div class="meta-cell" style="width: 45%; text-align: right;">
              <span class="meta-label">Section:</span>
              <span class="meta-value underline bold">${safeValue(section)}</span>
            </div>
          </div>

          <div class="meta-row">
            <div class="meta-cell" style="width: 100%;">
              <span class="meta-label">Month(s):</span>
              <span class="meta-value underline bold">${safeValue(fee.month)} ${safeValue(fee.year)}</span>
            </div>
          </div>
        </div>

        <table class="fee-schedule-table">
          <thead>
            <tr>
              <th style="width: 72%;">Fee Schedule</th>
              <th style="width: 28%; text-align: right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1. Tuition Fee</td>
              <td class="amount-cell">${tFee > 0 ? formatAmount(tFee) : '—'}</td>
            </tr>
            <tr>
              <td>2. Conveyance Fee</td>
              <td class="amount-cell">${cFee > 0 ? formatAmount(cFee) : '—'}</td>
            </tr>
            <tr>
              <td>3. Exam Fee</td>
              <td class="amount-cell">${eFee > 0 ? formatAmount(eFee) : '—'}</td>
            </tr>
            <tr>
              <td>4. Annual/Class Transfer Fee</td>
              <td class="amount-cell">${anFee > 0 ? formatAmount(anFee) : '—'}</td>
            </tr>
            <tr>
              <td>5. Admission/Re-Admission Fee</td>
              <td class="amount-cell">${adFee > 0 ? formatAmount(adFee) : '—'}</td>
            </tr>
            <tr>
              <td>6. Late Fee</td>
              <td class="amount-cell">${lFee > 0 ? formatAmount(lFee) : '—'}</td>
            </tr>
            <tr class="total-row">
              <td class="bold">Total ₹</td>
              <td class="amount-cell bold">₹ ${formatAmount(totalFee)}</td>
            </tr>
            ${remainingFee > 0 ? `
            <tr class="paid-row">
              <td class="bold text-green">Amount Paid ₹</td>
              <td class="amount-cell bold text-green">₹ ${formatAmount(paidAmount)}</td>
            </tr>
            <tr class="due-row">
              <td class="bold text-red">Remaining Due ₹</td>
              <td class="amount-cell bold text-red">₹ ${formatAmount(remainingFee)}</td>
            </tr>
            ` : `
            <tr class="paid-row">
              <td class="bold text-green">Amount Paid (Paid in Full) ₹</td>
              <td class="amount-cell bold text-green">₹ ${formatAmount(paidAmount)}</td>
            </tr>
            `}
          </tbody>
        </table>

        <div class="footer-meta">
          <div class="meta-row">
            <div class="meta-cell" style="width: 100%;">
              <span class="meta-label">Amount in words:</span>
              <span class="meta-value underline italic">${wordsText}</span>
            </div>
          </div>
          <div class="meta-row" style="margin-top: 1mm;">
            <div class="meta-cell" style="width: 100%;">
              <span class="meta-label">Cheque No. / Ref:</span>
              <span class="meta-value underline">${chequeText}</span>
            </div>
          </div>
        </div>

        <div class="receipt-bottom-bar">
          <div class="fee-day-box">
            Fee Day<br />
            <strong>10th of the month</strong>
          </div>
          <div class="signature-box">
            <div class="signature-line">Authorized Signature</div>
          </div>
        </div>
      </div>
    `

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Fee Receipt - ${receiptNumber}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Times New Roman', Times, serif, Arial, sans-serif;
            font-size: 8.5pt;
            line-height: 1.25;
            color: #000;
            background: #fff;
          }
          
          .receipt-container {
            width: 190mm;
            height: 278mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          
          .receipt-copy {
            height: 132mm;
            border: 1.5px solid #222;
            padding: 4mm 5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            position: relative;
            background: #fff;
          }
          
          .header-container {
            text-align: center;
            border-bottom: 1.5px solid #222;
            padding-bottom: 1.5mm;
            margin-bottom: 2mm;
          }
          
          .top-meta-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 7.5pt;
            font-family: Arial, sans-serif;
            margin-bottom: 0.5mm;
          }
          
          .copy-badge {
            background: #111;
            color: #fff;
            padding: 0.5mm 2.5mm;
            font-size: 7pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-radius: 1mm;
          }
          
          .school-phone {
            font-weight: bold;
            letter-spacing: 0.5px;
          }
          
          .school-title {
            font-size: 16pt;
            font-weight: 900;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            font-family: 'Impact', 'Arial Black', Times, serif;
            margin: 0.5mm 0;
          }
          
          .school-subtitle {
            font-size: 8.5pt;
            font-weight: bold;
            font-style: italic;
          }
          
          .student-meta-table {
            margin-bottom: 2mm;
          }
          
          .meta-row {
            display: flex;
            margin-bottom: 1.2mm;
            font-size: 8.5pt;
          }
          
          .meta-cell {
            display: inline-flex;
            align-items: baseline;
          }
          
          .meta-label {
            font-weight: bold;
            white-space: nowrap;
            margin-right: 1.5mm;
            font-size: 8pt;
          }
          
          .meta-value {
            flex: 1;
            padding: 0 1mm;
            font-size: 8.5pt;
          }
          
          .underline {
            border-bottom: 1px dotted #555;
          }
          
          .bold {
            font-weight: bold;
          }
          
          .italic {
            font-style: italic;
          }
          
          .text-green {
            color: #14532d;
          }
          
          .text-red {
            color: #991b1b;
          }
          
          .fee-schedule-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
            margin-bottom: 2mm;
          }
          
          .fee-schedule-table th,
          .fee-schedule-table td {
            border: 1px solid #444;
            padding: 1mm 2mm;
          }
          
          .fee-schedule-table th {
            background: #f1f5f9;
            font-weight: bold;
            text-align: left;
            font-size: 8pt;
          }
          
          .amount-cell {
            text-align: right;
            font-family: Arial, sans-serif;
          }
          
          .total-row {
            background: #f8fafc;
            font-size: 8.5pt;
          }
          
          .paid-row {
            background: #f0fdf4;
            font-size: 8.5pt;
          }
          
          .due-row {
            background: #fef2f2;
            font-size: 8.5pt;
          }
          
          .footer-meta {
            margin-bottom: 2mm;
          }
          
          .receipt-bottom-bar {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: auto;
            padding-top: 1mm;
          }
          
          .fee-day-box {
            border: 1px solid #000;
            border-radius: 1.5mm;
            padding: 1mm 3mm;
            font-size: 7.5pt;
            text-align: center;
            line-height: 1.2;
            font-family: Arial, sans-serif;
            background: #fafafa;
          }
          
          .signature-box {
            text-align: center;
          }
          
          .signature-line {
            border-top: 1px solid #000;
            width: 38mm;
            padding-top: 1mm;
            font-size: 7.5pt;
            font-weight: bold;
          }
          
          .separator {
            height: 7mm;
            text-align: center;
            position: relative;
            font-size: 7.5pt;
            color: #666;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
          }
          
          .separator::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            border-top: 1px dashed #777;
            z-index: 0;
          }
          
          .separator span {
            position: relative;
            background: #fff;
            padding: 0 3mm;
            z-index: 1;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Parent Copy -->
          ${renderCopyHtml('Parent Copy')}
          
          <!-- Cut Separator -->
          <div class="separator">
            <span>✂ Cut along the line ✂</span>
          </div>
          
          <!-- School Copy -->
          ${renderCopyHtml('School Copy')}
        </div>
      </body>
      </html>
    `
    
    const printWindow = window.open('', '_blank', 'width=840,height=650')
    
    if (!printWindow) {
      console.error('Failed to open print window. Popup may be blocked.')
      if (onClose) onClose()
      return
    }
    
    printWindow.document.write(receiptHTML)
    printWindow.document.close()
    
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      
      printWindow.onafterprint = () => {
        printWindow.close()
        if (onClose) onClose()
      }
      
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close()
        }
        if (onClose) onClose()
      }, 1000)
    }, 250)
    
  }, [student, fee, onClose])
  
  return null
}

export { generateReceiptNumber, formatPaymentDate, formatAmount }
