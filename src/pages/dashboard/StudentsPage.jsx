import { useEffect, useMemo, useState } from 'react'
import { isFirebaseConfigured } from '../../firebase/config.js'
import { softDeleteStudent, subscribeStudents } from '../../firebase/studentRepository.js'
import { useToast } from '../../context/useToast.js'
import { sortClassNames, sortStudentsByClassThenId } from '../../utils/studentSort.js'
import TableSkeleton from '../../components/dashboard/TableSkeleton.jsx'
import StudentDetailModal from './StudentDetailModal.jsx'

function StudentsPage() {
  const { showToast } = useToast()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(() => isFirebaseConfigured())
  const [error, setError] = useState(() =>
    isFirebaseConfigured() ? '' : 'Firebase is not configured. Add environment variables and restart.',
  )
  const [searchValue, setSearchValue] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return undefined
    }

    const unsub = subscribeStudents(
      (list) => {
        setStudents(list)
        setError('')
        setLoading(false)
      },
      (err) => {
        setError(err?.message || 'Failed to load students.')
        setLoading(false)
      },
    )
    return unsub
  }, [])

  const classOptions = useMemo(() => {
    const set = new Set()
    students.forEach((s) => {
      const c = String(s.class || '').trim()
      if (c) set.add(c)
    })
    return sortClassNames([...set])
  }, [students])

  const handleArchiveStudent = async (student) => {
    const ok = window.confirm(
      `Archive student ${student.name} (${student.id})? They will be hidden from the directory; fee rows stay in the database.`,
    )
    if (!ok) return
    try {
      await softDeleteStudent(student.id)
      showToast('Student archived.', 'success')
    } catch (err) {
      showToast(err?.message || 'Could not archive student.', 'error')
    }
  }

  const filteredStudents = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    return sortStudentsByClassThenId(
      students.filter((s) => {
        const matchName = q ? s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) : true
        const matchClass = classFilter ? String(s.class).toLowerCase() === classFilter.toLowerCase() : true
        return matchName && matchClass
      }),
    )
  }, [students, searchValue, classFilter])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Students</h2>
        <p className="text-sm text-slate-600">Directory from the students collection (no fee fields).</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <input
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search by name or student ID"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              aria-label="Filter by class"
            >
              <option value="">All classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {classFilter ? (
            <button
              type="button"
              onClick={() => setClassFilter('')}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
            >
              Clear class filter
            </button>
          ) : null}
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : (
            <table className="min-w-[900px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">Student ID</th>
                  <th className="px-3 py-3">Student name</th>
                  <th className="px-3 py-3">Parent name</th>
                  <th className="px-3 py-3">Class</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-slate-500">
                      No students match your filters.
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                        <td className="px-3 py-3 font-mono text-xs text-slate-800">{student.id}</td>
                        <td className="px-3 py-3 font-medium text-slate-900">{student.name}</td>
                        <td className="px-3 py-3 text-slate-700">{student.parentName || '—'}</td>
                        <td className="px-3 py-3 text-slate-700">{student.class}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedStudent(student)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArchiveStudent(student)}
                              className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                            >
                              Archive
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {selectedStudent ? (
        <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      ) : null}
    </div>
  )
}

export default StudentsPage
