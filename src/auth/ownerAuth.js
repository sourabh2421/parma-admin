export const OWNER_EMAIL = 'vatsalrai76652@gmail.com'
export const OWNER_PASSWORD = 'vatsal10032002'

export const OWNER_SESSION_STORAGE_KEY = 'parma_owner_revenue_unlocked'

/**
 * Validates owner credentials for unlocking revenue/total fee collection views.
 * @param {string} email
 * @param {string} password
 * @returns {boolean}
 */
export function verifyOwnerCredentials(email, password) {
  if (!email || !password) return false
  const normalizedEmail = String(email).trim().toLowerCase()
  return normalizedEmail === OWNER_EMAIL.toLowerCase() && String(password) === OWNER_PASSWORD
}

/**
 * Checks if current authenticated user is the owner
 * @param {{ email?: string } | null} user
 * @returns {boolean}
 */
export function isOwnerUser(user) {
  if (!user || !user.email) return false
  return user.email.trim().toLowerCase() === OWNER_EMAIL.toLowerCase()
}

/**
 * Reads stored session state for revenue unlock
 * @returns {boolean}
 */
export function getStoredOwnerSession() {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage?.getItem(OWNER_SESSION_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Updates stored session state for revenue unlock
 * @param {boolean} unlocked
 */
export function setStoredOwnerSession(unlocked) {
  if (typeof window === 'undefined') return
  try {
    if (unlocked) {
      window.sessionStorage?.setItem(OWNER_SESSION_STORAGE_KEY, 'true')
    } else {
      window.sessionStorage?.removeItem(OWNER_SESSION_STORAGE_KEY)
    }
  } catch {
    // ignore sessionStorage quota/security errors
  }
}
