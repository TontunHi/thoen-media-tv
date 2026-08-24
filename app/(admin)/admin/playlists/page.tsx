import prisma from '@/lib/db'
import Link from 'next/link'
import { Plus, ListMusic, Monitor } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PlaylistsPage() {
  const playlists = await prisma.playlist.findMany({
    include: {
      _count: {
        select: { items: true, screens: true }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">จัดการ Playlist</h1>
        <Link 
          href="/admin/playlists/new"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          สร้าง Playlist ใหม่
        </Link>
      </div>

      {playlists.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
          <ListMusic className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">ยังไม่มี Playlist</p>
          <p className="text-sm mt-1">คลิกปุ่ม "สร้าง Playlist ใหม่" เพื่อเริ่มต้นจัดเรียงสื่อ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((playlist) => (
            <Link 
              key={playlist.id} 
              href={`/admin/playlists/${playlist.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all group block p-5"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <ListMusic className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{playlist.name}</h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{playlist.description || 'ไม่มีคำอธิบาย'}</p>
              
              <div className="flex items-center text-sm text-gray-500 space-x-4 border-t border-gray-100 pt-4">
                <div className="flex items-center">
                  <ImageIcon className="w-4 h-4 mr-1.5" />
                  <span>{playlist._count.items} สื่อ</span>
                </div>
                <div className="flex items-center">
                  <Monitor className="w-4 h-4 mr-1.5" />
                  <span>{playlist._count.screens} จอทีวี</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function ImageIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  )
}
