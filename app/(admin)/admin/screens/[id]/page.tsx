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

// Helper to convert Date object or ISO string to local "YYYY-MM-DDTHH:mm" for input datetime-local
function toLocalDatetimeString(dateInput: Date | string | null): string {
  if (!dateInput) return ''
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
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
            startDate: toLocalDatetimeString(s.startDate),
            endDate: toLocalDatetimeString(s.endDate),
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
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/screens" 
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 rounded-xl border border-slate-200/80 transition-all shadow-2xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isNew ? 'เพิ่มจอทีวีใหม่' : 'ตั้งค่าจอทีวี'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isNew ? 'สร้างหน้าจอประชาสัมพันธ์ใหม่ในระบบ' : `จัดการการตั้งค่าและเลเยอร์ของ ${screen.name || 'หน้าจอ'}`}
            </p>
          </div>
        </div>
        
        {!isNew && (
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors border border-red-200/60"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            ลบจอทีวี
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-xs border border-slate-100 overflow-hidden">
        <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-8">
          {/* Section: Basic Info */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              ข้อมูลพื้นฐานของจอทีวี
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ชื่อจอทีวี (Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={screen.name}
                  onChange={(e) => setScreen({ ...screen, name: e.target.value })}
                  placeholder="เช่น จอหน้าห้องฉุกเฉิน, จอโถงรับรอง"
                  required
                  className="w-full px-4 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-hidden"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Slug (URL ประจำจอ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={screen.slug}
                  onChange={(e) => setScreen({ ...screen, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  placeholder="เช่น er-screen-1"
                  required
                  className="w-full px-4 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">ใช้ตัวอักษรภาษาอังกฤษ ตัวเลข และขีดกลาง (-) เท่านั้น</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">สถานที่ตั้ง (Location)</label>
              <input
                type="text"
                value={screen.location || ''}
                onChange={(e) => setScreen({ ...screen, location: e.target.value })}
                placeholder="ระบุตำแหน่งติดตั้ง เช่น ชั้น 1 อาคารผู้ป่วยนอก"
                className="w-full px-4 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">คำอธิบายเพิ่มเติม</label>
              <textarea
                value={screen.description || ''}
                onChange={(e) => setScreen({ ...screen, description: e.target.value })}
                rows={2}
                placeholder="หมายเหตุหรือรายละเอียดของจอนี้..."
                className="w-full px-4 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-hidden resize-none"
              />
            </div>
          </div>

          {/* Section: Multi-Playlist Layers & Schedule */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  Playlist Layers & Schedule (ลำดับความสำคัญ)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ระบบจะเลือก Playlist <b>ลำดับบนสุด (Priority 1)</b> ที่เข้าเงื่อนไขวันเวลาปัจจุบันมาเล่น หากยังไม่ถึงเวลาจะเล่นลำดับถัดไปลงมา
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddSchedule}
                className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all border border-blue-200/80 shadow-2xs self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                เพิ่ม Layer
              </button>
            </div>

            {schedules.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">ยังไม่มี Playlist Layers ในจอนี้</p>
                <p className="text-xs text-slate-400 mt-0.5">ระบบจะแสดง Playlist สำรองด้านล่าง หรือหน้าจอสแตนด์บาย</p>
                <button
                  type="button"
                  onClick={handleAddSchedule}
                  className="mt-3 inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  เพิ่ม Layer แรก
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {schedules.map((sched, idx) => {
                  const isPlayingNow = activeNowIndex === idx

                  return (
                    <div
                      key={sched.id || idx}
                      className={`p-5 rounded-2xl border transition-all duration-200 ${
                        isPlayingNow
                          ? 'border-emerald-500/80 bg-emerald-50/30 shadow-sm ring-2 ring-emerald-500/10'
                          : 'border-slate-200/80 bg-slate-50/50 hover:bg-white'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                        <div className="flex items-center gap-2.5">
                          <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-xs font-black shadow-xs">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 text-sm">
                            Priority #{idx + 1}
                          </span>
                          {isPlayingNow && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                              Active (กำลังเล่นบนจอ)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveSchedule(idx, 'up')}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 disabled:opacity-25 transition-all"
                            title="เลื่อนความสำคัญขึ้น (Priority สูงขึ้น)"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === schedules.length - 1}
                            onClick={() => handleMoveSchedule(idx, 'down')}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 disabled:opacity-25 transition-all"
                            title="เลื่อนความสำคัญลง"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSchedule(idx)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg ml-1 transition-colors"
                            title="ลบ Layer นี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">เลือก Playlist</label>
                          <select
                            value={sched.playlistId}
                            onChange={(e) => handleScheduleChange(idx, 'playlistId', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-medium text-slate-800"
                          >
                            {playlists.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            วันเวลาเริ่มต้น (Start)
                          </label>
                          <input
                            type="datetime-local"
                            value={sched.startDate}
                            onChange={(e) => handleScheduleChange(idx, 'startDate', e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-mono"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">เว้นว่างไว้ = เริ่มทันที</p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            วันเวลาสิ้นสุด (End)
                          </label>
                          <input
                            type="datetime-local"
                            value={sched.endDate}
                            onChange={(e) => handleScheduleChange(idx, 'endDate', e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden font-mono"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">เว้นว่างไว้ = ไม่มีกำหนดสิ้นสุด</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sched.isActive}
                            onChange={(e) => handleScheduleChange(idx, 'isActive', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-slate-700 font-bold">เปิดใช้งาน Layer นี้</span>
                        </label>
                        {!sched.startDate && !sched.endDate && (
                          <span className="text-slate-400 font-medium italic">Always Active (Fallback/Base Layer)</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Section: Legacy Fallback & Loop */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              การแสดงผลสำรอง (Fallback) & วนลูป
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Playlist สำรองเมื่อไม่มี Layer ทำงาน
                </label>
                <select
                  value={screen.playlistId || ''}
                  onChange={(e) => setScreen({ ...screen, playlistId: e.target.value || null })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-hidden text-slate-800"
                >
                  <option value="">-- ไม่เลือก (แสดงหน้าจอสแตนด์บาย) --</option>
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
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="loop" className="ml-2.5 text-xs font-bold text-slate-700 cursor-pointer">
                  เล่นวนซ้ำอัตโนมัติ (Loop continuously)
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              บันทึกการตั้งค่า
            </button>
          </div>
        </form>

        {!isNew && (
          <div className="bg-slate-50/70 p-6 sm:p-8 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-2">ลิงก์สำหรับเปิดบนจอทีวี (TV URL)</h3>
            <div className="flex items-center">
              <div className="flex-1 bg-white border border-slate-200 rounded-l-xl px-4 py-2.5 text-xs font-mono text-slate-600 overflow-x-auto whitespace-nowrap shadow-2xs">
                {typeof window !== 'undefined' ? `${window.location.origin}/tv/${screen.slug}` : `/tv/${screen.slug}`}
              </div>
              <button
                onClick={copyUrl}
                className="flex items-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border-y border-r border-slate-200 text-xs font-bold transition-colors"
                title="คัดลอกลิงก์"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </button>
              <Link
                href={`/tv/${screen.slug}`}
                target="_blank"
                className="flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-r-xl text-xs font-bold transition-colors shadow-2xs"
                title="เปิดดู"
              >
                <ExternalLink className="w-4 h-4 mr-1.5" />
                เปิดดู
              </Link>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              นำลิงก์นี้ไปเปิดในเว็บเบราว์เซอร์ของ Smart TV หรือ Android Box แล้วกด <b>F11</b> เพื่อเปิดเต็มหน้าจอ
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
