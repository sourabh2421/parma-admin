import React, { useState } from 'react'
import {
  ALL_CLASSES,
  DEFAULT_CLASS_SUBJECTS,
} from '../../utils/marksheetDefaults.js'
import {
  getStoredClassSubjects,
  saveClassSubjectsConfig,
} from '../../firebase/marksheetRepository.js'
import { BookOpen, Plus, RotateCcw, Trash2 } from 'lucide-react'

export default function SubjectsMasterPage() {
  const [classSubjectsMap, setClassSubjectsMap] = useState(() => getStoredClassSubjects())
  const [selectedClass, setSelectedClass] = useState('V')
  const [newSubjectName, setNewSubjectName] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  const currentSubjects = classSubjectsMap[selectedClass] || []

  const handleAddSubject = (e) => {
    e.preventDefault()
    if (!newSubjectName.trim()) return
    const sub = newSubjectName.trim()
    if (currentSubjects.includes(sub)) {
      setStatusMessage(`"${sub}" is already in the subject list for Class ${selectedClass}.`)
      return
    }
    const updated = {
      ...classSubjectsMap,
      [selectedClass]: [...currentSubjects, sub],
    }
    setClassSubjectsMap(updated)
    saveClassSubjectsConfig(updated)
    setNewSubjectName('')
    setStatusMessage(`Added "${sub}" to Class ${selectedClass}.`)
  }

  const handleRemoveSubject = (subName) => {
    const updatedList = currentSubjects.filter((s) => s !== subName)
    const updated = {
      ...classSubjectsMap,
      [selectedClass]: updatedList,
    }
    setClassSubjectsMap(updated)
    saveClassSubjectsConfig(updated)
    setStatusMessage(`Removed "${subName}" from Class ${selectedClass}.`)
  }

  const handleResetDefaults = () => {
    if (window.confirm('Reset all class subjects to standard default subjects?')) {
      setClassSubjectsMap(DEFAULT_CLASS_SUBJECTS)
      saveClassSubjectsConfig(DEFAULT_CLASS_SUBJECTS)
      setStatusMessage('Reset all subjects to default configuration.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-3xl border border-[#333538] bg-[#202122] p-6 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#4b88a2]/40 bg-[#4b88a2]/15 px-3 py-1 text-xs font-bold text-[#4b88a2] mb-2">
            <BookOpen className="h-3.5 w-3.5 text-[#4b88a2]" />
            <span>Subjects & Curriculum Master</span>
          </div>
          <h2 className="text-xl sm:text-2xl text-[#fff9fb] zen-dots-regular">Class Main Subjects Setup</h2>
          <p className="text-xs text-[#d3d4d9] mt-1">
            Configure the main subjects for each class (Playgroup, Nursery, LKG, UKG, Class I-VIII, IX-X, XI-XII streams).
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="flex items-center gap-1.5 rounded-xl border border-[#333538] bg-[#252627] px-4 py-2 text-xs font-bold text-amber-400 hover:bg-[#333538] transition shadow-sm"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset to Defaults</span>
        </button>
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-xs font-bold text-emerald-300">
          ✅ {statusMessage}
        </div>
      )}

      {/* Class Selection Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#333538] pb-3">
        {ALL_CLASSES.map((cls) => (
          <button
            key={cls}
            type="button"
            onClick={() => {
              setSelectedClass(cls)
              setStatusMessage('')
            }}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              selectedClass === cls
                ? 'bg-[#4b88a2] text-[#fff9fb] shadow-md shadow-[#4b88a2]/30 ring-1 ring-[#4b88a2]'
                : 'border border-[#333538] bg-[#202122] text-[#d3d4d9] hover:bg-[#252627] hover:text-[#fff9fb]'
            }`}
          >
            Class {cls}
          </button>
        ))}
      </div>

      {/* Main Subjects Manager Box */}
      <div className="rounded-3xl border border-[#333538] bg-[#202122] p-6 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base font-bold text-[#fff9fb]">
              Active Subjects for <span className="text-[#4b88a2]">Class {selectedClass}</span>
            </h3>
            <p className="text-xs text-[#d3d4d9] mt-0.5">
              These subjects will be auto-populated on student marksheet evaluation records and report cards.
            </p>
          </div>
          <span className="rounded-full bg-[#4b88a2]/15 px-3 py-1 text-xs font-bold text-[#4b88a2] border border-[#4b88a2]/30">
            {currentSubjects.length} Subjects Configured
          </span>
        </div>

        {/* Current Subjects Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {currentSubjects.map((sub, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-xl border border-[#333538] bg-[#252627] p-3.5 shadow-sm hover:border-[#4b88a2]/50 transition"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#4b88a2]/20 font-bold text-[#4b88a2] text-xs">
                  {idx + 1}
                </span>
                <span className="font-bold text-[#fff9fb] text-sm">{sub}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveSubject(sub)}
                className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition"
                title={`Remove ${sub}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Subject Form */}
        <form onSubmit={handleAddSubject} className="pt-4 border-t border-[#333538] flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Add new subject name (e.g. Environmental Studies, Sanskrit)"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            className="flex-1 rounded-xl border border-[#333538] bg-[#252627] px-4 py-2.5 text-xs font-semibold text-[#fff9fb] placeholder-[#d3d4d9]/50 focus:border-[#4b88a2] focus:outline-none"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#4b88a2] px-6 py-2.5 text-xs font-bold text-[#fff9fb] hover:bg-[#3a7187] transition shadow-md shadow-[#4b88a2]/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add Subject to Class {selectedClass}</span>
          </button>
        </form>
      </div>
    </div>
  )
}
