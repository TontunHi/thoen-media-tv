import React from 'react';
import { Monitor, History, X } from 'lucide-react';

export function TvFormModal({
  open,
  editingTv,
  tvForm,
  setTvForm,
  playlists = [],
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 max-w-lg w-full shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-slate-900 flex items-center gap-2">
            <Monitor size={18} strokeWidth={1.5} className="text-teal-700" />
            {editingTv
              ? 'แก้ไขข้อมูลจอทีวีและข้อความตัววิ่ง'
              : 'ลงทะเบียนจอทีวีใหม่'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                ชื่อเรียกจอทีวี
              </label>
              <input
                type="text"
                value={tvForm.name}
                onChange={(e) => setTvForm({ ...tvForm, name: e.target.value })}
                placeholder="เช่น จอหน้าห้องจ่ายยา 1"
                className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                ชื่อลิงก์ URL
              </label>
              <div className="flex items-center h-10 bg-slate-50 border border-slate-200/90 rounded-lg overflow-hidden focus-within:border-teal-700 focus-within:bg-white">
                <span className="px-2.5 h-full flex items-center text-xs text-slate-500 bg-slate-100 border-r border-slate-200/80 font-mono">
                  /tv/
                </span>
                <input
                  type="text"
                  value={tvForm.slug}
                  onChange={(e) => setTvForm({ ...tvForm, slug: e.target.value })}
                  placeholder="opd-1"
                  className="w-full bg-transparent px-2.5 text-sm text-slate-900 font-mono outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                สถานที่ติดตั้ง
              </label>
              <input
                type="text"
                value={tvForm.location}
                onChange={(e) => setTvForm({ ...tvForm, location: e.target.value })}
                placeholder="เช่น อาคารผู้ป่วยนอก ชั้น 1"
                className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                เพลย์ลิสต์เริ่มต้น
              </label>
              <select
                value={tvForm.playlist_id}
                onChange={(e) =>
                  setTvForm({ ...tvForm, playlist_id: e.target.value })
                }
                className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900"
              >
                <option value="">ยังไม่กำหนดเพลย์ลิสต์</option>
                {playlists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <label className="flex items-center justify-between cursor-pointer select-none">
              <span className="text-xs font-medium text-slate-900">
                เปิดใช้งานแถบข้อความตัววิ่งด้านล่างจอ
              </span>
              <input
                type="checkbox"
                checked={Boolean(tvForm.ticker_enabled)}
                onChange={(e) =>
                  setTvForm({ ...tvForm, ticker_enabled: e.target.checked })
                }
                className="w-4 h-4 text-teal-700 rounded cursor-pointer"
              />
            </label>

            <div>
              <label className="block text-xs font-normal text-slate-600 mb-1.5">
                ข้อความตัววิ่งประชาสัมพันธ์บนจอนี้
              </label>
              <input
                type="text"
                value={tvForm.ticker_text || ''}
                onChange={(e) =>
                  setTvForm({ ...tvForm, ticker_text: e.target.value })
                }
                placeholder="เช่น ขอความร่วมมือสวมหน้ากากอนามัยเมื่อเข้าพื้นที่โรงพยาบาลเถิน"
                className="w-full h-10 bg-white border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="h-9 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium cursor-pointer"
            >
              {editingTv ? 'บันทึกการแก้ไข' : 'ลงทะเบียนจอทีวี'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TvLogsModal({ tv, logs = [], loading = false, onClose }) {
  if (!tv) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] flex flex-col shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History size={18} strokeWidth={1.5} className="text-teal-700" />
            <div>
              <h3 className="text-sm font-medium text-slate-900">
                ประวัติการแสดงผลสื่อ
              </h3>
              <p className="text-xs text-slate-500">จอ {tv.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 divide-y divide-slate-100">
          {loading ? (
            <div className="py-10 text-center text-xs text-slate-500">
              กำลังโหลดประวัติ
            </div>
          ) : logs.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              ยังไม่มีประวัติการบันทึกจากจอทีวีนี้
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <span className="font-medium text-slate-900 truncate">
                  {log.media_name || `Media #${log.media_file_id}`}
                </span>
                <span className="text-slate-500 font-mono tabular-nums shrink-0">
                  {log.played_at
                    ? new Date(log.played_at).toLocaleString('th-TH')
                    : '-'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
