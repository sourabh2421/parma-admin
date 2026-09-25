import React, { useEffect, useMemo, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReportCardView from '../../components/marksheet/ReportCardView.jsx'
import {
  filterStudentsByClass,
  getMergedStudentsList,
  subscribeMarksheetRecords,
} from '../../firebase/marksheetRepository.js'
import { subscribeStudents } from '../../firebase/studentRepository.js'
import { ALL_CLASSES } from '../../utils/marksheetDefaults.js'
import { FileText, Printer, Users, User, CheckCircle2 } from 'lucide-react'

export default function ReportCardsPage() {
  const [studentsFromRepo, setStudentsFromRepo] = useState([])
  const [firestoreMarks, setFirestoreMarks] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [filterClass, setFilterClass] = useState('ALL')
  const [reportType, setReportType] = useState('annual') // 'half-yearly' | 'annual'

  // 1. Load students from studentRepository
  useEffect(() => {
    const unsubscribe = subscribeStudents(
      (list) => {
        if (list && list.length > 0) {
          setStudentsFromRepo(list)
        }
      },
      (err) => {
        console.warn('Firestore students read warning:', err?.message)
      }
    )
    return () => unsubscribe()
  }, [])

  // 2. Subscribe to real-time marks from Firestore
  useEffect(() => {
    const unsubscribe = subscribeMarksheetRecords(
      (records) => {
        setFirestoreMarks(records || [])
      },
      (err) => {
        console.warn('Firestore marks read notice:', err?.message)
      }
    )
    return () => unsubscribe()
  }, [])

  // All merged students (stored marksheets + student directory)
  const allMergedStudents = useMemo(() => {
    return getMergedStudentsList(studentsFromRepo, firestoreMarks)
  }, [studentsFromRepo, firestoreMarks])

  // Filtered by selected class
  const filteredStudents = useMemo(() => {
    return filterStudentsByClass(allMergedStudents, filterClass)
  }, [allMergedStudents, filterClass])

  // Current student to display
  const currentStudent = useMemo(() => {
    if (!filteredStudents || filteredStudents.length === 0) return null
    const found = filteredStudents.find(
      (s) => s.id === selectedStudentId || s.studentId === selectedStudentId
    )
    return found || filteredStudents[0]
  }, [filteredStudents, selectedStudentId])

  // Auto update selected student ID if current student changes
  useEffect(() => {
    if (currentStudent && currentStudent.id !== selectedStudentId) {
      setSelectedStudentId(currentStudent.id)
    }
  }, [currentStudent, selectedStudentId])

  // Unified Print Handler: Single Student or Bulk Class Printing
  const printReportCards = (studentsToPrint, titleSuffix = '') => {
    if (!studentsToPrint || studentsToPrint.length === 0) return

    const cardsHtml = studentsToPrint
      .map(
        (s) => `
        <div class="report-card-page-wrapper">
          ${renderToStaticMarkup(<ReportCardView data={s} reportType={reportType} />)}
        </div>
      `
      )
      .join('')

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Parma Academy - Report Cards${titleSuffix ? ' - ' + titleSuffix : ''}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 5mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: "Times New Roman", Times, serif;
            color: #0f172a;
            background: #ffffff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .report-card-page-wrapper {
            width: 100%;
            max-width: 100%;
            margin: 0 auto 20px auto;
            background: #ffffff;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .report-card-page-wrapper:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
            margin-bottom: 0;
          }
          @media print {
            body {
              padding: 0 !important;
              margin: 0 !important;
            }
            .report-card-page-wrapper {
              margin: 0 !important;
              padding: 0 !important;
            }
          }
          .zen-dots-regular {
            font-family: "Zen Dots", sans-serif;
            font-weight: 400;
            font-style: normal;
          }
        </style>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Zen+Dots&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-white text-slate-900 p-1">
        ${cardsHtml}
      </body>
      </html>
    `

    const printWin = window.open('', '_blank', 'width=950,height=850')
    if (!printWin) {
      window.print()
      return
    }

    printWin.document.write(printHtml)
    printWin.document.close()

    setTimeout(() => {
      printWin.focus()
      printWin.print()
      printWin.onafterprint = () => {
        printWin.close()
      }
      setTimeout(() => {
        if (!printWin.closed) {
          printWin.close()
        }
      }, 3000)
    }, 450)
  }

  const handlePrintSingle = () => {
    if (currentStudent) {
      printReportCards([currentStudent], `${currentStudent.name} (Class ${currentStudent.class})`)
    }
  }

  const handlePrintAllClass = () => {
    if (filteredStudents.length > 0) {
      const classLabel = filterClass === 'ALL' ? 'All Classes' : `Class ${filterClass}`
      printReportCards(filteredStudents, `${classLabel} (${filteredStudents.length} Students)`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions - hidden when printing */}
      <div className="no-print flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 rounded-3xl border border-[#333538] bg-[#202122] p-6 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#4b88a2]/40 bg-[#4b88a2]/15 px-3 py-1 text-xs font-bold text-[#4b88a2] mb-2">
            <FileText className="h-3.5 w-3.5 text-[#4b88a2]" />
            <span>Official Printable Report Cards (A4)</span>
          </div>
          <h2 className="text-xl sm:text-2xl text-[#fff9fb] zen-dots-regular">Parma Academy Report Cards</h2>
          <p className="text-xs text-[#d3d4d9] mt-1">
            Print <strong>Half-Yearly</strong> or <strong>Annual Report Cards</strong> for an individual student or in <strong>bulk for an entire class</strong>.
          </p>
        </div>

        {/* Action Buttons: Single & Bulk Printing */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Print Single Student Button */}
          <button
            type="button"
            onClick={handlePrintSingle}
            disabled={!currentStudent}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-[#2a2d30] border border-[#4b88a2]/40 px-4 py-2.5 text-xs font-bold text-[#d3d4d9] hover:text-[#fff9fb] hover:bg-[#33363a] transition shadow-md disabled:opacity-50"
            title="Print report card for the currently viewed student"
          >
            <User className="h-4 w-4 text-[#4b88a2]" />
            <span>Print Single Student</span>
          </button>

          {/* Print Entire Class Button */}
          <button
            type="button"
            onClick={handlePrintAllClass}
            disabled={filteredStudents.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-[#4b88a2] px-5 py-2.5 text-xs font-bold text-[#fff9fb] shadow-lg shadow-[#4b88a2]/30 hover:bg-[#3a7187] transition shadow-md disabled:opacity-50"
            title="Print report cards for all students in the selected class filter"
          >
            <Users className="h-4 w-4" />
            <span>
              Print All {filterClass === 'ALL' ? 'Classes' : `Class ${filterClass}`} ({filteredStudents.length})
            </span>
          </button>
        </div>
      </div>

      {/* Controls Bar - hidden when printing */}
      <div className="no-print rounded-2xl border border-[#333538] bg-[#202122] p-5 space-y-4 shadow-sm">
        {/* Report Card Type Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#333538]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#d3d4d9]">Evaluation Format:</span>
            <div className="inline-flex rounded-xl bg-[#252627] p-1 border border-[#333538]">
              <button
                type="button"
                onClick={() => setReportType('half-yearly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                  reportType === 'half-yearly'
                    ? 'bg-[#4b88a2] text-[#fff9fb] shadow-sm'
                    : 'text-[#d3d4d9] hover:text-[#fff9fb]'
                }`}
              >
                📄 Half-Yearly (Term 1: FA-1 + FA-2 + SA-1)
              </button>
              <button
                type="button"
                onClick={() => setReportType('annual')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                  reportType === 'annual'
                    ? 'bg-[#bb0a21] text-[#fff9fb] shadow-sm'
                    : 'text-[#d3d4d9] hover:text-[#fff9fb]'
                }`}
              >
                🎓 Annual (Whole Year: All FA & SA)
              </button>
            </div>
          </div>

          <div className="text-[11px] font-semibold text-[#8e9095]">
            Total in filter: <span className="font-bold text-[#4b88a2]">{filteredStudents.length}</span> students
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-[11px] font-bold text-[#d3d4d9] mb-1">
              Filter by Class (for preview & bulk printing)
            </label>
            <select
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value)
              }}
              className="w-full rounded-xl border border-[#4b88a2]/60 bg-[#252627] px-3.5 py-2 text-xs font-bold text-[#fff9fb] focus:border-[#4b88a2] focus:outline-none"
            >
              <option value="ALL">All Classes ({allMergedStudents.length} Students)</option>
              {ALL_CLASSES.map((cls) => {
                const count = filterStudentsByClass(allMergedStudents, cls).length
                return (
                  <option key={cls} value={cls}>
                    Class {cls} ({count} Students)
                  </option>
                )
              })}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-[#d3d4d9] mb-1">
              Select Student to Preview ({filteredStudents.length} available)
            </label>
            <select
              value={currentStudent?.id || ''}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full rounded-xl border border-[#333538] bg-[#252627] px-3.5 py-2 text-xs font-bold text-[#fff9fb] focus:border-[#4b88a2] focus:outline-none"
            >
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.studentId || s.id}) - Class {s.class}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Live Printable Preview Container */}
      <div className="overflow-x-auto p-2 print:p-0 print:m-0 print:overflow-visible">
        {currentStudent ? (
          <ReportCardView data={currentStudent} reportType={reportType} />
        ) : (
          <div className="no-print text-center py-12 text-[#d3d4d9] text-xs">
            No student marksheet records found for the selected class filter.
          </div>
        )}
      </div>
    </div>
  )
}
