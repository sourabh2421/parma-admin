import { useState } from 'react'
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import useAuth from '../../auth/useAuth.jsx'
import { mapAuthErrorToMessage } from '../../auth/mapAuthError.js'

export default function MarksheetLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, hasMarksheetAccess } = useAuth()
  const defaultTeacherEmail = import.meta.env.VITE_MARKSHEET_ADMIN_EMAIL || 'teacher@parma.com'
  const [email, setEmail] = useState(defaultTeacherEmail)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(location.state?.authNotice || '')
  const [submitting, setSubmitting] = useState(false)

  // If already signed in with marksheet access, redirect
  if (isAuthenticated && hasMarksheetAccess) {
    return <Navigate to="/marksheets" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const trimmedEmail = (email.trim() || defaultTeacherEmail).toLowerCase()
    const trimmedPassword = password.trim()

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter both email and password.')
      return
    }

    setSubmitting(true)
    try {
      await login(trimmedEmail, trimmedPassword)
      navigate('/marksheets', { replace: true })
    } catch (err) {
      if (err.code === 'auth/not-authorized-for-dashboard') {
        setError('This account does not have permission to access the Marksheet Portal.')
      } else {
        setError(mapAuthErrorToMessage(err))
      }
    } finally {
      setSubmitting(false)
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
            Teacher Desk
          </span>
        </div>

        {/* Branding Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white p-1.5 border border-indigo-500/30 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/20 overflow-hidden">
            <img
              src="/logo.png"
              alt="Parma Academy Logo"
              className="h-full w-full object-contain"
            />
          </div>

          <h1 className="text-2xl text-white tracking-tight zen-dots-regular">
            Teacher Marksheet Login
          </h1>
          <p className="mt-1.5 text-xs text-slate-400">
            Sign in with your <strong>Parma Academy staff account</strong> to enter marks and generate report cards.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="marksheet-email" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Staff Email Address
            </label>
            <input
              id="marksheet-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              placeholder="teacher@parma.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label htmlFor="marksheet-password" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Teacher Access Password
            </label>
            <input
              id="marksheet-password"
              type="password"
              autoComplete="current-password"
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
            {submitting ? 'Authenticating…' : 'Sign In to Marksheet Portal'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            Looking for Fee Management?{' '}
            <Link to="/login" className="text-emerald-400 font-semibold hover:underline">
              Switch to Office Fee Desk
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
