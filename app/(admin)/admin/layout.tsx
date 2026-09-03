'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Monitor, 
  ListMusic, 
  Image as ImageIcon, 
  Menu, 
  X, 
  LogOut,
  KeyRound,
  Tv,
  Radio
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'จอทีวี (Screens)', href: '/admin/screens', icon: Monitor },
  { name: 'Playlist รายการ', href: '/admin/playlists', icon: ListMusic },
  { name: 'คลังสื่อ (Media)', href: '/admin/media', icon: ImageIcon },
  { name: 'ตั้งค่ารหัสผ่าน', href: '/admin/settings', icon: KeyRound },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('Logout failed', err)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Modern Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/80 shadow-sm
        transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block
        flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Logo Header */}
        <div className="h-20 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover rounded-[10px] bg-white p-1" />
            </div>
            <div>
              <span className="text-base font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent block leading-tight">
                Thoen Media TV
              </span>
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Digital Signage System
              </span>
            </div>
          </div>
          <button 
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto py-6 px-4">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            เมนูการจัดการ
          </p>
          <ul className="space-y-1.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      group flex items-center px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                      ${isActive 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 translate-x-0.5' 
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                      }
                    `}
                  >
                    <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User profile & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3.5 py-2.5 text-sm font-semibold text-slate-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all group"
          >
            <LogOut className="w-5 h-5 mr-3 text-slate-400 group-hover:text-red-500 transition-colors" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <header className="lg:hidden h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 p-0.5 flex items-center justify-center">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover rounded-md bg-white p-0.5" />
            </div>
            <span className="text-sm font-bold text-slate-900">Thoen Media TV</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

