import React from 'react';
import {
  Image,
  Video,
  PlaySquare,
  Globe,
  FileText,
  Edit2,
  Trash2,
  Eye,
  Clock,
  Calendar,
} from 'lucide-react';
import {
  resolveMediaUrl,
  getYoutubeThumbnail,
  parseAnnouncementData,
  ANNOUNCEMENT_THEMES,
} from '../../domain/mediaRegistry';

function isExpiredDate(expiresAt) {
  if (!expiresAt) return false;
  const dateStr = String(expiresAt).slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);
  return dateStr < todayStr;
}

export default function MediaGrid({
  files = [],
  onPreview,
  onEdit,
  onDelete,
  formatBytes,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {files.map((file) => {
        const expired = isExpiredDate(file.expires_at);
        const announcement =
          file.file_type === 'announcement' ? parseAnnouncementData(file) : null;
        const annTheme = announcement
          ? ANNOUNCEMENT_THEMES[announcement.theme] || ANNOUNCEMENT_THEMES['hospital-green']
          : null;

        return (
          <div
            key={file.id}
            className={`group bg-white border rounded-xl overflow-hidden flex flex-col justify-between transition-colors ${
              expired
                ? 'border-rose-300 bg-rose-50/10 opacity-75'
                : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div
              onClick={() => onPreview(file)}
              className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden cursor-pointer"
            >
              {file.file_type === 'image' ? (
                <img
                  src={resolveMediaUrl(file.file_path)}
                  alt={file.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : file.file_type === 'video' ? (
                <video
                  src={resolveMediaUrl(file.file_path)}
                  className="w-full h-full object-cover opacity-95 group-hover:opacity-100 transition-opacity"
                  muted
                  preload="metadata"
                  onMouseOver={(e) => e.target.play().catch(() => {})}
                  onMouseOut={(e) => {
                    e.target.pause();
                    e.target.currentTime = 0;
                  }}
                />
              ) : file.file_type === 'announcement' && announcement ? (
                <div
                  className="w-full h-full p-3 flex flex-col justify-between text-center select-none"
                  style={{
                    backgroundColor: annTheme.bg,
                    color: annTheme.text,
                  }}
                >
                  <span
                    className="mx-auto px-2 py-0.5 rounded-md text-[10px] font-medium truncate max-w-[90%]"
                    style={{ backgroundColor: annTheme.badgeBg, color: annTheme.accent }}
                  >
                    {announcement.department}
                  </span>
                  <div className="my-auto px-1">
                    <div className="text-xs font-medium line-clamp-2 leading-snug">
                      {announcement.headline}
                    </div>
                    {announcement.body && (
                      <div className="text-[10px] opacity-85 line-clamp-1 mt-0.5">
                        {announcement.body}
                      </div>
                    )}
                  </div>
                  <div className="text-[9px] opacity-75 truncate">
                    {announcement.footer || 'ป้ายประกาศโรงพยาบาล'}
                  </div>
                </div>
              ) : file.file_type === 'youtube' && getYoutubeThumbnail(file.file_path) ? (
                <div className="relative w-full h-full">
                  <img
                    src={getYoutubeThumbnail(file.file_path)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-9 h-9 rounded-lg bg-slate-900/80 text-white flex items-center justify-center border border-white/20">
                      <PlaySquare size={18} strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
                  <Globe size={20} strokeWidth={1.5} className="text-slate-400 mb-1.5" />
                  <span className="text-xs font-medium text-slate-200">
                    {file.file_type === 'facebook' ? 'Facebook Live' : 'Online Stream'}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate max-w-full mt-0.5 px-2 font-mono">
                    {file.file_path}
                  </span>
                </div>
              )}

              <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-white text-slate-900 p-2 rounded-lg shadow-xs">
                  <Eye size={16} strokeWidth={1.5} />
                </div>
              </div>

              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-normal flex items-center gap-1 bg-slate-900/80 text-slate-100 border border-white/10">
                {file.file_type === 'image' ? (
                  <>
                    <Image size={12} strokeWidth={1.5} /> รูปภาพ
                  </>
                ) : file.file_type === 'video' ? (
                  <>
                    <Video size={12} strokeWidth={1.5} /> วิดีโอ
                  </>
                ) : file.file_type === 'announcement' ? (
                  <>
                    <FileText size={12} strokeWidth={1.5} /> ป้ายประกาศ
                  </>
                ) : file.file_type === 'youtube' ? (
                  <>
                    <PlaySquare size={12} strokeWidth={1.5} /> YouTube
                  </>
                ) : (
                  <>
                    <Globe size={12} strokeWidth={1.5} /> สตรีมสด
                  </>
                )}
              </div>

              {file.expires_at && (
                <div
                  className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums flex items-center gap-1 ${
                    expired
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-900/80 text-amber-300 border border-white/10'
                  }`}
                >
                  <Calendar size={11} strokeWidth={1.5} />
                  <span>
                    {expired
                      ? `หมดอายุ ${String(file.expires_at).slice(0, 10)}`
                      : `ถึง ${String(file.expires_at).slice(0, 10)}`}
                  </span>
                </div>
              )}
            </div>

            <div className="p-3.5 flex-1 flex flex-col justify-between bg-white">
              <div>
                <h4
                  className="font-medium text-xs text-slate-900 truncate"
                  title={file.name}
                >
                  {file.name}
                </h4>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
                  <span className="truncate max-w-[130px]">
                    {file.size > 0 ? formatBytes(file.size) : 'Stream'}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock size={12} strokeWidth={1.5} />
                    {file.default_duration > 0 ? `${file.default_duration}s` : 'Auto'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1 mt-3 pt-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onPreview(file)}
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                  title="ดูตัวอย่างสื่อ"
                >
                  <Eye size={14} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(file)}
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                  title="แก้ไขข้อมูลสื่อ"
                >
                  <Edit2 size={14} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(file)}
                  className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="ลบสื่อ"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
