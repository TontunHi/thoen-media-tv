import prisma from '@/lib/db'
import Link from 'next/link'
import { Plus, ListMusic, Monitor, ImageIcon, ArrowUpRight, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PlaylistsPage() {
  const playlists = await prisma.playlist.findMany({
    include: {
      _count: {
        select: { items: true, screens: true, schedules: true }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Playlist รายการสื่อ</h1>
          <p className="text-sm text-slate-500 mt-1">
            สร้างและจัดเรียงคิวสื่อภาพนิ่งและวิดีโอ เพื่อนำไปกำหนดให้แต่ละหน้าจอทีวี
          </p>
        </div>
        <Link 
          href="/admin/playlists/new"
          className="inline-flex items-center px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4 mr-2" />
          สร้าง Playlist ใหม่
        </Link>
      </div>

      {playlists.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4">
            <ListMusic className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">ยังไม่มี Playlist</h3>
          <p className="text-sm text-slate-400 mt-1 mb-6 max-w-sm mx-auto">
            สร้าง Playlist เพื่อรวบรวมรูปภาพและวิดีโอสำหรับนำไปตั้งเวลาและแสดงผลบนจอทีวี
          </p>
          <Link 
            href="/admin/playlists/new"
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            สร้าง Playlist ใหม่
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((playlist) => {
            const totalAssignedScreens = (playlist._count.screens || 0) + (playlist._count.schedules || 0)

            return (
              <Link 
                key={playlist.id} 
                href={`/admin/playlists/${playlist.id}`}
                className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md hover:border-purple-200 transition-all duration-200 group block p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <ListMusic className="w-6 h-6" />
                    </div>
                    {playlist.isDefault && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Default
                      </span>
                    )}
                    <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                    {playlist.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px]">
                    {playlist.description || 'ไม่มีคำอธิบาย'}
                  </p>
                </div>
                
                <div className="flex items-center text-xs text-slate-500 space-x-4 border-t border-slate-100 pt-4 mt-4">
                  <div className="flex items-center">
                    <ImageIcon className="w-4 h-4 mr-1.5 text-slate-400" />
                    <span className="font-semibold text-slate-700">{playlist._count.items}</span>
                    <span className="ml-1 text-slate-400">สื่อ</span>
                  </div>
                  <div className="flex items-center">
                    <Monitor className="w-4 h-4 mr-1.5 text-slate-400" />
                    <span className="font-semibold text-slate-700">{totalAssignedScreens}</span>
                    <span className="ml-1 text-slate-400">การใช้งานบนจอ</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

