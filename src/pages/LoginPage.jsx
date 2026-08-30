import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../auth/useAuth.jsx'
import { mapAuthErrorToMessage } from '../auth/mapAuthError.js'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loading, configError, login, canAccessDashboard } = useAuth()

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

  if (loading && !configError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-100">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"
          aria-hidden="true"
        />
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    )
  }

  if (!configError && canAccessDashboard) {
    return <Navigate to="/dashboard" replace />
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
      navigate(fromPath, { replace: true })
    } catch (error) {
      setAuthError(mapAuthErrorToMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-linear-to-b from-slate-50 to-slate-100 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <h1 className="text-center text-2xl font-bold text-slate-900">Welcome Back</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sign in with your admin account to open the dashboard.
        </p>

        {configError ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {configError}
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              placeholder="admin@school.edu"
            />
            {errors.email ? (
              <p className="mt-1 text-sm font-medium text-red-600">{errors.email}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              placeholder="Password"
            />
            {errors.password ? (
              <p className="mt-1 text-sm font-medium text-red-600">{errors.password}</p>
            ) : null}
          </div>

          {authError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {authError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || Boolean(configError)}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Log In'}
          </button>
        </form>
      </div>
    </section>
  )
}

export default LoginPage
