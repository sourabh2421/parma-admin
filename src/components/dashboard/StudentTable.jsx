import DatePicker from 'react-datepicker'

function StudentTable({
  students,
  searchValue,
  classFilter,
  classOptions,
  onSearchChange,
  onClassFilterChange,
  onStudentFieldChange,
}) {
  const getSafeDate = (value) => {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Student Fee Records</h2>
          <p className="text-sm text-slate-600">Search and update fee details for each student.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="text"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by student name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
          <select
            value={classFilter}
            onChange={(event) => onClassFilterChange(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            aria-label="Filter by class"
          >
            <option value="">All Classes</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
          {classFilter ? (
            <button
              type="button"
              onClick={() => onClassFilterChange('')}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 sm:col-span-2"
            >
              Clear class filter
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[1250px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Stud. Id</th>
              <th className="px-3 py-3">Students Name</th>
              <th className="px-3 py-3">Parents Name</th>
              <th className="px-3 py-3">Class</th>
              <th className="px-3 py-3">Fee Amount</th>
              <th className="px-3 py-3">From Date</th>
              <th className="px-3 py-3">To Date</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  No students found. Upload a file or adjust filters.
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const isPaid = student.status === 'paid'
                const rowStyle = isPaid ? 'bg-emerald-50/60' : 'bg-rose-50/60'

                return (
                  <tr key={student.id} className={`border-b border-slate-100 ${rowStyle}`}>
                    <td className="px-3 py-3 text-slate-700">{student.id}</td>
                    <td className="px-3 py-3 font-medium text-slate-900">{student.name}</td>
                    <td className="px-3 py-3 text-slate-700">{student.fatherName || 'N/A'}</td>
                    <td className="px-3 py-3 text-slate-700">{student.class}</td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min="0"
                        value={student.feeAmount}
                        onChange={(event) =>
                          onStudentFieldChange(student.id, 'feeAmount', event.target.value)
                        }
                        className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <DatePicker
                        selected={getSafeDate(student.fromDate)}
                        onChange={(date) => onStudentFieldChange(student.id, 'fromDate', date)}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Select date"
                        className="w-32 rounded-lg border border-slate-300 bg-white px-2 py-1.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <DatePicker
                        selected={getSafeDate(student.toDate)}
                        onChange={(date) => onStudentFieldChange(student.id, 'toDate', date)}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Select date"
                        className="w-32 rounded-lg border border-slate-300 bg-white px-2 py-1.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={student.status}
                        onChange={(event) =>
                          onStudentFieldChange(student.id, 'status', event.target.value)
                        }
                        className={`rounded-lg border px-2 py-1.5 outline-none transition ${
                          isPaid
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                            : 'border-rose-300 bg-rose-100 text-rose-700'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                      </select>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default StudentTable
