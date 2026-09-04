import React, { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMarksheetAuth } from '../context/MarksheetAuthContext.jsx'
import {
  BarChart3,
  BookOpen,
  ChevronsRight,
  FileEdit,
  FileText,
  Home,
  LogOut,
  School,
  Sparkles,
} from 'lucide-react'

export default function MarksheetLayout() {
  const { logout } = useMarksheetAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(true)

  const handleSignOut = () => {
    logout()
    navigate('/', { replace: true })
  }

  const navItems = [
    { to: '/marksheets', label: 'Marksheet Overview', Icon: BarChart3, end: true },
    { to: '/marksheets/entry', label: 'Marks Entry Desk', Icon: FileEdit },
    { to: '/marksheets/reports', label: 'Report Cards (A4)', Icon: FileText },
    { to: '/marksheets/subjects', label: 'Subjects Master', Icon: BookOpen },
  ]

  return (
    <div className="min-h-screen bg-[#191a1a] text-[#fff9fb] flex flex-col print:bg-white print:text-black print:min-h-0">
      {/* Topbar */}
      <header className="no-print sticky top-0 z-30 border-b border-[#333538] bg-[#252627]/95 px-4 sm:px-6 py-2.5 backdrop-blur-md shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#bb0a21] via-[#8c0819] to-[#4b88a2] font-extrabold text-[#fff9fb] shadow-md shadow-[#bb0a21]/20 group-hover:scale-105 transition-transform">
                PA
              </div>
              <div>
                <div className="text-sm font-black tracking-wider text-[#fff9fb] flex items-center gap-2 zen-dots-regular">
                  PARMA ACADEMY
                  <span className="text-[10px] bg-[#bb0a21]/20 text-[#fff9fb] border border-[#bb0a21]/40 px-1.5 py-0.2 rounded font-mono font-bold font-sans">
                    ICSE / ISC
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-[#4b88a2]">
                  Examination & Marksheet Cell
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
              onClick={handleSignOut}
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
        {/* Collapsible Modern Sidebar */}
        <aside
          className={`no-print relative shrink-0 border-r border-[#333538] bg-[#202122] p-2 hidden md:flex md:flex-col justify-between transition-all duration-300 ease-in-out ${
            open ? 'w-64' : 'w-16'
          }`}
        >
          {/* Sidebar Header Title Section */}
          <div>
            <div className="mb-4 border-b border-[#333538] pb-3">
              <div className="flex items-center justify-between rounded-xl p-2 transition-colors hover:bg-[#252627]">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-content-center rounded-xl bg-gradient-to-br from-[#4b88a2] to-[#252627] border border-[#4b88a2]/40 text-[#fff9fb] font-black text-sm shadow-sm">
                    <School className="h-5 w-5 text-[#fff9fb]" />
                  </div>
                  {open && (
                    <div className="transition-opacity duration-200">
                      <span className="block text-xs font-black uppercase tracking-wide text-[#fff9fb]">
                        Academic Desk
                      </span>
                      <span className="block text-[10px] text-[#d3d4d9]">
                        Session 2026-27
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="space-y-1.5">
              {open && (
                <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#d3d4d9]/60">
                  Navigation
                </div>
              )}
              {navItems.map((item) => {
                const isActive = item.end
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to)
                const Icon = item.Icon

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={!open ? item.label : undefined}
                    className={`relative flex h-11 w-full items-center rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-[#4b88a2] text-[#fff9fb] font-bold shadow-md shadow-[#4b88a2]/25'
                        : 'text-[#d3d4d9] hover:bg-[#252627] hover:text-[#fff9fb]'
                    }`}
                  >
                    <div className="grid h-full w-12 place-content-center shrink-0">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-[#fff9fb]' : 'text-[#4b88a2]'}`} />
                    </div>
                    {open && (
                      <span className="text-xs font-semibold truncate pr-3">
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </nav>
          </div>

          {/* Bottom Card & Toggle */}
          <div className="space-y-3">
            {open && (
              <div className="rounded-xl border border-[#333538] bg-[#252627] p-3 text-xs text-[#d3d4d9]">
                <div className="font-bold text-[#fff9fb] flex items-center gap-1.5 text-xs mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-[#4b88a2]" />
                  ICSE Examination Cell
                </div>
                <p className="text-[10.5px] leading-relaxed text-[#d3d4d9]">
                  FA-1 to SA-2 periodic evaluations with instant A4 report printing.
                </p>
              </div>
            )}

            {/* Toggle Expand / Collapse Button */}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex w-full items-center rounded-xl border border-[#333538] bg-[#252627] p-2 text-[#d3d4d9] hover:bg-[#333538] hover:text-[#fff9fb] transition"
              title={open ? 'Collapse Sidebar' : 'Expand Sidebar'}
            >
              <div className="grid h-7 w-7 place-content-center shrink-0">
                <ChevronsRight
                  className={`h-4 w-4 transition-transform duration-300 text-[#4b88a2] ${
                    open ? 'rotate-180' : ''
                  }`}
                />
              </div>
              {open && (
                <span className="text-xs font-semibold ml-2">
                  Collapse Sidebar
                </span>
              )}
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-7xl mx-auto w-full print:p-0 print:m-0 print:max-w-none print:w-full print:overflow-visible">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
