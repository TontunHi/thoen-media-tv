'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Monitor, Settings, ExternalLink, Loader2, MapPin, Layers, Clock, Tv } from 'lucide-react'

export default function ScreensPage() {
  const [screens, setScreens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchScreens = async () => {
    try {
      const res = await fetch('/api/screens')
      if (res.ok) {
        setScreens(await res.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScreens()
    // Poll every 10 seconds for real-time status
    const interval = setInterval(fetchScreens, 10000)
    return () => clearInterval(interval)
  }, [])

  // Consider online if pinged within the last 45 seconds (TV sends every 20s)
  const isOnline = (lastPingAt: string | null) => {
    if (!lastPingAt) return false
    return (Date.now() - new Date(lastPingAt).getTime()) < 45000
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">จัดการจอทีวี (Screens)</h1>
          <p className="text-sm text-slate-500 mt-1">
            ดูสถานะออนไลน์ ลิงก์ประจำจอ และกำหนดเลเยอร์ Playlist ของแต่ละจอ
          </p>
        </div>
        <Link 
          href="/admin/screens/new"
          className="inline-flex items-center px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มจอทีวีใหม่
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : screens.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-4">
            <Tv className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">ยังไม่มีจอทีวีในระบบ</h3>
          <p className="text-sm text-slate-400 mt-1 mb-6 max-w-sm mx-auto">
            เพิ่มจอทีวีตัวแรกเพื่อเริ่มถ่ายทอดสื่อ ป้ายประชาสัมพันธ์ หรือวิดีโอบนหน้าจอของคุณ
          </p>
          <Link 
            href="/admin/screens/new"
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มจอทีวีใหม่
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {screens.map((screen) => {
            const online = isOnline(screen.lastPingAt)
            
            return (
              <div 
                key={screen.id} 
                className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group"
              >
                <div className="p-6 flex-1 space-y-4">
                  {/* Top Bar: Icon + Title + Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                        online ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Monitor className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {screen.name}
                        </h3>
                        <span className="font-mono text-xs text-slate-400">/tv/{screen.slug}</span>
                      </div>
                    </div>

                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      online 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full mr-1.5 ${online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                      {online ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  {/* Details List */}
                  <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-400">สถานที่:</span>
                      <span className="font-medium text-slate-800 truncate">{screen.location || '-'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-400">Playlist หลัก:</span>
                      <span className="font-medium text-slate-800 truncate">
                        {screen.playlist ? (
                          <span className="text-blue-600 font-semibold">{screen.playlist.name}</span>
                        ) : (
                          <span className="text-amber-500 font-semibold">ตามลำดับ Layers</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-400">เชื่อมต่อล่าสุด:</span>
                      <span className="font-medium text-slate-700">
                        {screen.lastPingAt ? new Date(screen.lastPingAt).toLocaleTimeString('th-TH') : 'ยังไม่เคยเชื่อมต่อ'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="bg-slate-50/70 px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                  <Link 
                    href={`/tv/${screen.slug}`}
                    target="_blank"
                    className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    เปิดหน้าจอทีวี
                  </Link>
                  <Link 
                    href={`/admin/screens/${screen.id}`}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all shadow-2xs"
                  >
                    <Settings className="w-3.5 h-3.5 mr-1.5" />
                    ตั้งค่าจอ
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

