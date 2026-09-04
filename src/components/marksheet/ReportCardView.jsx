import React from 'react'
import {
  CO_SCHOLASTIC_SKILLS,
  calculateAnnualSubjectMarks,
  calculateDivision,
  calculateScholasticGrade,
  calculateTermMarks,
} from '../../utils/marksheetDefaults.js'
import { cleanFatherName, resolveFatherName } from '../../firebase/marksheetRepository.js'

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
    return Number.isInteger(n) ? n : Number(n.toFixed(2))
  }

  // Calculate totals and grades for each scholastic row
  let totalFa1Max = 0, totalFa1Obt = 0
  let totalFa2Max = 0, totalFa2Obt = 0
  let totalSa1Max = 0, totalSa1Obt = 0
  let totalT1Max = 0, totalT1Obt = 0

  let totalFa3Max = 0, totalFa3Obt = 0
  let totalFa4Max = 0, totalFa4Obt = 0
  let totalSa2Max = 0, totalSa2Obt = 0
  let totalT2Max = 0, totalT2Obt = 0

  let grandTotalMax = 0
  let grandTotalScored = 0

  const processedScholastic = (data.scholastic || []).map((sub) => {
    // Term 1 components (FA-1 20, FA-2 20, SA-1 80 -> Combined FA/2 + SA-1 => 100)
    const fa1Max = sub.fa1Max !== undefined && sub.fa1Max !== '' ? parseSafeNum(sub.fa1Max, 20) : (sub.t1IntMax !== undefined ? parseSafeNum(sub.t1IntMax, 20) : 20)
    const fa1Obt = sub.fa1Obt !== undefined && sub.fa1Obt !== '' ? parseSafeNum(sub.fa1Obt, 0) : (sub.t1IntObt !== undefined ? parseSafeNum(sub.t1IntObt, 0) : 0)

    const fa2Max = sub.fa2Max !== undefined && sub.fa2Max !== '' ? parseSafeNum(sub.fa2Max, 20) : 20
    const fa2Obt = sub.fa2Obt !== undefined && sub.fa2Obt !== '' ? parseSafeNum(sub.fa2Obt, 0) : 0

    const isSa1Special = isSpecialNote(sub.sa1Obt)
    const sa1Max = sub.sa1Max !== undefined && sub.sa1Max !== '' ? parseSafeNum(sub.sa1Max, 80) : (sub.t1MainMax !== undefined ? parseSafeNum(sub.t1MainMax, 80) : 80)
    const sa1Obt = isSa1Special ? 0 : (sub.sa1Obt !== undefined && sub.sa1Obt !== '' ? parseSafeNum(sub.sa1Obt, 0) : (sub.t1MainObt !== undefined ? parseSafeNum(sub.t1MainObt, 0) : 0))

    // Term 1 Total: SA-1 + (FA-1 + FA-2) / 2 => Out of 100
    const t1Calc = calculateTermMarks(fa1Obt, fa2Obt, sa1Obt, fa1Max, fa2Max, sa1Max)
    const t1Max = t1Calc.maxMarks
    const t1Obt = isSa1Special ? roundClean(t1Calc.faWeighted) : t1Calc.totalObt
    const t1Percent = t1Max > 0 ? (t1Obt / t1Max) * 100 : 0
    const t1Grade = calculateScholasticGrade(t1Percent)

    // Term 2 components (FA-3 20, FA-4 20, SA-2 80 -> Combined FA/2 + SA-2 => 100)
    const fa3Max = sub.fa3Max !== undefined && sub.fa3Max !== '' ? parseSafeNum(sub.fa3Max, 20) : (sub.t2IntMax !== undefined ? parseSafeNum(sub.t2IntMax, 20) : 20)
    const fa3Obt = sub.fa3Obt !== undefined && sub.fa3Obt !== '' ? parseSafeNum(sub.fa3Obt, 0) : (sub.t2IntObt !== undefined ? parseSafeNum(sub.t2IntObt, 0) : 0)

    const fa4Max = sub.fa4Max !== undefined && sub.fa4Max !== '' ? parseSafeNum(sub.fa4Max, 20) : 20
    const fa4Obt = sub.fa4Obt !== undefined && sub.fa4Obt !== '' ? parseSafeNum(sub.fa4Obt, 0) : 0

    const isSa2Special = isSpecialNote(sub.sa2Obt) || isSpecialNote(sub.t2MainObt)
    const sa2Max = sub.sa2Max !== undefined && sub.sa2Max !== '' ? parseSafeNum(sub.sa2Max, 80) : (sub.t2MainMax !== undefined ? parseSafeNum(sub.t2MainMax, 80) : 80)
    const sa2Obt = isSa2Special ? 0 : (sub.sa2Obt !== undefined && sub.sa2Obt !== '' ? parseSafeNum(sub.sa2Obt, 0) : (sub.t2MainObt !== undefined ? parseSafeNum(sub.t2MainObt, 0) : 0))

    // Term 2 Total: SA-2 + (FA-3 + FA-4) / 2 => Out of 100
    const t2Calc = calculateTermMarks(fa3Obt, fa4Obt, sa2Obt, fa3Max, fa4Max, sa2Max)
    const t2Max = t2Calc.maxMarks
    const t2Obt = isSa2Special ? roundClean(t2Calc.faWeighted) : t2Calc.totalObt
    const t2Percent = t2Max > 0 ? (t2Obt / t2Max) * 100 : 0
    const t2Grade = calculateScholasticGrade(t2Percent)

    // Full Year Total (Half-Yearly: out of 100 | Annual / Final: out of 200)
    const annualCalc = calculateAnnualSubjectMarks(t1Obt, t2Obt, t1Max, t2Max)
    const rowMax = isHalfYearly ? t1Max : annualCalc.maxMarks
    const rowScored = isHalfYearly ? t1Obt : annualCalc.totalObt
    const overallPercent = rowMax > 0 ? (rowScored / rowMax) * 100 : 0
    const overallRowGrade = calculateScholasticGrade(overallPercent)

    // Accumulate
    totalFa1Max += fa1Max
    totalFa1Obt += fa1Obt
    totalFa2Max += fa2Max
    totalFa2Obt += fa2Obt
    totalSa1Max += sa1Max
    totalSa1Obt += sa1Obt
    totalT1Max += t1Max
    totalT1Obt += t1Obt

    totalFa3Max += fa3Max
    totalFa3Obt += fa3Obt
    totalFa4Max += fa4Max
    totalFa4Obt += fa4Obt
    totalSa2Max += sa2Max
    totalSa2Obt += sa2Obt
    totalT2Max += t2Max
    totalT2Obt += t2Obt

    grandTotalMax += rowMax
    grandTotalScored += rowScored

    return {
      name: sub.name,
      fa1Max, fa1Obt,
      fa2Max, fa2Obt,
      sa1Max, sa1Obt, isSa1Special, sa1Raw: sub.sa1Obt,
      t1Max, t1Obt, t1Grade,
      fa3Max, fa3Obt,
      fa4Max, fa4Obt,
      sa2Max, sa2Obt, isSa2Special, sa2Raw: sub.sa2Obt || sub.t2MainObt,
      t2Max, t2Obt, t2Grade,
      rowMax,
      rowScored,
      overallRowGrade,
    }
  })

  totalFa1Obt = roundClean(totalFa1Obt)
  totalFa2Obt = roundClean(totalFa2Obt)
  totalSa1Obt = roundClean(totalSa1Obt)
  totalT1Obt = roundClean(totalT1Obt)

  totalFa3Obt = roundClean(totalFa3Obt)
  totalFa4Obt = roundClean(totalFa4Obt)
  totalSa2Obt = roundClean(totalSa2Obt)
  totalT2Obt = roundClean(totalT2Obt)

  grandTotalScored = roundClean(grandTotalScored)

  const overallPercentage = grandTotalMax > 0 ? (grandTotalScored / grandTotalMax) * 100 : 0
  const overallGrade = calculateScholasticGrade(overallPercentage)
  const overallDivision = calculateDivision(overallPercentage)

  const coScholastic = isHalfYearly
    ? (data.coScholasticHalfYearly || data.coScholasticTerm1 || {})
    : (data.coScholasticAnnual || data.coScholasticTerm2 || {})

  const attendance = isHalfYearly
    ? (data.attendanceHalfYearly || (data.attendance ? { attended: data.attendance.term1Attended || 104, total: data.attendance.term1Total || 110 } : { attended: 104, total: 110 }))
    : (data.attendanceAnnual || (data.attendance ? { attended: (data.attendance.term1Attended || 104) + (data.attendance.term2Attended || 91), total: (data.attendance.term1Total || 110) + (data.attendance.term2Total || 105) } : { attended: 195, total: 215 }))

  const discipline = isHalfYearly
    ? (data.disciplineHalfYearly || data.discipline?.term1 || 'A')
    : (data.disciplineAnnual || data.discipline?.term2 || 'A')

  const teacherRemarks = isHalfYearly
    ? (data.teacherRemarksHalfYearly || data.teacherRemarks || 'Good performance in Half-Yearly evaluation.')
    : (data.teacherRemarksAnnual || data.teacherRemarks || 'Promoted with good academic standing and conduct.')

  return (
    <div
      id="printable-report-card"
      className="printable-card-wrapper mx-auto max-w-4xl rounded-sm border border-slate-400 bg-white p-4 font-serif text-slate-900 shadow-xl print:m-0 print:max-w-none print:w-full print:border-none print:p-0 print:shadow-none"
    >
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm;
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

      {/* Outer Border Container matching exact reference format */}
      <div className="border-2 border-slate-900 p-2.5 text-xs leading-tight bg-white">
        {/* Header Section */}
        <div className="text-center">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-300">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-slate-900 bg-indigo-900 text-white font-bold text-base shadow-sm">
              PA
            </div>
            <div className="flex-1 px-3">
              <h1 className="text-xl tracking-wide text-red-700 uppercase zen-dots-regular">
                PARMA ACADEMY
              </h1>
              <p className="text-[10px] font-semibold text-slate-800">
                Affiliated to I.C.S.E. / I.S.C Board, New Delhi
              </p>
              <p className="text-[9.5px] text-slate-700">
                Naka Deokali Bypass, Janaura, Ayodhya -224001 (U.P)
              </p>
              <p className="text-[9px] text-slate-600">
                www.parmaacademy.in | Ph. 9235440873, 9415716555 | Email : info@parmaacademy.in
              </p>
            </div>
            <div className="w-14"></div>
          </div>

          <div className="mt-1 inline-block border-b-2 border-slate-900 px-5 py-0.5 text-sm font-extrabold uppercase tracking-widest text-slate-900">
            {isHalfYearly ? 'HALF-YEARLY REPORT CARD' : 'ANNUAL REPORT CARD'}
          </div>
          <div className="text-[11px] font-bold text-slate-800 mt-0.5">
            Academic Session : {data.session || '2026-27'} | Assessment : {isHalfYearly ? 'Term 1 (FA-1 + FA-2 + SA-1)' : 'Whole Academic Year (All Exams)'}
          </div>
        </div>

        {/* Student Details Grid */}
        <div className="mt-2 border border-slate-400 bg-slate-50/50 p-1.5">
          <div className="flex justify-between items-start gap-3">
            <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 text-[10.5px]">
              <div>
                <span className="font-semibold text-slate-700">Student's Name : </span>
                <span className="font-extrabold uppercase text-slate-900">{data.name}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Date of Birth : </span>
                <span className="font-bold text-slate-900">{data.dob || '—'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Class : </span>
                <span className="font-bold text-slate-900">{data.class || '—'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Father's Name : </span>
                <span className="font-bold text-slate-900">
                  {resolveFatherName(data.studentId || data.id, data.name, data.fatherName) || '—'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Student ID : </span>
                <span className="font-bold text-slate-900">{data.studentId || data.id}</span>
              </div>
            </div>

            {/* Student Photo Box */}
            <div className="h-16 w-14 border border-slate-500 bg-slate-200 flex flex-col items-center justify-center text-[8.5px] text-slate-600 text-center font-sans overflow-hidden">
              {data.photoUrl ? (
                <img src={data.photoUrl} alt={data.name} className="h-full w-full object-cover" />
              ) : (
                <>
                  <span className="text-base">👤</span>
                  <span>PHOTO</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Academic Performance Header */}
        <div className="mt-2 bg-slate-100 border border-slate-400 py-0.5 text-center font-bold text-slate-900 uppercase tracking-wide text-[10.5px]">
          Academic Performance : Scholastic Areas ({isHalfYearly ? 'Half-Yearly Evaluation' : 'Whole Academic Year Evaluation'})
        </div>

        {/* Scholastic Table */}
        <div className="mt-1 overflow-x-auto">
          {isHalfYearly ? (
            /* HALF YEARLY TABLE (FA-1, FA-2, SA-1, Total, Grade) */
            <table className="w-full border-collapse border border-slate-500 text-center text-[9.5px]">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-500 text-slate-900">
                  <th rowSpan={2} className="border border-slate-500 p-1 w-32 text-left uppercase">
                    Subject
                  </th>
                  <th colSpan={2} className="border border-slate-500 p-0.5 uppercase">
                    F.A.-1 (May)
                  </th>
                  <th colSpan={2} className="border border-slate-500 p-0.5 uppercase">
                    F.A.-2 (July)
                  </th>
                  <th colSpan={2} className="border border-slate-500 p-0.5 uppercase">
                    S.A.-1 Half-Yearly (Sep)
                  </th>
                  <th colSpan={2} className="border border-slate-500 p-0.5 uppercase">
                    Half-Yearly Total
                  </th>
                  <th rowSpan={2} className="border border-slate-500 p-1 uppercase font-bold w-14">
                    Grade
                  </th>
                </tr>
                <tr className="bg-slate-100 text-[8.5px]">
                  <th className="border border-slate-500 px-1 py-0.5">Max</th>
                  <th className="border border-slate-500 px-1 py-0.5">Obt</th>
                  <th className="border border-slate-500 px-1 py-0.5">Max</th>
                  <th className="border border-slate-500 px-1 py-0.5">Obt</th>
                  <th className="border border-slate-500 px-1 py-0.5">Max</th>
                  <th className="border border-slate-500 px-1 py-0.5">Obt</th>
                  <th className="border border-slate-500 px-1 py-0.5 font-bold">Max</th>
                  <th className="border border-slate-500 px-1 py-0.5 font-bold">Scored</th>
                </tr>
              </thead>
              <tbody>
                {processedScholastic.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 border-b border-slate-400 font-sans text-[9.5px]">
                    <td className="border border-slate-500 p-1 text-left font-bold uppercase text-slate-900">
                      {sub.name}
                    </td>
                    <td className="border border-slate-500 p-0.5">{sub.fa1Max}</td>
                    <td className="border border-slate-500 p-0.5 font-semibold">{sub.fa1Obt}</td>
                    <td className="border border-slate-500 p-0.5">{sub.fa2Max}</td>
                    <td className="border border-slate-500 p-0.5 font-semibold">{sub.fa2Obt}</td>
                    <td className="border border-slate-500 p-0.5">{sub.sa1Max}</td>
                    <td className="border border-slate-500 p-0.5 font-semibold">
                      {sub.isSa1Special ? sub.sa1Raw : sub.sa1Obt}
                    </td>
                    <td className="border border-slate-500 p-0.5 font-bold">{sub.t1Max}</td>
                    <td className="border border-slate-500 p-0.5 font-bold text-indigo-900">{sub.t1Obt}</td>
                    <td className="border border-slate-500 p-0.5 font-extrabold">{sub.t1Grade}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-700 text-[9.5px]">
                  <td className="border border-slate-500 p-1 text-left uppercase">Grand Total</td>
                  <td className="border border-slate-500 p-0.5">{totalFa1Max}</td>
                  <td className="border border-slate-500 p-0.5">{totalFa1Obt}</td>
                  <td className="border border-slate-500 p-0.5">{totalFa2Max}</td>
                  <td className="border border-slate-500 p-0.5">{totalFa2Obt}</td>
                  <td className="border border-slate-500 p-0.5">{totalSa1Max}</td>
                  <td className="border border-slate-500 p-0.5">{totalSa1Obt}</td>
                  <td className="border border-slate-500 p-0.5 font-bold">{totalT1Max}</td>
                  <td className="border border-slate-500 p-0.5 font-black text-indigo-900">{totalT1Obt}</td>
                  <td className="border border-slate-500 p-0.5 font-black">{overallGrade}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            /* ANNUAL FULL YEAR TABLE (All 6 Exams: FA1, FA2, SA1, FA3, FA4, SA2 + Grand Total) */
            <table className="w-full border-collapse border border-slate-500 text-center text-[9px]">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-500 text-slate-900">
                  <th rowSpan={2} className="border border-slate-500 p-0.5 w-24 text-left uppercase">
                    Subject
                  </th>
                  <th colSpan={4} className="border border-slate-500 p-0.5 uppercase bg-indigo-50/50">
                    TERM 1 (Half-Yearly)
                  </th>
                  <th colSpan={4} className="border border-slate-500 p-0.5 uppercase bg-purple-50/50">
                    TERM 2 (Annual)
                  </th>
                  <th colSpan={3} className="border border-slate-500 p-0.5 uppercase bg-slate-200">
                    Whole Year
                  </th>
                </tr>
                <tr className="bg-slate-100 text-[8px]">
                  <th className="border border-slate-500 px-0.5 py-0.5">FA-1</th>
                  <th className="border border-slate-500 px-0.5 py-0.5">FA-2</th>
                  <th className="border border-slate-500 px-0.5 py-0.5">SA-1</th>
                  <th className="border border-slate-500 px-0.5 py-0.5 font-bold bg-indigo-100">T1 Total</th>

                  <th className="border border-slate-500 px-0.5 py-0.5">FA-3</th>
                  <th className="border border-slate-500 px-0.5 py-0.5">FA-4</th>
                  <th className="border border-slate-500 px-0.5 py-0.5">SA-2</th>
                  <th className="border border-slate-500 px-0.5 py-0.5 font-bold bg-purple-100">T2 Total</th>

                  <th className="border border-slate-500 px-0.5 py-0.5 font-bold">Max</th>
                  <th className="border border-slate-500 px-0.5 py-0.5 font-bold">Scored</th>
                  <th className="border border-slate-500 px-0.5 py-0.5 font-bold">Grade</th>
                </tr>
              </thead>
              <tbody>
                {processedScholastic.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 border-b border-slate-400 font-sans text-[8.5px]">
                    <td className="border border-slate-500 p-0.5 text-left font-bold uppercase text-slate-900">
                      {sub.name}
                    </td>

                    {/* Term 1 */}
                    <td className="border border-slate-500 p-0.5">{sub.fa1Obt}</td>
                    <td className="border border-slate-500 p-0.5">{sub.fa2Obt}</td>
                    <td className="border border-slate-500 p-0.5">{sub.isSa1Special ? sub.sa1Raw : sub.sa1Obt}</td>
                    <td className="border border-slate-500 p-0.5 font-bold bg-indigo-50/50">{sub.t1Obt}</td>

                    {/* Term 2 */}
                    <td className="border border-slate-500 p-0.5">{sub.fa3Obt}</td>
                    <td className="border border-slate-500 p-0.5">{sub.fa4Obt}</td>
                    <td className="border border-slate-500 p-0.5">{sub.isSa2Special ? sub.sa2Raw : sub.sa2Obt}</td>
                    <td className="border border-slate-500 p-0.5 font-bold bg-purple-50/50">{sub.t2Obt}</td>

                    {/* Whole Year */}
                    <td className="border border-slate-500 p-0.5 font-bold">{sub.rowMax}</td>
                    <td className="border border-slate-500 p-0.5 font-bold text-indigo-900">{sub.rowScored}</td>
                    <td className="border border-slate-500 p-0.5 font-extrabold">{sub.overallRowGrade}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-700 text-[8.5px]">
                  <td className="border border-slate-500 p-0.5 text-left uppercase">Grand Total</td>
                  <td className="border border-slate-500 p-0.5">{totalFa1Obt}</td>
                  <td className="border border-slate-500 p-0.5">{totalFa2Obt}</td>
                  <td className="border border-slate-500 p-0.5">{totalSa1Obt}</td>
                  <td className="border border-slate-500 p-0.5 font-bold bg-indigo-100">{totalT1Obt}</td>

                  <td className="border border-slate-500 p-0.5">{totalFa3Obt}</td>
                  <td className="border border-slate-500 p-0.5">{totalFa4Obt}</td>
                  <td className="border border-slate-500 p-0.5">{totalSa2Obt}</td>
                  <td className="border border-slate-500 p-0.5 font-bold bg-purple-100">{totalT2Obt}</td>

                  <td className="border border-slate-500 p-0.5 font-bold">{grandTotalMax}</td>
                  <td className="border border-slate-500 p-0.5 font-black text-indigo-900">{grandTotalScored}</td>
                  <td className="border border-slate-500 p-0.5 font-black">{overallGrade}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Co-Scholastic & Attendance & Discipline Summary Box */}
        <div className="mt-2 grid grid-cols-2 gap-2 text-[9.5px]">
          {/* Co-Scholastic Box */}
          <div className="border border-slate-500 p-1">
            <div className="bg-slate-100 font-bold text-center border-b border-slate-400 pb-0.5 mb-1 uppercase text-[9.5px]">
              Co-Scholastic Activities ({isHalfYearly ? 'Term 1' : 'Cumulative'})
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
              {CO_SCHOLASTIC_SKILLS.slice(0, 8).map((skill) => (
                <div key={skill} className="flex justify-between border-b border-slate-200 py-0.5">
                  <span className="text-slate-700 truncate">{skill}</span>
                  <span className="font-bold text-slate-900 ml-1">{coScholastic[skill] || 'A'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Evaluation Summary & Discipline Box */}
          <div className="border border-slate-500 p-1 flex flex-col justify-between">
            <div>
              <div className="bg-slate-100 font-bold text-center border-b border-slate-400 pb-0.5 mb-1 uppercase text-[9.5px]">
                Overall Performance Summary
              </div>
              <div className="space-y-0.5 text-[9.5px]">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">Total Marks Scored :</span>
                  <span className="font-bold text-slate-900">{grandTotalScored} / {grandTotalMax}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">Overall Percentage :</span>
                  <span className="font-bold text-slate-900">{overallPercentage.toFixed(2)} %</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">Final Grade & Division :</span>
                  <span className="font-bold text-indigo-900">{overallGrade} ({overallDivision})</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">Discipline :</span>
                  <span className="font-bold text-slate-900">Grade {discipline}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">Attendance :</span>
                  <span className="font-bold text-slate-900">{attendance.attended || 0} / {attendance.total || 0} Days</span>
                </div>
              </div>
            </div>

            <div className="mt-1 border-t border-slate-300 pt-0.5 text-[9px]">
              <span className="font-semibold text-slate-700">Remarks : </span>
              <span className="italic text-slate-900">{teacherRemarks}</span>
            </div>
          </div>
        </div>

        {/* Grading Scale Legend */}
        <div className="mt-1 border border-slate-400 p-0.5 text-[8px] bg-slate-50/50">
          <span className="font-bold text-slate-800 uppercase">Grading Scale (Scholastic) : </span>
          <span className="text-slate-700">
            A1 (91-100%) | A2 (81-90%) | B1 (71-80%) | B2 (61-70%) | C1 (51-60%) | C2 (41-50%) | D (33-40%) | E (Failed)
          </span>
        </div>

        {/* Signatures & Promotion Footer */}
        <div className="mt-3 pt-2 border-t border-slate-400 text-[9.5px]">
          <div className="flex justify-between items-end text-center px-4 font-bold">
            <div>
              <div className="w-24 border-b border-slate-900 mb-1"></div>
              <span>Class Teacher</span>
            </div>
            <div>
              <div className="w-24 border-b border-slate-900 mb-1"></div>
              <span>Exam In-Charge</span>
            </div>
            <div>
              <div className="w-24 border-b border-slate-900 mb-1"></div>
              <span>Principal</span>
            </div>
          </div>

          <div className="mt-2 flex justify-between items-center text-[8.5px] text-slate-600 px-1">
            <span>Place : Ayodhya</span>
            <span className="font-bold text-slate-900">
              {isHalfYearly ? 'Status : Half-Yearly Evaluated' : `Status : ${data.promotedClass || 'Promoted to Next Class'}`}
            </span>
            <span>Date : {data.date || '29/03/2027'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
