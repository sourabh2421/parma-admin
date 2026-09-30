import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../auth/useAuth.jsx'

/**
 * Protects marksheet portal routes using Firebase Auth role checks.
 */
export default function MarksheetProtectedRoute({ children }) {
  const location = useLocation()
  const { isAuthenticated, hasMarksheetAccess, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-900 text-white">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
          aria-hidden="true"
        />
        <p className="text-sm text-slate-400">Verifying credentials…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/marksheets/login"
        replace
        state={{
          from: location,
          authNotice: 'Please sign in to access the Marksheet Portal.',
        }}
      />
    )
  }

  if (!hasMarksheetAccess) {
    return (
      <Navigate
        to="/marksheets/login"
        replace
        state={{
          authNotice: 'Your account is not authorized for the Marksheet Portal.',
        }}
      />
    )
  }

  return children
}
