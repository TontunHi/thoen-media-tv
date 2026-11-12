import React, { useState, useEffect, useRef } from 'react';
import {
  GripVertical,
  ArrowUp,
  ArrowDown,
  Clock,
  Calendar,
  Eye,
  EyeOff,
  Trash2,
  PlaySquare,
  Globe,
  FileText,
} from 'lucide-react';
import {
  resolveMediaUrl,
  getYoutubeThumbnail,
  parseAnnouncementData,
  ANNOUNCEMENT_THEMES,
} from '../../domain/mediaRegistry';

export const THAI_WEEKDAYS = [
  { id: 1, short: 'จ.', label: 'จันทร์' },
  { id: 2, short: 'อ.', label: 'อังคาร' },
  { id: 3, short: 'พ.', label: 'พุธ' },
  { id: 4, short: 'พฤ.', label: 'พฤหัสบดี' },
  { id: 5, short: 'ศ.', label: 'ศุกร์' },
  { id: 6, short: 'ส.', label: 'เสาร์' },
  { id: 0, short: 'อา.', label: 'อาทิตย์' },
];

export function formatDaysOfWeekBadge(daysStr) {
  if (!daysStr || String(daysStr).trim() === '') return null;
  const nums = String(daysStr)
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
  if (nums.length === 0 || nums.length === 7) return null;
  return THAI_WEEKDAYS.filter((d) => nums.includes(d.id))
    .map((d) => d.short)
    .join(' ');
}

function DebouncedDurationInput({ value, onChange, debounceMs = 400 }) {
  const [localVal, setLocalVal] = useState(value ?? 10);
  const timerRef = useRef(null);

  useEffect(() => {
    setLocalVal(value ?? 10);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e) => {
    const raw = e.target.value;
    setLocalVal(raw);
    const parsed = Math.max(0, parseInt(raw, 10) || 0);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(parsed);
    }, debounceMs);
  };

  return (
    <input
      type="number"
      min="0"
      value={localVal}
      onChange={handleChange}
      className="w-16 h-8 bg-slate-50 border border-slate-200/90 rounded-lg px-2 text-xs text-center text-slate-900 font-mono tabular-nums font-medium focus:border-teal-700 focus:bg-white outline-none"
      aria-label="ระยะเวลาแสดงผลเป็นวินาที"
    />
  );
}

