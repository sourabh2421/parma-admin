import { createContext, useContext, useEffect, useState } from 'react'

const MarksheetAuthContext = createContext(null)

const MARKSHEET_AUTH_KEY = 'parma_marksheet_auth_session'
const MARKSHEET_PASSWORD = 'admin123'

export function MarksheetAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem(MARKSHEET_AUTH_KEY) === 'true'
  })

  const login = (password) => {
    if (password === MARKSHEET_PASSWORD) {
      sessionStorage.setItem(MARKSHEET_AUTH_KEY, 'true')
      setIsAuthenticated(true)
      return { success: true }
    }
    return { success: false, error: 'Incorrect password. Access denied.' }
  }

  const logout = () => {
    sessionStorage.removeItem(MARKSHEET_AUTH_KEY)
    setIsAuthenticated(false)
  }

  return (
    <MarksheetAuthContext.Provider value={{ isAuthenticated, login, logout }}>
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
