'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  UserPlus,
  ListOrdered,
  Settings,
  LogOut,
  Monitor,
  Activity,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '@/components/ThemeProvider'

interface NavbarProps {
  user: {
    name?: string | null
    role?: string
  }
}

const navItems = [
  { href: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard, roles: ['admin', 'nurse'] },
  { href: '/register', label: 'ลงทะเบียน', icon: UserPlus, roles: ['admin', 'nurse', 'triage'] },
  { href: '/queue', label: 'จัดการคิว', icon: ListOrdered, roles: ['admin', 'nurse'] },
  { href: '/settings', label: 'ตั้งค่า', icon: Settings, roles: ['admin'] },
]

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { colors } = useTheme()

  return (
    <nav
      className="shadow-lg sticky top-0 z-50"
      style={{ background: `linear-gradient(to right, ${colors.navFrom}, ${colors.navTo})` }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-white font-bold text-lg">Smart ER</span>
              <span className="text-xs block -mt-1" style={{ color: colors.textMuted }}>Emergency Room</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems
              .filter(item => item.roles.includes(user.role || ''))
              .map(item => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                      color: isActive ? '#fff' : colors.textSubtle,
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.textSubtle } }}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}

            <Link
              href="/view"
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/10 hover:text-white"
              style={{ color: colors.textSubtle }}
            >
              <Monitor className="w-4 h-4" />
              จอแสดงผล
            </Link>
          </div>

          {/* User info + Logout */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <div className="text-white text-sm font-medium">{user.name}</div>
              <div className="text-xs capitalize" style={{ color: colors.textMuted }}>{user.role}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-2 rounded-lg hover:bg-white/10 hover:text-white transition-all"
              style={{ color: colors.textMuted }}
              title="ออกจากระบบ"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-white hover:bg-white/10"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div
          className="md:hidden border-t animate-fade-in"
          style={{ background: colors.mobileBg, borderColor: colors.primary }}
        >
          <div className="px-4 py-3 space-y-1">
            {navItems
              .filter(item => item.roles.includes(user.role || ''))
              .map(item => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                      color: isActive ? '#fff' : colors.textSubtle,
                    }}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                )
              })}
            <div className="pt-3 mt-3 border-t" style={{ borderColor: colors.primary }}>
              <div className="px-4 py-2 text-sm" style={{ color: colors.textMuted }}>
                {user.name} ({user.role})
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-300 hover:bg-white/10"
              >
                <LogOut className="w-5 h-5" />
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
