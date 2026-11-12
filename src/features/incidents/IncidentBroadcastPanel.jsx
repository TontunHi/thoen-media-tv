import React from 'react';
import { Radio } from 'lucide-react';

export default function IncidentBroadcastPanel({
  summary = { red: 0, yellow: 0, green: 0, black: 0, refuse_treatment: 0, total: 0 },
  isBroadcasting = false,
  selectedBroadcastTvs = [],
  tvs = [],
  saving = false,
  onToggleBroadcast,
  onToggleTvSelection,
  onSelectAllTvs,
}) {
  const triageCards = [
    {
      label: 'ผู้ป่วยวิกฤต',
      sublabel: 'สีแดง',
      value: summary.red,
      dotClass: 'bg-rose-600',
      valueClass: 'text-rose-700',
      cardClass: 'bg-white border-slate-200/80',
    },
    {
      label: 'ผู้ป่วยเร่งด่วน',
      sublabel: 'สีเหลือง',
      value: summary.yellow,
      dotClass: 'bg-amber-500',
      valueClass: 'text-amber-700',
      cardClass: 'bg-white border-slate-200/80',
    },
    {
      label: 'ผู้ป่วยไม่เร่งด่วน',
      sublabel: 'สีเขียว',
      value: summary.green,
      dotClass: 'bg-emerald-600',
      valueClass: 'text-emerald-700',
      cardClass: 'bg-white border-slate-200/80',
    },
    {
      label: 'เสียชีวิต',
      sublabel: 'สีดำ',
      value: summary.black,
      dotClass: 'bg-slate-900',
      valueClass: 'text-slate-900',
      cardClass: 'bg-white border-slate-200/80',
    },
    {
      label: 'ไม่ประสงค์ตรวจ',
      sublabel: 'สังเกตอาการ',
      value: summary.refuse_treatment,
      dotClass: 'bg-slate-400',
      valueClass: 'text-slate-700',
      cardClass: 'bg-white border-slate-200/80',
    },
  ];

  return (
    <>
      {/* Deliberate Triage Telemetry Moment */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {triageCards.map((card) => (
          <div
            key={card.label}
            className={`${card.cardClass} border rounded-xl p-4 shadow-2xs flex flex-col justify-between h-24`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5 truncate">
                <span className={`w-2 h-2 rounded-full shrink-0 ${card.dotClass}`} />
                <span className="truncate">{card.label}</span>
              </span>
              <span className="text-[11px] text-slate-400 shrink-0">{card.sublabel}</span>
            </div>
            <div className="flex items-baseline justify-between pt-2">
              <span
                className={`text-3xl font-mono tabular-nums font-medium leading-none ${card.valueClass}`}
              >
                {card.value}
              </span>
              <span className="text-xs text-slate-400">ราย</span>
            </div>
          </div>
        ))}

        <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-4 shadow-2xs flex flex-col justify-between h-24">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-200">ยอดผู้ประสบเหตุรวม</span>
            <span className="text-[11px] text-teal-400 font-mono">ทั้งหมด</span>
          </div>
          <div className="flex items-baseline justify-between pt-2">
            <span className="text-3xl font-mono tabular-nums font-medium leading-none text-white">
              {summary.total}
            </span>
            <span className="text-xs text-slate-400">ราย</span>
          </div>
        </div>
      </div>

      {/* Emergency TV Broadcast Switchboard */}
      <div
        className={`p-5 rounded-xl border transition-colors ${
          isBroadcasting
            ? 'bg-slate-900 border-rose-600/80 text-white'
            : 'bg-white border-slate-200/80 text-slate-900 shadow-2xs'
        }`}
      >
        <div
          className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b ${
            isBroadcasting ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isBroadcasting
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-700 border border-slate-200/80'
              }`}
            >
              <Radio size={18} strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-medium">
                  แผงควบคุมการตัดสัญญาณขึ้นจอทีวีฉุกเฉิน
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${
                    isBroadcasting
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isBroadcasting ? 'bg-rose-400' : 'bg-slate-400'
                    }`}
                  />
                  <span>
                    {isBroadcasting ? 'กำลังออกอากาศฉุกเฉิน' : 'โหมดปกติ'}
                  </span>
                </span>
              </div>
              <p
                className={`text-xs mt-0.5 ${
                  isBroadcasting ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                เลือกจอทีวีที่ต้องการสลับไปแสดงกระดานสถานะอุบัติเหตุหมู่แบบสด
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleBroadcast}
              disabled={saving}
              className={`h-10 flex items-center gap-2 px-5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isBroadcasting
                  ? 'bg-white text-rose-700 hover:bg-slate-100'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isBroadcasting ? 'bg-rose-600' : 'bg-white'
                }`}
              />
              <span>
                {isBroadcasting
                  ? 'หยุดถ่ายทอดสดและคืนจอปกติ'
                  : 'เริ่มถ่ายทอดสดขึ้นจอทีวี'}
              </span>
            </button>
          </div>
        </div>

        <div className="pt-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-normal ${
                isBroadcasting ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              จอทีวีที่เลือกออกอากาศ{' '}
              <span className="font-mono tabular-nums font-medium">
                {selectedBroadcastTvs.length}/{tvs.length}
              </span>
            </span>
            <button
              type="button"
              onClick={onSelectAllTvs}
              className={`text-xs font-medium hover:underline cursor-pointer ${
                isBroadcasting ? 'text-teal-300' : 'text-teal-700'
              }`}
            >
              {selectedBroadcastTvs.length === tvs.length
                ? 'ยกเลิกการเลือกทั้งหมด'
                : 'เลือกทุกจอทั้งหมด'}
            </button>
          </div>

          {tvs.length === 0 ? (
            <p className="text-xs text-slate-400">
              ยังไม่มีการลงทะเบียนจอทีวีในระบบ
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {tvs.map((tv) => {
                const isSelected = selectedBroadcastTvs.includes(tv.id);
                return (
                  <label
                    key={tv.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer select-none ${
                      isSelected
                        ? isBroadcasting
                          ? 'bg-rose-950/60 border-rose-500/70 text-white'
                          : 'bg-teal-50/70 border-teal-700 text-slate-900 font-medium'
                        : isBroadcasting
                        ? 'bg-slate-800/70 border-slate-700 text-slate-300 hover:border-slate-600'
                        : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleTvSelection(tv.id)}
                      className="w-4 h-4 text-teal-700 rounded cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate flex items-center justify-between gap-2">
                        <span className="truncate">{tv.name}</span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            tv.is_online === 1 ? 'bg-teal-500' : 'bg-slate-400'
                          }`}
                          title={tv.is_online === 1 ? 'ออนไลน์' : 'ออฟไลน์'}
                        />
                      </div>
                      <div className="text-[11px] opacity-75 truncate mt-0.5">
                        {tv.location || `/tv/${tv.slug}`}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
