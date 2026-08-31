import { useEffect } from 'react'

/**
 * ReceiptPrint Component
 * 
 * Opens a new window with a printable fee receipt containing two identical copies.
 * Uses isolated print window approach to avoid printing the main dashboard.
 */

/**
 * Generates a unique receipt number in the format PA-{YYYY}{MM}-{studentId}
 * 
 * @param {number} year - Four-digit year (e.g., 2025)
 * @param {string} month - Month name (e.g., "January", "February", etc.)
 * @param {string} studentId - Student identifier
 * @returns {string} Formatted receipt number (e.g., "PA-202501-STU001")
 * 
 * @example
 * generateReceiptNumber(2025, "January", "STU001") // Returns "PA-202501-STU001"
 * generateReceiptNumber(2025, "December", "STU042") // Returns "PA-202512-STU042"
 */
function generateReceiptNumber(year, month, studentId) {
  // Map month names to two-digit numbers
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
    'December': '12'
  };
  
  const monthNum = monthMap[month];
  
  // Warn if month name is not recognized
  if (!monthNum) {
    console.warn(`Unrecognized month name: ${month}`);
  }
  
  // Truncate student ID to 20 characters if it exceeds that length
  const truncatedId = studentId && studentId.length > 20 
    ? studentId.slice(0, 20) 
    : studentId || '';
  
  return `PA-${year}${monthNum || '00'}-${truncatedId}`;
}

/**
 * Formats a payment date to dd/MM/yyyy format with error handling
 * 
 * @param {Date|string|null} paymentDate - Payment date as Date object or ISO string
 * @returns {string} Formatted date string (e.g., "15/01/2025") or "N/A" if invalid
 * 
 * @example
 * formatPaymentDate(new Date(2025, 0, 15)) // Returns "15/01/2025"
 * formatPaymentDate("2025-03-05T00:00:00Z") // Returns "05/03/2025"
 * formatPaymentDate(null) // Returns "N/A"
 * formatPaymentDate("invalid-date") // Returns "N/A"
 */
function formatPaymentDate(paymentDate) {
  if (!paymentDate) return 'N/A';
  
  // Convert to Date object if it's a string
  const date = paymentDate instanceof Date 
    ? paymentDate 
    : new Date(paymentDate);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid payment date:', paymentDate);
    return 'N/A';
  }
  
  // Format as dd/MM/yyyy with zero-padding
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Formats an amount as "₹" with thousand separators and two decimals
 * 
 * @param {number} amount - Fee amount in INR
 * @returns {string} Formatted amount string (e.g., "₹5,000.00")
 * 
 * @example
 * formatAmount(5000) // Returns "₹5,000.00"
 * formatAmount(1234.56) // Returns "₹1,234.56"
 * formatAmount(0) // Returns "₹0.00"
 * formatAmount(NaN) // Returns "₹0.00"
 * formatAmount(-100) // Returns "₹0.00"
 */
function formatAmount(amount) {
  // Validate amount
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    console.warn('Invalid amount:', amount);
    return '₹0.00';
  }
  
  // Format with thousand separators and two decimal places
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * ReceiptPrint Component
 * 
 * Opens a new window with a printable fee receipt containing two copies.
 * Automatically triggers print dialog and closes window after printing.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.student - Student information
 * @param {string} props.student.id - Student identifier
 * @param {string} props.student.name - Student full name
 * @param {string} props.student.class - Student class/grade
 * @param {string} props.student.parentName - Parent or guardian name
 * @param {Object} props.fee - Fee record information
 * @param {string} props.fee.month - Payment month name
 * @param {number} props.fee.year - Payment year (4 digits)
 * @param {number} props.fee.amount - Fee amount in INR
 * @param {string} props.fee.status - Payment status
 * @param {Date|string} props.fee.paymentDate - Payment date
 * @param {Function} props.onClose - Optional callback to hide receipt after printing
 */
