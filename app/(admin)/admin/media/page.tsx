'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Upload, 
  Trash2, 
  FileVideo, 
  Image as ImageIcon, 
  Loader2, 
  FolderPlus, 
  Folder, 
  FolderOpen,
  MoreVertical,
  Edit2,
  MoveRight,
  Sparkles,
  Layers
} from 'lucide-react'

interface FolderType {
  id: string
  name: string
  color: string
  _count?: {
    items: number
  }
}

interface Media {
  id: string
  title: string
  filename: string
  url: string
  thumbnailUrl: string | null
  type: 'IMAGE' | 'VIDEO'
  size: number
  folderId: string | null
  folder?: FolderType | null
  createdAt: string
}

export default function MediaPage() {
  const [mediaList, setMediaList] = useState<Media[]>([])
  const [folders, setFolders] = useState<FolderType[]>([])
  const [activeFolder, setActiveFolder] = useState<string>('all') // 'all', 'none', or folderId
  const [totalMediaCount, setTotalMediaCount] = useState(0)
  const [uncategorizedCount, setUncategorizedCount] = useState(0)
  
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  // Folder modals & state
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  
  // Move item to folder state
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [targetFolderId, setTargetFolderId] = useState<string>('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [mediaRes, foldersRes] = await Promise.all([
        fetch(`/api/media?folderId=${activeFolder}`),
        fetch('/api/media/folders')
      ])

      if (mediaRes.ok) {
        const mediaData = await mediaRes.json()
        setMediaList(mediaData)
      }

      if (foldersRes.ok) {
        const folderData = await foldersRes.json()
        setFolders(folderData.folders || [])
        setTotalMediaCount(folderData.totalMediaCount || 0)
        setUncategorizedCount(folderData.uncategorizedCount || 0)
      }
    } catch (err) {
      console.error('Failed to fetch media library data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeFolder])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('file', files[i])
    }
    
    // Assign to active folder if currently viewing a specific folder
    if (activeFolder !== 'all' && activeFolder !== 'none') {
      formData.append('folderId', activeFolder)
    }

    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        await fetchData()
      } else {
        alert('อัปโหลดไม่สำเร็จ')
      }
    } catch (err) {
      console.error('Upload failed', err)
      alert('เกิดข้อผิดพลาดในการอัปโหลด')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('คุณต้องการลบสื่อนี้ใช่หรือไม่?')) return
    
    try {
      const res = await fetch(`/api/media?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMediaList(prev => prev.filter(m => m.id !== id))
        fetchData()
      }
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return

    setCreatingFolder(true)
    try {
      const res = await fetch('/api/media/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() })
      })

      if (res.ok) {
        setNewFolderName('')
        setShowNewFolderModal(false)
        await fetchData()
      } else {
        alert('สร้างโฟลเดอร์ไม่สำเร็จ')
      }
    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาด')
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleDeleteFolder = async (folderId: string, folderName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`คุณต้องการลบโฟลเดอร์ "${folderName}" ใช่หรือไม่?\n⚠️ คำเตือน: ไฟล์สื่อและวิดีโอทั้งหมดที่อยู่ในโฟลเดอร์นี้จะถูกลบออกจากระบบด้วยอย่างถาวร`)) return

    try {
      const res = await fetch(`/api/media/folders?id=${folderId}`, { method: 'DELETE' })
      if (res.ok) {
        if (activeFolder === folderId) {
          setActiveFolder('all')
        } else {
          fetchData()
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleMoveMedia = async () => {
    if (!selectedMedia) return

    try {
      const res = await fetch('/api/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedMedia.id,
          folderId: targetFolderId === 'none' ? null : targetFolderId
        })
      })

      if (res.ok) {
        setShowMoveModal(false)
        setSelectedMedia(null)
        await fetchData()
      }
    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาดในการย้ายโฟลเดอร์')
    }
  }

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-7 h-7 text-blue-600" />
            คลังสื่อ (Media Library)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            จัดการรูปภาพ วิดีโอประชาสัมพันธ์ และจัดหมวดหมู่โฟลเดอร์
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors shadow-xs"
          >
            <FolderPlus className="w-5 h-5 mr-2 text-blue-600" />
            สร้างโฟลเดอร์
          </button>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            className="hidden" 
            accept="image/*,video/*"
            multiple 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 shadow-xs"
          >
            {uploading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Upload className="w-5 h-5 mr-2" />}
            {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดสื่อใหม่'}
          </button>
        </div>
      </div>

      {/* Folders Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
          โฟลเดอร์และหมวดหมู่
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* All Media */}
          <button
            onClick={() => setActiveFolder('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFolder === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            ทั้งหมด ({totalMediaCount})
          </button>

          {/* User Folders */}
          {folders.map(folder => (
            <div
              key={folder.id}
              onClick={() => setActiveFolder(folder.id)}
              className={`group flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                activeFolder === folder.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Folder className="w-4 h-4 text-amber-500" />
              <span>{folder.name} ({folder._count?.items || 0})</span>
              <button
                onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)}
                className={`opacity-0 group-hover:opacity-100 hover:text-red-500 p-0.5 rounded transition-opacity ${
                  activeFolder === folder.id ? 'text-white/80 hover:text-white' : 'text-gray-400'
                }`}
                title="ลบโฟลเดอร์"
              >
                ✕
              </button>
            </div>
          ))}

          {/* Uncategorized */}
          <button
            onClick={() => setActiveFolder('none')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFolder === 'none'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Folder className="w-4 h-4 text-gray-400" />
            ยังไม่ได้จัดหมวดหมู่ ({uncategorizedCount})
          </button>
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : mediaList.length === 0 ? (
        <div className="bg-white rounded-xl shadow-xs p-16 text-center text-gray-500 border border-gray-200">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-bold text-gray-700">ไม่มีสื่อในโฟลเดอร์นี้</p>
          <p className="text-sm mt-1 text-gray-500">คลิกปุ่ม "อัปโหลดสื่อใหม่" เพื่อเพิ่มรูปภาพหรือวิดีโอเข้าโฟลเดอร์นี้</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {mediaList.map((media) => (
            <div key={media.id} className="bg-white rounded-xl shadow-xs overflow-hidden border border-gray-200 hover:shadow-md transition-shadow group flex flex-col">
              {/* Media Thumbnail Container */}
              <div className="aspect-video bg-gray-900 relative flex items-center justify-center overflow-hidden">
                {media.type === 'IMAGE' ? (
                  <img 
                    src={media.thumbnailUrl || media.url} 
                    alt={media.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full relative flex items-center justify-center bg-gray-950">
                    <video 
                      src={media.url}
                      className="w-full h-full object-cover opacity-80"
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-10 h-10 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg">
                        <FileVideo className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Hover Actions Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button 
                    onClick={() => {
                      setSelectedMedia(media)
                      setTargetFolderId(media.folderId || 'none')
                      setShowMoveModal(true)
                    }}
                    className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-md"
                    title="ย้ายโฟลเดอร์"
                  >
                    <MoveRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(media.id)}
                    className="p-2.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-md"
                    title="ลบสื่อ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Type & Folder Badges */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider shadow-xs ${
                    media.type === 'VIDEO' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    {media.type}
                  </span>
                </div>

                {media.folder && (
                  <div className="absolute bottom-2 left-2">
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-black/70 text-white rounded backdrop-blur-xs flex items-center gap-1">
                      <Folder className="w-3 h-3 text-amber-400" />
                      {media.folder.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Title & Details */}
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <p className="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug" title={media.title}>
                  {media.title}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-2.5 pt-2 border-t border-gray-100">
                  <span>{formatSize(media.size)}</span>
                  <span>{new Date(media.createdAt).toLocaleDateString('th-TH')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-blue-600" />
              สร้างโฟลเดอร์ใหม่
            </h2>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อโฟลเดอร์ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="เช่น ประชาสัมพันธ์ทั่วไป, คลินิกทันตกรรม, ตารางแพทย์"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder || !newFolderName.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm disabled:opacity-50 flex items-center"
                >
                  {creatingFolder && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                  สร้างโฟลเดอร์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Media to Folder Modal */}
      {showMoveModal && selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <MoveRight className="w-5 h-5 text-blue-600" />
              ย้ายสื่อไปยังโฟลเดอร์
            </h2>
            <p className="text-sm text-gray-500 mb-4 truncate">
              ไฟล์: <span className="font-medium text-gray-800">{selectedMedia.title}</span>
            </p>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">เลือกโฟลเดอร์ปลายทาง</label>
              <select
                value={targetFolderId}
                onChange={(e) => setTargetFolderId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="none">-- ยังไม่ได้จัดหมวดหมู่ (Root) --</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowMoveModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleMoveMedia}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm"
              >
                บันทึกการย้าย
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
