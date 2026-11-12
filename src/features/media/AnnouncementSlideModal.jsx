import React, { useState } from 'react';
import { FileText, X, Calendar, Clock } from 'lucide-react';
import { ANNOUNCEMENT_THEMES } from '../../domain/mediaRegistry';

export default function AnnouncementSlideModal({
  open,
  onClose,
  onSubmit,
  folders = [],
  currentFolderId = 'all',
  submitting = false,
}) {
  const [form, setForm] = useState({
    name: '',
    headline: '',
    body: '',
    department: 'โรงพยาบาลเถิน จ.ลำปาง',
    theme: 'hospital-green',
    footer: '',
    default_duration: 15,
    expires_at: '',
    folder_id: currentFolderId !== 'all' && currentFolderId !== 'root' ? currentFolderId : 'root',
  });

  if (!open) return null;

  const activeTheme = ANNOUNCEMENT_THEMES[form.theme] || ANNOUNCEMENT_THEMES['hospital-green'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.headline.trim()) return;
    onSubmit({
      ...form,
      name: (form.name || form.headline).trim(),
      headline: form.headline.trim(),
      body: form.body.trim(),
      department: form.department.trim() || 'โรงพยาบาลเถิน จ.ลำปาง',
      footer: form.footer.trim(),
      default_duration: Math.max(5, parseInt(form.default_duration) || 15),
      expires_at: form.expires_at || null,
      folder_id: form.folder_id === 'root' || form.folder_id === 'all' ? null : form.folder_id,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 max-w-3xl w-full shadow-lg my-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 border border-teal-200/80 flex items-center justify-center">
              <FileText size={18} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-medium text-slate-900">
                สร้างป้ายประกาศโรงพยาบาล
              </h3>
              <p className="text-xs text-slate-500">
                สร้างสไลด์ข้อความประกาศขึ้นจอทีวีโดยตรงในอัตราส่วน 16 ต่อ 9
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                หัวข้อประกาศหลัก
              </label>
              <input
                type="text"
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                placeholder="เช่น แจ้งปิดปรับปรุงคลินิกทันตกรรมชั่วคราว"
                className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                รายละเอียดประกาศ
              </label>
              <textarea
                rows={3}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="ระบุรายละเอียด วัน เวลา หรือคำแนะนำสำหรับผู้รับบริการ"
                className="w-full bg-slate-50 border border-slate-200/90 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  หน่วยงานหรือแผนกที่ประกาศ
                </label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="เช่น งานผู้ป่วยนอก โรงพยาบาลเถิน"
                  className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  ข้อความท้ายป้าย
                </label>
                <input
                  type="text"
                  value={form.footer}
                  onChange={(e) => setForm({ ...form, footer: e.target.value })}
                  placeholder="เช่น ติดต่อจุดประชาสัมพันธ์ชั้น 1"
                  className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  โทนสีป้ายประกาศ
                </label>
                <select
                  value={form.theme}
                  onChange={(e) => setForm({ ...form, theme: e.target.value })}
                  className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 text-sm text-slate-900"
                >
                  {Object.values(ANNOUNCEMENT_THEMES).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                  <Clock size={12} strokeWidth={1.5} /> เวลาแสดงเป็นวินาที
                </label>
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={form.default_duration}
                  onChange={(e) => setForm({ ...form, default_duration: e.target.value })}
                  className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm font-mono tabular-nums font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                  <Calendar size={12} strokeWidth={1.5} /> วันหมดอายุอัตโนมัติ
                </label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 text-sm text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                บันทึกในโฟลเดอร์
              </label>
              <select
                value={form.folder_id}
                onChange={(e) => setForm({ ...form, folder_id: e.target.value })}
                className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900"
              >
                <option value="root">โฟลเดอร์หลัก</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-normal text-slate-500 mb-2">
                ตัวอย่างการแสดงผลบนจอทีวี
              </div>
              <div
                className="aspect-video rounded-xl p-5 flex flex-col justify-between text-center border"
                style={{
                  backgroundColor: activeTheme.bg,
                  color: activeTheme.text,
                  borderColor: activeTheme.accent,
                }}
              >
                <div className="flex justify-center">
                  <span
                    className="px-3 py-1 rounded-md text-[10px] font-medium"
                    style={{ backgroundColor: activeTheme.badgeBg, color: activeTheme.accent }}
                  >
                    {form.department || 'โรงพยาบาลเถิน จ.ลำปาง'}
                  </span>
                </div>
                <div className="my-auto px-2 space-y-2">
                  <div className="text-base sm:text-lg font-semibold leading-snug line-clamp-2">
                    {form.headline || 'หัวข้อประกาศโรงพยาบาล'}
                  </div>
                  {form.body && (
                    <div className="text-xs opacity-90 leading-relaxed line-clamp-3 whitespace-pre-line">
                      {form.body}
                    </div>
                  )}
                </div>
                <div
                  className="text-[10px] font-medium pt-2 border-t border-white/15 truncate"
                  style={{ color: activeTheme.accent }}
                >
                  {form.footer || 'ประชาสัมพันธ์ โรงพยาบาลเถิน'}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-5 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-9 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'กำลังสร้าง' : 'บันทึกป้ายประกาศ'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
