import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title = 'ยืนยันการดำเนินการ',
  message = '',
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 max-w-md w-full shadow-lg">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                variant === 'danger'
                  ? 'bg-rose-50 text-rose-600 border-rose-200/80'
                  : 'bg-amber-50 text-amber-600 border-amber-200/80'
              }`}
            >
              <AlertTriangle size={18} strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-medium text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed mb-6">{message}</p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-9 px-4 rounded-lg text-white text-xs font-medium cursor-pointer ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-teal-700 hover:bg-teal-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
