'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Monitor, Settings, ExternalLink, Loader2 } from 'lucide-react'

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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">จัดการจอทีวี</h1>
        <Link 
          href="/admin/screens/new"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          เพิ่มจอทีวีใหม่
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : screens.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
          <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">ยังไม่มีจอทีวีในระบบ</p>
          <p className="text-sm mt-1">คลิกปุ่ม "เพิ่มจอทีวีใหม่" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {screens.map((screen) => {
            const online = isOnline(screen.lastPingAt)
            
            return (
              <div key={screen.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <Monitor className={`w-8 h-8 mr-3 ${online ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{screen.name}</h3>
                        <div className="flex items-center mt-1">
                          <span className={`w-2 h-2 rounded-full mr-2 ${online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                          <span className={`text-xs font-semibold ${online ? 'text-green-600' : 'text-gray-500'}`}>
                            {online ? 'กำลังออนไลน์' : 'ออฟไลน์'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-start text-sm">
                      <span className="text-gray-500 w-24">สถานที่:</span>
                      <span className="text-gray-900 font-medium">{screen.location || '-'}</span>
                    </div>
                    <div className="flex items-start text-sm">
                      <span className="text-gray-500 w-24">Playlist:</span>
                      <span className="text-gray-900 font-medium">
                        {screen.playlist ? (
                          <Link href={`/admin/playlists/${screen.playlist.id}`} className="text-blue-600 hover:underline">
                            {screen.playlist.name}
                          </Link>
                        ) : (
                          <span className="text-orange-500">ยังไม่กำหนด</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-start text-sm">
                      <span className="text-gray-500 w-24">ใช้งานล่าสุด:</span>
                      <span className="text-gray-900 font-medium text-xs mt-0.5">
                        {screen.lastPingAt ? new Date(screen.lastPingAt).toLocaleString('th-TH') : 'ไม่เคยใช้งาน'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center">
                  <Link 
                    href={`/tv/${screen.slug}`}
                    target="_blank"
                    className="flex items-center text-sm text-blue-600 font-medium hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    ดูหน้าจอ
                  </Link>
                  <Link 
                    href={`/admin/screens/${screen.id}`}
                    className="flex items-center text-sm text-gray-600 font-medium hover:text-gray-900"
                  >
                    <Settings className="w-4 h-4 mr-1.5" />
                    ตั้งค่า
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
