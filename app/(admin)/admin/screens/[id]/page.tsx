'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2, Copy, Check, ExternalLink, Loader2, Plus, ArrowUp, ArrowDown, Layers, Calendar, Clock } from 'lucide-react'

export interface ScreenScheduleItem {
  id?: string
  playlistId: string
  priority: number
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  isActive: boolean
  playlist?: any
}

export default function EditScreenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [screen, setScreen] = useState<any>(null)
  const [playlists, setPlaylists] = useState<any[]>([])
  const [schedules, setSchedules] = useState<ScreenScheduleItem[]>([])
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
        setSchedules([])
        setLoading(false)
        return
      }

      // Fetch screen data
      const sRes = await fetch(`/api/screens/${id}`)
      if (sRes.ok) {
        const sData = await sRes.json()
        setScreen(sData)
      } else {
        router.push('/admin/screens')
        return
      }

      // Fetch screen schedules
      const schedRes = await fetch(`/api/screens/${id}/schedules`)
      if (schedRes.ok) {
        const schedData = await schedRes.json()
        setSchedules(
          schedData.map((s: any) => ({
            id: s.id,
            playlistId: s.playlistId,
            priority: s.priority,
            startDate: s.startDate ? new Date(s.startDate).toISOString().slice(0, 16) : '',
            endDate: s.endDate ? new Date(s.endDate).toISOString().slice(0, 16) : '',
            startTime: s.startTime || '',
            endTime: s.endTime || '',
            isActive: s.isActive !== undefined ? s.isActive : true,
            playlist: s.playlist
          }))
        )
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSchedule = () => {
    if (playlists.length === 0) {
      alert('กรุณาสร้าง Playlist ก่อนเพิ่ม Layer')
      return
    }
    const newPriority = schedules.length + 1
    setSchedules([
      ...schedules,
      {
        playlistId: playlists[0].id,
        priority: newPriority,
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        isActive: true
      }
    ])
  }

  const handleRemoveSchedule = (index: number) => {
    const updated = schedules.filter((_, idx) => idx !== index).map((item, idx) => ({
      ...item,
      priority: idx + 1
    }))
    setSchedules(updated)
  }

  const handleMoveSchedule = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= schedules.length) return

    const newSchedules = [...schedules]
    const temp = newSchedules[index]
    newSchedules[index] = newSchedules[targetIndex]
    newSchedules[targetIndex] = temp

    // Re-index priorities 1..N
    const reindexed = newSchedules.map((item, idx) => ({
      ...item,
      priority: idx + 1
    }))
    setSchedules(reindexed)
  }

  const handleScheduleChange = (index: number, field: keyof ScreenScheduleItem, value: any) => {
    const updated = [...schedules]
    updated[index] = { ...updated[index], [field]: value }
    setSchedules(updated)
  }

  const isScheduleActiveNowClient = (sched: ScreenScheduleItem) => {
    if (!sched.isActive) return false
    const now = new Date()
    if (sched.startDate && new Date(sched.startDate) > now) return false
    if (sched.endDate && new Date(sched.endDate) < now) return false
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    if (sched.startTime && currentTime < sched.startTime) return false
    if (sched.endTime && currentTime > sched.endTime) return false
    return true
  }

  // Find currently active priority
  const activeNowIndex = schedules.findIndex(isScheduleActiveNowClient)

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
        const savedScreen = await res.json()
        const targetScreenId = isNew ? savedScreen.id : id

        // Save schedules
        const schedRes = await fetch(`/api/screens/${targetScreenId}/schedules`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schedules })
        })

        if (!schedRes.ok) {
          throw new Error('บันทึกหน้าจอสำเร็จ แต่บันทึก Playlist Layers ไม่สำเร็จ')
        }

        alert('บันทึกสำเร็จ')
        if (isNew) {
          router.push(`/admin/screens/${savedScreen.id}`)
        } else {
          router.refresh()
          fetchData()
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
    <div className="max-w-4xl mx-auto pb-20">
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

          {/* Multi-Playlist Layers & Schedule */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  Playlist Layers & Schedule (ลำดับความสำคัญ)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  ระบบจะเล่น Playlist <b>ลำดับบนสุด (Priority 1)</b> ที่ถึงเวลาและ Active อยู่ ณ ปัจจุบัน หากยังไม่ถึงเวลาจะเล่นลำดับถัดไปลงมาอัตโนมัติ (เล่นทีละ 1 Playlist)
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddSchedule}
                className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors border border-blue-200"
              >
                <Plus className="w-4 h-4 mr-1" />
                เพิ่ม Layer
              </button>
            </div>

            {schedules.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <p className="text-sm text-gray-500">ยังไม่มี Playlist Layers ที่กำหนด (จะใช้ Default Playlist ด้านล่างแทน)</p>
                <button
                  type="button"
                  onClick={handleAddSchedule}
                  className="mt-2 text-sm text-blue-600 hover:underline font-medium"
                >
                  + เพิ่ม Playlist Layer แรก
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((sched, idx) => {
                  const isPlayingNow = activeNowIndex === idx

                  return (
                    <div
                      key={sched.id || idx}
                      className={`p-4 rounded-xl border transition-all ${
                        isPlayingNow
                          ? 'border-green-500 bg-green-50/40 shadow-sm'
                          : 'border-gray-200 bg-gray-50/70'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-200/80">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold shadow-sm">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-gray-800 text-sm">
                            Priority #{idx + 1}
                          </span>
                          {isPlayingNow && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                              <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                              Active (กำลังเล่นบนจอ)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveSchedule(idx, 'up')}
                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-white rounded disabled:opacity-30"
                            title="เลื่อนความสำคัญขึ้น (Priority สูงขึ้น)"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === schedules.length - 1}
                            onClick={() => handleMoveSchedule(idx, 'down')}
                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-white rounded disabled:opacity-30"
                            title="เลื่อนความสำคัญลง"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSchedule(idx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded ml-2"
                            title="ลบ Layer นี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
                        <div className="md:col-span-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">เลือก Playlist</label>
                          <select
                            value={sched.playlistId}
                            onChange={(e) => handleScheduleChange(idx, 'playlistId', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500"
                          >
                            {playlists.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-500" />
                            วันเวลาเริ่มต้น (Start)
                          </label>
                          <input
                            type="datetime-local"
                            value={sched.startDate}
                            onChange={(e) => handleScheduleChange(idx, 'startDate', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-[10px] text-gray-400 mt-0.5">เว้นว่างไว้ = เริ่มทันที</p>
                        </div>

                        <div className="md:col-span-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-500" />
                            วันเวลาสิ้นสุด (End)
                          </label>
                          <input
                            type="datetime-local"
                            value={sched.endDate}
                            onChange={(e) => handleScheduleChange(idx, 'endDate', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-[10px] text-gray-400 mt-0.5">เว้นว่างไว้ = ไม่จำกัดวันสิ้นสุด</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sched.isActive}
                            onChange={(e) => handleScheduleChange(idx, 'isActive', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-gray-700 font-medium">เปิดใช้งาน Layer นี้</span>
                        </label>
                        {!sched.startDate && !sched.endDate && (
                          <span className="text-gray-500 italic">Always Active (Fallback/Base Layer)</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">การแสดงผลสำรอง (Legacy Fallback)</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Playlist สำรองเมื่อไม่มี Layer ทำงาน</label>
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
                <label htmlFor="loop" className="ml-2 block text-sm text-gray-900">
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
