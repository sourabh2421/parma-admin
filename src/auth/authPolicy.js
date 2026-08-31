/**
 * Portal & Role Authorization Policy for Parma Academy
 * 
 * Supports role separation between:
 * 1. Fee Management Portal (fee_admin)
 * 2. Marksheet Management Portal (marksheet_admin)
 * 3. Master / Super Admin (super_admin - access to both)
 */

export function getExpectedAdminEmail() {
  return import.meta.env.VITE_FIREBASE_ADMIN_EMAIL?.trim() ?? ''
}

export function getFeeAdminEmail() {
  return import.meta.env.VITE_FEE_ADMIN_EMAIL?.trim() || getExpectedAdminEmail()
}

export function getMarksheetAdminEmail() {
  return import.meta.env.VITE_MARKSHEET_ADMIN_EMAIL?.trim() ?? ''
}

export function isAdminGateActive() {
  return Boolean(getExpectedAdminEmail() || getFeeAdminEmail() || getMarksheetAdminEmail())
}

/**
 * Returns user role: 'super_admin' | 'fee_admin' | 'marksheet_admin' | 'general_admin'
 */
export function getUserRole(user) {
  if (!user || !user.email) return 'guest'

  const email = user.email.trim().toLowerCase()
  const masterAdmin = getExpectedAdminEmail().toLowerCase()
  const feeAdmin = getFeeAdminEmail().toLowerCase()
  const marksheetAdmin = getMarksheetAdminEmail().toLowerCase()

  // 1. If explicit super admin or matches default master email
  if (masterAdmin && email === masterAdmin && (!marksheetAdmin || masterAdmin !== marksheetAdmin)) {
    // If master matches and no specific sub-roles, master has super access
    return 'super_admin'
  }

  // 2. Explicit marksheet admin match
  if (marksheetAdmin && email === marksheetAdmin) {
    return 'marksheet_admin'
  }

  // 3. Explicit fee admin match
  if (feeAdmin && email === feeAdmin) {
    return 'fee_admin'
  }

  // 4. Conventional email matching (e.g. accounts@... or exam@...)
  if (email.includes('fee') || email.includes('account') || email.includes('office') || email.includes('clerk')) {
    return 'fee_admin'
  }
  if (email.includes('exam') || email.includes('mark') || email.includes('teacher') || email.includes('academic')) {
    return 'marksheet_admin'
  }

  // Default: if no strict email gate is set, treat logged in user as super_admin
  if (!isAdminGateActive()) {
    return 'super_admin'
  }

  return 'super_admin'
}

/**
 * Checks if user is permitted to access the Fee Management Portal
 */
export function canAccessFeePortal(user) {
  if (!user) return false
  const role = getUserRole(user)
  return role === 'fee_admin' || role === 'super_admin'
}

/**
 * Checks if user is permitted to access the Marksheet Management Portal
 */
export function canAccessMarksheetPortal(user) {
  if (!user) return false
  const role = getUserRole(user)
  return role === 'marksheet_admin' || role === 'super_admin'
}

/**
 * Backward-compatible generic dashboard check
 */
export function isAuthorizedDashboardUser(user) {
  if (!user) return false
  if (!isAdminGateActive()) return true
  const role = getUserRole(user)
  return role !== 'guest'
}
