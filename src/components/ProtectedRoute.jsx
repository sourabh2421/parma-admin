import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../auth/useAuth.jsx'

function ProtectedRoute({ children }) {
  const location = useLocation()
  const { canAccessDashboard, loading, configError, adminGateActive, isAuthenticated } = useAuth()

  if (configError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
        <p className="max-w-md text-center text-sm font-medium text-red-700">{configError}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-100">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"
          aria-hidden="true"
        />
        <p className="text-sm text-slate-600">Checking session…</p>
      </div>
    )
  }

  if (!canAccessDashboard) {
    const authNotice =
      adminGateActive && isAuthenticated
        ? 'This account is not authorized for the admin dashboard.'
        : undefined
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
          ...(authNotice ? { authNotice } : {}),
        }}
      />
    )
  }

  return children
}

export default ProtectedRoute
