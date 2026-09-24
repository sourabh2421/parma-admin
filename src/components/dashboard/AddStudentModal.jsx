import { useState } from 'react'
import { createSingleStudent } from '../../firebase/studentRepository.js'
import { useToast } from '../../context/useToast.js'

const STANDARD_CLASSES = [
  'NURSERY',
  'LKG',
  'UKG',
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
]

function AddStudentModal({ isOpen, onClose, onCreated }) {
  const { showToast } = useToast()
  const [studentId, setStudentId] = useState('')
  const [name, setName] = useState('')
  const [parentName, setParentName] = useState('')
  const [selectedClass, setSelectedClass] = useState('NURSERY')
  const [customClass, setCustomClass] = useState('')
  const [isCustomClass, setIsCustomClass] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleClassChange = (e) => {
    const val = e.target.value
    if (val === '__CUSTOM__') {
      setIsCustomClass(true)
      setSelectedClass('')
    } else {
      setIsCustomClass(false)
      setSelectedClass(val)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const finalId = studentId.trim()
    const finalName = name.trim().toUpperCase()
    const finalParent = parentName.trim().toUpperCase()
    const finalClass = (isCustomClass ? customClass.trim() : selectedClass.trim()).toUpperCase()

    if (!finalId) {
      setError('Please enter a Student ID / Roll Number.')
      return
    }

    if (!finalName) {
      setError('Please enter the Student Name.')
      return
    }

    if (!finalClass) {
      setError('Please select or specify a Class.')
      return
    }

    setSubmitting(true)

    try {
      const created = await createSingleStudent({
        id: finalId,
        name: finalName,
        parentName: finalParent,
        studentClass: finalClass,
      })

      showToast(`Student ${created.name} (${created.id}) added successfully.`, 'success')
      onCreated?.(created)
      handleClose()
    } catch (err) {
      setError(err?.message || 'Failed to add student.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setStudentId('')
    setName('')
    setParentName('')
    setSelectedClass('NURSERY')
    setCustomClass('')
    setIsCustomClass(false)
    setError('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-student-title"
    >
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" x2="19" y1="8" y2="14"/>
                <line x1="22" x2="16" y1="11" y2="11"/>
              </svg>
            </div>
            <div>
              <h2 id="add-student-title" className="text-xl font-bold text-slate-900">
                Add New Student
              </h2>
              <p className="text-xs text-slate-500">Create a single student record in the school roster</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800">
            {error}
          </div>
        ) : null}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="new-student-id"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Student ID / Roll No <span className="text-rose-500">*</span>
              </label>
              <input
                id="new-student-id"
                type="text"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. 329 or 1045"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="new-student-class"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Class <span className="text-rose-500">*</span>
              </label>
              {!isCustomClass ? (
                <select
                  id="new-student-class"
                  value={selectedClass}
                  onChange={handleClassChange}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  {STANDARD_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                  <option value="__CUSTOM__">+ Other / Custom Class...</option>
                </select>
              ) : (
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    required
                    value={customClass}
                    onChange={(e) => setCustomClass(e.target.value)}
                    placeholder="Enter Class Name"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomClass(false)
                      setSelectedClass('NURSERY')
                    }}
                    className="rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Preset
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="new-student-name"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Student Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="new-student-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. KABIR YADAV"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm uppercase text-slate-900 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="new-student-parent"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Father's / Parent's Name
            </label>
            <input
              id="new-student-parent"
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="e.g. MR. MUKESH YADAV"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm uppercase text-slate-900 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="mt-6 flex flex-col gap-2 pt-3 border-t border-slate-100 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? 'Adding Student…' : 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddStudentModal
