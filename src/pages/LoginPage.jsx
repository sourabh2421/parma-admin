import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../auth/useAuth.jsx'
import { mapAuthErrorToMessage } from '../auth/mapAuthError.js'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loading, configError, login, user, hasFeeAccess } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [authError, setAuthError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fromPath = location.state?.from?.pathname || '/dashboard'
  const routeAuthNotice = location.state?.authNotice

  useEffect(() => {
    if (routeAuthNotice) {
      setAuthError(routeAuthNotice)
    }
  }, [routeAuthNotice])

  // If already authenticated and authorized for fee portal, redirect
  if (!configError && user && hasFeeAccess) {
    return <Navigate to="/dashboard" replace />
  }

  if (loading && !configError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-900 text-white">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
          aria-hidden="true"
        />
        <p className="text-sm text-slate-400">Verifying session…</p>
      </div>
    )
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }))
    setAuthError('')
  }

  const validateForm = () => {
    const validationErrors = {}
    const trimmedEmail = formData.email.trim()

    if (!trimmedEmail) {
      validationErrors.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      validationErrors.email = 'Enter a valid email address.'
    }

    if (!formData.password) {
      validationErrors.password = 'Password is required.'
    }

    return validationErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationErrors = validateForm()
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return
    if (configError) return

    setSubmitting(true)
    setAuthError('')

    try {
      await login(formData.email.trim(), formData.password)
      const targetPath = fromPath && !fromPath.startsWith('/marksheets') ? fromPath : '/dashboard'
      navigate(targetPath, { replace: true })
    } catch (error) {
      setAuthError(mapAuthErrorToMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 bg-emerald-600/20 -left-40 w-96 h-96 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        {/* Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <span>←</span>
            <span>Portal Selection</span>
          </Link>

          <span className="rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold">
            🏢 Office Desk
          </span>
        </div>

        {/* Branding Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/20">
            💳
          </div>

          <h1 className="text-2xl text-white tracking-tight zen-dots-regular">
            Fee Desk Login
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Sign in with your <strong>Office / Accounts</strong> credentials to open Fee Management.
          </p>
        </div>

        {configError ? (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-300">
            {configError}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:bg-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="admin@school.edu"
            />
            {errors.email ? (
              <p className="mt-1 text-xs font-medium text-rose-400">{errors.email}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:bg-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="••••••••"
            />
            {errors.password ? (
              <p className="mt-1 text-xs font-medium text-rose-400">{errors.password}</p>
            ) : null}
          </div>

          {authError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-300">
              {authError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || Boolean(configError)}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Authenticating…' : 'Sign In to Fee Portal'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            Looking for Marksheet Portal?{' '}
            <Link to="/marksheets/login" className="text-indigo-400 font-semibold hover:underline">
              Switch to Teacher Marksheet Desk
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}

export default LoginPage
