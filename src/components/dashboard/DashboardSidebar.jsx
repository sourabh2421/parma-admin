import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ChevronsRight,
  ClockAlert,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'

export default function DashboardSidebar() {
  const [open, setOpen] = useState(true)
  const location = useLocation()

  const navItems = [
    { to: '/dashboard', label: 'Dashboard overview', Icon: LayoutDashboard, end: true },
    { to: '/dashboard/students', label: 'Students', Icon: Users },
    { to: '/dashboard/fees', label: 'Fee records', Icon: Receipt },
    { to: '/dashboard/pending', label: 'Pending fees', Icon: ClockAlert },
  ]

  return (
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
              <div className="grid h-10 w-10 shrink-0 place-content-center rounded-xl bg-gradient-to-br from-emerald-600 to-[#252627] border border-emerald-500/40 text-[#fff9fb] font-black text-sm shadow-sm">
                <Wallet className="h-5 w-5 text-emerald-300" />
              </div>
              {open && (
                <div className="transition-opacity duration-200">
                  <span className="block text-xs font-black uppercase tracking-wide text-[#fff9fb]">
                    Accounts Desk
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
                    ? 'bg-emerald-600 text-[#fff9fb] font-bold shadow-md shadow-emerald-600/25'
                    : 'text-[#d3d4d9] hover:bg-[#252627] hover:text-[#fff9fb]'
                }`}
              >
                <div className="grid h-full w-12 place-content-center shrink-0">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-[#fff9fb]' : 'text-emerald-400'}`} />
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
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Office Accounts Cell
            </div>
            <p className="text-[10.5px] leading-relaxed text-[#d3d4d9]">
              Student records, monthly collections & audit reporting.
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
              className={`h-4 w-4 transition-transform duration-300 text-emerald-400 ${
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
  )
}

