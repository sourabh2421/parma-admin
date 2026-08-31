import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import PortalSelectionPage from './pages/PortalSelectionPage.jsx'
import DashboardLayout from './pages/DashboardLayout.jsx'
import DashboardOverview from './pages/dashboard/DashboardOverview.jsx'
import StudentsPage from './pages/dashboard/StudentsPage.jsx'
import FeeRecordsPage from './pages/dashboard/FeeRecordsPage.jsx'
import PendingFeesPage from './pages/dashboard/PendingFeesPage.jsx'
import MarksheetLayout from './pages/MarksheetLayout.jsx'
import MarksheetOverview from './pages/marksheet/MarksheetOverview.jsx'
import MarksheetLoginPage from './pages/marksheet/MarksheetLoginPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import MarksheetProtectedRoute from './components/MarksheetProtectedRoute.jsx'
import { MarksheetAuthProvider } from './context/MarksheetAuthContext.jsx'

function App() {
  return (
    <MarksheetAuthProvider>
      <Routes>
        {/* Portal Selection Landing Hub */}
        <Route path="/" element={<PortalSelectionPage />} />

        {/* Fee Management Login & Portal (Protected) */}
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute portal="fees">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardOverview />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="fees" element={<FeeRecordsPage />} />
          <Route path="pending" element={<PendingFeesPage />} />
        </Route>

        {/* Marksheet Management Login (Password Protected: admin123) */}
        <Route path="/marksheets/login" element={<MarksheetLoginPage />} />

        {/* Marksheet Management Portal (Protected) */}
        <Route
          path="/marksheets"
          element={
            <MarksheetProtectedRoute>
              <MarksheetLayout />
            </MarksheetProtectedRoute>
          }
        >
          <Route index element={<MarksheetOverview />} />
          <Route path="entry" element={<MarksheetOverview />} />
          <Route path="reports" element={<MarksheetOverview />} />
          <Route path="subjects" element={<MarksheetOverview />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MarksheetAuthProvider>
  )
}

export default App
