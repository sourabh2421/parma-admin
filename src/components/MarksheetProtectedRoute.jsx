import { Navigate } from 'react-router-dom'
import { useMarksheetAuth } from '../context/MarksheetAuthContext.jsx'

export default function MarksheetProtectedRoute({ children }) {
  const { isAuthenticated } = useMarksheetAuth()

  if (!isAuthenticated) {
    return <Navigate to="/marksheets/login" replace />
  }

  return children
}
