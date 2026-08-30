import { getFirebaseAuth } from './config.js'
import { getExpectedAdminEmail, isAuthorizedDashboardUser } from '../auth/authPolicy.js'

/**
 * When VITE_FIREBASE_ADMIN_EMAIL is set, only that signed-in user may perform writes.
 * Firestore security rules must enforce the same (see firestore.rules in repo root).
 */
export function assertAdminCanWrite() {
  if (!getExpectedAdminEmail()) return

  const auth = getFirebaseAuth()
  if (!isAuthorizedDashboardUser(auth?.currentUser ?? null)) {
    throw new Error(
      'You are not allowed to change school data with this account. Sign in with the configured admin email.',
    )
  }
}
