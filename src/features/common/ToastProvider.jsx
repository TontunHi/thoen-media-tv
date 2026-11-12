import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext({
  showToast: () => {},
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((type, text, duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, text }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isInfo = toast.type === 'info';
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto px-3.5 py-2.5 rounded-xl shadow-md border flex items-center justify-between gap-3 ${
                isError
                  ? 'bg-white text-rose-900 border-rose-200'
                  : isInfo
                  ? 'bg-slate-900 text-white border-slate-800'
                  : 'bg-white text-slate-900 border-slate-200/90'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isError ? (
                  <AlertCircle size={16} strokeWidth={1.5} className="text-rose-600 shrink-0" />
                ) : isInfo ? (
                  <Info size={16} strokeWidth={1.5} className="text-teal-400 shrink-0" />
                ) : (
                  <CheckCircle2 size={16} strokeWidth={1.5} className="text-teal-700 shrink-0" />
                )}
                <span className="text-xs font-medium leading-snug break-words">
                  {toast.text}
                </span>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="p-1 rounded-md opacity-60 hover:opacity-100 cursor-pointer shrink-0"
                aria-label="ปิดการแจ้งเตือน"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
