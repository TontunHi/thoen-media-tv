'use client'

import { useState, useEffect } from 'react'
import { KeyRound, User, Lock, CheckCircle2, AlertCircle, Loader2, Shield } from 'lucide-react'

export default function SettingsPage() {
  const [username, setUsername] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/auth/profile')
      if (res.ok) {
        const data = await res.json()
        setUsername(data.username)
        setNewUsername(data.username)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน' })
      return
    }

    if (newPassword && newPassword.length < 6) {
      setMessage({ type: 'error', text: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' })
      return
    }

    if (!currentPassword) {
      setMessage({ type: 'error', text: 'กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยันการเปลี่ยนแปลง' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newUsername: newUsername !== username ? newUsername : undefined,
          newPassword: newPassword || undefined
        })
      })

      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: 'บันทึกการเปลี่ยนแปลงสำเร็จเรียบร้อยแล้ว' })
        setUsername(data.user.username)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setMessage({ type: 'error', text: data.error || 'เกิดข้อผิดพลาดในการบันทึก' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <KeyRound className="w-7 h-7 text-blue-600" />
          ตั้งค่าบัญชีและรหัสผ่าน
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          แก้ไขชื่อผู้ใช้งาน (Username) และเปลี่ยนรหัสผ่านสำหรับเข้าสู่ระบบ
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 md:p-8">
        {message && (
          <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Username */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
              <User className="w-4 h-4 text-blue-600" />
              ชื่อผู้ใช้งาน (Username)
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="ระบุ Username"
              />
            </div>
          </div>

          {/* Section: Password */}
          <div className="space-y-4 pt-2">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Lock className="w-4 h-4 text-blue-600" />
              เปลี่ยนรหัสผ่าน (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                รหัสผ่านใหม่
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร (หรือเว้นว่างไว้)"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                ยืนยันรหัสผ่านใหม่
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Section: Confirm Current Password */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">ยืนยันรหัสผ่านปัจจุบัน</span>
              </div>
              <p className="text-xs text-blue-700 mb-3">
                เพื่อความปลอดภัย กรุณากรอกรหัสผ่านปัจจุบันของคุณเพื่อยืนยันการแก้ไขข้อมูล
              </p>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="รหัสผ่านปัจจุบัน (เช่น admin123)"
                className="w-full px-4 py-2.5 border border-blue-200 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors shadow-xs disabled:opacity-50 flex items-center"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
