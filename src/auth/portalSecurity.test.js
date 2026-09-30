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

  it('assigns guest role to unknown/unrecognized emails and denies all portal access', () => {
    const unknownUser = { email: 'random.person@gmail.com' }
    expect(getUserRole(unknownUser)).toBe('guest')
    expect(canAccessFeePortal(unknownUser)).toBe(false)
    expect(canAccessMarksheetPortal(unknownUser)).toBe(false)
  })

  it('correctly grants fee_admin to office@parma.com and denies marksheet portal', () => {
    const officeUser = { email: 'office@parma.com' }
    expect(getUserRole(officeUser)).toBe('fee_admin')
    expect(canAccessFeePortal(officeUser)).toBe(true)
    expect(canAccessMarksheetPortal(officeUser)).toBe(false)
  })

  it('correctly grants marksheet_admin to teacher@parma.com and denies fee portal', () => {
    const teacherUser = { email: 'teacher@parma.com' }
    expect(getUserRole(teacherUser)).toBe('marksheet_admin')
    expect(canAccessMarksheetPortal(teacherUser)).toBe(true)
    expect(canAccessFeePortal(teacherUser)).toBe(false)
  })

  it('correctly grants super_admin to owner vatsalrai76652@gmail.com with access to both portals', () => {
    const ownerUser = { email: 'vatsalrai76652@gmail.com' }
    expect(getUserRole(ownerUser)).toBe('super_admin')
    expect(canAccessFeePortal(ownerUser)).toBe(true)
    expect(canAccessMarksheetPortal(ownerUser)).toBe(true)
  })
})