export default function ReceiptPrint({ student, fee, onClose }) {
  // Defensive rendering: return null if required props are missing
  if (!student || !fee) {
    console.error('ReceiptPrint: Missing required props', { student, fee });
    return null;
  }
  
  useEffect(() => {
    // Safe value accessor with fallback
    const safeValue = (value, fallback = 'N/A') => {
      return value ?? fallback;
    };
    
    // Generate receipt data
    const receiptNumber = generateReceiptNumber(fee.year, fee.month, student.id);
    const formattedDate = formatPaymentDate(fee.paymentDate);

    const paidAmount = Number(fee.amount) || 0;
    const totalFee =
      fee.totalAmount != null
        ? Number(fee.totalAmount)
        : fee.remainingAmount != null
          ? paidAmount + Number(fee.remainingAmount)
          : paidAmount;
    const remainingFee =
      fee.remainingAmount != null
        ? Number(fee.remainingAmount)
        : Math.max(0, totalFee - paidAmount);

    const formattedAmount = formatAmount(paidAmount);
    const formattedTotalAmount = formatAmount(totalFee);
    const formattedRemainingAmount = formatAmount(remainingFee);
    
    // Build receipt HTML with inline styles
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Fee Receipt - ${receiptNumber}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.3;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
          }
          
          .receipt-container {
            width: 190mm;
            height: 277mm;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
          }
          
          .receipt-copy {
            height: 133mm;
            border: 2px solid #000;
            padding: 5mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .copy-label {
            text-align: center;
            font-weight: bold;
            font-size: 9pt;
            margin-bottom: 3mm;
            text-transform: uppercase;
          }
          
          .header {
            text-align: center;
            margin-bottom: 3mm;
          }
          
          .header h1 {
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 1mm;
          }
          
          .header .subtitle {
            font-size: 9pt;
            color: #333;
            margin-bottom: 0.5mm;
          }
          
          .header .address,
          .header .phone {
            font-size: 8pt;
            color: #555;
          }
          
          .title-section {
            text-align: center;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 1.5mm 0;
            margin-bottom: 3mm;
          }
          
          .title-section h2 {
            font-size: 12pt;
            font-weight: bold;
            letter-spacing: 1px;
          }
          
          .receipt-number {
            text-align: right;
            font-size: 8pt;
            margin-bottom: 3mm;
          }
          
          .info-grid {
            display: table;
            width: 100%;
            margin-bottom: 2mm;
          }
          
          .info-column {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding: 0 2mm;
          }
          
          .info-row {
            margin-bottom: 1.5mm;
            font-size: 8.5pt;
          }
          
          .info-label {
            font-weight: bold;
            display: inline-block;
            width: 42%;
            font-size: 8pt;
          }
          
          .info-value {
            display: inline-block;
            width: 55%;
            font-size: 8.5pt;
          }
          
          .amount-box {
            background: #f8fafc;
            border: 1.5px solid #000;
            padding: 2mm 3mm;
            text-align: center;
            margin: 2mm 0;
          }
          
          .status-badge {
            display: inline-block;
            background: #d4edda;
            border: 1.5px solid #28a745;
            color: #155724;
            padding: 1mm 3.5mm;
            border-radius: 1.5mm;
            font-weight: bold;
            font-size: 8pt;
          }
          
          .footer {
            margin-top: auto;
            padding-top: 2mm;
            border-top: 1px solid #ccc;
          }
          
          .footer-row {
            display: table;
            width: 100%;
            margin-top: 1mm;
          }
          
          .footer-column {
            display: table-cell;
            width: 50%;
            font-size: 8pt;
          }
          
          .signature-line {
            border-top: 1px solid #000;
            width: 40mm;
            margin-top: 4mm;
            padding-top: 1mm;
            text-align: center;
            font-size: 7pt;
          }
          
          .separator {
            height: 6mm;
            text-align: center;
            position: relative;
            font-size: 8pt;
            color: #666;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .separator::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            border-top: 1px dashed #999;
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
          <div class="receipt-copy">
            <div>
              <div class="copy-label">Parent Copy</div>
              
              <div class="header">
                <h1>PARMA ACADEMY</h1>
                <div class="subtitle">ICSE School, Ayodhya</div>
                <div class="address">Parikrama Marg, Parmapuram, Ayodhya - 224123, U.P.</div>
                <div class="phone">Phone: 05278-222222</div>
              </div>
              
              <div class="title-section">
                <h2>FEE RECEIPT</h2>
              </div>
              
              <div class="receipt-number">
                Receipt No: <strong>${receiptNumber}</strong>
              </div>
              
              <div class="info-grid">
                <div class="info-column">
                  <div class="info-row">
                    <span class="info-label">Student Name:</span>
                    <span class="info-value">${safeValue(student.name)}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Class:</span>
                    <span class="info-value">${safeValue(student.class)}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Parent Name:</span>
                    <span class="info-value">${safeValue(student.parentName)}</span>
                  </div>
                </div>
                
                <div class="info-column">
                  <div class="info-row">
                    <span class="info-label">Month:</span>
                    <span class="info-value">${safeValue(fee.month)}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Year:</span>
                    <span class="info-value">${safeValue(fee.year)}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Payment Date:</span>
                    <span class="info-value">${formattedDate}</span>
                  </div>
                </div>
              </div>
              
              <div class="amount-box">
                <div style="display: table; width: 100%; font-size: 8.5pt;">
                  <div style="display: table-cell; width: 33.3%; text-align: left; vertical-align: middle;">
                    <span style="color: #555; display: block; font-size: 7.5pt;">Total Fee</span>
                    <strong style="font-size: 9.5pt;">${formattedTotalAmount}</strong>
                  </div>
                  <div style="display: table-cell; width: 33.3%; text-align: center; vertical-align: middle; border-left: 1px solid #ddd; border-right: 1px solid #ddd;">
                    <span style="color: #155724; display: block; font-size: 7.5pt; font-weight: bold;">Amount Paid</span>
                    <strong style="font-size: 12pt; color: #155724;">${formattedAmount}</strong>
                  </div>
                  <div style="display: table-cell; width: 33.3%; text-align: right; vertical-align: middle;">
                    <span style="color: ${remainingFee > 0 ? '#991b1b' : '#555'}; display: block; font-size: 7.5pt;">Remaining Due</span>
                    <strong style="font-size: 9.5pt; color: ${remainingFee > 0 ? '#991b1b' : '#155724'};">${formattedRemainingAmount}</strong>
                  </div>
                </div>
              </div>
              
              <div style="text-align: center; margin: 2mm 0;">
                ${remainingFee > 0
                  ? `<span class="status-badge" style="background: #fef3c7; border-color: #f59e0b; color: #92400e;">PARTIAL PAYMENT — BALANCE DUE: ${formattedRemainingAmount}</span>`
                  : `<span class="status-badge">PAID IN FULL</span>`
                }
              </div>
            </div>
            
            <div class="footer">
              <div class="footer-row">
                <div class="footer-column">
                  Date: ${formattedDate}
                </div>
                <div class="footer-column" style="text-align: right;">
                  <div class="signature-line">Authorized Signature</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Separator -->
          <div class="separator">
            <span>✂ Cut along the line ✂</span>
          </div>
          
          <!-- School Copy -->
          <div class="receipt-copy">
            <div>
              <div class="copy-label">School Copy</div>
              
              <div class="header">
                <h1>PARMA ACADEMY</h1>
                <div class="subtitle">ICSE School, Ayodhya</div>
                <div class="address">Parikrama Marg, Parmapuram, Ayodhya - 224123, U.P.</div>
                <div class="phone">Phone: 05278-222222</div>
              </div>
              
              <div class="title-section">
                <h2>FEE RECEIPT</h2>
              </div>
              
              <div class="receipt-number">
                Receipt No: <strong>${receiptNumber}</strong>
              </div>
              
              <div class="info-grid">
                <div class="info-column">
                  <div class="info-row">
                    <span class="info-label">Student Name:</span>
                    <span class="info-value">${safeValue(student.name)}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Class:</span>
                    <span class="info-value">${safeValue(student.class)}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Parent Name:</span>
                    <span class="info-value">${safeValue(student.parentName)}</span>
                  </div>
                </div>
                
                <div class="info-column">
                  <div class="info-row">
                    <span class="info-label">Month:</span>
                    <span class="info-value">${safeValue(fee.month)}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Year:</span>
                    <span class="info-value">${safeValue(fee.year)}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Payment Date:</span>
                    <span class="info-value">${formattedDate}</span>
                  </div>
                </div>
              </div>
              
              <div class="amount-box">
                <div style="display: table; width: 100%; font-size: 8.5pt;">
                  <div style="display: table-cell; width: 33.3%; text-align: left; vertical-align: middle;">
                    <span style="color: #555; display: block; font-size: 7.5pt;">Total Fee</span>
                    <strong style="font-size: 9.5pt;">${formattedTotalAmount}</strong>
                  </div>
                  <div style="display: table-cell; width: 33.3%; text-align: center; vertical-align: middle; border-left: 1px solid #ddd; border-right: 1px solid #ddd;">
                    <span style="color: #155724; display: block; font-size: 7.5pt; font-weight: bold;">Amount Paid</span>
                    <strong style="font-size: 12pt; color: #155724;">${formattedAmount}</strong>
                  </div>
                  <div style="display: table-cell; width: 33.3%; text-align: right; vertical-align: middle;">
                    <span style="color: ${remainingFee > 0 ? '#991b1b' : '#555'}; display: block; font-size: 7.5pt;">Remaining Due</span>
                    <strong style="font-size: 9.5pt; color: ${remainingFee > 0 ? '#991b1b' : '#155724'};">${formattedRemainingAmount}</strong>
                  </div>
                </div>
              </div>
              
              <div style="text-align: center; margin: 2mm 0;">
                ${remainingFee > 0
                  ? `<span class="status-badge" style="background: #fef3c7; border-color: #f59e0b; color: #92400e;">PARTIAL PAYMENT — BALANCE DUE: ${formattedRemainingAmount}</span>`
                  : `<span class="status-badge">PAID IN FULL</span>`
                }
              </div>
            </div>
            
            <div class="footer">
              <div class="footer-row">
                <div class="footer-column">
                  Date: ${formattedDate}
                </div>
                <div class="footer-column" style="text-align: right;">
                  <div class="signature-line">Authorized Signature</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Open new window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      console.error('Failed to open print window. Popup may be blocked.');
      if (onClose) onClose();
      return;
    }
    
    // Write receipt HTML to the new window
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      
      // Set up cleanup after print
      printWindow.onafterprint = () => {
        printWindow.close();
        if (onClose) onClose();
      };
      
      // Fallback timeout in case onafterprint doesn't fire
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close();
        }
        if (onClose) onClose();
      }, 1000);
    }, 250);
    
  }, [student, fee, onClose]);
  
  // Component returns null - it doesn't render anything in the main app
  return null;
}

// Export helper functions for testing
export { generateReceiptNumber, formatPaymentDate, formatAmount };
