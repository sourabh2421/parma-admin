import { useEffect, useState } from 'react'
import { numberToWordsIndian } from '../../utils/numberToWords.js'
import { getPaymentDoc } from '../../firebase/feeRepository.js'
import { formatMonthRange } from '../../utils/monthRangeFormatter.js'

/**
 * ReceiptPrint Component
 * 
 * Generates an official, authentic school fee receipt matching Parma Academy's physical receipt book.
 * 
 * Supports:
 * 1. Single-month receipt (exact physical receipt layout with 6 fee heads).
 * 2. Multi-month combined receipt (displays all covered months with allocations & total received).
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
    : typeof paymentDate.toDate === 'function'
      ? paymentDate.toDate()
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
    return '0'
  }
  return amount.toLocaleString('en-IN')
}

function parseClassAndSection(classStr) {
  if (!classStr) return { className: '—', section: 'A' }
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

export default function ReceiptPrint({ student, fee, payment = null, onClose }) {
  if (!student || !fee) {
    console.error('ReceiptPrint: Missing required props', { student, fee })
    return null
  }

  const [paymentData, setPaymentData] = useState(payment)
  const [readyToPrint, setReadyToPrint] = useState(Boolean(payment))

  // Fetch parent payment document if fee belongs to a multi-month transaction
  useEffect(() => {
    let active = true
    if (payment) {
      setPaymentData(payment)
      setReadyToPrint(true)
      return
    }

    if (fee.paymentId) {
      getPaymentDoc(fee.paymentId)
        .then((doc) => {
          if (active) {
            if (doc) setPaymentData(doc)
            setReadyToPrint(true)
          }
        })
        .catch(() => {
          if (active) setReadyToPrint(true)
        })
    } else {
      setReadyToPrint(true)
    }

    return () => {
      active = false
    }
  }, [fee, payment])
  
  useEffect(() => {
    if (!readyToPrint) return

    const escapeHtml = (str) => {
      return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }

    const safeValue = (value, fallback = '—') => {
      return (value !== undefined && value !== null && String(value).trim() !== '')
        ? escapeHtml(String(value).trim())
        : fallback
    }

    const isMultiMonth = Boolean(
      paymentData &&
      Array.isArray(paymentData.allocations) &&
      paymentData.allocations.length > 1,
    )
    
    // Receipt Number: Prioritize payment receipt number, then fee.receiptNos, fallback to legacy generator
    const receiptNumber =
      paymentData?.receiptNo ||
      (Array.isArray(fee.receiptNos) && fee.receiptNos.length > 0 ? fee.receiptNos[0] : null) ||
      generateReceiptNumber(fee.year, fee.month, student.id)

    const formattedDate = formatPaymentDate(paymentData?.paidOn || fee.paymentDate)

    const paidAmount = isMultiMonth
      ? Number(paymentData.totalReceived) || 0
      : Number(fee.amount) || 0

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
      isMultiMonth
        ? numberToWordsIndian(paymentData.totalReceived)
        : fee.amountInWords || numberToWordsIndian(paidAmount || totalFee)

    const chequeText =
      paymentData?.reference
        ? `${paymentData.mode ? paymentData.mode.toUpperCase() + ': ' : ''}${paymentData.reference}`
        : fee.chequeNo
          ? fee.chequeNo
          : fee.status === 'paid' || fee.status === 'partial'
            ? 'Cash / Online'
            : '—'

    const { className, section } = parseClassAndSection(student.class)

    const monthLabel = isMultiMonth
      ? formatMonthRange(paymentData.allocations.map((a) => a.month), paymentData.allocations[0]?.year) || `${paymentData.allocations.length} Months`
      : `${safeValue(fee.month)} ${safeValue(fee.year)}`

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
              <span class="meta-value underline">${safeValue(receiptNumber)}</span>
            </div>
            <div class="meta-cell" style="width: 45%; text-align: right;">
              <span class="meta-label">Date:</span>
              <span class="meta-value underline">${safeValue(formattedDate)}</span>
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
              <span class="meta-value underline bold">${safeValue(monthLabel)}</span>
            </div>
          </div>
        </div>

        ${isMultiMonth ? (() => {
          const waivedConveyanceMonths = []
          let totalConveyanceWaived = 0
          const waivedTuitionMonths = []
          let totalTuitionWaived = 0

          if (Array.isArray(paymentData?.allocations)) {
            paymentData.allocations.forEach((a) => {
              if (Array.isArray(a.waivers)) {
                a.waivers.forEach((w) => {
                  if (w.head === 'conveyance') {
                    totalConveyanceWaived += Number(w.amount || 0)
                    if (!waivedConveyanceMonths.includes(a.month)) {
                      waivedConveyanceMonths.push(a.month)
                    }
                  } else if (w.head === 'tuition') {
                    totalTuitionWaived += Number(w.amount || 0)
                    if (!waivedTuitionMonths.includes(a.month)) {
                      waivedTuitionMonths.push(a.month)
                    }
                  }
                })
              } else if (a.waived > 0) {
                totalConveyanceWaived += Number(a.waived)
                if (!waivedConveyanceMonths.includes(a.month)) {
                  waivedConveyanceMonths.push(a.month)
                }
              }
            })
          }

          return `
        <!-- Combined Multi-Month Table -->
        <table class="fee-schedule-table">
          <thead>
            <tr>
              <th style="width: 20%;">Month</th>
              <th style="width: 15%; text-align: right;">Tuition</th>
              <th style="width: 17%; text-align: right;">Conveyance</th>
              <th style="width: 26%;">Status / Due</th>
              <th style="width: 22%; text-align: right;">Paid (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${paymentData.allocations.map((a) => `
              <tr>
                <td class="bold">${safeValue(a.month)} ${safeValue(a.year)}</td>
                <td class="amount-cell">${a.tuitionFee != null ? `₹${formatAmount(a.tuitionFee)}` : '—'}</td>
                <td class="amount-cell">${Number(a.conveyanceFee) > 0 ? `₹${formatAmount(a.conveyanceFee)}` : (a.waived > 0 ? '<span class="italic text-green">Waived</span>' : '—')}</td>
                <td style="font-size: 7.2pt; color: #475569;">
                  Due: ₹${formatAmount(a.totalAmount)} ${a.remainingAmount > 0 ? `· <span class="text-red">Bal: ₹${formatAmount(a.remainingAmount)}</span>` : '· <span class="text-green">Cleared</span>'}
                </td>
                <td class="amount-cell bold text-green">₹ ${formatAmount(a.amount)}</td>
              </tr>
            `).join('')}
            ${totalConveyanceWaived > 0 ? `
              <tr style="background: #f8fafc; font-size: 7.5pt;">
                <td colspan="4" class="italic" style="color: #047857;">
                  Conveyance waived: ₹${formatAmount(totalConveyanceWaived)} (${waivedConveyanceMonths.join(', ')})
                </td>
                <td class="amount-cell italic text-green" style="font-size: 7.5pt;">- ₹${formatAmount(totalConveyanceWaived)}</td>
              </tr>
            ` : ''}
            ${totalTuitionWaived > 0 ? `
              <tr style="background: #f8fafc; font-size: 7.5pt;">
                <td colspan="4" class="italic" style="color: #047857;">
                  Tuition waived: ₹${formatAmount(totalTuitionWaived)} (${waivedTuitionMonths.join(', ')})
                </td>
                <td class="amount-cell italic text-green" style="font-size: 7.5pt;">- ₹${formatAmount(totalTuitionWaived)}</td>
              </tr>
            ` : ''}
            <tr class="total-row">
              <td colspan="4" class="bold">Total Received ₹</td>
              <td class="amount-cell bold text-green">₹ ${formatAmount(paidAmount)}</td>
            </tr>
          </tbody>
        </table>
        `
        })() : `
        <!-- Standard Single-Month Schedule Table -->
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
        `}

        <div class="footer-meta">
          <div class="meta-row">
            <div class="meta-cell" style="width: 100%;">
              <span class="meta-label">Amount in words:</span>
              <span class="meta-value underline italic">${safeValue(wordsText)}</span>
            </div>
          </div>
          <div class="meta-row" style="margin-top: 1mm;">
            <div class="meta-cell" style="width: 100%;">
              <span class="meta-label">Cheque No. / Ref:</span>
              <span class="meta-value underline">${safeValue(chequeText)}</span>
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
        <title>Fee Receipt - ${safeValue(receiptNumber)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            background: #fff;
            color: #000;
            display: flex;
            justify-content: center;
          }
          
          .receipt-container {
            width: 210mm;
            height: 297mm;
            padding: 5mm 9mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          
          .receipt-copy {
            height: 140mm;
            border: 1.8px solid #0f172a;
            border-radius: 3mm;
            padding: 3mm 4.5mm;
            display: flex;
            flex-direction: column;
            position: relative;
            background-color: #fff;
          }
          
          .header-container {
            text-align: center;
            border-bottom: 1.5px solid #000;
            padding-bottom: 1.5mm;
            margin-bottom: 2mm;
            position: relative;
          }
          
          .top-meta-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 7.5pt;
            font-weight: bold;
          }
          
          .copy-badge {
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 7.5pt;
            background: #f1f5f9;
            padding: 0.5mm 2.5mm;
            border: 1px solid #94a3b8;
            border-radius: 1mm;
          }
          
          .school-phone {
            font-family: monospace;
            font-size: 8pt;
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
            font-family: 'Courier New', Courier, monospace;
            font-size: 8.5pt;
          }
          
          .total-row {
            background: #f8fafc;
            font-weight: bold;
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
  }, [readyToPrint, student, fee, paymentData, onClose])

  return null
}

export { generateReceiptNumber, formatPaymentDate, formatAmount }
