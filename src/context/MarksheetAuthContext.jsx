import { createContext, useContext, useState } from 'react'

const MarksheetAuthContext = createContext(null)

const TEACHER_AUTH_KEY = 'parma_teacher_marksheet_session'
const VALID_TEACHER_PASSWORDS = ['teacher123', 'admin123', 'exam2026']

export function MarksheetAuthProvider({ children }) {
  const [teacherUser, setTeacherUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem(TEACHER_AUTH_KEY)
      if (raw) {
        return JSON.parse(raw)
      }
      // Backward compatibility for legacy flag
      if (sessionStorage.getItem('parma_marksheet_auth_session') === 'true') {
        return { name: 'Academic Teacher', role: 'teacher' }
      }
    } catch {
      // ignore JSON parse error
    }
    return null
  })

  const isAuthenticated = Boolean(teacherUser)

  const login = (password, teacherName = '') => {
    const trimmed = String(password || '').trim()
    if (VALID_TEACHER_PASSWORDS.includes(trimmed.toLowerCase())) {
      const userObj = {
        name: teacherName.trim() || 'Academic Teacher',
        role: 'teacher',
        loginTime: new Date().toISOString(),
      }
      sessionStorage.setItem(TEACHER_AUTH_KEY, JSON.stringify(userObj))
      sessionStorage.setItem('parma_marksheet_auth_session', 'true')
      setTeacherUser(userObj)
      return { success: true, user: userObj }
    }
    return {
      success: false,
      error: 'Invalid Teacher Access Password. (Authorized for teachers & academic staff).',
    }
  }

  const logout = () => {
    sessionStorage.removeItem(TEACHER_AUTH_KEY)
    sessionStorage.removeItem('parma_marksheet_auth_session')
    setTeacherUser(null)
  }

  return (
    <MarksheetAuthContext.Provider
      value={{
        teacherUser,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </MarksheetAuthContext.Provider>
  )
}

export function useMarksheetAuth() {
  const ctx = useContext(MarksheetAuthContext)
  if (!ctx) {
    throw new Error('useMarksheetAuth must be used within MarksheetAuthProvider')
  }
  return ctx
}
