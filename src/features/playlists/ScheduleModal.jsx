import React from 'react';
import { Calendar, X } from 'lucide-react';
import ThaiDateSelector from '../../components/ThaiDateSelector';
import { THAI_WEEKDAYS } from './PlaylistTimeline';

export default function ScheduleModal({
  scheduleModal,
  setScheduleModal,
  onSave,
}) {
  if (!scheduleModal) return null;

  const selectedDays = scheduleModal.days_of_week
    ? String(scheduleModal.days_of_week)
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n))
    : [];

  const toggleDay = (dayId) => {
    let next;
    if (selectedDays.includes(dayId)) {
      next = selectedDays.filter((d) => d !== dayId);
    } else {
      next = [...selectedDays, dayId];
    }
    setScheduleModal({
      ...scheduleModal,
      days_of_week: next.length === 0 || next.length === 7 ? '' : next.join(','),
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 max-w-lg w-full shadow-lg">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-base font-medium text-slate-900 flex items-center gap-2">
            <Calendar size={18} strokeWidth={1.5} className="text-teal-700" />
            ตั้งเวลาแสดงผลสื่อ
          </h3>
          <button
            type="button"
            onClick={() => setScheduleModal(null)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4 truncate">
          สื่อ {scheduleModal.media_name}
        </p>

        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-3">
            <ThaiDateSelector
              label="วันที่เริ่มแสดง"
              value={scheduleModal.start_date}
              onChange={(val) =>
                setScheduleModal({ ...scheduleModal, start_date: val })
              }
            />
            <ThaiDateSelector
              label="วันที่สิ้นสุด"
              value={scheduleModal.end_date}
              onChange={(val) =>
                setScheduleModal({ ...scheduleModal, end_date: val })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                เวลาเริ่มของแต่ละวัน
              </label>
              <input
                type="time"
                value={scheduleModal.start_time}
                onChange={(e) =>
                  setScheduleModal({ ...scheduleModal, start_time: e.target.value })
                }
                className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-xs font-mono tabular-nums text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                เวลาสิ้นสุดของแต่ละวัน
              </label>
              <input
                type="time"
                value={scheduleModal.end_time}
                onChange={(e) =>
                  setScheduleModal({ ...scheduleModal, end_time: e.target.value })
                }
                className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-xs font-mono tabular-nums text-slate-900"
              />
            </div>
          </div>

          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-700">
                วันที่แสดงผลในสัปดาห์
              </label>
              {selectedDays.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setScheduleModal({ ...scheduleModal, days_of_week: '' })
                  }
                  className="text-xs text-teal-700 hover:underline font-medium cursor-pointer"
                >
                  แสดงทุกวัน
                </button>
              )}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {THAI_WEEKDAYS.map((day) => {
                const active = selectedDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`h-9 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-teal-700 border-teal-700 text-white'
                        : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                    }`}
                    title={day.label}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() =>
                setScheduleModal({
                  ...scheduleModal,
                  start_date: '',
                  end_date: '',
                  start_time: '',
                  end_time: '',
                  days_of_week: '',
                })
              }
              className="text-xs text-rose-600 hover:underline font-medium cursor-pointer"
            >
              ล้างค่าตั้งเวลาทั้งหมด
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScheduleModal(null)}
                className="h-9 px-4 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="h-9 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium cursor-pointer"
              >
                บันทึกเวลา
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
