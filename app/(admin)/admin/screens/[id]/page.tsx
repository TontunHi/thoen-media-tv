'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2, Copy, Check, ExternalLink, Loader2 } from 'lucide-react'

export default function EditScreenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [screen, setScreen] = useState<any>(null)
  const [playlists, setPlaylists] = useState<any[]>([])
  const [copied, setCopied] = useState(false)

  const isNew = id === 'new'

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      // Fetch playlists for the dropdown
      const pRes = await fetch('/api/playlists')
      if (pRes.ok) setPlaylists(await pRes.json())

      if (isNew) {
        setScreen({
          name: '',
          slug: '',
          location: '',
          description: '',
          playlistId: '',
          loop: true
        })
        setLoading(false)
        return
      }

      // Fetch screen data
      const sRes = await fetch(`/api/screens/${id}`)
      if (sRes.ok) {
        setScreen(await sRes.json())
      } else {
        router.push('/admin/screens')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const url = isNew ? '/api/screens' : `/api/screens/${id}`
      const method = isNew ? 'POST' : 'PUT'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(screen)
      })
      
      if (res.ok) {
        alert('บันทึกสำเร็จ')
        if (isNew) {
          const data = await res.json()
          router.push(`/admin/screens/${data.id}`)
        } else {
          router.refresh()
        }
      } else {
        const error = await res.json()
        throw new Error(error.message || 'บันทึกไม่สำเร็จ')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('คุณต้องการลบจอทีวีนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) return
    
    try {
      const res = await fetch(`/api/screens/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/admin/screens')
        router.refresh()
      } else {
        throw new Error('ไม่สามารถลบได้')
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const copyUrl = () => {
    const url = `${window.location.origin}/tv/${screen.slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  if (!screen) return null

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href="/admin/screens" className="mr-4 p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{isNew ? 'เพิ่มจอทีวีใหม่' : 'ตั้งค่าจอทีวี'}</h1>
        </div>
        
        {!isNew && (
          <button
            onClick={handleDelete}
            className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            ลบจอทีวี
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อจอทีวี (Name) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={screen.name}
                onChange={(e) => setScreen({ ...screen, name: e.target.value })}
                placeholder="เช่น จอหน้าห้องฉุกเฉิน, จอโถงรับรอง"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug (URL ประจำจอ) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={screen.slug}
                onChange={(e) => setScreen({ ...screen, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                placeholder="เช่น er-screen-1"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">ใช้ตัวอักษรภาษาอังกฤษ ตัวเลข และขีดกลาง (-) เท่านั้น</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สถานที่ตั้ง (Location)</label>
            <input
              type="text"
              value={screen.location || ''}
              onChange={(e) => setScreen({ ...screen, location: e.target.value })}
              placeholder="ระบุสถานที่ติดตั้งจอให้ชัดเจน"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบายเพิ่มเติม</label>
            <textarea
              value={screen.description || ''}
              onChange={(e) => setScreen({ ...screen, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">การแสดงผล</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">กำหนด Playlist</label>
                <select
                  value={screen.playlistId || ''}
                  onChange={(e) => setScreen({ ...screen, playlistId: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">-- ไม่เลือก (แสดงหน้าจอ Standby) --</option>
                  {playlists.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  id="loop"
                  type="checkbox"
                  checked={screen.loop ?? true}
                  onChange={(e) => setScreen({ ...screen, loop: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isLooping" className="ml-2 block text-sm text-gray-900">
                  เล่นวนซ้ำอัตโนมัติ (Loop)
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
              บันทึกการตั้งค่า
            </button>
          </div>
        </form>

        {!isNew && (
          <div className="bg-gray-50 p-6 border-t border-gray-200">
            <h3 className="text-sm font-bold text-gray-900 mb-3">ลิงก์สำหรับเปิดบนทีวี</h3>
            <div className="flex items-center">
              <div className="flex-1 bg-white border border-gray-300 rounded-l-lg px-4 py-2 text-sm text-gray-600 font-mono overflow-x-auto whitespace-nowrap">
                {typeof window !== 'undefined' ? `${window.location.origin}/tv/${screen.slug}` : `/tv/${screen.slug}`}
              </div>
              <button
                onClick={copyUrl}
                className="flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 border-y border-r border-gray-300 font-medium transition-colors"
                title="คัดลอกลิงก์"
              >
                {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
              </button>
              <Link
                href={`/tv/${screen.slug}`}
                target="_blank"
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-lg font-medium transition-colors"
                title="เปิดดู"
              >
                <ExternalLink className="w-5 h-5" />
              </Link>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              นำลิงก์นี้ไปเปิดในเว็บเบราว์เซอร์ของ Smart TV หรือ Android Box แล้วกด F11 เพื่อแสดงเต็มจอ
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
