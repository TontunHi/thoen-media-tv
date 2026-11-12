import React from 'react';
import {
  Monitor,
  MapPin,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Edit2,
  Trash2,
  FileText,
  History,
} from 'lucide-react';

export function parseDeviceInfo(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function TvHealthCard({
  tv,
  playlists = [],
  copiedId,
  reloadingId,
  onCopyUrl,
  onChangePlaylist,
  onReloadTv,
  onViewLogs,
  onEditTv,
  onDeleteTv,
}) {
  const tvUrl = `${window.location.origin}/tv/${tv.slug}`;
  const isOnline = tv.is_online === 1;
  const deviceInfo = parseDeviceInfo(tv.device_info);

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-2xs">
      <div>
        <div className="flex items-start justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center shrink-0">
              <Monitor size={18} strokeWidth={1.5} />
            </div>
            <div className="truncate">
              <h3 className="font-medium text-slate-900 text-sm truncate">
                {tv.name}
              </h3>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                <MapPin size={12} strokeWidth={1.5} className="shrink-0" />
                <span className="truncate">{tv.location || 'ไม่ได้ระบุจุดติดตั้ง'}</span>
              </div>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md shrink-0 border ${
              isOnline
                ? 'bg-teal-50/70 text-teal-800 border-teal-600/30'
                : 'bg-slate-50 text-slate-500 border-slate-200/80'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? 'bg-teal-600' : 'bg-slate-400'
              }`}
            />
            <span>{isOnline ? 'ออนไลน์' : 'ออฟไลน์'}</span>
          </span>
        </div>

        {/* Deliberate Studio Monitor Moment */}
        <div className="bg-slate-900 text-white rounded-lg p-3.5 mb-3.5 border border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-teal-400' : 'bg-slate-500'
                }`}
              />
              <span>จอภาพขณะนี้</span>
            </span>
            {deviceInfo?.resolution && (
              <span className="font-mono tabular-nums text-slate-400">
                {deviceInfo.resolution}
              </span>
            )}
          </div>
          {deviceInfo?.current_media_name ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-white truncate">
                {deviceInfo.current_media_name}
              </span>
              {deviceInfo.total_active > 0 && (
                <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-white/10 text-teal-300 shrink-0">
                  {deviceInfo.slide_index}/{deviceInfo.total_active}
                </span>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 truncate">
              {tv.playlist_name ? `เพลย์ลิสต์ ${tv.playlist_name}` : 'รอสัญญาณจากจอทีวี'}
            </div>
          )}

          {tv.ticker_enabled === 1 && tv.ticker_text && (
            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center gap-1.5 text-[11px] text-teal-300 truncate">
              <FileText size={12} strokeWidth={1.5} className="shrink-0" />
              <span className="truncate">{tv.ticker_text}</span>
            </div>
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 mb-3.5">
          <div className="text-[11px] text-slate-500 mb-1.5 flex items-center justify-between">
            <span>ลิงก์สำหรับเปิดบนสมาร์ททีวี</span>
            <span className="text-teal-700 font-mono font-medium">/tv/{tv.slug}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={tvUrl}
              className="bg-white border border-slate-200/80 rounded-md px-2.5 py-1.5 text-xs text-slate-700 w-full font-mono outline-none"
            />
            <button
              type="button"
              onClick={() => onCopyUrl(tv.slug, tv.id)}
              className="w-8 h-8 flex items-center justify-center rounded-md bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80 transition-colors shrink-0 cursor-pointer"
              title="คัดลอกลิงก์"
            >
              {copiedId === tv.id ? (
                <Check size={14} strokeWidth={1.5} className="text-teal-700" />
              ) : (
                <Copy size={14} strokeWidth={1.5} />
              )}
            </button>
            <a
              href={`/tv/${tv.slug}`}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 flex items-center justify-center rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 transition-colors shrink-0"
              title="เปิดหน้าจอจำลอง"
            >
              <ExternalLink size={14} strokeWidth={1.5} />
            </a>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            เพลย์ลิสต์ที่กำลังแสดงผล
          </label>
          <select
            value={tv.playlist_id || ''}
            onChange={(e) => onChangePlaylist(tv, e.target.value)}
            className="w-full h-9 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 text-xs text-slate-900 font-normal focus:border-teal-700 focus:bg-white outline-none"
          >
            <option value="">ไม่ได้กำหนดเพลย์ลิสต์</option>
            {playlists.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.name} ({pl.item_count || 0} รายการ)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="font-mono tabular-nums">
          {tv.last_ping
            ? `ซิงค์ ${new Date(tv.last_ping).toLocaleTimeString('th-TH')}`
            : 'ยังไม่เคยเชื่อมต่อ'}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onReloadTv(tv)}
            disabled={reloadingId === tv.id}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
            title="สั่งรีโหลดหน้าจอทีวีระยะไกล"
          >
            <RefreshCw
              size={14}
              strokeWidth={1.5}
              className={reloadingId === tv.id ? 'animate-spin text-teal-700' : ''}
            />
          </button>
          <button
            type="button"
            onClick={() => onViewLogs(tv)}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            title="ดูประวัติการเล่นสื่อ"
          >
            <History size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => onEditTv(tv)}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            title="แก้ไขการตั้งค่าและข้อความวิ่ง"
          >
            <Edit2 size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => onDeleteTv(tv.id, tv.name)}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            title="ลบจอทีวี"
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
