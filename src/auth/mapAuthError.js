/**
 * Map Firebase Auth errors to safe, user-facing strings.
 * Avoid returning raw `error.message` (can leak implementation details).
 *
 * Rate limiting & abuse mitigation (configure in Firebase / GCP — not in SPA):
 * - Use Firebase App Check on web to reduce credential stuffing against your API key.
 * - In Google Cloud / Identity Platform: enable reCAPTCHA, SMS risk, and account
 *   protection; tune "too many requests" thresholds if needed.
 * - Prefer short-lived sessions (`VITE_AUTH_PERSISTENCE=session`) on shared machines.
 * - Optional: Cloud Function blocking triggers (`beforeCreate` / `beforeSignIn`) for
 *   IP or email domain allowlists (sensitive rules stay server-side).
 *
 * @param {unknown} error
 * @param {boolean} [includeDebugDetail]
 * @returns {string}
 */
export function mapAuthErrorToMessage(error, includeDebugDetail = import.meta.env.DEV) {
  const code = error && typeof error === 'object' ? error.code : undefined

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Invalid email or password.'
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact your administrator.'
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Please wait before trying again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled for this project.'
    case 'auth/invalid-api-key':
      return 'Application configuration error. Please contact support.'
    case 'auth/internal-error':
      return 'Sign-in is temporarily unavailable. Please try again later.'
    case 'auth/not-authorized-for-dashboard':
      return 'This account is not authorized to access the admin dashboard.'
    default:
      if (includeDebugDetail && error && typeof error === 'object' && error.message) {
        return String(error.message)
      }
      return 'Sign-in failed. Please try again.'
  }
}
