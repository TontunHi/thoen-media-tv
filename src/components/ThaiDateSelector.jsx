import React, { useMemo } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';

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
 * Clean and simple Day / Month / Year (BE) dropdowns in Thai format
 */
export default function ThaiDateSelector({
  value,
  onChange,
  label = 'วันที่เกิดเหตุ *',
  required = false,
  className = '',
}) {
  // Parse YYYY-MM-DD
  const { currentYearCE, currentYearBE, currentMonth, currentDay, maxDaysInMonth } = useMemo(() => {
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

    return {
      currentYearCE: y,
      currentYearBE: y + 543,
      currentMonth: m,
      currentDay: d,
      maxDaysInMonth: daysInMonth,
    };
  }, [value]);

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

  // Handlers for Dropdowns
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
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-slate-700">
            {label}
          </label>
          <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
            วัน / เดือน / ปี (พ.ศ.)
          </span>
        </div>
      )}

      {/* 3 Dropdowns: [วัน] [เดือน] [ปี พ.ศ.] */}
      <div className="grid grid-cols-12 gap-2 items-center">
        {/* Day Select (3 cols) */}
        <div className="col-span-3 relative">
          <select
            value={currentDay}
            onChange={(e) => handleDayChange(e.target.value)}
            className="w-full pl-3 pr-7 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer shadow-xs"
            aria-label="เลือกวัน"
            required={required}
          >
            {daysList.map((d) => (
              <option key={d} value={d}>
                วัน {parseInt(d, 10)}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Month Select (5 cols) */}
        <div className="col-span-5 relative">
          <select
            value={currentMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="w-full pl-3 pr-7 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer shadow-xs truncate"
            aria-label="เลือกเดือน"
            required={required}
          >
            {THAI_MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.name} ({m.short})
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Year Select (4 cols) */}
        <div className="col-span-4 relative">
          <select
            value={currentYearBE}
            onChange={(e) => handleYearChange(e.target.value)}
            className="w-full pl-3 pr-7 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer shadow-xs"
            aria-label="เลือกปี พ.ศ."
            required={required}
          >
            {yearsList.map((y) => (
              <option key={y.be} value={y.be}>
                พ.ศ. {y.be}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Clean Thai Date Display Text */}
      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold pt-1">
        <Calendar size={13} className="text-teal-600 shrink-0" />
        <span>{thaiDisplayString}</span>
      </div>
    </div>
  );
}
