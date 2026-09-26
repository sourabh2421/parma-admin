import React from 'react'
import {
  calculateAnnualSubjectMarks,
  calculateDivision,
  calculateScholasticGrade,
  calculateTermMarks,
} from '../../utils/marksheetDefaults.js'
import { resolveFatherName } from '../../firebase/marksheetRepository.js'

export const OFFICIAL_CO_SCHOLASTIC_SKILLS = [
  'Physical Education',
  'Value Education',
  'S.U.P.W.',
  'Scientific Skill',
  'Social Skill',
  'Regularity and Punctuality',
  'Responsibility',
  'Attitude Towards Teachers',
]

export default function ReportCardView({ data, reportType = 'annual' }) {
  if (!data) return null

  const isHalfYearly = reportType === 'half-yearly'

  // Helper to parse numeric value safely without treating 0 as falsy fallback
  const parseSafeNum = (val, defaultVal = 0) => {
    if (val === null || val === undefined || val === '') return defaultVal
    const s = String(val).trim().toUpperCase()
    if (s === 'NA' || s === 'M/L' || s === 'ML' || s === '-' || s === 'AB' || s === 'ABSENT') return 0
    const n = Number(val)
    return isNaN(n) ? defaultVal : n
  }

  const isSpecialNote = (val) => {
    if (val === null || val === undefined) return false
    const s = String(val).trim().toUpperCase()
    return s === 'M/L' || s === 'ML' || s === 'NA' || s === 'AB' || s === 'ABSENT'
  }

  const roundClean = (num) => {
    if (num === null || num === undefined) return 0
    const n = Number(num)
    if (isNaN(n)) return 0
    return Number.isInteger(n) ? n : Number(n.toFixed(4))
  }

  // Round to 2 decimal places for display only
  const roundDisplay = (num) => {
    if (num === null || num === undefined) return 0
    const n = Number(num)
    if (isNaN(n)) return 0
    return Number.isInteger(n) ? n : Number(n.toFixed(2))
  }

  // Calculate totals and grades for each scholastic row
  let totalT1InternalMax = 0, totalT1InternalObt = 0
  let totalSa1Max = 0, totalSa1Obt = 0
  let totalT1Max = 0, totalT1Obt = 0

  let totalT2InternalMax = 0, totalT2InternalObt = 0
  let totalSa2Max = 0, totalSa2Obt = 0
  let totalT2Max = 0, totalT2Obt = 0

  let grandTotalMax = 0
  let grandTotalScored = 0

  const processedScholastic = (data.scholastic || []).map((sub) => {
    // Term 1 components
    const fa1Max = sub.fa1Max !== undefined && sub.fa1Max !== '' ? parseSafeNum(sub.fa1Max, 20) : (sub.t1IntMax !== undefined ? parseSafeNum(sub.t1IntMax, 20) : 20)
    const fa1Obt = sub.fa1Obt !== undefined && sub.fa1Obt !== '' ? parseSafeNum(sub.fa1Obt, 0) : (sub.t1IntObt !== undefined ? parseSafeNum(sub.t1IntObt, 0) : 0)

    const fa2Max = sub.fa2Max !== undefined && sub.fa2Max !== '' ? parseSafeNum(sub.fa2Max, 20) : 20
    const fa2Obt = sub.fa2Obt !== undefined && sub.fa2Obt !== '' ? parseSafeNum(sub.fa2Obt, 0) : 0

    const isSa1Special = isSpecialNote(sub.sa1Obt)
    const sa1Max = sub.sa1Max !== undefined && sub.sa1Max !== '' ? parseSafeNum(sub.sa1Max, 80) : (sub.t1MainMax !== undefined ? parseSafeNum(sub.t1MainMax, 80) : 80)
    const sa1Obt = isSa1Special ? 0 : (sub.sa1Obt !== undefined && sub.sa1Obt !== '' ? parseSafeNum(sub.sa1Obt, 0) : (sub.t1MainObt !== undefined ? parseSafeNum(sub.t1MainObt, 0) : 0))

    // Term 1 Total: SA-1 Theory + Internal Assessment (FA1 + FA2 + Assignment + Oral according to syllabus)
    const t1Calc = calculateTermMarks(
      fa1Obt,
      fa2Obt,
      sa1Obt,
      fa1Max,
      fa2Max,
      sa1Max,
      sub.sa1AssignObt,
      sub.sa1OralObt,
      sub.sa1AssignMax,
      sub.sa1OralMax,
      data.class,
      sub.name
    )
    const t1Max = t1Calc.maxMarks
    const t1Obt = isSa1Special ? roundClean(t1Calc.internalObt) : t1Calc.totalObt
    const t1Percent = t1Max > 0 ? (t1Obt / t1Max) * 100 : 0
    const t1Grade = calculateScholasticGrade(t1Percent)

    // Term 2 components
    const fa3Max = sub.fa3Max !== undefined && sub.fa3Max !== '' ? parseSafeNum(sub.fa3Max, 20) : (sub.t2IntMax !== undefined ? parseSafeNum(sub.t2IntMax, 20) : 20)
    const fa3Obt = sub.fa3Obt !== undefined && sub.fa3Obt !== '' ? parseSafeNum(sub.fa3Obt, 0) : (sub.t2IntObt !== undefined ? parseSafeNum(sub.t2IntObt, 0) : 0)

    const fa4Max = sub.fa4Max !== undefined && sub.fa4Max !== '' ? parseSafeNum(sub.fa4Max, 20) : 20
    const fa4Obt = sub.fa4Obt !== undefined && sub.fa4Obt !== '' ? parseSafeNum(sub.fa4Obt, 0) : 0

    const isSa2Special = isSpecialNote(sub.sa2Obt) || isSpecialNote(sub.t2MainObt)
    const sa2Max = sub.sa2Max !== undefined && sub.sa2Max !== '' ? parseSafeNum(sub.sa2Max, 80) : (sub.t2MainMax !== undefined ? parseSafeNum(sub.t2MainMax, 80) : 80)
    const sa2Obt = isSa2Special ? 0 : (sub.sa2Obt !== undefined && sub.sa2Obt !== '' ? parseSafeNum(sub.sa2Obt, 0) : (sub.t2MainObt !== undefined ? parseSafeNum(sub.t2MainObt, 0) : 0))

    // Term 2 Total: SA-2 Theory + Internal Assessment (FA3 + FA4 + Assignment + Oral according to syllabus)
    const t2Calc = calculateTermMarks(
      fa3Obt,
      fa4Obt,
      sa2Obt,
      fa3Max,
      fa4Max,
      sa2Max,
      sub.sa2AssignObt,
      sub.sa2OralObt,
      sub.sa2AssignMax,
      sub.sa2OralMax,
      data.class,
      sub.name
    )
    const t2Max = t2Calc.maxMarks
    const t2Obt = isSa2Special ? roundClean(t2Calc.internalObt) : t2Calc.totalObt
    const t2Percent = t2Max > 0 ? (t2Obt / t2Max) * 100 : 0
    const t2Grade = calculateScholasticGrade(t2Percent)

    // Full Year Total (Half-Yearly: out of 100 | Annual / Final: out of 200)
    const annualCalc = calculateAnnualSubjectMarks(t1Obt, t2Obt, t1Max, t2Max)
    const rowMax = isHalfYearly ? t1Max : annualCalc.maxMarks
    const rowScored = isHalfYearly ? t1Obt : annualCalc.totalObt
    const overallPercent = rowMax > 0 ? (rowScored / rowMax) * 100 : 0
    const overallRowGrade = calculateScholasticGrade(overallPercent)

    // Accumulate
    totalT1InternalMax += t1Calc.internalMax
    totalT1InternalObt += t1Calc.internalObt
    totalSa1Max += sa1Max
    totalSa1Obt += sa1Obt
    totalT1Max += t1Max
    totalT1Obt += t1Obt

    totalT2InternalMax += t2Calc.internalMax
    totalT2InternalObt += t2Calc.internalObt
    totalSa2Max += sa2Max
    totalSa2Obt += sa2Obt
    totalT2Max += t2Max
    totalT2Obt += t2Obt

    grandTotalMax += rowMax
    grandTotalScored += rowScored

    return {
      name: sub.name,
      sa1Max, sa1Obt, isSa1Special, sa1Raw: sub.sa1Obt,
      t1InternalObt: roundDisplay(t1Calc.internalObt),
      t1InternalMax: t1Calc.internalMax,
      t1Max, t1Obt: roundDisplay(t1Obt), t1Grade,
      sa2Max, sa2Obt, isSa2Special, sa2Raw: sub.sa2Obt || sub.t2MainObt,
      t2InternalObt: roundDisplay(t2Calc.internalObt),
      t2InternalMax: t2Calc.internalMax,
      t2Max, t2Obt: roundDisplay(t2Obt), t2Grade,
      rowMax,
      rowScored: roundDisplay(rowScored),
      overallRowGrade,
    }
  })

  totalT1InternalObt = roundDisplay(totalT1InternalObt)
  totalT1InternalMax = roundClean(totalT1InternalMax)
  totalSa1Obt = roundClean(totalSa1Obt)
  totalT1Obt = roundDisplay(totalT1Obt)

  totalT2InternalObt = roundDisplay(totalT2InternalObt)
  totalT2InternalMax = roundClean(totalT2InternalMax)
  totalSa2Obt = roundClean(totalSa2Obt)
  totalT2Obt = roundDisplay(totalT2Obt)

  grandTotalScored = roundDisplay(grandTotalScored)

  const overallPercentage = grandTotalMax > 0 ? (grandTotalScored / grandTotalMax) * 100 : 0
  const overallGrade = calculateScholasticGrade(overallPercentage)
  const overallDivision = calculateDivision(overallPercentage)

  const coScholasticT1 = data.coScholasticHalfYearly || data.coScholasticTerm1 || {}
  const coScholasticT2 = data.coScholasticAnnual || data.coScholasticTerm2 || {}

  const attendanceT1 = data.attendanceHalfYearly || (data.attendance ? { attended: data.attendance.term1Attended || 93, total: data.attendance.term1Total || 121 } : { attended: 93, total: 121 })
  const attendanceT2 = data.attendanceAnnual || (data.attendance ? { attended: data.attendance.term2Attended || 95, total: data.attendance.term2Total || 115 } : { attended: 95, total: 115 })

  const disciplineT1 = data.disciplineHalfYearly || data.discipline?.term1 || 'A'
  const disciplineT2 = data.disciplineAnnual || data.discipline?.term2 || 'A'

  const teacherRemarks = isHalfYearly
    ? (data.teacherRemarksHalfYearly || data.teacherRemarks || 'Very Good')
    : (data.teacherRemarksAnnual || data.teacherRemarks || 'Very Good')

  return (
    <div
      id="printable-report-card"
      className="printable-card-wrapper mx-auto max-w-4xl bg-white p-3 font-serif text-slate-900 shadow-xl print:m-0 print:max-w-none print:w-full print:border-none print:p-0 print:shadow-none"
    >
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 5mm 4mm 5mm;
          }
          body, html {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-card-wrapper {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Main Outer Border matching exact ICSE sample format */}
      <div className="border-2 border-slate-900 p-2 text-[10px] leading-tight bg-white">
        {/* Header Section */}
        <div className="text-center">
          <div className="flex items-center justify-between pb-1 border-b border-slate-300">
            {/* School Logo */}
            <div className="flex h-16 w-20 items-center justify-center shrink-0">
              <img src="/logo.png" alt="Parma Academy Logo" className="h-16 w-auto object-contain max-h-16" />
            </div>

            {/* School Title & Affiliation Info */}
            <div className="flex-1 px-2 text-center">
              <h1 className="text-lg font-black tracking-wider text-emerald-900 uppercase font-serif">
                PARMA ACADEMY
              </h1>
              <p className="text-[10px] font-bold text-blue-900">
                Affiliated to I.C.S.E./I.S.C Board , New Delhi
              </p>
              <p className="text-[9.5px] font-semibold text-slate-800">
                Parikrama Marg, Parmapuram, Ayodhya -224123(U.P)
              </p>
              <p className="text-[9px] font-medium text-blue-950">
                www.parmaacademy.com
              </p>
              <p className="text-[8.5px] font-normal text-slate-700">
                Ph. 8853810084 (off.), 7007178570, Email : parma.academy.2004@gmail.com
              </p>
            </div>

            {/* Right Balancer */}
            <div className="w-20 shrink-0"></div>
          </div>

          {/* Heading: REPORT CARD */}
          <div className="mt-1">
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-red-700 font-serif">
              {isHalfYearly ? 'HALF-YEARLY REPORT CARD' : 'REPORT CARD'}
            </h2>
            <div className="text-[10.5px] font-bold text-slate-900">
              Academic Session : {data.session || '2025-2026'}
            </div>
          </div>
        </div>

        {/* Student Demographic Details Section */}
        <div className="mt-1.5 border border-slate-400 p-1.5 bg-slate-50/30">
          <div className="flex justify-between items-start gap-3">
            {/* Details Left & Center Columns */}
            <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
              <div>
                <span className="font-semibold text-slate-700">Student's Name : </span>
                <span className="font-bold uppercase text-slate-900">{data.name}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Date of Birth : </span>
                <span className="font-bold text-slate-900">{data.dob || '—'}</span>
              </div>

              <div>
                <span className="font-semibold text-slate-700">Mother's Name : </span>
                <span className="font-bold uppercase text-slate-900">{data.motherName || '—'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Class-Section : </span>
                <span className="font-bold text-slate-900">{data.class || '—'}</span>
              </div>

              <div>
                <span className="font-semibold text-slate-700">Father's Name : </span>
                <span className="font-bold uppercase text-slate-900">
                  {resolveFatherName(data.studentId || data.id, data.name, data.fatherName) || '—'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Student ID : </span>
                <span className="font-bold text-slate-900">{data.studentId || data.id}</span>
              </div>

              <div>
                <span className="font-semibold text-slate-700">Parent ID : </span>
                <span className="font-bold text-slate-900">{data.parentId || data.parentID || `PAR${data.studentId || data.id}`}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">SR No. : </span>
                <span className="font-bold text-slate-900">{data.srNo || data.rollNo || '—'}</span>
              </div>
            </div>

            {/* Student Photo Section */}
            <div className="h-20 w-16 border border-slate-400 bg-slate-100 flex flex-col items-center justify-center text-[7.5px] text-slate-500 text-center font-sans shrink-0 overflow-hidden">
              {data.photoUrl ? (
                <img src={data.photoUrl} alt={data.name} className="h-full w-full object-cover" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              )}
            </div>
          </div>
        </div>

        {/* Academic Performance Header */}
        <div className="mt-1 bg-slate-100 border border-slate-400 py-0.5 text-center font-bold text-slate-900 text-[10px]">
          Academic Performance : Scholastic Areas
        </div>

        {/* Scholastic Table */}
        <div className="mt-0.5 overflow-x-auto">
          {isHalfYearly ? (
            /* HALF-YEARLY REPORT CARD TABLE */
            <table className="w-full border-collapse border border-slate-900 text-center text-[9px]">
              <thead>
                <tr className="bg-slate-50 font-bold border-b border-slate-900 text-slate-900">
                  <th rowSpan={2} className="border border-slate-900 p-1 w-36 text-left uppercase">
                    Subject
                  </th>
                  <th colSpan={5} className="border border-slate-900 p-0.5 uppercase">
                    TERM-1
                  </th>
                  <th colSpan={3} className="border border-slate-900 p-0.5 uppercase">
                    Grand Total
                  </th>
                </tr>
                <tr className="bg-slate-50 font-bold border-b border-slate-900 text-slate-900 text-[8px]">
                  <th colSpan={2} className="border border-slate-900 px-0.5 py-0.5 uppercase">INTERNAL ASSESMENT</th>
                  <th colSpan={2} className="border border-slate-900 px-0.5 py-0.5 uppercase">HALF YEARLY</th>
                  <th rowSpan={2} className="border border-slate-900 px-0.5 py-0.5">Total</th>

                  <th rowSpan={2} className="border border-slate-900 px-0.5 py-0.5">Max Marks</th>
                  <th rowSpan={2} className="border border-slate-900 px-0.5 py-0.5">Scored</th>
                  <th rowSpan={2} className="border border-slate-900 px-0.5 py-0.5">Grade</th>
                </tr>
                <tr className="bg-slate-50 text-[7.5px] border-b border-slate-900 text-slate-800">
                  <th className="border border-slate-900 px-0.5 py-0.5">Max. Marks</th>
                  <th className="border border-slate-900 px-0.5 py-0.5">Marks Obt.</th>
                  <th className="border border-slate-900 px-0.5 py-0.5">Max. Marks</th>
                  <th className="border border-slate-900 px-0.5 py-0.5">Marks Obt.</th>
                </tr>
              </thead>
              <tbody>
                {processedScholastic.map((sub, idx) => (
                  <tr key={idx} className="border-b border-slate-800 text-[8.5px]">
                    <td className="border border-slate-900 p-1 text-left font-bold uppercase text-slate-900">
                      {sub.name}
                    </td>
                    <td className="border border-slate-900 p-0.5">{sub.t1InternalMax}</td>
                    <td className="border border-slate-900 p-0.5 font-semibold">{sub.t1InternalObt}</td>
                    <td className="border border-slate-900 p-0.5">{sub.sa1Max}</td>
                    <td className="border border-slate-900 p-0.5 font-semibold">{sub.isSa1Special ? sub.sa1Raw : sub.sa1Obt}</td>
                    <td className="border border-slate-900 p-0.5 font-bold">{sub.t1Obt}</td>

                    <td className="border border-slate-900 p-0.5 font-bold">{sub.rowMax}</td>
                    <td className="border border-slate-900 p-0.5 font-bold">{sub.rowScored}</td>
                    <td className="border border-slate-900 p-0.5 font-bold">{sub.overallRowGrade}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-900 text-[8.5px]">
                  <td className="border border-slate-900 p-1 text-left uppercase">Total</td>
                  <td className="border border-slate-900 p-0.5">{totalT1InternalMax}</td>
                  <td className="border border-slate-900 p-0.5">{totalT1InternalObt}</td>
                  <td className="border border-slate-900 p-0.5">{totalSa1Max}</td>
                  <td className="border border-slate-900 p-0.5">{totalSa1Obt}</td>
                  <td className="border border-slate-900 p-0.5 font-black">{totalT1Obt}</td>

                  <td className="border border-slate-900 p-0.5 font-black">{grandTotalMax}</td>
                  <td className="border border-slate-900 p-0.5 font-black">{grandTotalScored}</td>
                  <td className="border border-slate-900 p-0.5 font-black">{overallGrade}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            /* ANNUAL / FINAL REPORT CARD TABLE (Matches reference PDF exactly) */
            <table className="w-full border-collapse border border-slate-900 text-center text-[8.5px]">
              <thead>
                <tr className="bg-slate-50 font-bold border-b border-slate-900 text-slate-900">
                  <th rowSpan={2} className="border border-slate-900 p-1 w-32 text-left uppercase">
                    Subject
                  </th>
                  <th colSpan={5} className="border border-slate-900 p-0.5 uppercase">
                    TERM-1
                  </th>
                  <th colSpan={5} className="border border-slate-900 p-0.5 uppercase">
                    TERM-2
                  </th>
                  <th colSpan={3} className="border border-slate-900 p-0.5 uppercase">
                    Grand Total
                  </th>
                </tr>
                <tr className="bg-slate-50 font-bold border-b border-slate-900 text-slate-900 text-[7.5px]">
                  <th colSpan={2} className="border border-slate-900 px-0.5 py-0.5 uppercase">INTERNAL ASSESMENT</th>
                  <th colSpan={2} className="border border-slate-900 px-0.5 py-0.5 uppercase">HALF YEARLY</th>
                  <th rowSpan={2} className="border border-slate-900 px-0.5 py-0.5">Total</th>

                  <th colSpan={2} className="border border-slate-900 px-0.5 py-0.5 uppercase">INTERNAL ASSESMENT</th>
                  <th colSpan={2} className="border border-slate-900 px-0.5 py-0.5 uppercase">ANNUAL</th>
                  <th rowSpan={2} className="border border-slate-900 px-0.5 py-0.5">Total</th>

                  <th rowSpan={2} className="border border-slate-900 px-0.5 py-0.5">Max Marks</th>
                  <th rowSpan={2} className="border border-slate-900 px-0.5 py-0.5">Scored</th>
                  <th rowSpan={2} className="border border-slate-900 px-0.5 py-0.5">Grade</th>
                </tr>
                <tr className="bg-slate-50 text-[7px] border-b border-slate-900 text-slate-800">
                  <th className="border border-slate-900 px-0.5 py-0.5">Max. Marks</th>
                  <th className="border border-slate-900 px-0.5 py-0.5">Marks Obt.</th>
                  <th className="border border-slate-900 px-0.5 py-0.5">Max. Marks</th>
                  <th className="border border-slate-900 px-0.5 py-0.5">Marks Obt.</th>

                  <th className="border border-slate-900 px-0.5 py-0.5">Max. Marks</th>
                  <th className="border border-slate-900 px-0.5 py-0.5">Marks Obt.</th>
                  <th className="border border-slate-900 px-0.5 py-0.5">Max. Marks</th>
                  <th className="border border-slate-900 px-0.5 py-0.5">Marks Obt.</th>
                </tr>
              </thead>
              <tbody>
                {processedScholastic.map((sub, idx) => (
                  <tr key={idx} className="border-b border-slate-800 text-[8px]">
                    <td className="border border-slate-900 p-0.5 text-left font-bold uppercase text-slate-900">
                      {sub.name}
                    </td>
                    {/* TERM-1 Internal */}
                    <td className="border border-slate-900 p-0.5">{sub.t1InternalMax}</td>
                    <td className="border border-slate-900 p-0.5 font-semibold">{sub.t1InternalObt}</td>
                    {/* TERM-1 Half Yearly */}
                    <td className="border border-slate-900 p-0.5">{sub.sa1Max}</td>
                    <td className="border border-slate-900 p-0.5 font-semibold">{sub.isSa1Special ? sub.sa1Raw : sub.sa1Obt}</td>
                    {/* TERM-1 Total */}
                    <td className="border border-slate-900 p-0.5 font-bold">{sub.t1Obt}</td>

                    {/* TERM-2 Internal */}
                    <td className="border border-slate-900 p-0.5">{sub.t2InternalMax}</td>
                    <td className="border border-slate-900 p-0.5 font-semibold">{sub.t2InternalObt}</td>
                    {/* TERM-2 Annual */}
                    <td className="border border-slate-900 p-0.5">{sub.sa2Max}</td>
                    <td className="border border-slate-900 p-0.5 font-semibold">{sub.isSa2Special ? sub.sa2Raw : sub.sa2Obt}</td>
                    {/* TERM-2 Total */}
                    <td className="border border-slate-900 p-0.5 font-bold">{sub.t2Obt}</td>

                    {/* Grand Total */}
                    <td className="border border-slate-900 p-0.5 font-bold">{sub.rowMax}</td>
                    <td className="border border-slate-900 p-0.5 font-bold">{sub.rowScored}</td>
                    <td className="border border-slate-900 p-0.5 font-bold">{sub.overallRowGrade}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-900 text-[8px]">
                  <td className="border border-slate-900 p-0.5 text-left uppercase">Total</td>
                  <td className="border border-slate-900 p-0.5">{totalT1InternalMax}</td>
                  <td className="border border-slate-900 p-0.5">{totalT1InternalObt}</td>
                  <td className="border border-slate-900 p-0.5">{totalSa1Max}</td>
                  <td className="border border-slate-900 p-0.5">{totalSa1Obt}</td>
                  <td className="border border-slate-900 p-0.5 font-black">{totalT1Obt}</td>

                  <td className="border border-slate-900 p-0.5">{totalT2InternalMax}</td>
                  <td className="border border-slate-900 p-0.5">{totalT2InternalObt}</td>
                  <td className="border border-slate-900 p-0.5">{totalSa2Max}</td>
                  <td className="border border-slate-900 p-0.5">{totalSa2Obt}</td>
                  <td className="border border-slate-900 p-0.5 font-black">{totalT2Obt}</td>

                  <td className="border border-slate-900 p-0.5 font-black">{grandTotalMax}</td>
                  <td className="border border-slate-900 p-0.5 font-black">{grandTotalScored}</td>
                  <td className="border border-slate-900 p-0.5 font-black">{overallGrade}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Overall Marks Summary Box */}
        <div className="mt-1 border border-slate-900 p-1 bg-slate-50/50 flex flex-wrap justify-between items-center text-[9px] font-bold">
          <div>
            <span>Overall Marks : </span>
            <span className="font-extrabold">{grandTotalScored.toFixed(2)} / {grandTotalMax.toFixed(2)}</span>
          </div>
          <div>
            <span>Percentage : </span>
            <span className="font-extrabold">{overallPercentage.toFixed(2)} %</span>
          </div>
          <div>
            <span>Grade : </span>
            <span className="font-extrabold">{overallGrade}</span>
          </div>
          <div>
            <span>Division : </span>
            <span className="font-extrabold">{overallDivision}</span>
          </div>
        </div>

        {/* Co-Scholastic Areas (Two Columns matching PDF) */}
        <div className="mt-1 grid grid-cols-2 gap-2 text-[8.5px]">
          {/* Term 1 Co-Scholastic Table */}
          <div className="border border-slate-900">
            <div className="bg-slate-100 font-bold border-b border-slate-900 px-1 py-0.5 flex justify-between">
              <span>Co-Scholastic Areas TERM-1 [on a 3-point (A-C) grading scale]</span>
              <span className="font-bold">Grade</span>
            </div>
            <div className="divide-y divide-slate-300">
              {OFFICIAL_CO_SCHOLASTIC_SKILLS.map((skill) => (
                <div key={skill} className="flex justify-between px-1.5 py-0.5">
                  <span className="text-slate-800">{skill}</span>
                  <span className="font-bold text-slate-900">{coScholasticT1[skill] || 'A'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Term 2 Co-Scholastic Table */}
          <div className="border border-slate-900">
            <div className="bg-slate-100 font-bold border-b border-slate-900 px-1 py-0.5 flex justify-between">
              <span>Co-Scholastic Areas TERM-2 [on a 3-point (A-C) grading scale]</span>
              <span className="font-bold">Grade</span>
            </div>
            <div className="divide-y divide-slate-300">
              {OFFICIAL_CO_SCHOLASTIC_SKILLS.map((skill) => (
                <div key={skill} className="flex justify-between px-1.5 py-0.5">
                  <span className="text-slate-800">{skill}</span>
                  <span className="font-bold text-slate-900">{isHalfYearly ? (coScholasticT1[skill] || 'A') : (coScholasticT2[skill] || 'A')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Discipline & Attendance Section (Two Columns matching PDF) */}
        <div className="mt-1 grid grid-cols-2 gap-2 text-[8.5px]">
          {/* Term 1 Discipline & Attendance */}
          <div className="border border-slate-900 p-1 space-y-0.5">
            <div className="flex justify-between">
              <span className="font-bold text-slate-900">Discipline : TERM-1 [on a 3-point (A-C) grading scale]</span>
              <span className="font-bold text-slate-900">{disciplineT1}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Attendance</span>
              <span className="font-bold">{attendanceT1.attended || 93}/{attendanceT1.total || 121}</span>
            </div>
            <div className="flex justify-between">
              <span>Grace</span>
              <span>-</span>
            </div>
          </div>

          {/* Term 2 Discipline & Attendance */}
          <div className="border border-slate-900 p-1 space-y-0.5">
            <div className="flex justify-between">
              <span className="font-bold text-slate-900">Discipline : TERM-2 [on a 3-point (A-C) grading scale]</span>
              <span className="font-bold text-slate-900">{isHalfYearly ? disciplineT1 : disciplineT2}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Attendance</span>
              <span className="font-bold">{isHalfYearly ? '' : `${attendanceT2.attended || 95}/${attendanceT2.total || 115}`}</span>
            </div>
            <div className="flex justify-between">
              <span>Grace</span>
              <span></span>
            </div>
          </div>
        </div>

        {/* Teacher Remarks & Promoted to */}
        <div className="mt-1 border-t border-slate-400 pt-1 text-[9px]">
          <div className="flex items-center gap-1">
            <span className="font-bold text-slate-900">Class Teacher's Remarks : </span>
            <span className="text-slate-800 font-medium">........................................................................... {teacherRemarks}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="font-bold text-slate-900">Promoted to : </span>
            <span className="text-slate-800 font-medium">........................................................................... {isHalfYearly ? '' : (data.promotedClass || 'Promoted to Next Higher Class')}</span>
          </div>
        </div>

        {/* Signatures & Place/Date Footer */}
        <div className="mt-3 pt-2 text-[9px]">
          <div className="flex justify-between items-end px-2">
            <div>
              <div><span className="font-semibold text-slate-700">Place : </span><span className="font-bold">Ayodhya</span></div>
              <div className="mt-0.5"><span className="font-semibold text-slate-700">Date : </span><span className="font-bold">{data.date || '31/01/2026'}</span></div>
            </div>
            <div className="text-center">
              <span className="font-bold text-slate-900">Signature of Class Teacher</span>
            </div>
            <div className="text-center">
              <span className="font-bold text-slate-900">Signature of Principal</span>
            </div>
          </div>
        </div>

        {/* Bottom Legend Boxes (Grading Scales) */}
        <div className="mt-2 grid grid-cols-2 gap-2 text-[7px] leading-tight">
          {/* Scholastic Grading Scale Legend */}
          <div className="border border-slate-900 p-1">
            <div className="font-bold text-slate-900">Grading Scale for scholastic areas :</div>
            <div className="text-slate-700">Grades are awarded on a 8-point grading scale as follow -</div>
            <div className="text-slate-900 font-medium mt-0.5">
              A1 [91%-100%], A2 [81%-90%], B1 [ 71%-80%], B2 [61%-70%], C1 [51%-60%], C2 [41%-50%], D [33%-40%], E [ 32% (Needs improvement)]
            </div>
          </div>

          {/* Co-Scholastic Grading Scale Legend */}
          <div className="border border-slate-900 p-1">
            <div className="font-bold text-slate-900">Grading Scale for co-scholastic areas :</div>
            <div className="text-slate-700">Grades are awarded on a 3-point grading scale</div>
            <div className="text-slate-900 font-medium mt-0.5">
              A [Outstanding], B [ Very Good], C [Fair], D [ Needs improvement]
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
