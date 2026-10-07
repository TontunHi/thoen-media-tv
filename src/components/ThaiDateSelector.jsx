import React, { useMemo, useRef } from 'react';
import { Calendar, ChevronDown, Clock, Sparkles } from 'lucide-react';

const THAI_MONTHS = [
  { value: '01', name: 'มกราคม', short: 'ม.ค.' },
  { value: '02', name: 'กุมภาพันธ์', short: 'ก.พ.' },
  { value: '03', name: 'มีนาคม', short: 'มี.ค.' },
  { value: '04', name: 'เมษายน', short: 'เม.ย.' },
  { value: '05', name: 'พฤษภาคม', short: 'พ.ค.' },
  { value: '06', name: 'มิถุนายน', short: 'มิ.ย.' },
  { value: '07', name: 'กรกฎาคม', short: 'ก.ค.' },
  { value: '08', name: 'สิงหาคม', short: 'ส.ค.' },
  { value: '09', name: 'กันยายน', short: 'ก.ย.' },
  { value: '10', name: 'ตุลาคม', short: 'ต.ค.' },
  { value: '11', name: 'พฤศจิกายน', short: 'พ.ย.' },
  { value: '12', name: 'ธันวาคม', short: 'ธ.ค.' },
];

const THAI_DAY_NAMES = [
  'วันอาทิตย์',
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
];

/**
 * ThaiDateSelector Component
 * Provides clean Day / Month / Year (BE) dropdowns and formatted Thai date display.
 * Emits standard 'YYYY-MM-DD' ISO date string via onChange.
 */
