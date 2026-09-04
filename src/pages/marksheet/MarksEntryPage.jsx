import React, { useEffect, useMemo, useState } from 'react'
import {
  ALL_CLASSES,
  CO_SCHOLASTIC_SKILLS,
  EXAM_SCHEDULE,
  EXAM_TYPES,
  matchClassKey,
} from '../../utils/marksheetDefaults.js'
import {
  createEmptyMarksheetForStudent,
  filterStudentsByClass,
  getMergedStudentsList,
  resolveFatherName,
  saveExamMarks,
  saveStudentMarksheet,
  subscribeMarksheetRecords,
} from '../../firebase/marksheetRepository.js'
import { subscribeStudents } from '../../firebase/studentRepository.js'
import { FileEdit, PlusCircle, Save, User } from 'lucide-react'

export default function MarksEntryPage() {
  const [studentsFromRepo, setStudentsFromRepo] = useState([])
  const [firestoreMarks, setFirestoreMarks] = useState([])
  const [isCloudConnected, setIsCloudConnected] = useState(false)
  const [selectedClass, setSelectedClass] = useState('I')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedExam, setSelectedExam] = useState('FA-1')
  const [record, setRecord] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // 1. Subscribe to real-time students from Firebase backend
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

  // 2. Subscribe to real-time marksheet records from Firebase backend
  useEffect(() => {
    const unsubscribe = subscribeMarksheetRecords(
      (records) => {
        setFirestoreMarks(records || [])
        setIsCloudConnected(true)
      },
      (err) => {
        console.warn('Firestore marks read notice:', err?.message)
        setIsCloudConnected(false)
      }
    )
    return () => unsubscribe()
  }, [])

  // All merged students (live stored marksheets from Firebase + student directory)
  const allMergedStudents = useMemo(() => {
    return getMergedStudentsList(studentsFromRepo, firestoreMarks)
  }, [studentsFromRepo, firestoreMarks])

  // Students belonging strictly to selected class stream
  const classStudents = useMemo(() => {
    return filterStudentsByClass(allMergedStudents, selectedClass)
  }, [allMergedStudents, selectedClass])

  // Initialize or update selection when class or merged list changes
  useEffect(() => {
    if (classStudents.length > 0) {
      const exists = classStudents.find((s) => s.id === selectedStudentId || s.studentId === selectedStudentId)
      if (!exists) {
        const first = classStudents[0]
        setSelectedStudentId(first.id || first.studentId)
        setRecord({
          ...first,
          fatherName: resolveFatherName(first.id || first.studentId, first.name, first.fatherName),
        })
      }
    } else {
      const draft = createEmptyMarksheetForStudent({
        id: 'DRAFT_' + selectedClass + '_' + Date.now(),
        name: `New Class ${selectedClass} Student`,
        class: selectedClass,
      })
      setRecord(draft)
      setSelectedStudentId(draft.id)
    }
  }, [selectedClass, classStudents])

  // Handle selecting student from dropdown
  const handleSelectStudent = (id) => {
    setSelectedStudentId(id)
    setStatusMessage('')
    const found = allMergedStudents.find((s) => s.id === id || s.studentId === id)
    if (found) {
      const safeFather = resolveFatherName(found.id || found.studentId, found.name, found.fatherName)
      setRecord({
        ...found,
        fatherName: safeFather,
      })
      setSelectedClass(matchClassKey(found.class) || selectedClass)
    }
  }

  // Handle changing class stream dropdown
  const handleClassStreamChange = (newClassKey) => {
    setSelectedClass(newClassKey)
    setStatusMessage(`Switched to Class ${newClassKey}.`)
    const filtered = filterStudentsByClass(allMergedStudents, newClassKey)
    if (filtered.length > 0) {
      const first = filtered[0]
      setSelectedStudentId(first.id || first.studentId)
      setRecord({
        ...first,
        fatherName: resolveFatherName(first.id || first.studentId, first.name, first.fatherName),
      })
    } else {
      const draft = createEmptyMarksheetForStudent({
        id: 'DRAFT_' + newClassKey + '_' + Date.now(),
        name: `New Class ${newClassKey} Student`,
        class: newClassKey,
      })
      setRecord(draft)
      setSelectedStudentId(draft.id)
    }
  }

  // Create new student entry draft
  const handleCreateNewStudentForm = () => {
    const newStud = createEmptyMarksheetForStudent({
      id: 'STUD_' + Math.floor(1000 + Math.random() * 9000),
      name: 'New Student',
      class: selectedClass,
    })
    setRecord(newStud)
    setSelectedStudentId(newStud.id)
    setStatusMessage(`Created new student marksheet draft for Class ${selectedClass}.`)
  }

  const handleScholasticChange = (idx, field, value) => {
    if (!record) return
    const updated = [...(record.scholastic || [])]
    updated[idx] = { ...updated[idx], [field]: value }
    setRecord({ ...record, scholastic: updated })
  }

  const handleCoScholasticChange = (term, skill, grade) => {
    if (!record) return
    if (term === 'halfYearly' || term === 1) {
      setRecord({
        ...record,
        coScholasticHalfYearly: { ...(record.coScholasticHalfYearly || {}), [skill]: grade },
      })
    } else {
      setRecord({
        ...record,
        coScholasticAnnual: { ...(record.coScholasticAnnual || {}), [skill]: grade },
      })
    }
  }

  const handleSave = async (e, shouldGoNext = false) => {
    if (e) e.preventDefault()
    if (!record) return
    setIsSaving(true)
    try {
      if (selectedExam === 'ALL') {
        await saveStudentMarksheet(record)
        setStatusMessage(`Successfully saved all marks for ${record.name} to backend!`)
      } else {
        await saveExamMarks(record, selectedExam, record.scholastic)
        setStatusMessage(`Successfully saved ${selectedExam} marks for ${record.name} to backend!`)
      }

      if (shouldGoNext && classStudents.length > 1) {
        const currentIndex = classStudents.findIndex(
          (s) => s.id === (record.id || record.studentId)
        )
        if (currentIndex >= 0 && currentIndex < classStudents.length - 1) {
          const nextStudent = classStudents[currentIndex + 1]
          handleSelectStudent(nextStudent.id || nextStudent.studentId)
          setStatusMessage((prev) => `${prev} Moved to next student: ${nextStudent.name}.`)
        }
      }
    } catch (err) {
      console.error('Error saving marksheet:', err)
      setStatusMessage(`Error saving: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Helper to check if an exam has entered marks
  const isExamEntered = (examKey) => {
    if (!record || !record.scholastic) return false
    const obtKey = {
      'FA-1': 'fa1Obt',
      'FA-2': 'fa2Obt',
      'SA-1': 'sa1Obt',
      'FA-3': 'fa3Obt',
      'FA-4': 'fa4Obt',
      'SA-2': 'sa2Obt',
    }[examKey]
    if (!obtKey) return false
    return record.scholastic.some((s) => s[obtKey] !== undefined && s[obtKey] !== 0 && s[obtKey] !== '' && s[obtKey] !== '0')
  }

  if (!record) {
    return (
      <div className="p-8 text-center text-[#d3d4d9]">
        Loading Marks Entry Desk...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-3xl border border-[#333538] bg-[#202122] p-6 shadow-xl">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#4b88a2]/40 bg-[#4b88a2]/15 px-3 py-1 text-xs font-bold text-[#4b88a2]">
              <FileEdit className="h-3.5 w-3.5 text-[#4b88a2]" />
              <span>Marks & Evaluation Desk</span>
            </div>
            <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
              isCloudConnected
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
            }`}>
              <span className={`h-2 w-2 rounded-full ${isCloudConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{isCloudConnected ? 'Firebase Cloud Connected' : 'Local Cache Active'}</span>
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl text-[#fff9fb] zen-dots-regular">Periodic Exam Mark Entry</h2>
          <p className="text-xs text-[#d3d4d9] mt-1">
            Enter marks exam-by-exam (FA-1 May, FA-2 July, SA-1 Sep, FA-3 Nov, FA-4 Jan, SA-2 Mar). All marks save directly to backend.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCreateNewStudentForm}
            className="flex items-center gap-1.5 rounded-xl border border-[#333538] bg-[#252627] px-4 py-2 text-xs font-bold text-[#d3d4d9] hover:bg-[#333538] hover:text-[#fff9fb] transition shadow-sm"
          >
            <PlusCircle className="h-4 w-4 text-[#4b88a2]" />
            <span>New Student</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={(e) => handleSave(e, false)}
            className="flex items-center gap-1.5 rounded-xl bg-[#4b88a2] px-5 py-2 text-xs font-bold text-[#fff9fb] shadow-md shadow-[#4b88a2]/30 hover:bg-[#3a7187] disabled:opacity-50 transition"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving to Cloud...' : selectedExam === 'ALL' ? 'Save All Marks' : `Save ${selectedExam} Marks`}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-xs font-bold text-emerald-300">
          ✅ {statusMessage}
        </div>
      )}

      {/* 1. Exam Timeline Selector Bar */}
      <div className="rounded-2xl border border-[#333538] bg-[#202122] p-5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-extrabold uppercase tracking-wider text-[#d3d4d9] flex items-center gap-2">
            <span>📅</span> Select Active Exam to Enter
          </label>
          <span className="text-[11px] text-[#d3d4d9]">
            Active: <strong className="text-[#4b88a2] font-black">{selectedExam === 'ALL' ? 'All Exams Full Matrix' : `${selectedExam} (${EXAM_SCHEDULE[selectedExam]})`}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {EXAM_TYPES.map((exam) => {
            const isEntered = isExamEntered(exam)
            const isSelected = selectedExam === exam
            const schedule = EXAM_SCHEDULE[exam]
            return (
              <button
                key={exam}
                type="button"
                onClick={() => setSelectedExam(exam)}
                className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-[#4b88a2] bg-[#4b88a2]/25 shadow-md shadow-[#4b88a2]/20 ring-1 ring-[#4b88a2]'
                    : 'border-[#333538] bg-[#252627] hover:border-[#4b88a2]/50 hover:bg-[#2e3032]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-black ${isSelected ? 'text-[#fff9fb]' : 'text-[#fff9fb]'}`}>
                    {exam}
                  </span>
                  <span className="text-[11px]">
                    {isEntered ? '✅' : '⏳'}
                  </span>
                </div>
                <span className="text-[10px] text-[#d3d4d9] mt-1">{schedule}</span>
                <span className={`text-[9px] mt-1 font-bold ${isEntered ? 'text-emerald-400' : 'text-[#d3d4d9]/70'}`}>
                  {isEntered ? 'Marks Entered' : 'Pending'}
                </span>
              </button>
            )
          })}

          {/* View All Option */}
          <button
            type="button"
            onClick={() => setSelectedExam('ALL')}
            className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
              selectedExam === 'ALL'
                ? 'border-[#4b88a2] bg-[#4b88a2]/25 shadow-md shadow-[#4b88a2]/20 ring-1 ring-[#4b88a2]'
                : 'border-[#333538] bg-[#252627] hover:border-[#4b88a2]/50 hover:bg-[#2e3032]'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`text-xs font-black ${selectedExam === 'ALL' ? 'text-[#fff9fb]' : 'text-[#fff9fb]'}`}>
                Full Matrix
              </span>
              <span className="text-[10px]">📊</span>
            </div>
            <span className="text-[10px] text-[#d3d4d9] mt-1">All 6 Exams</span>
            <span className="text-[9px] text-[#4b88a2] mt-1 font-bold">Overview Mode</span>
          </button>
        </div>
      </div>

      {/* 2. Class & Student Selector Bar */}
      <div className="rounded-2xl border border-[#333538] bg-[#202122] p-5 shadow-md">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Class Stream Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[#d3d4d9] mb-1">
              1. Class Stream
            </label>
            <select
              value={selectedClass}
              onChange={(e) => handleClassStreamChange(e.target.value)}
              className="w-full rounded-xl border border-[#4b88a2]/60 bg-[#252627] px-3.5 py-2 text-xs font-bold text-[#fff9fb] focus:border-[#4b88a2] focus:outline-none"
            >
              {ALL_CLASSES.map((cls) => (
                <option key={cls} value={cls}>
                  Class {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Student Dropdown Linked to Class */}
          <div>
            <label className="block text-[11px] font-bold text-[#d3d4d9] mb-1">
              2. Select Student ({classStudents.length} in Class {selectedClass})
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => handleSelectStudent(e.target.value)}
              className="w-full rounded-xl border border-[#333538] bg-[#252627] px-3.5 py-2 text-xs font-bold text-[#fff9fb] focus:border-[#4b88a2] focus:outline-none"
            >
              {classStudents.length > 0 ? (
                classStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.studentId || s.id})
                  </option>
                ))
              ) : (
                <option value="">No registered students in Class {selectedClass}</option>
              )}
            </select>
          </div>

          {/* Academic Session */}
          <div>
            <label className="block text-[11px] font-bold text-[#d3d4d9] mb-1">
              3. Academic Session
            </label>
            <input
              type="text"
              value={record.session || '2026-27'}
              onChange={(e) => setRecord({ ...record, session: e.target.value })}
              className="w-full rounded-xl border border-[#333538] bg-[#252627] px-3.5 py-2 text-xs font-bold text-[#fff9fb] focus:border-[#4b88a2] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Edit Form */}
      <form onSubmit={(e) => handleSave(e, false)} className="space-y-6">
        {/* Student Profile Info */}
        <div className="rounded-2xl border border-[#333538] bg-[#202122] p-6">
          <h3 className="text-sm font-bold text-[#fff9fb] mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-[#4b88a2]" />
            <span>Student Profile Information</span>
          </h3>
          <div className="grid gap-4 sm:grid-cols-5 text-xs">
            <div>
              <label className="block font-semibold text-[#d3d4d9] mb-1">Student's Name</label>
              <input
                type="text"
                value={record.name || ''}
                onChange={(e) => setRecord({ ...record, name: e.target.value })}
                className="w-full rounded-xl border border-[#333538] bg-[#252627] px-3 py-2 text-[#fff9fb] font-semibold focus:border-[#4b88a2] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#d3d4d9] mb-1">Date of Birth</label>
              <input
                type="text"
                value={record.dob || ''}
                placeholder="DD/MM/YYYY"
                onChange={(e) => setRecord({ ...record, dob: e.target.value })}
                className="w-full rounded-xl border border-[#333538] bg-[#252627] px-3 py-2 text-[#fff9fb] font-semibold focus:border-[#4b88a2] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#d3d4d9] mb-1">Father's Name</label>
              <input
                type="text"
                value={record.fatherName || ''}
                onChange={(e) => setRecord({ ...record, fatherName: e.target.value })}
                className="w-full rounded-xl border border-[#333538] bg-[#252627] px-3 py-2 text-[#fff9fb] font-semibold focus:border-[#4b88a2] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#d3d4d9] mb-1">Class</label>
              <input
                type="text"
                value={record.class || ''}
                onChange={(e) => setRecord({ ...record, class: e.target.value })}
                className="w-full rounded-xl border border-[#333538] bg-[#252627] px-3 py-2 text-[#fff9fb] font-semibold focus:border-[#4b88a2] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#d3d4d9] mb-1">Student ID</label>
              <input
                type="text"
                value={record.studentId || record.id || ''}
                onChange={(e) => setRecord({ ...record, studentId: e.target.value })}
                className="w-full rounded-xl border border-[#333538] bg-[#252627] px-3 py-2 text-[#fff9fb] font-semibold focus:border-[#4b88a2] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Scholastic Marks Matrix Table */}
        <div className="rounded-2xl border border-[#333538] bg-[#202122] p-6 overflow-x-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#fff9fb] flex items-center gap-2">
                <span>📊</span> Scholastic Subjects Marks for Class {selectedClass}
              </h3>
              <p className="text-xs text-[#d3d4d9] mt-0.5">
                {selectedExam === 'ALL'
                  ? 'Showing all 6 periodic evaluations for the academic year.'
                  : `Currently editing: ${selectedExam} (${EXAM_SCHEDULE[selectedExam]}).`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#4b88a2] bg-[#4b88a2]/15 px-2.5 py-1 rounded-md border border-[#4b88a2]/30">
                {(record.scholastic || []).length} Subjects
              </span>
            </div>
          </div>

          {/* Focused Single Exam View */}
          {selectedExam !== 'ALL' ? (
            <div className="space-y-3">
              <div className="bg-[#252627] border border-[#4b88a2]/30 rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="font-bold text-[#fff9fb]">
                  Target Exam: <strong className="text-[#4b88a2] text-sm ml-1">{selectedExam}</strong> ({EXAM_SCHEDULE[selectedExam]})
                </span>
                <span className="text-[#d3d4d9] text-[11px]">
                  Default Max Marks: {selectedExam.startsWith('FA') ? '20' : '80'}
                </span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#333538] text-[#d3d4d9] uppercase text-[10px] font-bold">
                    <th className="py-2.5 px-3">Subject Name</th>
                    <th className="py-2.5 px-3 text-center w-36">Marks Obtained</th>
                    <th className="py-2.5 px-3 text-center w-28">Max Marks</th>
                    <th className="py-2.5 px-3 text-center w-36">Exam Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {(record.scholastic || []).map((sub, idx) => {
                    const fields = {
                      'FA-1': { obt: 'fa1Obt', max: 'fa1Max' },
                      'FA-2': { obt: 'fa2Obt', max: 'fa2Max' },
                      'SA-1': { obt: 'sa1Obt', max: 'sa1Max' },
                      'FA-3': { obt: 'fa3Obt', max: 'fa3Max' },
                      'FA-4': { obt: 'fa4Obt', max: 'fa4Max' },
                      'SA-2': { obt: 'sa2Obt', max: 'sa2Max' },
                    }[selectedExam]

                    return (
                      <tr key={idx} className="border-b border-[#333538]/60 hover:bg-[#252627]">
                        <td className="py-2.5 px-3 font-bold text-[#fff9fb] text-sm">
                          {sub.name}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="text"
                            value={sub[fields.obt] ?? ''}
                            placeholder="0"
                            onChange={(e) => handleScholasticChange(idx, fields.obt, e.target.value)}
                            className="w-24 rounded-lg border border-[#4b88a2]/60 bg-[#252627] px-3 py-1.5 text-center font-extrabold text-[#fff9fb] text-sm focus:border-[#4b88a2] focus:ring-1 focus:ring-[#4b88a2] focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="text"
                            value={sub[fields.max] ?? (selectedExam.startsWith('FA') ? 20 : 80)}
                            onChange={(e) => handleScholasticChange(idx, fields.max, e.target.value)}
                            className="w-20 rounded-lg border border-[#333538] bg-[#252627]/60 px-2 py-1.5 text-center text-[#d3d4d9] font-semibold focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center text-[10.5px] text-[#d3d4d9]">
                          <span className="font-mono">
                            FA1:{sub.fa1Obt || 0} | FA2:{sub.fa2Obt || 0} | SA1:{sub.sa1Obt || 0}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Comprehensive All-Exams Table */
            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-[#333538] text-[#d3d4d9] uppercase text-[10px] font-bold">
                  <th className="py-2 px-3" rowSpan={2}>Subject</th>
                  <th className="py-1 px-2 text-center border-b border-[#4b88a2]/30" colSpan={3}>
                    TERM 1 (Half-Yearly)
                  </th>
                  <th className="py-1 px-2 text-center border-b border-[#bb0a21]/30" colSpan={3}>
                    TERM 2 (Annual)
                  </th>
                </tr>
                <tr className="border-b border-[#333538] text-[#d3d4d9] text-[10px]">
                  <th className="py-1 px-2 text-center">FA-1 (May)</th>
                  <th className="py-1 px-2 text-center">FA-2 (July)</th>
                  <th className="py-1 px-2 text-center">SA-1 (Sep)</th>
                  <th className="py-1 px-2 text-center">FA-3 (Nov)</th>
                  <th className="py-1 px-2 text-center">FA-4 (Jan)</th>
                  <th className="py-1 px-2 text-center">SA-2 (Mar)</th>
                </tr>
              </thead>
              <tbody>
                {(record.scholastic || []).map((sub, idx) => (
                  <tr key={idx} className="border-b border-[#333538]/60 hover:bg-[#252627]">
                    <td className="py-2 px-3 font-bold text-[#fff9fb] text-sm">{sub.name}</td>

                    {/* FA-1 */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="text"
                        value={sub.fa1Obt ?? ''}
                        onChange={(e) => handleScholasticChange(idx, 'fa1Obt', e.target.value)}
                        className="w-14 rounded-lg border border-[#333538] bg-[#252627] px-1 py-1 text-center font-bold text-[#fff9fb] text-xs focus:border-[#4b88a2] focus:outline-none"
                      />
                    </td>

                    {/* FA-2 */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="text"
                        value={sub.fa2Obt ?? ''}
                        onChange={(e) => handleScholasticChange(idx, 'fa2Obt', e.target.value)}
                        className="w-14 rounded-lg border border-[#333538] bg-[#252627] px-1 py-1 text-center font-bold text-[#fff9fb] text-xs focus:border-[#4b88a2] focus:outline-none"
                      />
                    </td>

                    {/* SA-1 */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="text"
                        value={sub.sa1Obt ?? ''}
                        onChange={(e) => handleScholasticChange(idx, 'sa1Obt', e.target.value)}
                        className="w-16 rounded-lg border border-[#4b88a2]/50 bg-[#252627] px-1 py-1 text-center font-bold text-[#4b88a2] text-xs focus:border-[#4b88a2] focus:outline-none"
                      />
                    </td>

                    {/* FA-3 */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="text"
                        value={sub.fa3Obt ?? ''}
                        onChange={(e) => handleScholasticChange(idx, 'fa3Obt', e.target.value)}
                        className="w-14 rounded-lg border border-[#333538] bg-[#252627] px-1 py-1 text-center font-bold text-[#fff9fb] text-xs focus:border-[#4b88a2] focus:outline-none"
                      />
                    </td>

                    {/* FA-4 */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="text"
                        value={sub.fa4Obt ?? ''}
                        onChange={(e) => handleScholasticChange(idx, 'fa4Obt', e.target.value)}
                        className="w-14 rounded-lg border border-[#333538] bg-[#252627] px-1 py-1 text-center font-bold text-[#fff9fb] text-xs focus:border-[#4b88a2] focus:outline-none"
                      />
                    </td>

                    {/* SA-2 */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="text"
                        value={sub.sa2Obt ?? ''}
                        placeholder="e.g. 64"
                        onChange={(e) => handleScholasticChange(idx, 'sa2Obt', e.target.value)}
                        className="w-16 rounded-lg border border-[#bb0a21]/50 bg-[#252627] px-1 py-1 text-center font-bold text-[#bb0a21] text-xs focus:border-[#bb0a21] focus:outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Co-Scholastic, Discipline, Attendance & Remarks (Only for SA-1 Half-Yearly, SA-2 Annual, and ALL matrix) */}
        {!selectedExam.startsWith('FA') && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Co-Scholastic */}
            <div className="rounded-2xl border border-[#333538] bg-[#202122] p-6">
              <h3 className="text-sm font-bold text-[#fff9fb] mb-4 flex items-center gap-2">
                <span>🎨</span> Co-Scholastic Grades (A / B / C)
                <span className="text-[11px] font-normal text-[#4b88a2]">
                  {selectedExam === 'SA-1' ? '(Half-Yearly)' : selectedExam === 'SA-2' ? '(Annual / Final)' : '(Session Matrix)'}
                </span>
              </h3>
              <div className="space-y-2 text-xs">
                {CO_SCHOLASTIC_SKILLS.map((skill) => (
                  <div key={skill} className="flex justify-between items-center py-1.5 border-b border-[#333538]/50">
                    <span className="text-[#d3d4d9] font-medium">{skill}</span>
                    <div className="flex items-center gap-3">
                      {(selectedExam === 'SA-1' || selectedExam === 'ALL') && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[#4b88a2] font-semibold">Half-Yearly:</span>
                          <select
                            value={record.coScholasticHalfYearly?.[skill] || 'A'}
                            onChange={(e) => handleCoScholasticChange('halfYearly', skill, e.target.value)}
                            className="rounded-lg border border-[#333538] bg-[#252627] px-2 py-0.5 font-bold text-[#fff9fb] focus:border-[#4b88a2] focus:outline-none"
                          >
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                          </select>
                        </div>
                      )}

                      {(selectedExam === 'SA-2' || selectedExam === 'ALL') && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[#bb0a21] font-semibold">Annual:</span>
                          <select
                            value={record.coScholasticAnnual?.[skill] || 'A'}
                            onChange={(e) => handleCoScholasticChange('annual', skill, e.target.value)}
                            className="rounded-lg border border-[#333538] bg-[#252627] px-2 py-0.5 font-bold text-[#fff9fb] focus:border-[#bb0a21] focus:outline-none"
                          >
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discipline, Attendance, Remarks & Promotion */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#333538] bg-[#202122] p-6 space-y-4 text-xs">
                <h3 className="text-sm font-bold text-[#fff9fb] flex items-center gap-2">
                  <span>🛡️</span> Discipline & Attendance
                </h3>

                <div className={`grid ${selectedExam === 'ALL' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                  {/* Half-Yearly */}
                  {(selectedExam === 'SA-1' || selectedExam === 'ALL') && (
                    <div className="space-y-2">
                      <span className="font-bold text-[#4b88a2]">Half-Yearly (Term 1)</span>
                      <div>
                        <label className="block text-[#d3d4d9] mb-1">Discipline Grade</label>
                        <select
                          value={record.disciplineHalfYearly || 'A'}
                          onChange={(e) => setRecord({ ...record, disciplineHalfYearly: e.target.value })}
                          className="w-full rounded-xl border border-[#333538] bg-[#252627] px-3 py-1.5 font-bold text-[#fff9fb] focus:border-[#4b88a2] focus:outline-none"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[#d3d4d9] mb-1">Attended Days</label>
                          <input
                            type="number"
                            value={record.attendanceHalfYearly?.attended ?? 103}
                            onChange={(e) =>
                              setRecord({
                                ...record,
                                attendanceHalfYearly: {
                                  ...(record.attendanceHalfYearly || {}),
                                  attended: e.target.value,
                                },
                              })
                            }
                            className="w-full rounded-xl border border-[#333538] bg-[#252627] px-2 py-1.5 font-bold text-[#fff9fb] focus:border-[#4b88a2] focus:outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[#d3d4d9] mb-1">Total Days</label>
                          <input
                            type="number"
                            value={record.attendanceHalfYearly?.total ?? 110}
                            onChange={(e) =>
                              setRecord({
                                ...record,
                                attendanceHalfYearly: {
                                  ...(record.attendanceHalfYearly || {}),
                                  total: e.target.value,
                                },
                              })
                            }
                            className="w-full rounded-xl border border-[#333538] bg-[#252627] px-2 py-1.5 font-bold text-[#fff9fb] focus:border-[#4b88a2] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Annual */}
                  {(selectedExam === 'SA-2' || selectedExam === 'ALL') && (
                    <div className="space-y-2">
                      <span className="font-bold text-[#bb0a21]">Annual (Full Year)</span>
                      <div>
                        <label className="block text-[#d3d4d9] mb-1">Discipline Grade</label>
                        <select
                          value={record.disciplineAnnual || 'A'}
                          onChange={(e) => setRecord({ ...record, disciplineAnnual: e.target.value })}
                          className="w-full rounded-xl border border-[#333538] bg-[#252627] px-3 py-1.5 font-bold text-[#fff9fb] focus:border-[#bb0a21] focus:outline-none"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[#d3d4d9] mb-1">Attended Days</label>
                          <input
                            type="number"
                            value={record.attendanceAnnual?.attended ?? 195}
                            onChange={(e) =>
                              setRecord({
                                ...record,
                                attendanceAnnual: {
                                  ...(record.attendanceAnnual || {}),
                                  attended: e.target.value,
                                },
                              })
                            }
                            className="w-full rounded-xl border border-[#333538] bg-[#252627] px-2 py-1.5 font-bold text-[#fff9fb] focus:border-[#4b88a2] focus:outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[#d3d4d9] mb-1">Total Days</label>
                          <input
                            type="number"
                            value={record.attendanceAnnual?.total ?? 215}
                            onChange={(e) =>
                              setRecord({
                                ...record,
                                attendanceAnnual: {
                                  ...(record.attendanceAnnual || {}),
                                  total: e.target.value,
                                },
                              })
                            }
                            className="w-full rounded-xl border border-[#333538] bg-[#252627] px-2 py-1.5 font-bold text-[#fff9fb] focus:border-[#4b88a2] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks & Promotion Status */}
              <div className="rounded-2xl border border-[#333538] bg-[#202122] p-6 space-y-4 text-xs">
                <h3 className="text-sm font-bold text-[#fff9fb] flex items-center gap-2">
                  <span>💬</span> Remarks & Promotion Status
                </h3>
                {(selectedExam === 'SA-1' || selectedExam === 'ALL') && (
                  <div>
                    <label className="block text-[#d3d4d9] mb-1">Half-Yearly Teacher Remarks</label>
                    <input
                      type="text"
                      value={record.teacherRemarksHalfYearly || 'Good performance.'}
                      onChange={(e) => setRecord({ ...record, teacherRemarksHalfYearly: e.target.value })}
                      className="w-full rounded-xl border border-[#333538] bg-[#252627] px-3.5 py-2 font-bold text-[#fff9fb] focus:border-[#4b88a2] focus:outline-none"
                    />
                  </div>
                )}

                {(selectedExam === 'SA-2' || selectedExam === 'ALL') && (
                  <>
                    <div>
                      <label className="block text-[#d3d4d9] mb-1">Annual Teacher Remarks</label>
                      <input
                        type="text"
                        value={record.teacherRemarksAnnual || 'Excellent performance and regular attendance.'}
                        onChange={(e) => setRecord({ ...record, teacherRemarksAnnual: e.target.value })}
                        className="w-full rounded-xl border border-[#333538] bg-[#252627] px-3.5 py-2 font-bold text-[#fff9fb] focus:border-[#bb0a21] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[#d3d4d9] mb-1">Promotion Status</label>
                      <input
                        type="text"
                        value={record.promotedClass || 'Promoted to next higher class'}
                        onChange={(e) => setRecord({ ...record, promotedClass: e.target.value })}
                        className="w-full rounded-xl border border-[#333538] bg-[#252627] px-3.5 py-2 font-bold text-[#fff9fb] focus:border-[#4b88a2] focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Save Bar */}
        <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-[#333538]">
          <div className="text-xs text-[#d3d4d9]">
            Saving updates both <strong>Firebase backend</strong> and local cache.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={(e) => handleSave(e, true)}
              className="rounded-xl border border-[#4b88a2]/60 bg-[#4b88a2]/15 px-5 py-2.5 text-xs font-bold text-[#4b88a2] hover:bg-[#4b88a2] hover:text-[#fff9fb] disabled:opacity-50 transition shadow-sm"
            >
              💾 Save & Next Student ➡️
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-[#4b88a2] px-8 py-2.5 text-xs font-bold text-[#fff9fb] shadow-lg shadow-[#4b88a2]/30 hover:bg-[#3a7187] disabled:opacity-50 transition"
            >
              {isSaving ? 'Saving to Cloud...' : selectedExam === 'ALL' ? '💾 Save All Marks' : `💾 Save ${selectedExam} Marks`}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
