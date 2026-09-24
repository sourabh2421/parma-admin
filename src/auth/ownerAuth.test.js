import { describe, expect, it, beforeEach } from 'vitest'
import {
  OWNER_EMAIL,
  OWNER_PASSWORD,
  OWNER_SESSION_STORAGE_KEY,
  getStoredOwnerSession,
  isOwnerUser,
  setStoredOwnerSession,
  verifyOwnerCredentials,
} from './ownerAuth.js'

describe('Owner Authentication & Financial Revenue Security', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  describe('verifyOwnerCredentials', () => {
    it('accepts exact email and password', () => {
      expect(verifyOwnerCredentials('Vatsalrai76652@gmail.com', 'vatsal10032002')).toBe(true)
    })

    it('accepts lowercase email with extra whitespace trimmed', () => {
      expect(verifyOwnerCredentials('  vatsalrai76652@gmail.com  ', 'vatsal10032002')).toBe(true)
    })

    it('rejects incorrect password', () => {
      expect(verifyOwnerCredentials('Vatsalrai76652@gmail.com', 'wrongpassword')).toBe(false)
      expect(verifyOwnerCredentials('Vatsalrai76652@gmail.com', '')).toBe(false)
    })

    it('rejects incorrect email', () => {
      expect(verifyOwnerCredentials('otheruser@gmail.com', 'vatsal10032002')).toBe(false)
      expect(verifyOwnerCredentials('', 'vatsal10032002')).toBe(false)
      expect(verifyOwnerCredentials(null, 'vatsal10032002')).toBe(false)
    })
  })

  describe('isOwnerUser', () => {
    it('returns true when user email matches owner email', () => {
      expect(isOwnerUser({ email: 'Vatsalrai76652@gmail.com' })).toBe(true)
      expect(isOwnerUser({ email: 'vatsalrai76652@gmail.com' })).toBe(true)
    })

    it('returns false for non-owner user or null', () => {
      expect(isOwnerUser({ email: 'teacher@parma.edu' })).toBe(false)
      expect(isOwnerUser(null)).toBe(false)
      expect(isOwnerUser({})).toBe(false)
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
