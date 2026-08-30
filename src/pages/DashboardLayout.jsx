import { useNavigate, Outlet } from 'react-router-dom'
import useAuth from '../auth/useAuth.jsx'
import { ToastProvider } from '../context/ToastProvider.jsx'
import DashboardSidebar from '../components/dashboard/DashboardSidebar.jsx'
import DashboardTopbar from '../components/dashboard/DashboardTopbar.jsx'

function DashboardLayout() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <ToastProvider>
      <section className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <DashboardSidebar />
          <div className="min-w-0 space-y-4">
            <DashboardTopbar onLogout={handleLogout} />
            <Outlet />
          </div>
        </div>
      </section>
    </ToastProvider>
  )
}

export default DashboardLayout
