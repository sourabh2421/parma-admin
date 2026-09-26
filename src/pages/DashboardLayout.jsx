import { useNavigate, Outlet, Link } from 'react-router-dom'
import { Home, LogOut } from 'lucide-react'
import useAuth from '../auth/useAuth.jsx'
import { ToastProvider } from '../context/ToastProvider.jsx'
import { OwnerRevenueProvider } from '../context/OwnerRevenueContext.jsx'
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
      <OwnerRevenueProvider>
        <div className="min-h-screen bg-[#191a1a] text-[#fff9fb] flex flex-col print:bg-white print:text-black print:min-h-0">
          {/* Topbar matching Marksheet Portal */}
          <header className="no-print sticky top-0 z-30 border-b border-[#333538] bg-[#252627]/95 px-4 sm:px-6 py-2.5 backdrop-blur-md shadow-md text-[#fff9fb]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link to="/" className="flex items-center gap-3 group">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1 border border-white/20 shadow-md shadow-black/30 group-hover:scale-105 transition-transform overflow-hidden">
                    <img
                      src="/logo.png"
                      alt="Parma Academy Logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-black tracking-wider text-[#fff9fb] flex items-center gap-2 zen-dots-regular">
                      PARMA ACADEMY
                      <span className="text-[10px] bg-[#bb0a21]/20 text-[#fff9fb] border border-[#bb0a21]/40 px-1.5 py-0.2 rounded font-mono font-bold font-sans">
                        ICSE / ISC
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-400">
                      Fee & Accounts Management Cell
                    </div>
                  </div>
                </Link>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/"
                  className="flex items-center gap-1.5 rounded-xl border border-[#333538] bg-[#252627] px-3.5 py-1.5 text-xs font-semibold text-[#d3d4d9] hover:bg-[#333538] hover:text-[#fff9fb] transition-all"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Portal Selection</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-xl border border-[#bb0a21]/50 bg-[#bb0a21]/15 px-3 py-1.5 text-xs font-semibold text-[#fff9fb] hover:bg-[#bb0a21] transition-all shadow-sm"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            </div>
          </header>

          {/* Main App Layout */}
          <div className="flex flex-1 print:block print:p-0 print:m-0">
            <DashboardSidebar />
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-7xl mx-auto w-full print:p-0 print:m-0 print:max-w-none print:w-full print:overflow-visible">
              <div className="space-y-4">
                <DashboardTopbar onLogout={handleLogout} />
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </OwnerRevenueProvider>
    </ToastProvider>
  )
}

export default DashboardLayout
