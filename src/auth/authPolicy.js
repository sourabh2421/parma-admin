/**
 * Dashboard authorization (client-side). Must match Firestore rules admin check
 * and `writeGuard.js` — use the same `VITE_FIREBASE_ADMIN_EMAIL` value.
 *
 * When unset, any Firebase-signed-in user may open the dashboard (Firestore
 * rules should still restrict data). Set the variable in production.
 */
export function getExpectedAdminEmail() {
  return import.meta.env.VITE_FIREBASE_ADMIN_EMAIL?.trim() ?? ''
}

export function isAdminGateActive() {
  return Boolean(getExpectedAdminEmail())
}

export function isAuthorizedDashboardUser(user) {
  if (!user) return false
  const expected = getExpectedAdminEmail()
  if (!expected) return true
  const email = user.email?.trim().toLowerCase()
  return Boolean(email && email === expected.toLowerCase())
}
