import { Link, Navigate, useLocation } from 'react-router-dom'
import useAuth from '../auth/useAuth.jsx'

function ProtectedRoute({ children, portal = 'fees' }) {
  const location = useLocation()
  const {
    user,
    role,
    hasFeeAccess,
    hasMarksheetAccess,
    loading,
    configError,
    isAuthenticated,
  } = useAuth()

  if (configError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
        <p className="max-w-md text-center text-sm font-medium text-red-700">{configError}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-900 text-white">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
          aria-hidden="true"
        />
        <p className="text-sm text-slate-400">Verifying credentials…</p>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to={`/login?portal=${portal}`}
        replace
        state={{
          from: location,
          authNotice: `Please sign in to access the ${portal === 'marksheet' ? 'Marksheet' : 'Fee'} Portal.`,
        }}
      />
    )
  }

  // Check portal-specific permission
  const isAuthorized = portal === 'marksheet' ? hasMarksheetAccess : hasFeeAccess

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-3xl text-rose-400 border border-rose-500/30">
            🔒
          </div>
          <h2 className="text-xl font-bold text-white">Access Restricted</h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Your account (<strong className="text-slate-200">{user.email}</strong>) is assigned the role of{' '}
            <span className="font-semibold text-amber-400 capitalize">{role?.replace('_', ' ')}</span> and does not have permission to access the{' '}
            <strong>{portal === 'marksheet' ? 'Marksheet & Academic' : 'Fee Management'}</strong> Portal.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Link
              to={portal === 'marksheet' ? '/dashboard' : '/marksheets'}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition"
            >
              Go to Your Authorized Portal ({portal === 'marksheet' ? 'Fee Portal' : 'Marksheet Portal'})
            </Link>
            <Link
              to="/"
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Back to Portal Selection Hub
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
