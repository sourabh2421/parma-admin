import { describe, expect, it } from 'vitest'
import { canAccessFeePortal, canAccessMarksheetPortal, getUserRole } from './authPolicy.js'

describe('Portal Security & Role Separation Test Suite', () => {
  it('correctly classifies office person as fee_admin only', () => {
    const officeUser = { email: 'office.accounts@parmaacademy.in' }
    expect(getUserRole(officeUser)).toBe('fee_admin')
    expect(canAccessFeePortal(officeUser)).toBe(true)
    expect(canAccessMarksheetPortal(officeUser)).toBe(false)
  })

  it('correctly classifies teacher as marksheet_admin only', () => {
    const teacherUser = { email: 'teacher.academic@parmaacademy.in' }
    expect(getUserRole(teacherUser)).toBe('marksheet_admin')
    expect(canAccessMarksheetPortal(teacherUser)).toBe(true)
    expect(canAccessFeePortal(teacherUser)).toBe(false)
  })

  it('denies unauthenticated guests from both portals', () => {
    expect(canAccessFeePortal(null)).toBe(false)
    expect(canAccessMarksheetPortal(null)).toBe(false)
    expect(getUserRole(null)).toBe('guest')
  })
})
