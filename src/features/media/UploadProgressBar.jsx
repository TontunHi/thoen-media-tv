import React from 'react';
import { Loader2 } from 'lucide-react';

export default function UploadProgressBar({ uploading, progress = 0, fileCount = 0 }) {
  if (!uploading) return null;

  const pct = Math.min(100, Math.max(0, Number(progress) || 0));

  return (
    <div className="mb-5 bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
          <Loader2 size={14} strokeWidth={1.5} className="animate-spin text-teal-700" />
          <span>
            กำลังอัปโหลดสื่อ {fileCount > 0 ? `${fileCount} ไฟล์` : ''}
          </span>
        </div>
        <span className="text-xs font-mono tabular-nums font-medium text-teal-700">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-700 transition-transform duration-150 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
