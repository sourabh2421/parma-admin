import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { getFirebaseAuth, isFirebaseConfigured } from '../firebase/config.js'
import { isAdminGateActive, isAuthorizedDashboardUser } from './authPolicy.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initialized, setInitialized] = useState(false)

  const configError = isFirebaseConfigured()
    ? null
    : 'Firebase is not configured. Add VITE_FIREBASE_* keys to a .env file and restart the dev server.'

  const adminGateActive = isAdminGateActive()
  const isAdmin = isAuthorizedDashboardUser(user)
  const role = getUserRole(user)
  const hasFeeAccess = canAccessFeePortal(user)
  const hasMarksheetAccess = canAccessMarksheetPortal(user)
  const canAccessDashboard = Boolean(user) && isAdmin

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return undefined
    }

    const auth = getFirebaseAuth()
    if (!auth) {
      const timeoutId = window.setTimeout(() => setInitialized(true), 0)
      return () => window.clearTimeout(timeoutId)
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (nextUser && isAdminGateActive() && !isAuthorizedDashboardUser(nextUser)) {
        void signOut(auth)
        setUser(null)
        setInitialized(true)
        return
      }
      setUser(nextUser)
      setInitialized(true)
    })

    return unsubscribe
  }, [])

  const login = useCallback(async (email, password) => {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase Auth is not available.')
    const cred = await signInWithEmailAndPassword(auth, email, password)
    if (isAdminGateActive() && !isAuthorizedDashboardUser(cred.user)) {
      await signOut(auth)
      const err = new Error('AUTH_NOT_AUTHORIZED')
      err.code = 'auth/not-authorized-for-dashboard'
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    const auth = getFirebaseAuth()
    if (!auth) return
    await signOut(auth)
  }, [])

  const loading = Boolean(isFirebaseConfigured() && !initialized)

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin,
      role,
      hasFeeAccess,
      hasMarksheetAccess,
      adminGateActive,
      canAccessDashboard,
      loading,
      configError,
      login,
      logout,
    }),
    [
      user,
      isAdmin,
      role,
      hasFeeAccess,
      hasMarksheetAccess,
      adminGateActive,
      canAccessDashboard,
      loading,
      configError,
      login,
      logout,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
