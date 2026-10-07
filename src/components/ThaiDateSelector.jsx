import React, { useMemo, useState, useRef } from 'react';
import { Calendar, Check, ChevronDown, Sparkles, Clock, CalendarDays, Sliders } from 'lucide-react';

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

const THAI_SHORT_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const THAI_SHORT_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/**
 * ThaiDateSelector Component (Ultra-Fast 1-Click Selection)
 * - Large 1-click Quick Date Chips (วันนี้, เมื่อวาน, 2-6 วันก่อน)
 * - Formatted Thai Date Display with Day of Week
 * - Instant Native Calendar Picker popup
 * - Collapsible Day/Month/Year dropdowns for custom older dates
 */
export default function ThaiDateSelector({
  value,
  onChange,
  label = 'วันที่เกิดเหตุ *',
  required = false,
  className = '',
}) {
  const hiddenInputRef = useRef(null);
  const [showCustomDropdowns, setShowCustomDropdowns] = useState(false);

  // Parse YYYY-MM-DD
  const { currentYearCE, currentYearBE, currentMonth, currentDay, maxDaysInMonth, formattedIso } = useMemo(() => {
    let y = 2026;
    let m = '10';
    let d = '07';

    if (value && typeof value === 'string' && value.includes('-')) {
      const parts = value.slice(0, 10).split('-');
      if (parts.length === 3) {
        y = parseInt(parts[0], 10) || 2026;
        m = parts[1].padStart(2, '0');
        d = parts[2].padStart(2, '0');
      }
    } else {
      const now = new Date();
      y = now.getFullYear();
      m = String(now.getMonth() + 1).padStart(2, '0');
      d = String(now.getDate()).padStart(2, '0');
    }

    const monthNum = parseInt(m, 10);
    const daysInMonth = new Date(y, monthNum, 0).getDate();
    const iso = `${y}-${m}-${d}`;

    return {
      currentYearCE: y,
      currentYearBE: y + 543,
      currentMonth: m,
      currentDay: d,
      maxDaysInMonth: daysInMonth,
      formattedIso: iso,
    };
  }, [value]);

  // Generate Quick Date Preset Chips (Today + past 6 days)
  const quickDates = useMemo(() => {
    const list = [];
    const now = new Date();

    for (let i = 0; i <= 6; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${day}`;

      let label = '';
      if (i === 0) label = 'วันนี้';
      else if (i === 1) label = 'เมื่อวาน';
      else label = `${i} วันก่อน`;

      const dayName = THAI_SHORT_DAYS[d.getDay()];
      const monthName = THAI_SHORT_MONTHS[d.getMonth()];
      const yearBE = (y + 543) % 100;

      list.push({
        iso,
        label,
        subLabel: `${dayName} ${parseInt(day, 10)} ${monthName} '${yearBE}`,
        isToday: i === 0,
      });
    }
    return list;
  }, []);

  // Check if current value matches one of the quick chips
  const isCustomDate = useMemo(() => {
    return !quickDates.some((q) => q.iso === formattedIso);
  }, [quickDates, formattedIso]);

  // Formatted Thai display string
  const thaiDisplayString = useMemo(() => {
    try {
      const d = new Date(currentYearCE, parseInt(currentMonth, 10) - 1, parseInt(currentDay, 10));
      const dayName = THAI_DAY_NAMES[d.getDay()] || '';
      const monthObj = THAI_MONTHS.find((m) => m.value === currentMonth) || THAI_MONTHS[0];
      return `${dayName}ที่ ${parseInt(currentDay, 10)} ${monthObj.name} พ.ศ. ${currentYearBE}`;
    } catch (e) {
      return `${currentDay}/${currentMonth}/${currentYearBE}`;
    }
  }, [currentYearCE, currentYearBE, currentMonth, currentDay]);

  // Generate Days 1..maxDaysInMonth
  const daysList = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= maxDaysInMonth; i++) {
      arr.push(String(i).padStart(2, '0'));
    }
    return arr;
  }, [maxDaysInMonth]);

  // Generate Years
  const yearsList = useMemo(() => {
    const list = [];
    const baseYearCE = new Date().getFullYear();
    for (let y = baseYearCE - 3; y <= baseYearCE + 5; y++) {
      list.push({ ce: y, be: y + 543 });
    }
    return list;
  }, []);

  // Handlers for Custom Dropdowns
  const handleDayChange = (newDay) => {
    const clampedDay = Math.min(parseInt(newDay, 10), maxDaysInMonth);
    const dayStr = String(clampedDay).padStart(2, '0');
    onChange(`${currentYearCE}-${currentMonth}-${dayStr}`);
  };

  const handleMonthChange = (newMonth) => {
    const monthNum = parseInt(newMonth, 10);
    const daysInNewMonth = new Date(currentYearCE, monthNum, 0).getDate();
    const clampedDay = Math.min(parseInt(currentDay, 10), daysInNewMonth);
    const dayStr = String(clampedDay).padStart(2, '0');
    onChange(`${currentYearCE}-${newMonth}-${dayStr}`);
  };

  const handleYearChange = (newYearBE) => {
    const yearBE = parseInt(newYearBE, 10);
    const yearCE = yearBE - 543;
    const monthNum = parseInt(currentMonth, 10);
    const daysInNewMonth = new Date(yearCE, monthNum, 0).getDate();
    const clampedDay = Math.min(parseInt(currentDay, 10), daysInNewMonth);
    const dayStr = String(clampedDay).padStart(2, '0');
    onChange(`${yearCE}-${currentMonth}-${dayStr}`);
  };

  // Trigger Native Calendar Picker
  const handleOpenCalendarPicker = () => {
    try {
      if (hiddenInputRef.current?.showPicker) {
        hiddenInputRef.current.showPicker();
      } else {
        hiddenInputRef.current?.click();
      }
    } catch (e) {
      hiddenInputRef.current?.click();
    }
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* 1. Header Label & Active Formatted Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleOpenCalendarPicker}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black transition cursor-pointer border border-indigo-200 active:scale-95 shadow-2xs"
            title="เปิดปฏิทินแบบกราฟิก"
          >
            <Calendar size={13} className="text-indigo-600" />
            <span>เปิดปฏิทิน</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCustomDropdowns(!showCustomDropdowns)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border active:scale-95 ${
              showCustomDropdowns || isCustomDate
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title="เลือกวัน/เดือน/ปี แบบกำหนดเอง"
          >
            <Sliders size={12} />
            <span>{showCustomDropdowns ? 'ซ่อนตัวเลือกละเอียด' : 'ระบุวันอื่น...'}</span>
          </button>
        </div>
      </div>

      {/* 2. Active Date Highlight Card */}
      <div
        onClick={handleOpenCalendarPicker}
        className="group relative flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-teal-50 via-emerald-50/70 to-slate-50 border-2 border-teal-500/80 shadow-xs cursor-pointer hover:border-teal-600 transition select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition">
            <CalendarDays size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="text-xs font-black text-teal-950 flex items-center gap-1.5">
              <span>{thaiDisplayString}</span>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-100/90 px-1.5 py-0.5 rounded">
                พ.ศ. {currentYearBE}
              </span>
            </div>
            <div className="text-[11px] text-teal-800/80 font-mono font-bold mt-0.5">
              {currentDay}/{currentMonth}/{currentYearBE} ({formattedIso})
            </div>
          </div>
        </div>

        <span className="text-xs font-bold text-teal-700 group-hover:text-teal-900 flex items-center gap-1 bg-white/90 px-2.5 py-1 rounded-xl border border-teal-200 shadow-2xs">
          <span>คลิ๊กเปลี่ยนวัน</span>
          <Calendar size={13} />
        </span>
      </div>

      {/* 3. ULTRA-FAST 1-CLICK QUICK DATE PILLS (เน้น ไว คลิ๊ก 1 ทีเปลี่ยนทันที) */}
      <div className="space-y-1">
        <div className="text-[11px] font-extrabold text-slate-600 flex items-center gap-1">
          <Sparkles size={12} className="text-amber-500" />
          <span>คลิ๊กเลือกด่วน (1-Click Presets):</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {quickDates.map((q) => {
            const isSelected = formattedIso === q.iso;
            return (
              <button
                key={q.iso}
                type="button"
                onClick={() => {
                  onChange(q.iso);
                  setShowCustomDropdowns(false);
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-left border transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-indigo-500/30 font-black'
                    : q.isToday
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border-emerald-300 font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300 font-medium'
                }`}
              >
                <div className="flex items-center gap-1 w-full justify-between">
                  <span className={`text-xs ${isSelected ? 'font-black text-yellow-300' : 'font-extrabold'}`}>
                    {q.label}
                  </span>
                  {isSelected && <Check size={13} className="text-emerald-400 stroke-[3]" />}
                </div>
                <span className={`text-[10px] truncate w-full mt-0.5 ${isSelected ? 'text-slate-300 font-bold' : 'text-slate-500'}`}>
                  {q.subLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Collapsible Custom Dropdowns (for older dates or exact manual selection) */}
      {(showCustomDropdowns || isCustomDate) && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 animate-fade">
          <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
            <span>เลือก วัน / เดือน / ปี พ.ศ. กำหนดเอง:</span>
            {isCustomDate && (
              <span className="text-amber-700 font-extrabold bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                วันที่กำหนดเอง
              </span>
            )}
          </div>
          <div className="grid grid-cols-12 gap-1.5 items-center">
            {/* Day Select (3 cols) */}
            <div className="col-span-3 relative">
              <select
                value={currentDay}
                onChange={(e) => handleDayChange(e.target.value)}
                className="w-full pl-2.5 pr-6 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-black text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer shadow-2xs"
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
                className="w-full pl-2.5 pr-6 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-black text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer shadow-2xs truncate"
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
                className="w-full pl-2.5 pr-6 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-black text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer shadow-2xs"
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
        </div>
      )}

      {/* Hidden Native Date Input for Direct Calendar Picker Support */}
      <input
        ref={hiddenInputRef}
        type="date"
        value={formattedIso}
        onChange={(e) => {
          if (e.target.value) {
            onChange(e.target.value);
          }
        }}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
