import {
  OWNER_SESSION_STORAGE_KEY,
  getOwnerEmail,
  getOwnerPassword,
  getStoredOwnerSession,
  isOwnerUser,
  setStoredOwnerSession,
  verifyOwnerPassword,
} from './ownerAuth.js'

describe('Owner Authentication & Financial Revenue Security', () => {
  const originalOwnerEmail = import.meta.env.VITE_OWNER_EMAIL
  const originalOwnerPassword = import.meta.env.VITE_OWNER_PASSWORD

  beforeEach(() => {
    window.sessionStorage.clear()
    import.meta.env.VITE_OWNER_EMAIL = 'vatsalrai76652@gmail.com'
    delete import.meta.env.VITE_OWNER_PASSWORD
  })

  afterEach(() => {
    import.meta.env.VITE_OWNER_EMAIL = originalOwnerEmail
    import.meta.env.VITE_OWNER_PASSWORD = originalOwnerPassword
  })

  describe('getOwnerPassword & verifyOwnerPassword', () => {
    it('returns empty string and rejects all passwords when VITE_OWNER_PASSWORD is unset', () => {
      expect(getOwnerPassword()).toBe('')
      expect(verifyOwnerPassword('vatsal10032002')).toBe(false)
      expect(verifyOwnerPassword('anypassword')).toBe(false)
    })

    it('rejects incorrect passwords or empty input', () => {
      import.meta.env.VITE_OWNER_PASSWORD = 'secureOwnerPass'
      expect(verifyOwnerPassword('wrongpassword')).toBe(false)
      expect(verifyOwnerPassword('')).toBe(false)
      expect(verifyOwnerPassword(null)).toBe(false)
    })

    it('verifies correctly when VITE_OWNER_PASSWORD is configured', () => {
      import.meta.env.VITE_OWNER_PASSWORD = 'customPassword123'
      expect(getOwnerPassword()).toBe('customPassword123')
      expect(verifyOwnerPassword('customPassword123')).toBe(true)
      expect(verifyOwnerPassword('  customPassword123  ')).toBe(true)
    })
  })

  describe('getOwnerEmail', () => {
    it('reads configured owner email from environment', () => {
      expect(getOwnerEmail()).toBe('vatsalrai76652@gmail.com')
    })
  })

  describe('isOwnerUser', () => {
    it('returns true when authenticated user email matches configured owner email', () => {
      expect(isOwnerUser({ email: 'Vatsalrai76652@gmail.com' })).toBe(true)
      expect(isOwnerUser({ email: 'vatsalrai76652@gmail.com' })).toBe(true)
      expect(isOwnerUser({ email: '  vatsalrai76652@gmail.com  ' })).toBe(true)
    })

    it('returns false for non-owner user or invalid/empty input', () => {
      expect(isOwnerUser({ email: 'teacher@parma.edu' })).toBe(false)
      expect(isOwnerUser({ email: 'other@gmail.com' })).toBe(false)
      expect(isOwnerUser(null)).toBe(false)
      expect(isOwnerUser({})).toBe(false)
      expect(isOwnerUser({ email: '' })).toBe(false)
    })

    it('returns false when no owner email is configured', () => {
      import.meta.env.VITE_OWNER_EMAIL = ''
      expect(isOwnerUser({ email: 'vatsalrai76652@gmail.com' })).toBe(false)
    })
  })

  describe('session storage persistence', () => {
    it('reads and writes session state correctly', () => {
      expect(getStoredOwnerSession()).toBe(false)

      setStoredOwnerSession(true)
      expect(getStoredOwnerSession()).toBe(true)
      expect(window.sessionStorage.getItem(OWNER_SESSION_STORAGE_KEY)).toBe('true')

      setStoredOwnerSession(false)
      expect(getStoredOwnerSession()).toBe(false)
      expect(window.sessionStorage.getItem(OWNER_SESSION_STORAGE_KEY)).toBeNull()
    })
  })
})

