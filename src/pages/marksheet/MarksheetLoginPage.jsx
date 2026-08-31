import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMarksheetAuth } from '../../context/MarksheetAuthContext.jsx'

export default function MarksheetLoginPage() {
  const navigate = useNavigate()
  const { login } = useMarksheetAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!password) {
      setError('Please enter the password.')
      return
    }

    setSubmitting(true)
    const result = login(password)
    setSubmitting(false)

    if (result.success) {
      navigate('/marksheets', { replace: true })
    } else {
      setError(result.error)
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
        {/* Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <span>←</span>
            <span>Portal Selection</span>
          </Link>

          <span className="rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-3 py-1 text-[11px] font-bold">
            📊 Examination Cell
          </span>
        </div>

        {/* Branding Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-3xl mb-3 shadow-lg shadow-indigo-500/20">
            📊
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight">
            Marksheet Portal Access
          </h1>
          <p className="mt-1.5 text-xs text-slate-400">
            Enter the marksheet access password to open the examination desk.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="marksheet-password" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Access Password
            </label>
            <input
              id="marksheet-password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder="Enter password..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-300">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? 'Verifying…' : 'Unlock Marksheet Portal'}
          </button>
        </form>
      </div>
    </section>
  )
}
