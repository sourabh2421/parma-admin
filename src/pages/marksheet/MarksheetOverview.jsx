import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMarksheetAuth } from '../../context/MarksheetAuthContext.jsx'
import {
  filterStudentsByClass,
  getMergedStudentsList,
  getStoredClassSubjects,
  subscribeMarksheetRecords,
} from '../../firebase/marksheetRepository.js'
import { subscribeStudents } from '../../firebase/studentRepository.js'
import { ALL_CLASSES } from '../../utils/marksheetDefaults.js'
import { BookOpen, FileEdit, FileText, School } from 'lucide-react'

export default function MarksheetOverview() {
  const { teacherUser } = useMarksheetAuth()
  const [studentsFromRepo, setStudentsFromRepo] = useState([])
  const [firestoreMarks, setFirestoreMarks] = useState([])
  const classSubjectsMap = getStoredClassSubjects()

  useEffect(() => {
    const unsubStudents = subscribeStudents(
      (list) => {
        if (list && list.length > 0) setStudentsFromRepo(list)
      },
      (err) => console.warn('Firestore load error:', err)
    )
    const unsubMarks = subscribeMarksheetRecords(
      (records) => {
        setFirestoreMarks(records || [])
      },
      (err) => console.warn('Firestore marks load error:', err)
    )
    return () => {
      unsubStudents()
      unsubMarks()
    }
  }, [])

  const mergedStudents = useMemo(() => {
    return getMergedStudentsList(studentsFromRepo, firestoreMarks)
  }, [studentsFromRepo, firestoreMarks])

  // Count evaluations completed
  const evaluatedCount = useMemo(() => {
    return mergedStudents.filter((s) =>
      (s.scholastic || []).some((sub) => (sub.fa1Obt || sub.fa2Obt || sub.sa1Obt || sub.fa3Obt || sub.fa4Obt || sub.sa2Obt))
    ).length
  }, [mergedStudents])

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl border border-[#333538] bg-[#202122] p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-[#4b88a2]/10 blur-3xl pointer-events-none"></div>
        <div className="absolute right-32 -bottom-12 h-64 w-64 rounded-full bg-[#bb0a21]/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#4b88a2]/40 bg-[#4b88a2]/15 px-3 py-1 text-xs font-bold text-[#4b88a2] mb-3 shadow-sm">
            <School className="h-3.5 w-3.5 text-[#4b88a2]" />
            <span>Parma Academy Examination Cell</span>
          </div>
          <h2 className="text-2xl sm:text-3xl text-[#fff9fb] tracking-tight zen-dots-regular">
            Marksheet & Academic Portal
          </h2>
          <p className="mt-2 text-sm text-[#d3d4d9] leading-relaxed">
            Welcome, <strong className="text-[#fff9fb]">{teacherUser?.name || 'Academic Teacher'}</strong>. Manage class subjects, enter periodic exam marks (FA-1 to SA-2), and generate official Parma Academy, Ayodhya report cards for session 2026-27.
          </p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-4">
        {/* Configured Classes */}
        <div className="rounded-2xl border border-[#333538] bg-[#202122] p-5 shadow-sm hover:border-[#4b88a2]/50 transition">
          <div className="text-xs font-extrabold text-[#d3d4d9] uppercase tracking-wider mb-1">
            Configured Classes
          </div>
          <div className="text-3xl font-black text-[#4b88a2]">
            {ALL_CLASSES.length} <span className="text-xs font-normal text-[#d3d4d9]">Streams</span>
          </div>
          <div className="mt-3 text-[11px] text-[#d3d4d9]">
            Playgroup, Nursery, LKG, UKG, I–XII
          </div>
        </div>

        {/* Total Live Student Roster */}
        <div className="rounded-2xl border border-[#333538] bg-[#202122] p-5 shadow-sm hover:border-[#4b88a2]/50 transition">
          <div className="text-xs font-extrabold text-[#d3d4d9] uppercase tracking-wider mb-1">
            Total Live Student Roster
          </div>
          <div className="text-3xl font-black text-[#fff9fb]">
            {mergedStudents.length} <span className="text-xs font-normal text-[#d3d4d9]">Students</span>
          </div>
          <div className="mt-3 text-[11px] text-[#d3d4d9]">
            {studentsFromRepo.length > 0 ? `${studentsFromRepo.length} students loaded live from backend` : 'Loaded from database & roster'}
          </div>
        </div>

        {/* Evaluations Entered */}
        <div className="rounded-2xl border border-[#333538] bg-[#202122] p-5 shadow-sm hover:border-[#bb0a21]/50 transition">
          <div className="text-xs font-extrabold text-[#d3d4d9] uppercase tracking-wider mb-1">
            Evaluations Entered
          </div>
          <div className="text-3xl font-black text-[#bb0a21]">
            {evaluatedCount} <span className="text-xs font-normal text-[#d3d4d9]">Active</span>
          </div>
          <div className="mt-3 text-[11px] text-[#d3d4d9]">
            Students with periodic marks saved
          </div>
        </div>

        {/* Report Formats */}
        <div className="rounded-2xl border border-[#333538] bg-[#202122] p-5 shadow-sm hover:border-[#4b88a2]/50 transition">
          <div className="text-xs font-extrabold text-[#d3d4d9] uppercase tracking-wider mb-1">
            Report Formats
          </div>
          <div className="text-2xl font-black text-[#4b88a2]">
            Half-Yearly & Annual
          </div>
          <div className="mt-3 text-[11px] text-[#d3d4d9]">
            Official ICSE / ISC single-page A4
          </div>
        </div>
      </div>

      {/* Feature Navigation Cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        <Link
          to="/marksheets/entry"
          className="group rounded-2xl border border-[#333538] bg-[#202122] p-5 shadow-sm hover:border-[#4b88a2] hover:bg-[#252627] transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-[#4b88a2]/15 border border-[#4b88a2]/30 flex items-center justify-center text-[#4b88a2] mb-3 group-hover:scale-110 transition">
            <FileEdit className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-[#fff9fb] text-base">Periodic Marks Entry</h3>
          <p className="mt-1 text-xs text-[#d3d4d9] leading-relaxed">
            Enter FA-1 (May), FA-2 (July), SA-1 (Sep), FA-3 (Nov), FA-4 (Jan), and SA-2 (Mar) marks.
          </p>
          <div className="mt-4">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#4b88a2] group-hover:translate-x-1 transition">
              Open Marks Entry &rarr;
            </span>
          </div>
        </Link>

        <Link
          to="/marksheets/reports"
          className="group rounded-2xl border border-[#333538] bg-[#202122] p-5 shadow-sm hover:border-[#4b88a2] hover:bg-[#252627] transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-[#4b88a2]/15 border border-[#4b88a2]/30 flex items-center justify-center text-[#4b88a2] mb-3 group-hover:scale-110 transition">
            <FileText className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-[#fff9fb] text-base">Print Report Cards</h3>
          <p className="mt-1 text-xs text-[#d3d4d9] leading-relaxed">
            Generate and print official 1-page A4 Half-Yearly and Annual report cards for parents.
          </p>
          <div className="mt-4">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#4b88a2] group-hover:translate-x-1 transition">
              View & Print Report Cards &rarr;
            </span>
          </div>
        </Link>

        <Link
          to="/marksheets/subjects"
          className="group rounded-2xl border border-[#333538] bg-[#202122] p-5 shadow-sm hover:border-[#4b88a2] hover:bg-[#252627] transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-[#4b88a2]/15 border border-[#4b88a2]/30 flex items-center justify-center text-[#4b88a2] mb-3 group-hover:scale-110 transition">
            <BookOpen className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-[#fff9fb] text-base">Subjects Master</h3>
          <p className="mt-1 text-xs text-[#d3d4d9] leading-relaxed">
            Configure subject lists across classes (Pre-primary to XII Science, Commerce, Humanities).
          </p>
          <div className="mt-4">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#4b88a2] group-hover:translate-x-1 transition">
              Configure Subjects &rarr;
            </span>
          </div>
        </Link>
      </div>

      {/* Class Stream Roster Overview */}
      <div className="rounded-2xl border border-[#333538] bg-[#202122] p-6 shadow-md">
        <h3 className="text-sm font-bold text-[#fff9fb] mb-4 flex items-center gap-2">
          <span>🏫</span> Class Streams & Enrolled Students Summary
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ALL_CLASSES.map((cls) => {
            const count = filterStudentsByClass(mergedStudents, cls).length
            const subjects = classSubjectsMap[cls] || []
            return (
              <div
                key={cls}
                className="rounded-xl border border-[#333538] bg-[#252627] p-4 hover:border-[#4b88a2]/60 transition"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-[#fff9fb] text-sm">Class {cls}</span>
                  <span className="rounded-full bg-[#4b88a2]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#4b88a2] border border-[#4b88a2]/30">
                    {count} Students
                  </span>
                </div>
                <div className="text-[11px] text-[#d3d4d9]">
                  {subjects.length} Subjects: {subjects.slice(0, 3).join(', ')}{subjects.length > 3 ? ` +${subjects.length - 3} more` : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