export default function PlaylistTimeline({
  items = [],
  onMoveItem,
  onReorderDrag,
  onUpdateDuration,
  onToggleActive,
  onOpenSchedule,
  onRemoveItem,
  formatDateStr,
}) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    onReorderDrag(draggedIndex, dropIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item, idx) => {
        const hasSchedule =
          item.start_date ||
          item.end_date ||
          item.start_time ||
          item.end_time ||
          item.days_of_week;
        const daysLabel = formatDaysOfWeekBadge(item.days_of_week);
        const announcement =
          item.file_type === 'announcement' ? parseAnnouncementData(item) : null;
        const annTheme = announcement
          ? ANNOUNCEMENT_THEMES[announcement.theme] || ANNOUNCEMENT_THEMES['hospital-green']
          : null;

        return (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            className={`px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors select-none ${
              !item.is_active ? 'opacity-50 bg-slate-50/70' : 'hover:bg-slate-50/60'
            } ${draggedIndex === idx ? 'opacity-40 bg-slate-100' : ''} ${
              dragOverIndex === idx ? 'border-t-2 border-t-teal-700 bg-teal-50/30' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-1">
                <div
                  className="p-1.5 text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing rounded-md hover:bg-slate-100"
                  title="คลิกค้างเพื่อลากสลับลำดับ"
                >
                  <GripVertical size={16} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col items-center gap-0.5 w-6">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => onMoveItem(idx, -1)}
                    className="p-0.5 rounded hover:bg-slate-200/70 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                    aria-label="เลื่อนขึ้น"
                  >
                    <ArrowUp size={12} strokeWidth={1.5} />
                  </button>
                  <span className="text-xs font-mono tabular-nums font-medium text-slate-500">
                    {idx + 1}
                  </span>
                  <button
                    type="button"
                    disabled={idx === items.length - 1}
                    onClick={() => onMoveItem(idx, 1)}
                    className="p-0.5 rounded hover:bg-slate-200/70 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                    aria-label="เลื่อนลง"
                  >
                    <ArrowDown size={12} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              <div className="w-24 aspect-video bg-slate-900 rounded-lg overflow-hidden shrink-0 border border-slate-200/80 flex items-center justify-center">
                {item.file_type === 'image' ? (
                  <img
                    src={resolveMediaUrl(item.file_path)}
                    alt={item.media_name}
                    className="w-full h-full object-cover"
                  />
                ) : item.file_type === 'video' ? (
                  <video
                    src={resolveMediaUrl(item.file_path)}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : item.file_type === 'announcement' && announcement ? (
                  <div
                    className="w-full h-full p-1.5 flex flex-col items-center justify-center text-center"
                    style={{ backgroundColor: annTheme.bg, color: annTheme.text }}
                  >
                    <FileText size={14} strokeWidth={1.5} style={{ color: annTheme.accent }} />
                    <span className="text-[8px] font-medium truncate max-w-full mt-0.5">
                      {announcement.headline}
                    </span>
                  </div>
                ) : item.file_type === 'youtube' && getYoutubeThumbnail(item.file_path) ? (
                  <div className="relative w-full h-full">
                    <img
                      src={getYoutubeThumbnail(item.file_path)}
                      alt={item.media_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <PlaySquare size={15} strokeWidth={1.5} className="text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-300">
                    <Globe size={16} strokeWidth={1.5} />
                    <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                      {item.file_type}
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-slate-900 truncate">
                    {item.media_name}
                  </span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                    {item.file_type}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {hasSchedule ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 font-mono tabular-nums">
                      <Calendar size={11} strokeWidth={1.5} className="text-teal-700" />
                      {item.start_date || item.end_date
                        ? `${formatDateStr(item.start_date) || 'ตลอด'} ถึง ${
                            formatDateStr(item.end_date) || 'ตลอด'
                          }`
                        : 'ทุกวัน'}
                      {(item.start_time || item.end_time) &&
                        ` ${
                          item.start_time ? item.start_time.slice(0, 5) : '00:00'
                        }-${item.end_time ? item.end_time.slice(0, 5) : '23:59'}`}
                      {daysLabel && ` ${daysLabel}`}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">
                      แสดงผลตลอดเวลา
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
              <div className="flex items-center gap-1.5 mr-2">
                <Clock size={14} strokeWidth={1.5} className="text-slate-400" />
                <DebouncedDurationInput
                  value={item.duration_seconds}
                  onChange={(val) => onUpdateDuration(item, val)}
                />
                <span className="text-xs text-slate-500">วินาที</span>
              </div>

              <button
                type="button"
                onClick={() => onOpenSchedule(item)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs transition-colors cursor-pointer ${
                  hasSchedule
                    ? 'bg-teal-50/70 border-teal-600/40 text-teal-800'
                    : 'bg-white border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="ตั้งเวลาแสดงผล"
              >
                <Calendar size={14} strokeWidth={1.5} />
              </button>

              <button
                type="button"
                onClick={() => onToggleActive(item)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs transition-colors cursor-pointer ${
                  item.is_active
                    ? 'bg-white border-slate-200/80 text-teal-700 hover:bg-slate-50'
                    : 'bg-slate-100 border-slate-200/80 text-slate-400'
                }`}
                title={item.is_active ? 'กำลังเปิดใช้งาน' : 'ปิดการแสดงผลชั่วคราว'}
              >
                {item.is_active ? (
                  <Eye size={14} strokeWidth={1.5} />
                ) : (
                  <EyeOff size={14} strokeWidth={1.5} />
                )}
              </button>

              <button
                type="button"
                onClick={() => onRemoveItem(item.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/80 transition-colors cursor-pointer"
                title="เอาออกจากเพลย์ลิสต์"
              >
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