export default function ThaiDateSelector({
  value,
  onChange,
  label = 'วันที่เกิดเหตุ *',
  required = false,
  showPresets = true,
  className = '',
}) {
  const hiddenInputRef = useRef(null);

  // Parse YYYY-MM-DD
  const { currentYearCE, currentYearBE, currentMonth, currentDay, maxDaysInMonth, isValidDate } = useMemo(() => {
    let y = 2026;
    let m = '10';
    let d = '07';
    let valid = false;

    if (value && typeof value === 'string' && value.includes('-')) {
      const parts = value.slice(0, 10).split('-');
      if (parts.length === 3) {
        y = parseInt(parts[0], 10) || 2026;
        m = parts[1].padStart(2, '0');
        d = parts[2].padStart(2, '0');
        valid = true;
      }
    } else {
      const now = new Date();
      y = now.getFullYear();
      m = String(now.getMonth() + 1).padStart(2, '0');
      d = String(now.getDate()).padStart(2, '0');
      valid = true;
    }

    const monthNum = parseInt(m, 10);
    // Number of days in month (handling leap years)
    const daysInMonth = new Date(y, monthNum, 0).getDate();

    return {
      currentYearCE: y,
      currentYearBE: y + 543,
      currentMonth: m,
      currentDay: d,
      maxDaysInMonth: daysInMonth,
      isValidDate: valid,
    };
  }, [value]);

  // Generate Days 1..maxDaysInMonth
  const daysList = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= maxDaysInMonth; i++) {
      const val = String(i).padStart(2, '0');
      arr.push(val);
    }
    return arr;
  }, [maxDaysInMonth]);

  // Generate Years (พ.ศ. 2565 to 2575 -> 2022 to 2032 CE)
  const yearsList = useMemo(() => {
    const list = [];
    const baseYearCE = new Date().getFullYear();
    for (let y = baseYearCE - 3; y <= baseYearCE + 5; y++) {
      list.push({
        ce: y,
        be: y + 543,
      });
    }
    return list;
  }, []);

  // Update Year / Month / Day
  const handleDayChange = (newDay) => {
    const clampedDay = Math.min(parseInt(newDay, 10), maxDaysInMonth);
    const dayStr = String(clampedDay).padStart(2, '0');
    const formatted = `${currentYearCE}-${currentMonth}-${dayStr}`;
    onChange(formatted);
  };

  const handleMonthChange = (newMonth) => {
    const monthNum = parseInt(newMonth, 10);
    const daysInNewMonth = new Date(currentYearCE, monthNum, 0).getDate();
    const clampedDay = Math.min(parseInt(currentDay, 10), daysInNewMonth);
    const dayStr = String(clampedDay).padStart(2, '0');
    const formatted = `${currentYearCE}-${newMonth}-${dayStr}`;
    onChange(formatted);
  };

  const handleYearChange = (newYearBE) => {
    const yearBE = parseInt(newYearBE, 10);
    const yearCE = yearBE - 543;
    const monthNum = parseInt(currentMonth, 10);
    const daysInNewMonth = new Date(yearCE, monthNum, 0).getDate();
    const clampedDay = Math.min(parseInt(currentDay, 10), daysInNewMonth);
    const dayStr = String(clampedDay).padStart(2, '0');
    const formatted = `${yearCE}-${currentMonth}-${dayStr}`;
    onChange(formatted);
  };

  // Preset Date handler
  const setPresetDate = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${day}`);
  };

  // Formatted Thai display string
  const thaiDisplayString = useMemo(() => {
    try {
      const d = new Date(currentYearCE, parseInt(currentMonth, 10) - 1, parseInt(currentDay, 10));
      const dayName = THAI_DAY_NAMES[d.getDay()] || '';
      const monthObj = THAI_MONTHS.find((m) => m.value === currentMonth) || THAI_MONTHS[0];
      return `${dayName}ที่ ${parseInt(currentDay, 10)} ${monthObj.name} พ.ศ. ${currentYearBE} (${currentDay}/${currentMonth}/${currentYearBE})`;
    } catch (e) {
      return `${currentDay}/${currentMonth}/${currentYearBE}`;
    }
  }, [currentYearCE, currentYearBE, currentMonth, currentDay]);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-extrabold text-slate-800 tracking-tight">
            {label}
          </label>
          <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
            รูปแบบ วัน/เดือน/ปี (พ.ศ.)
          </span>
        </div>
      )}

      {/* 3 Side-by-Side Dropdown Selectors: [วัน (Day)] [เดือน (Month)] [ปี พ.ศ. (Year)] */}
      <div className="grid grid-cols-12 gap-1.5 items-center">
        {/* Day Select (3 cols) */}
        <div className="col-span-3 relative">
          <select
            value={currentDay}
            onChange={(e) => handleDayChange(e.target.value)}
            className="w-full pl-2.5 pr-6 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-xs sm:text-sm font-black text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer shadow-2xs"
            aria-label="เลือกวัน"
            required={required}
          >
            {daysList.map((d) => (
              <option key={d} value={d}>
                วัน {parseInt(d, 10)}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Month Select (5 cols) */}
        <div className="col-span-5 relative">
          <select
            value={currentMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="w-full pl-2.5 pr-6 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-xs sm:text-sm font-black text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer shadow-2xs truncate"
            aria-label="เลือกเดือน"
            required={required}
          >
            {THAI_MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.name} ({m.short})
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Year Select (4 cols) */}
        <div className="col-span-4 relative">
          <select
            value={currentYearBE}
            onChange={(e) => handleYearChange(e.target.value)}
            className="w-full pl-2.5 pr-6 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-xs sm:text-sm font-black text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer shadow-2xs"
            aria-label="เลือกปี พ.ศ."
            required={required}
          >
            {yearsList.map((y) => (
              <option key={y.be} value={y.be}>
                พ.ศ. {y.be}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Formatted Date Display Strip + Quick Presets */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
        {/* Thai Formatted Result */}
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200">
          <Calendar size={13} className="text-teal-600 shrink-0" />
          <span className="truncate">{thaiDisplayString}</span>
        </div>

        {/* Quick Date Presets */}
        {showPresets && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPresetDate(0)}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 active:scale-95 text-[11px] font-bold text-slate-700 transition cursor-pointer border border-slate-200"
              title="ตั้งเป็นวันนี้"
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => setPresetDate(-1)}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 active:scale-95 text-[11px] font-bold text-slate-700 transition cursor-pointer border border-slate-200"
              title="ตั้งเป็นเมื่อวาน"
            >
              เมื่อวาน
            </button>
            <button
              type="button"
              onClick={() => setPresetDate(-2)}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 active:scale-95 text-[11px] font-bold text-slate-700 transition cursor-pointer border border-slate-200"
              title="ตั้งเป็น 2 วันก่อน"
            >
              2 วันก่อน
            </button>

            {/* Native Calendar Picker Trigger */}
            <button
              type="button"
              onClick={() => hiddenInputRef.current?.showPicker ? hiddenInputRef.current.showPicker() : hiddenInputRef.current?.click()}
              className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-indigo-600 transition cursor-pointer border border-slate-200 ml-0.5"
              title="เปิดปฏิทินแบบเลือกช่อง"
            >
              <Calendar size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Hidden Native Date Input for Direct Calendar Picker Support */}
      <input
        ref={hiddenInputRef}
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
