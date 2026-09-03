'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, X, Check } from 'lucide-react'

interface DateTimePickerProps {
  value: string // Format: "YYYY-MM-DDTHH:mm" or empty string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  isEnd?: boolean
}

const MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

const DAY_NAMES = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

export default function DateTimePicker({
  value,
  onChange,
  placeholder = 'เลือกวันและเวลา',
  label,
  isEnd = false
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse existing value or fallback to current
  const parsedDate = value ? new Date(value) : null
  const isValidDate = parsedDate && !isNaN(parsedDate.getTime())

  const [viewYear, setViewYear] = useState<number>(
    isValidDate ? parsedDate.getFullYear() : new Date().getFullYear()
  )
  const [viewMonth, setViewMonth] = useState<number>(
    isValidDate ? parsedDate.getMonth() : new Date().getMonth()
  )

  const [selectedDate, setSelectedDate] = useState<Date | null>(isValidDate ? parsedDate : null)
  const [selectedHour, setSelectedHour] = useState<number>(
    isValidDate ? parsedDate.getHours() : isEnd ? 23 : 0
  )
  const [selectedMinute, setSelectedMinute] = useState<number>(
    isValidDate ? parsedDate.getMinutes() : isEnd ? 59 : 0
  )

  // Sync state when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) {
        setSelectedDate(d)
        setViewYear(d.getFullYear())
        setViewMonth(d.getMonth())
        setSelectedHour(d.getHours())
        setSelectedMinute(d.getMinutes())
      }
    } else {
      setSelectedDate(null)
    }
  }, [value, isEnd])

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  // Days calculation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()

  const emitDateTime = (date: Date, hour: number, minute: number) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    const hh = pad(hour)
    const mm = pad(minute)
    onChange(`${y}-${m}-${d}T${hh}:${mm}`)
  }

  const handleSelectDay = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day)
    setSelectedDate(newDate)
    emitDateTime(newDate, selectedHour, selectedMinute)
  }

  const handleHourChange = (hour: number) => {
    setSelectedHour(hour)
    const baseDate = selectedDate || new Date()
    if (!selectedDate) setSelectedDate(baseDate)
    emitDateTime(baseDate, hour, selectedMinute)
  }

  const handleMinuteChange = (minute: number) => {
    setSelectedMinute(minute)
    const baseDate = selectedDate || new Date()
    if (!selectedDate) setSelectedDate(baseDate)
    emitDateTime(baseDate, selectedHour, minute)
  }

  const handleClear = () => {
    setSelectedDate(null)
    onChange('')
    setIsOpen(false)
  }

  const handleSetToday = () => {
    const today = new Date()
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    setSelectedDate(today)
    const h = isEnd ? 23 : 0
    const m = isEnd ? 59 : 0
    setSelectedHour(h)
    setSelectedMinute(m)
    emitDateTime(today, h, m)
  }

  const handleSetTomorrow = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setViewYear(tomorrow.getFullYear())
    setViewMonth(tomorrow.getMonth())
    setSelectedDate(tomorrow)
    const h = isEnd ? 23 : 0
    const m = isEnd ? 59 : 0
    setSelectedHour(h)
    setSelectedMinute(m)
    emitDateTime(tomorrow, h, m)
  }

  const handleSetEndOfMonth = () => {
    const today = new Date()
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    setViewYear(endOfMonth.getFullYear())
    setViewMonth(endOfMonth.getMonth())
    setSelectedDate(endOfMonth)
    const h = 23
    const m = 59
    setSelectedHour(h)
    setSelectedMinute(m)
    emitDateTime(endOfMonth, h, m)
  }

  // Format display string
  const formatDisplay = () => {
    if (!value || !isValidDate || !selectedDate) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    const day = selectedDate.getDate()
    const month = MONTH_NAMES[selectedDate.getMonth()]
    const year = selectedDate.getFullYear() + 543 // พ.ศ.
    const time = `${pad(selectedHour)}:${pad(selectedMinute)} น.`
    return `${day} ${month} ${year}, ${time}`
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          {label}
        </label>
      )}

      {/* Input trigger button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2 text-xs bg-white border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
          isOpen 
            ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-xs' 
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden truncate">
          <CalendarIcon className={`w-4 h-4 flex-shrink-0 ${value ? 'text-blue-600' : 'text-slate-400'}`} />
          {value ? (
            <span className="font-semibold text-slate-800 tracking-tight">{formatDisplay()}</span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>

        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
            className="p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-slate-100 transition-colors ml-1"
            title="ล้างเวลา"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Modern Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-2 left-0 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Presets Bar */}
          <div className="flex items-center gap-1.5 pb-3 border-b border-slate-100 overflow-x-auto text-[11px] font-bold">
            <button
              type="button"
              onClick={handleSetToday}
              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-600 transition-colors whitespace-nowrap"
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={handleSetTomorrow}
              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-600 transition-colors whitespace-nowrap"
            >
              พรุ่งนี้
            </button>
            <button
              type="button"
              onClick={handleSetEndOfMonth}
              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-600 transition-colors whitespace-nowrap"
            >
              สิ้นเดือนนี้
            </button>
            {isEnd && (
              <button
                type="button"
                onClick={() => {
                  handleHourChange(23)
                  handleMinuteChange(59)
                }}
                className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors whitespace-nowrap ml-auto"
              >
                23:59 น.
              </button>
            )}
          </div>

          {/* Calendar Header */}
          <div className="flex items-center justify-between py-2.5">
            <h4 className="text-xs font-black text-slate-900">
              {MONTH_NAMES[viewMonth]} {viewYear + 543}
            </h4>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] mb-3">
            {DAY_NAMES.map((d, i) => (
              <span key={i} className="font-bold text-slate-400 py-1">
                {d}
              </span>
            ))}

            {/* Empty slots before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="p-1" />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const isSelected =
                selectedDate &&
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === viewMonth &&
                selectedDate.getFullYear() === viewYear

              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === viewMonth &&
                new Date().getFullYear() === viewYear

              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={`p-1.5 rounded-xl font-bold transition-all text-xs ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : isToday
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* 24-Hour Time Selection Section */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                เวลาแบบ 24 ชั่วโมง (00:00 - 23:59)
              </span>
              <span className="text-xs font-black text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                {String(selectedHour).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')} น.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Hour Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">ชั่วโมง (00 - 23)</label>
                <select
                  value={selectedHour}
                  onChange={(e) => handleHourChange(parseInt(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono font-bold text-slate-800 outline-hidden"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00 ({h < 12 ? 'เช้า' : h < 18 ? 'บ่าย' : 'ค่ำ'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Minute Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">นาที (00 - 59)</label>
                <select
                  value={selectedMinute}
                  onChange={(e) => handleMinuteChange(parseInt(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono font-bold text-slate-800 outline-hidden"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 59].map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, '0')} นาที
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
            >
              ล้างค่า
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all hover:scale-105"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              เสร็จสิ้น
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
