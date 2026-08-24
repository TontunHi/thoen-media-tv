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
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href="/admin/playlists" className="mr-4 p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">แก้ไข Playlist</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
          บันทึกการเปลี่ยนแปลง
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Playlist Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">ข้อมูลทั่วไป</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ Playlist</label>
                <input
                  type="text"
                  value={playlist.name}
                  onChange={(e) => setPlaylist({ ...playlist, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
                <textarea
                  value={playlist.description || ''}
                  onChange={(e) => setPlaylist({ ...playlist, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Playlist Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">รายการสื่อ ({playlist.items?.length || 0} รายการ)</h2>
              <button
                onClick={() => {
                  setShowMediaModal(true)
                  fetchMediaLibrary()
                }}
                className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                เพิ่มสื่อ
              </button>
            </div>

            {(!playlist.items || playlist.items.length === 0) ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">ยังไม่มีสื่อใน Playlist นี้</p>
                <button
                  onClick={() => {
                    setShowMediaModal(true)
                    fetchMediaLibrary()
                  }}
                  className="mt-3 text-blue-600 font-medium hover:underline text-sm"
                >
                  คลิกเพื่อเพิ่มสื่อ
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
                    <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 group">
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => moveItem(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button 
                          onClick={() => moveItem(index, 'down')}
                          disabled={index === playlist.items.length - 1}
                          className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </div>
                      
                      <div className="w-20 h-14 bg-gray-900 rounded overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                        {isImage ? (
                          <img src={thumbUrl || mediaUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full relative flex items-center justify-center">
                            {mediaUrl && <video src={mediaUrl} className="w-full h-full object-cover opacity-60" muted preload="metadata" />}
                            <FileVideo className="w-5 h-5 text-purple-400 absolute" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{media.title || 'ไม่มีชื่อ'}</p>
                        <p className="text-xs text-gray-500 uppercase">{media.type || 'IMAGE'}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        {isImage ? (
                          <>
                            <div className="flex items-center">
                              <label className="text-xs text-gray-500 mr-2">ระยะเวลา (วินาที)</label>
                              <input
                                type="number"
                                min={1}
                                value={item.customDuration ?? media.defaultDuration ?? 15}
                                onChange={(e) => updateItemDuration(index, parseInt(e.target.value) || 0)}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex gap-1">
                              {[5, 10, 15, 30].map(s => (
                                <button
                                  key={s}
                                  onClick={() => updateItemDuration(index, s)}
                                  className="px-1.5 py-0.5 text-[10px] bg-gray-200 hover:bg-gray-300 rounded text-gray-700 font-medium"
                                >
                                  {s}s
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center px-3 py-1 bg-purple-50 border border-purple-200 rounded-lg">
                            <span className="text-xs font-semibold text-purple-700">🎬 เล่นตามความยาววิดีโอจนจบ</span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                        title="ลบ"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
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
