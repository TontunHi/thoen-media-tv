import React from 'react';
import { ShieldAlert, Sliders, Clock, Server, Save, X } from 'lucide-react';
import ThaiDateSelector from '../../components/ThaiDateSelector';

export function IncidentSettingsForm({
  formState,
  setFormState,
  saving = false,
  lastSyncTime = null,
  onSave,
  onDelete,
}) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-2xs space-y-5">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-teal-700 flex items-center justify-center">
            <Sliders size={18} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-base font-medium text-slate-900">
              การตั้งค่าเหตุการณ์และเงื่อนไขดึงข้อมูล HOSxP
            </h2>
            <p className="text-xs text-slate-500">
              กำหนดวันและเวลาเริ่มเหตุเพื่อให้ระบบดึงรายชื่อผู้บาดเจ็บมาแสดงผลอัตโนมัติ
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="h-9 text-xs font-medium text-rose-600 hover:bg-rose-50 px-3 rounded-lg transition-colors cursor-pointer"
        >
          ลบเหตุการณ์
        </button>
      </div>

      <form onSubmit={onSave} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              ชื่อเหตุการณ์
            </label>
            <input
              type="text"
              value={formState.title}
              onChange={(e) => setFormState({ ...formState, title: e.target.value })}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200/90 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              สถานที่เกิดเหตุ
            </label>
            <input
              type="text"
              value={formState.location}
              onChange={(e) => setFormState({ ...formState, location: e.target.value })}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200/90 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
            <div className="flex items-center gap-2">
              <Clock size={16} strokeWidth={1.5} className="text-teal-700" />
              <span className="text-sm font-medium text-slate-900">
                ช่วงวันและเวลาของเหตุการณ์
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-7">
              <ThaiDateSelector
                value={formState.incident_date}
                onChange={(val) => setFormState({ ...formState, incident_date: val })}
                label="วันที่เริ่มต้นเหตุการณ์"
                required
              />
            </div>

            <div className="md:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  เวลาเริ่มเหตุ
                </label>
                <input
                  type="text"
                  value={formState.start_time}
                  onChange={(e) => setFormState({ ...formState, start_time: e.target.value })}
                  placeholder="เช่น 14:00"
                  className="w-full h-10 px-3 bg-white border border-slate-200/90 rounded-lg text-sm font-mono tabular-nums font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  ไม่ประสงค์ตรวจเป็นรายคน
                </label>
                <input
                  type="number"
                  min="0"
                  value={formState.refuse_treatment_count}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      refuse_treatment_count: Number(e.target.value),
                    })
                  }
                  className="w-full h-10 px-3 bg-white border border-slate-200/90 rounded-lg text-sm font-mono tabular-nums font-medium text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/70 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none font-medium text-xs text-slate-800">
              <input
                type="checkbox"
                checked={Boolean(formState.end_date || formState.end_time)}
                onChange={(e) => {
                  const now = new Date();
                  const currentTimeStr = now.toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  if (e.target.checked) {
                    setFormState({
                      ...formState,
                      end_date:
                        formState.end_date ||
                        formState.incident_date ||
                        now.toISOString().slice(0, 10),
                      end_time: formState.end_time || currentTimeStr,
                    });
                  } else {
                    setFormState({ ...formState, end_date: '', end_time: '' });
                  }
                }}
                className="w-4 h-4 text-teal-700 rounded cursor-pointer"
              />
              <span>กำหนดวันและเวลาสิ้นสุดเหตุการณ์เมื่อปิดเคสแล้ว</span>
            </label>

            {Boolean(formState.end_date || formState.end_time) && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 rounded-xl bg-white border border-slate-200/80">
                <div className="md:col-span-7">
                  <ThaiDateSelector
                    value={formState.end_date || formState.incident_date}
                    onChange={(val) => setFormState({ ...formState, end_date: val })}
                    label="วันที่สิ้นสุดเหตุการณ์"
                  />
                </div>
                <div className="md:col-span-5 pt-0.5">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    เวลาสิ้นสุดเหตุการณ์
                  </label>
                  <input
                    type="text"
                    value={formState.end_time}
                    onChange={(e) => setFormState({ ...formState, end_time: e.target.value })}
                    placeholder="เช่น 18:00"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200/90 rounded-lg text-sm font-mono tabular-nums font-medium text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer select-none font-medium text-xs text-slate-900">
              <input
                type="checkbox"
                checked={formState.is_auto_sync}
                onChange={(e) =>
                  setFormState({ ...formState, is_auto_sync: e.target.checked })
                }
                className="w-4 h-4 text-teal-700 rounded cursor-pointer"
              />
              <span>ดึงข้อมูลจาก HOSxP อัตโนมัติทุก 15 วินาที</span>
            </label>
            <span className="text-xs font-mono tabular-nums text-slate-500 flex items-center gap-1.5">
              <Server size={13} strokeWidth={1.5} className="text-slate-400" />
              ซิงค์ล่าสุด {lastSyncTime ? lastSyncTime.toLocaleTimeString('th-TH') : '-'}
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="h-9 flex items-center gap-2 px-5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            <Save size={15} strokeWidth={1.5} />
            <span>บันทึกและอัปเดตจอทีวี</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export function CreateIncidentModal({
  open,
  newIncidentForm,
  setNewIncidentForm,
  saving = false,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-lg border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert size={18} strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-medium text-slate-900">
              สร้างรายงานอุบัติเหตุหมู่ใหม่
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              ชื่อเหตุการณ์
            </label>
            <input
              type="text"
              value={newIncidentForm.title}
              onChange={(e) =>
                setNewIncidentForm({ ...newIncidentForm, title: e.target.value })
              }
              placeholder="เช่น รถบัสพลิกคว่ำ ทางหลวง 106"
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200/90 rounded-lg text-sm focus:outline-none focus:border-teal-700 focus:bg-white font-medium text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              สถานที่เกิดเหตุ
            </label>
            <input
              type="text"
              value={newIncidentForm.location}
              onChange={(e) =>
                setNewIncidentForm({
                  ...newIncidentForm,
                  location: e.target.value,
                })
              }
              placeholder="เช่น ทล.106 กม.45 ต.แม่ตื่น อ.เถิน"
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200/90 rounded-lg text-sm focus:outline-none focus:border-teal-700 focus:bg-white text-slate-900"
            />
          </div>

          <ThaiDateSelector
            value={newIncidentForm.incident_date}
            onChange={(val) =>
              setNewIncidentForm({ ...newIncidentForm, incident_date: val })
            }
            label="วันที่เกิดเหตุ"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                เวลาเริ่มเหตุ
              </label>
              <input
                type="text"
                value={newIncidentForm.start_time}
                onChange={(e) =>
                  setNewIncidentForm({
                    ...newIncidentForm,
                    start_time: e.target.value,
                  })
                }
                placeholder="เช่น 14:00"
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200/90 rounded-lg text-sm focus:outline-none focus:border-teal-700 font-mono tabular-nums font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                ไม่ประสงค์ตรวจเป็นรายคน
              </label>
              <input
                type="number"
                min="0"
                value={newIncidentForm.refuse_treatment_count}
                onChange={(e) =>
                  setNewIncidentForm({
                    ...newIncidentForm,
                    refuse_treatment_count: Number(e.target.value),
                  })
                }
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200/90 rounded-lg text-sm focus:outline-none focus:border-teal-700 font-mono tabular-nums font-medium text-slate-900"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 font-medium text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newIncidentForm.is_auto_sync}
              onChange={(e) =>
                setNewIncidentForm({
                  ...newIncidentForm,
                  is_auto_sync: e.target.checked,
                })
              }
              className="w-4 h-4 text-teal-700 rounded cursor-pointer"
            />
            <div>
              <div className="text-xs font-medium text-slate-900">
                ดึงข้อมูลผู้ป่วยจาก HOSxP อัตโนมัติ
              </div>
              <div className="text-[11px] font-normal text-slate-500">
                กรองจากวันที่และเวลาเริ่มเหตุ และซิงค์ข้อมูลใหม่ทุก 15 วินาที
              </div>
            </div>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-4 bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium rounded-lg cursor-pointer"
            >
              สร้างเหตุการณ์
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
