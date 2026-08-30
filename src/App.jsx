import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import DashboardLayout from './pages/DashboardLayout.jsx'
import DashboardOverview from './pages/dashboard/DashboardOverview.jsx'
import StudentsPage from './pages/dashboard/StudentsPage.jsx'
import FeeRecordsPage from './pages/dashboard/FeeRecordsPage.jsx'
import PendingFeesPage from './pages/dashboard/PendingFeesPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardOverview />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="fees" element={<FeeRecordsPage />} />
        <Route path="pending" element={<PendingFeesPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
