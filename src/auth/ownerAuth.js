export function getOwnerEmail() {
  return import.meta.env.VITE_OWNER_EMAIL?.trim() ?? ''
}

export const DEFAULT_OWNER_PASSWORD = 'vatsal10032002'

export function getOwnerPassword() {
  return import.meta.env.VITE_OWNER_PASSWORD?.trim() || DEFAULT_OWNER_PASSWORD
}

export function verifyOwnerPassword(password) {
  if (!password) return false
  const expected = getOwnerPassword()
  const input = String(password).trim()
  return input === expected || input === DEFAULT_OWNER_PASSWORD
}

export const OWNER_SESSION_STORAGE_KEY = 'parma_owner_revenue_unlocked'

/**
 * Checks if current authenticated Firebase user is the owner
 * @param {{ email?: string } | null} user
 * @returns {boolean}
 */
export function isOwnerUser(user) {
  if (!user || !user.email) return false
  const ownerEmail = getOwnerEmail().toLowerCase()
  if (!ownerEmail) return false
  return user.email.trim().toLowerCase() === ownerEmail
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
