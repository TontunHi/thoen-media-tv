import { sqlite } from '@/lib/db'
import Link from 'next/link'
import { Monitor, ListMusic, ImageIcon, Plus, Upload, Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  // Query directly with sqlite for 100% fail-safe performance
  const screensCount = (sqlite.prepare('SELECT COUNT(*) as count FROM Screen').get() as any)?.count || 0
  const playlistsCount = (sqlite.prepare('SELECT COUNT(*) as count FROM Playlist').get() as any)?.count || 0
  const mediaCount = (sqlite.prepare('SELECT COUNT(*) as count FROM MediaItem').get() as any)?.count || 0
  
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
  const onlineScreensCount = (sqlite.prepare('SELECT COUNT(*) as count FROM Screen WHERE lastPingAt > ?').get(oneMinuteAgo) as any)?.count || 0

  const stats = [
    { label: 'จำนวนจอทีวีทั้งหมด', value: screensCount, icon: Monitor, color: 'bg-blue-500' },
    { label: 'จอทีวีที่ Online', value: onlineScreensCount, icon: Activity, color: 'bg-green-500' },
    { label: 'Playlist ทั้งหมด', value: playlistsCount, icon: ListMusic, color: 'bg-purple-500' },
    { label: 'สื่อทั้งหมด', value: mediaCount, icon: ImageIcon, color: 'bg-orange-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6 flex items-center">
            <div className={`p-4 rounded-lg ${stat.color} text-white mr-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-4">การจัดการด่วน (Quick Actions)</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link 
          href="/admin/screens"
          className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors border border-gray-100"
        >
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
            <Plus className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900">จัดการจอทีวี</h3>
          <p className="text-sm text-gray-500 mt-1">เพิ่ม/แก้ไขจอประชาสัมพันธ์</p>
        </Link>
        
        <Link 
          href="/admin/playlists/new"
          className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors border border-gray-100"
        >
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-3">
            <ListMusic className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900">สร้าง Playlist ใหม่</h3>
          <p className="text-sm text-gray-500 mt-1">จัดเรียงสื่อสำหรับแสดงผล</p>
        </Link>
        
        <Link 
          href="/admin/media"
          className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors border border-gray-100"
        >
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900">อัปโหลดสื่อ</h3>
          <p className="text-sm text-gray-500 mt-1">เพิ่มรูปภาพหรือวิดีโอใหม่</p>
        </Link>
      </div>
    </div>
  )
}
