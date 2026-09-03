import { sqlite } from '@/lib/db'
import Link from 'next/link'
import { Monitor, ListMusic, ImageIcon, Plus, Upload, Activity, ArrowUpRight, Sparkles, Tv, Layers } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  // Query directly with sqlite for 100% fail-safe performance
  const screensCount = (sqlite.prepare('SELECT COUNT(*) as count FROM Screen').get() as any)?.count || 0
  const playlistsCount = (sqlite.prepare('SELECT COUNT(*) as count FROM Playlist').get() as any)?.count || 0
  const mediaCount = (sqlite.prepare('SELECT COUNT(*) as count FROM MediaItem').get() as any)?.count || 0
  
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
  const onlineScreensCount = (sqlite.prepare('SELECT COUNT(*) as count FROM Screen WHERE lastPingAt > ?').get(oneMinuteAgo) as any)?.count || 0

  const stats = [
    { 
      label: 'จำนวนจอทีวีทั้งหมด', 
      value: screensCount, 
      icon: Monitor, 
      color: 'from-blue-600 to-indigo-600', 
      bg: 'bg-blue-50 text-blue-600 border-blue-100',
      desc: 'จอทีวีที่ลงทะเบียนไว้'
    },
    { 
      label: 'จอที่กำลัง Online', 
      value: onlineScreensCount, 
      icon: Activity, 
      color: 'from-emerald-500 to-teal-600', 
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      isLive: true,
      desc: 'เชื่อมต่อและกำลังเล่นสด'
    },
    { 
      label: 'Playlist ทั้งหมด', 
      value: playlistsCount, 
      icon: ListMusic, 
      color: 'from-purple-600 to-violet-600', 
      bg: 'bg-purple-50 text-purple-600 border-purple-100',
      desc: 'ชุดรายการสื่อ'
    },
    { 
      label: 'สื่อทั้งหมดในคลัง', 
      value: mediaCount, 
      icon: ImageIcon, 
      color: 'from-amber-500 to-orange-600', 
      bg: 'bg-amber-50 text-amber-600 border-amber-100',
      desc: 'รูปภาพและวิดีโอ'
    },
  ]

  // Recent Screens
  const recentScreens = (sqlite.prepare('SELECT id, name, slug, location, lastPingAt FROM Screen ORDER BY updatedAt DESC LIMIT 4').all() as any[]) || []

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-800 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-blue-100 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            ระบบจัดการป้ายประชาสัมพันธ์ดิจิทัล
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            ภาพรวมระบบ (Dashboard)
          </h1>
          <p className="text-blue-100 text-sm max-w-xl font-normal">
            ควบคุมหน้าจอทีวีแบบรวมศูนย์ จัดลำดับความสำคัญของ Playlist และกำหนดช่วงเวลาการแสดงผลได้แบบเรียลไทม์
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <Link
            href="/admin/screens/new"
            className="inline-flex items-center px-5 py-3 rounded-xl bg-white text-blue-700 font-bold text-sm shadow-md hover:bg-blue-50 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มจอทีวีใหม่
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs hover:shadow-md transition-all duration-200 relative group overflow-hidden"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3.5 rounded-2xl border ${stat.bg}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              {stat.isLive && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-ping"></span>
                  Live
                </span>
              )}
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
              <h3 className="text-sm font-semibold text-slate-700 mt-1">{stat.label}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{stat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions & Recent Screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">การจัดการด่วน (Quick Actions)</h2>
            <p className="text-xs text-slate-500">เข้าสู่ฟังก์ชันสำคัญได้ในคลิกเดียว</p>
          </div>

          <div className="space-y-3">
            <Link 
              href="/admin/screens"
              className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex items-center group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                <Tv className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">จัดการจอทีวี</h3>
                <p className="text-xs text-slate-500">ตั้งค่าชื่อ, ลำดับ Playlist และเวลา</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </Link>
            
            <Link 
              href="/admin/playlists"
              className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-xs hover:shadow-md hover:border-purple-200 transition-all flex items-center group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">จัดการ Playlist</h3>
                <p className="text-xs text-slate-500">จัดเรียงภาพและวิดีโอในรายการ</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </Link>
            
            <Link 
              href="/admin/media"
              className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-xs hover:shadow-md hover:border-amber-200 transition-all flex items-center group"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">อัปโหลดสื่อเข้าคลัง</h3>
                <p className="text-xs text-slate-500">เพิ่มรูปภาพ ป้ายประชาสัมพันธ์ หรือวิดีโอ</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </Link>
          </div>
        </div>

        {/* Recent Screens Summary */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">จอทีวีล่าสุด (Screens Status)</h2>
              <p className="text-xs text-slate-500">ตรวจสอบสถานะการเชื่อมต่อล่าสุดของจอ</p>
            </div>
            <Link href="/admin/screens" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
              ดูจอทั้งหมด ({screensCount}) &rarr;
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            {recentScreens.length === 0 ? (
              <div className="p-12 text-center">
                <Monitor className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-700">ยังไม่มีจอทีวีในระบบ</h3>
                <p className="text-xs text-slate-400 mt-1 mb-4">เริ่มต้นด้วยการเพิ่มจอทีวีตัวแรกของคุณ</p>
                <Link
                  href="/admin/screens/new"
                  className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  เพิ่มจอทีวีใหม่
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentScreens.map((s) => {
                  const isOnline = s.lastPingAt && new Date(s.lastPingAt).getTime() > Date.now() - 60000

                  return (
                    <div key={s.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isOnline ? 'bg-emerald-500 shadow-xs shadow-emerald-500' : 'bg-slate-300'}`} />
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{s.name}</h4>
                          <p className="text-xs text-slate-400">
                            {s.location || 'ไม่ได้ระบุสถานที่'} &bull; <span className="font-mono text-slate-500">/tv/{s.slug}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                        <Link
                          href={`/admin/screens/${s.id}`}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-white hover:border-slate-300 transition-colors"
                        >
                          ตั้งค่า
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

