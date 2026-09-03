'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Plus, Trash2, GripVertical, Loader2, Image as ImageIcon, FileVideo } from 'lucide-react'

export default function EditPlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [playlist, setPlaylist] = useState<any>(null)
  
  // States for Media Modal
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [mediaLibrary, setMediaLibrary] = useState<any[]>([])
  const [modalFolders, setModalFolders] = useState<any[]>([])
  const [activeModalFolder, setActiveModalFolder] = useState<string>('all')
  const [loadingMedia, setLoadingMedia] = useState(false)

  useEffect(() => {
    fetchPlaylist()
  }, [id])

  const fetchPlaylist = async () => {
    try {
      const res = await fetch(`/api/playlists/${id}`)
      if (res.ok) {
        const data = await res.json()
        setPlaylist(data)
      } else {
        router.push('/admin/playlists')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMediaLibrary = async (folderId = activeModalFolder) => {
    setLoadingMedia(true)
    try {
      const [mediaRes, foldersRes] = await Promise.all([
        fetch(`/api/media?folderId=${folderId}`),
        fetch('/api/media/folders')
      ])
      if (mediaRes.ok) {
        setMediaLibrary(await mediaRes.json())
      }
      if (foldersRes.ok) {
        const folderData = await foldersRes.json()
        setModalFolders(folderData.folders || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMedia(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/playlists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playlist)
      })
      if (res.ok) {
        alert('บันทึกสำเร็จ')
        router.refresh()
      } else {
        throw new Error('บันทึกไม่สำเร็จ')
      }
    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSaving(false)
    }
  }

  const addMediaToPlaylist = (media: any) => {
    const newItem = {
      id: `temp-${Date.now()}`,
      mediaItemId: media.id,
      mediaItem: media,
      media,
      customDuration: media.type === 'VIDEO' || media.type === 'video' ? null : 15,
      order: playlist.items ? playlist.items.length : 0
    }
    
    setPlaylist({
      ...playlist,
      items: [...(playlist.items || []), newItem]
    })
    
    setShowMediaModal(false)
  }

  const removeItem = (index: number) => {
    const newItems = [...playlist.items]
    newItems.splice(index, 1)
    setPlaylist({ ...playlist, items: newItems })
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === playlist.items.length - 1)
    ) return

    const newItems = [...playlist.items]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    
    const temp = newItems[index]
    newItems[index] = newItems[swapIndex]
    newItems[swapIndex] = temp
    
    setPlaylist({ ...playlist, items: newItems })
  }

  const updateItemDuration = (index: number, duration: number) => {
    const newItems = [...playlist.items]
    newItems[index].customDuration = duration
    setPlaylist({ ...playlist, items: newItems })
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  if (!playlist) return null

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/playlists" 
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 rounded-xl border border-slate-200/80 transition-all shadow-2xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">แก้ไข Playlist</h1>
            <p className="text-xs text-slate-500 mt-0.5">จัดเรียงและกำหนดระยะเวลาแสดงผลของสื่อในรายการนี้</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          บันทึกการเปลี่ยนแปลง
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Playlist Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl shadow-xs p-6 border border-slate-100 space-y-4">
            <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              ข้อมูล Playlist
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อ Playlist</label>
                <input
                  type="text"
                  value={playlist.name}
                  onChange={(e) => setPlaylist({ ...playlist, name: e.target.value })}
                  placeholder="เช่น ประชาสัมพันธ์ทั่วไป 2026"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all outline-hidden font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">คำอธิบาย</label>
                <textarea
                  value={playlist.description || ''}
                  onChange={(e) => setPlaylist({ ...playlist, description: e.target.value })}
                  rows={3}
                  placeholder="รายละเอียดเนื้อหาในเพลย์ลิสต์นี้..."
                  className="w-full px-4 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all outline-hidden resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Playlist Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-xs p-6 sm:p-8 border border-slate-100 h-full space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  รายการสื่อ ({playlist.items?.length || 0} รายการ)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">เรียงจากบนลงล่าง และวนลูปตามลำดับ</p>
              </div>
              <button
                onClick={() => {
                  setShowMediaModal(true)
                  fetchMediaLibrary()
                }}
                className="inline-flex items-center px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-all border border-purple-200/80 shadow-2xs"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                เพิ่มสื่อเข้าคิว
              </button>
            </div>

            {(!playlist.items || playlist.items.length === 0) ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <ImageIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-600">ยังไม่มีสื่อใน Playlist นี้</p>
                <p className="text-xs text-slate-400 mt-0.5">กดปุ่มด้านล่างเพื่อเลือกรูปภาพหรือวิดีโอจากคลังสื่อ</p>
                <button
                  onClick={() => {
                    setShowMediaModal(true)
                    fetchMediaLibrary()
                  }}
                  className="mt-3 inline-flex items-center text-xs font-bold text-purple-600 hover:text-purple-800 bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  เลือกสื่อเพิ่ม
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {playlist.items.map((item: any, index: number) => {
                  const media = item.mediaItem || item.media || {}
                  const mediaUrl = media.url || (media.filename ? `/api/media/${media.filename}` : '')
                  const thumbUrl = media.thumbnailUrl || (media.thumbnailPath ? `/api/media/${media.thumbnailPath}` : mediaUrl)
                  const isImage = media.type === 'IMAGE' || media.type === 'image'

                  return (
                    <div 
                      key={item.id} 
                      className="flex flex-col sm:flex-row sm:items-center gap-4 p-3.5 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-sm transition-all group"
                    >
                      {/* Priority indicator & reorder arrows */}
                      <div className="flex items-center gap-2 sm:flex-col sm:gap-1">
                        <button 
                          onClick={() => moveItem(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-purple-600 hover:bg-white rounded-md disabled:opacity-20 transition-colors"
                          title="เลื่อนขึ้น"
                        >
                          ▲
                        </button>
                        <span className="text-[10px] font-black text-slate-400">#{index + 1}</span>
                        <button 
                          onClick={() => moveItem(index, 'down')}
                          disabled={index === playlist.items.length - 1}
                          className="p-1 text-slate-400 hover:text-purple-600 hover:bg-white rounded-md disabled:opacity-20 transition-colors"
                          title="เลื่อนลง"
                        >
                          ▼
                        </button>
                      </div>
                      
                      {/* Thumbnail */}
                      <div className="w-24 h-16 bg-slate-950 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-2xs">
                        {isImage ? (
                          <img src={thumbUrl || mediaUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full relative flex items-center justify-center">
                            {mediaUrl && <video src={mediaUrl} className="w-full h-full object-cover opacity-60" muted preload="metadata" />}
                            <FileVideo className="w-5 h-5 text-purple-400 absolute" />
                          </div>
                        )}
                      </div>
                      
                      {/* Title & Type */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{media.title || 'ไม่มีชื่อ'}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black mt-1 uppercase ${
                          isImage ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {media.type || 'IMAGE'}
                        </span>
                      </div>
                      
                      {/* Duration Controls */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                        {isImage ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
                              <span className="text-[11px] text-slate-400 mr-1.5">เวลา:</span>
                              <input
                                type="number"
                                min={1}
                                value={item.customDuration ?? media.defaultDuration ?? 15}
                                onChange={(e) => updateItemDuration(index, parseInt(e.target.value) || 0)}
                                className="w-10 text-xs font-bold text-slate-800 text-center outline-hidden"
                              />
                              <span className="text-[11px] text-slate-400 ml-0.5">วินาที</span>
                            </div>
                            <div className="hidden md:flex gap-1">
                              {[5, 10, 15, 30].map(s => (
                                <button
                                  key={s}
                                  onClick={() => updateItemDuration(index, s)}
                                  className="px-2 py-1 text-[10px] bg-slate-200/80 hover:bg-purple-600 hover:text-white rounded-md text-slate-700 font-bold transition-colors"
                                >
                                  {s}s
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center px-3 py-1 bg-purple-50 border border-purple-200 rounded-xl">
                            <span className="text-[11px] font-bold text-purple-700">🎬 ตามความยาววิดีโอ</span>
                          </div>
                        )}
                        
                        <button
                          onClick={() => removeItem(index)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="นำออกจากคิว"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media Selection Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">เลือกสื่อเพื่อเพิ่มใน Playlist</h2>
              <button onClick={() => setShowMediaModal(false)} className="text-gray-500 hover:text-gray-900 p-1">
                ✕
              </button>
            </div>

            {/* Folder selection in modal */}
            <div className="px-4 py-3 bg-white border-b border-gray-100 flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => {
                  setActiveModalFolder('all')
                  fetchMediaLibrary('all')
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeModalFolder === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ทั้งหมด
              </button>
              {modalFolders.map(folder => (
                <button
                  type="button"
                  key={folder.id}
                  onClick={() => {
                    setActiveModalFolder(folder.id)
                    fetchMediaLibrary(folder.id)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    activeModalFolder === folder.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>📁 {folder.name}</span>
                  <span className="text-[10px] opacity-75">({folder._count?.items || 0})</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setActiveModalFolder('none')
                  fetchMediaLibrary('none')
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeModalFolder === 'none'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ยังไม่จัดหมวดหมู่
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              {loadingMedia ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
              ) : mediaLibrary.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>ไม่มีสื่อในคลัง กรุณาอัปโหลดสื่อก่อน</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {mediaLibrary.map(media => (
                    <button
                      key={media.id}
                      onClick={() => addMediaToPlaylist(media)}
                      className="group text-left border border-gray-200 rounded-lg overflow-hidden hover:border-blue-500 hover:ring-2 hover:ring-blue-200 transition-all focus:outline-none"
                    >
                      <div className="aspect-video bg-gray-950 flex items-center justify-center relative overflow-hidden">
                        {media.type === 'IMAGE' || media.type === 'image' ? (
                          <img src={media.thumbnailUrl || media.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full relative flex items-center justify-center">
                            <video src={media.url} className="w-full h-full object-cover opacity-60" muted preload="metadata" />
                            <FileVideo className="w-6 h-6 text-purple-400 absolute" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors" />
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium truncate" title={media.title}>{media.title}</p>
                        <p className="text-[10px] text-gray-500 uppercase">{media.type}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button 
                onClick={() => setShowMediaModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
