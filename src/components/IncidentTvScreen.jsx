import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { Clock, Users, ShieldAlert, Activity, CheckCircle2, XCircle, ArrowUpDown, Radio } from 'lucide-react';

export default function IncidentTvScreen({ directIncidentId = null }) {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id');
  const incidentId = directIncidentId || paramId || queryId;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    incident: null,
    summary: { red: 0, yellow: 0, green: 0, black: 0, refuse_treatment: 0, total: 0 },
    patients: []
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState('');
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollDirection, setScrollDirection] = useState('down'); // 'down' | 'up' | 'paused'
  
  const scrollContainerRef = useRef(null);

  // Fetch incident data
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let res;
      if (incidentId) {
        res = await api.getIncidentDisplay(incidentId);
      } else {
        res = await api.getActiveIncidentDisplay();
      }
      setData({
        incident: res.incident || null,
        summary: res.summary || { red: 0, yellow: 0, green: 0, black: 0, refuse_treatment: 0, total: 0 },
        patients: res.patients || []
      });
      setError('');
    } catch (err) {
      console.error('Error fetching incident display:', err);
      if (!silent) setError(err.message || 'ไม่สามารถโหลดข้อมูลอุบัติเหตุหมู่ได้');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup Socket.io real-time listener
    const socket = getSocket();
    const handleUpdate = () => {
      fetchData(true);
    };

    socket.on('incident_updated', handleUpdate);
    socket.on('incident_broadcast_toggled', handleUpdate);
    socket.on('tv_config_changed', handleUpdate);

    // Auto-polling every 15 seconds
    const interval = setInterval(() => {
      fetchData(true);
    }, 15000);

    // Clock ticker every 1 second
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      socket.off('incident_updated', handleUpdate);
      socket.off('incident_broadcast_toggled', handleUpdate);
      socket.off('tv_config_changed', handleUpdate);
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, [incidentId]);

  // Auto-scroll loop (Scroll Down -> Pause 5s -> Scroll Up -> Pause 5s -> Loop)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let animId = null;
    let timerId = null;
    let isCancelled = false;

    const PIXELS_PER_SECOND = 20; // Exact 20 px / second
    const PAUSE_DURATION = 5000; // 5 seconds pause at top and bottom

    const startAutoScroll = () => {
      if (!container) return;
      
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll <= 8) {
        setIsAutoScrolling(false);
        return;
      }

      setIsAutoScrolling(true);
      let currentScroll = container.scrollTop;
      let dir = 'down';
      let lastTimestamp = null;

      const doScroll = (timestamp) => {
        if (isCancelled || !container) return;

        if (!lastTimestamp) lastTimestamp = timestamp;
        const deltaSec = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
        lastTimestamp = timestamp;

        const currentMaxScroll = container.scrollHeight - container.clientHeight;
        if (currentMaxScroll <= 8) {
          setIsAutoScrolling(false);
          return;
        }

        const step = PIXELS_PER_SECOND * deltaSec;

        if (dir === 'down') {
          setScrollDirection('down');
          currentScroll += step;
          container.scrollTop = currentScroll;

          if (currentScroll >= currentMaxScroll) {
            container.scrollTop = currentMaxScroll;
            currentScroll = currentMaxScroll;
            setScrollDirection('paused');
            lastTimestamp = null;
            
            timerId = setTimeout(() => {
              if (isCancelled) return;
              dir = 'up';
              lastTimestamp = null;
              animId = requestAnimationFrame(doScroll);
            }, PAUSE_DURATION);
            return;
          }
        } else {
          setScrollDirection('up');
          currentScroll -= step;
          container.scrollTop = currentScroll;

          if (currentScroll <= 0) {
            container.scrollTop = 0;
            currentScroll = 0;
            setScrollDirection('paused');
            lastTimestamp = null;

            timerId = setTimeout(() => {
              if (isCancelled) return;
              dir = 'down';
              lastTimestamp = null;
              animId = requestAnimationFrame(doScroll);
            }, PAUSE_DURATION);
            return;
          }
        }

        animId = requestAnimationFrame(doScroll);
      };

      setScrollDirection('paused');
      timerId = setTimeout(() => {
        if (!isCancelled) {
          dir = 'down';
          lastTimestamp = null;
          animId = requestAnimationFrame(doScroll);
        }
      }, PAUSE_DURATION);
    };

    const initTimer = setTimeout(startAutoScroll, 500);

    const handleResize = () => {
      if (animId) cancelAnimationFrame(animId);
      if (timerId) clearTimeout(timerId);
      startAutoScroll();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isCancelled = true;
      clearTimeout(initTimer);
      if (timerId) clearTimeout(timerId);
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [data.patients, loading]);

  // Format Date in Thai
  const formatThaiDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mb-4" />
        <h2 className="text-2xl font-black tracking-tight text-slate-100">กำลังเชื่อมต่อรายงานสถานการณ์อุบัติเหตุหมู่...</h2>
        <p className="text-slate-400 text-sm mt-1">โรงพยาบาลเถิน จ.ลำปาง</p>
      </div>
    );
  }

  if (error || !data.incident) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 p-6 text-center select-none">
        <div className="w-20 h-20 rounded-3xl bg-white border border-slate-200 flex items-center justify-center mb-6 shadow-xl">
          <ShieldAlert size={44} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">ยังไม่มีรายงานอุบัติเหตุหมู่ที่กำลังเปิดแสดงผล</h1>
        <p className="text-slate-500 max-w-md text-sm">
          {error || 'ขณะนี้ระบบอยู่ในสถานะปกติ หากมีเหตุฉุกเฉิน Admin สามารถสร้างและสั่งถ่ายทอดสดขึ้นจอได้จากหน้าจัดการ'}
        </p>
        <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-xs text-slate-600 font-mono shadow-xs">
          <Clock size={14} className="text-teal-600" />
          <span>เวลาปัจจุบัน {currentTime.toLocaleTimeString('th-TH')}</span>
        </div>
      </div>
    );
  }

  const { incident, summary, patients } = data;

  // Dynamic Multi-Column Logic:
  // If <= 12 patients: Show 1 Full-Width table that fills the screen row-by-row downwards.
  // If > 12 patients (when 1 column is full and would overflow): Split into 2 equal columns (50% / 50%).
  const isMultiColumn = patients.length > 12;
  const half = Math.ceil(patients.length / 2);
  const leftColPatients = isMultiColumn ? patients.slice(0, half) : patients;
  const rightColPatients = isMultiColumn ? patients.slice(half) : [];

  // Helper to render Patient Name on a single line (ชื่อ-นามสกุล อยู่ในบรรทัดเดียวกัน)
  const renderPatientName = (name, isCompact = false) => {
    if (!name) return <span className="text-slate-400 italic">ไม่ระบุชื่อ</span>;
    return (
      <div className={`font-black text-slate-950 leading-normal truncate ${isCompact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'}`}>
        {name.trim()}
      </div>
    );
  };

  // Helper to render Triage Badges
  const renderTriageBadge = (color, isCompact = false) => {
    const c = (color || 'green').toLowerCase();
    const padding = isCompact ? 'px-3 py-1 text-xs sm:text-sm' : 'px-4 py-1.5 text-sm sm:text-base';
    
    if (c === 'red') {
      return (
        <span className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 text-white font-black tracking-wide shadow-xs ${padding}`}>
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          วิกฤต
        </span>
      );
    }
    if (c === 'yellow') {
      return (
        <span className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 text-slate-950 font-black tracking-wide shadow-xs border border-amber-500 ${padding}`}>
          <span className="w-2 h-2 rounded-full bg-slate-950 shrink-0" />
          เร่งด่วน
        </span>
      );
    }
    if (c === 'black' || c === 'white') {
      return (
        <span className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-white font-black tracking-wide shadow-xs ${padding}`}>
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          เสียชีวิต
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white font-black tracking-wide shadow-xs ${padding}`}>
        <span className="w-2 h-2 rounded-full bg-white shrink-0" />
        ไม่เร่งด่วน
      </span>
    );
  };

  // Helper to render Multi-line Stacked Status
  const renderStatusBadge = (status, isCompact = false) => {
    const s = (status || 'ห้องฉุกเฉิน (ER)').trim();
    let labelTop = s;
    let labelBottom = '';
    let colorClass = 'bg-teal-50 text-teal-950 border-teal-300';

    if (s.includes(':')) {
      const sp = s.split(':');
      labelTop = sp[0].trim() + ':';
      labelBottom = sp.slice(1).join(':').trim();
    } else if (s.includes(' (')) {
      const sp = s.split(' (');
      labelTop = sp[0].trim();
      labelBottom = '(' + sp[1];
    } else if (s.includes(' ')) {
      const sp = s.split(' ');
      labelTop = sp[0].trim();
      labelBottom = sp.slice(1).join(' ').trim();
    }

    if (s.includes('เสียชีวิต') || s.includes('ตาย')) {
      colorClass = 'bg-rose-100 text-rose-950 border-2 border-rose-500';
    } else if (s.includes('ส่งต่อ') || s.includes('Refer') || s.includes('ศูนย์ลำปาง') || s.includes('เกาะคา')) {
      colorClass = 'bg-amber-100 text-amber-950 border-2 border-amber-400';
    } else if (s.includes('Admit') || s.includes('ตึก')) {
      colorClass = 'bg-sky-100 text-sky-950 border-2 border-sky-400';
    } else if (s.includes('กลับบ้าน') || s.includes('Discharge')) {
      colorClass = 'bg-emerald-100 text-emerald-950 border-2 border-emerald-400';
    }

    const padClass = isCompact ? 'px-2.5 py-1' : 'px-4 py-1.5';
    const topTextSize = isCompact ? 'text-xs sm:text-[13px]' : 'text-sm sm:text-base';
    const bottomTextSize = isCompact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm';

    return (
      <div className={`inline-flex flex-col items-center justify-center rounded-xl leading-tight font-black shadow-xs ${padClass} ${colorClass}`}>
        <span className={`${topTextSize} leading-tight whitespace-nowrap`}>{labelTop}</span>
        {labelBottom && (
          <span className={`${bottomTextSize} leading-tight font-extrabold text-center break-words max-w-[180px]`}>
            {labelBottom}
          </span>
        )}
      </div>
    );
  };

  // Render Table Row (without injury / diag column)
  const renderPatientRow = (pt, index, offset = 0, isCompact = false) => {
    const rowIdx = offset + index + 1;
    const color = (pt.triage_color || 'green').toLowerCase();

    let borderLeftColor = 'border-l-emerald-500';
    let rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80';

    if (color === 'red') {
      borderLeftColor = 'border-l-rose-600';
      rowBg = index % 2 === 0 ? 'bg-rose-50/40' : 'bg-rose-50/70';
    } else if (color === 'yellow') {
      borderLeftColor = 'border-l-amber-500';
      rowBg = index % 2 === 0 ? 'bg-amber-50/30' : 'bg-amber-50/60';
    } else if (color === 'black' || color === 'white') {
      borderLeftColor = 'border-l-slate-800';
      rowBg = 'bg-slate-100';
    }

    const pyClass = isCompact ? 'py-2.5' : 'py-4';

    return (
      <tr
        key={pt.id || index}
        className={`border-b border-slate-200/90 transition-colors border-l-4 ${borderLeftColor} ${rowBg}`}
      >
        {/* 1. ลำดับ */}
        <td className={`${pyClass} px-2 text-center ${isCompact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} font-mono font-black text-slate-600 align-middle`}>
          {rowIdx}
        </td>

        {/* 2. หมายเลขสายรัดข้อมือ (Tag Number) */}
        <td className={`${pyClass} px-1.5 text-center align-middle`}>
          <span className={`inline-flex items-center justify-center rounded-xl bg-slate-900 text-white font-black font-mono tracking-wider shadow-xs ${
            isCompact ? 'min-w-[38px] px-2.5 py-0.5 text-sm sm:text-base' : 'min-w-[46px] px-3.5 py-1 text-base sm:text-lg'
          }`}>
            {pt.tag_number || '-'}
          </span>
        </td>

        {/* 3. ชื่อ-สกุล (ซ้อนบรรทัดได้) */}
        <td className={`${pyClass} ${isCompact ? 'px-3' : 'px-5'} align-middle`}>
          {renderPatientName(pt.pt_name, isCompact)}
        </td>

        {/* 4. เพศ / อายุ */}
        <td className={`${pyClass} px-2 text-center ${isCompact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} font-bold text-slate-800 align-middle whitespace-nowrap`}>
          <span>{pt.sex || '-'}</span>
          <span className="text-slate-400 mx-1">/</span>
          <span>{pt.age ? `${pt.age} ปี` : '-'}</span>
        </td>

        {/* 5. ระดับความเร่งด่วน (Triage) */}
        <td className={`${pyClass} px-2 text-center align-middle whitespace-nowrap`}>
          {renderTriageBadge(pt.triage_color, isCompact)}
        </td>

        {/* 6. สถานะปัจจุบัน (ซ้อนบรรทัดได้) */}
        <td className={`${pyClass} px-3 text-center align-middle`}>
          {renderStatusBadge(pt.current_status, isCompact)}
        </td>
      </tr>
    );
  };

  return (
    <div
      onWheel={(e) => e.preventDefault()}
      className="w-screen h-screen bg-slate-100 text-slate-900 flex flex-col overflow-hidden select-none font-sans cursor-default"
    >
      {/* 1. TOP HEADER BANNER (WHITE THEME) */}
      <header className="px-6 py-2.5 bg-white border-b-2 border-slate-200/90 flex items-center justify-between shadow-sm shrink-0">
        {/* Hospital Logo & Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-500/30 shrink-0">
            <ShieldAlert size={28} className="stroke-[2.4]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base md:text-lg font-black tracking-tight text-slate-950 uppercase">
                รายงานสถานการณ์อุบัติเหตุหมู่ / สาธารณภัย
              </span>
              <span className="px-2.5 py-0.5 bg-rose-600 text-white text-[11px] font-black rounded-md uppercase tracking-wider shadow-xs animate-pulse">
                EMERGENCY MCI
              </span>
            </div>
            <div className="text-[11px] text-slate-600 flex items-center gap-2 font-bold">
              <span className="text-slate-900">โรงพยาบาลเถิน จังหวัดลำปาง</span>
              <span>•</span>
              <span className="text-teal-700">ศูนย์ประสานงานและสั่งการห้องฉุกเฉิน (ER Command)</span>
            </div>
          </div>
        </div>

        {/* Incident Name & Date Info */}
        <div className="hidden lg:flex flex-col items-center bg-amber-50 border-2 border-amber-300 px-5 py-1.5 rounded-2xl shadow-xs">
          <div className="text-xs md:text-sm font-black text-amber-950 flex items-center gap-1.5">
            <span className="text-amber-800 font-bold">เหตุเกิด:</span>
            <span className="text-slate-950 underline decoration-amber-500 decoration-2 underline-offset-4">
              {incident.title}
            </span>
            {incident.location && (
              <span className="text-slate-700 font-semibold">({incident.location})</span>
            )}
          </div>
          <div className="text-[11px] text-slate-700 mt-0.5 flex items-center gap-2.5 font-bold">
            <span>วันที่: <strong className="text-slate-950">{formatThaiDate(incident.incident_date)}</strong></span>
            {incident.start_time && (
              <span>เวลาเริ่ม: <strong className="text-slate-950">{incident.start_time} น.</strong></span>
            )}
          </div>
        </div>

        {/* Live Digital Clock */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950 text-white px-4 py-1.5 rounded-2xl flex items-center gap-2.5 shadow-md border border-slate-800">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <div className="text-right">
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">เวลาปัจจุบัน (Live)</div>
              <div className="font-mono text-sm sm:text-base font-black text-yellow-300 tracking-widest leading-none">
                {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. STATS & SUMMARY KPI BAR */}
      <section className="px-6 py-2 bg-white border-b-2 border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-xs">
        {/* Triage Badges Group */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-700 font-black uppercase tracking-wider text-[11px] mr-1 flex items-center gap-1">
            <Activity size={14} className="text-rose-600" /> สรุปความเร่งด่วน:
          </span>

          {/* วิกฤต */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 border-2 border-rose-500 text-rose-950 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-rose-600 shadow-sm animate-pulse" />
            <span className="font-extrabold text-[11px]">วิกฤต:</span>
            <span className="font-mono font-black text-base text-rose-700 leading-none">{summary.red}</span>
            <span className="text-[10px] font-bold text-rose-800">คน</span>
          </div>

          {/* เร่งด่วน */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border-2 border-amber-500 text-amber-950 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm" />
            <span className="font-extrabold text-[11px]">เร่งด่วน:</span>
            <span className="font-mono font-black text-base text-amber-700 leading-none">{summary.yellow}</span>
            <span className="text-[10px] font-bold text-amber-800">คน</span>
          </div>

          {/* ไม่เร่งด่วน */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-950 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 shadow-sm" />
            <span className="font-extrabold text-[11px]">ไม่เร่งด่วน:</span>
            <span className="font-mono font-black text-base text-emerald-700 leading-none">{summary.green}</span>
            <span className="text-[10px] font-bold text-emerald-800">คน</span>
          </div>

          {/* เสียชีวิต */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 border-2 border-slate-700 text-slate-900 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-slate-800" />
            <span className="font-extrabold text-[11px]">เสียชีวิต:</span>
            <span className="font-mono font-black text-base text-slate-900 leading-none">{summary.black}</span>
            <span className="text-[10px] font-bold text-slate-700">คน</span>
          </div>
        </div>

        {/* Refuse Treatment & Total Counts */}
        <div className="flex items-center gap-2 text-xs">
          {/* ไม่ประสงค์ตรวจ */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border-2 border-slate-300 text-slate-800 shadow-xs">
            <XCircle size={14} className="text-slate-500" />
            <span className="font-extrabold text-[11px]">ไม่ประสงค์ตรวจ:</span>
            <span className="font-mono font-black text-base text-amber-600 leading-none">{summary.refuse_treatment}</span>
            <span className="text-[10px] font-bold text-slate-600">คน</span>
          </div>

          {/* ยอดรวมทั้งหมด */}
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 border border-slate-800 text-white shadow-md shadow-indigo-900/20">
            <Users size={15} className="text-indigo-300" />
            <span className="font-black text-[11px] uppercase tracking-wide text-indigo-100">รวมทั้งหมด:</span>
            <span className="font-mono font-black text-lg text-yellow-300 leading-none">{summary.total}</span>
            <span className="text-[10px] font-bold text-indigo-200">คน</span>
          </div>
        </div>
      </section>

      {/* 3. MAIN PATIENTS TABLE (DYNAMIC 1-COLUMN OR 2-EQUAL-COLUMNS FULL SCREEN) */}
      <main className="flex-1 min-h-0 p-3 overflow-hidden flex flex-col">
        {patients.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border-2 border-dashed border-slate-300 shadow-sm">
            <Users size={48} className="text-slate-400 mb-3" />
            <h3 className="text-lg font-black text-slate-800">ยังไม่มีรายชื่อผู้ป่วยในอุบัติเหตุหมู่นี้</h3>
            <p className="text-slate-500 text-xs mt-1">ระบบดึงข้อมูลผู้ป่วยจาก HOSxP อัตโนมัติตามช่วงเวลาเกิดเหตุ</p>
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {!isMultiColumn ? (
              /* Single Full-Width Table Mode (<= 12 patients: fills the screen with larger rows & fonts) */
              <div className="w-full rounded-2xl border-2 border-slate-300 bg-white shadow-md overflow-hidden">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead className="sticky top-0 z-10 bg-slate-900 text-white text-xs md:text-sm font-black uppercase tracking-wider shadow-md">
                    <tr>
                      <th className="py-3 px-2 text-center w-16">ลำดับ</th>
                      <th className="py-3 px-2 text-center w-28">หมายเลข</th>
                      <th className="py-3 px-5">ชื่อ-สกุล</th>
                      <th className="py-3 px-3 text-center w-36">เพศ/อายุ</th>
                      <th className="py-3 px-3 text-center w-48">ความเร่งด่วน</th>
                      <th className="py-3 px-4 text-center w-64">สถานะปัจจุบัน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {patients.map((pt, idx) => renderPatientRow(pt, idx, 0, false))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* High-Density 2-Equal-Columns Table Mode (> 12 patients: splits 50%/50% evenly and fills the screen) */
              <div className="grid grid-cols-2 gap-3 items-start w-full">
                {/* Left Column Table (50% width) */}
                <div className="w-full rounded-2xl border-2 border-slate-300 bg-white shadow-md overflow-hidden">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead className="sticky top-0 z-10 bg-slate-900 text-white text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-md">
                      <tr>
                        <th className="py-2.5 px-1 text-center w-12">ลำดับ</th>
                        <th className="py-2.5 px-1 text-center w-20">หมายเลข</th>
                        <th className="py-2.5 px-3">ชื่อ-สกุล</th>
                        <th className="py-2.5 px-1.5 text-center w-24">เพศ/อายุ</th>
                        <th className="py-2.5 px-1.5 text-center w-28">ความเร่งด่วน</th>
                        <th className="py-2.5 px-2 text-center w-40">สถานะปัจจุบัน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {leftColPatients.map((pt, idx) => renderPatientRow(pt, idx, 0, true))}
                    </tbody>
                  </table>
                </div>

                {/* Right Column Table (50% width) */}
                <div className="w-full rounded-2xl border-2 border-slate-300 bg-white shadow-md overflow-hidden">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead className="sticky top-0 z-10 bg-slate-900 text-white text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-md">
                      <tr>
                        <th className="py-2.5 px-1 text-center w-12">ลำดับ</th>
                        <th className="py-2.5 px-1 text-center w-20">หมายเลข</th>
                        <th className="py-2.5 px-3">ชื่อ-สกุล</th>
                        <th className="py-2.5 px-1.5 text-center w-24">เพศ/อายุ</th>
                        <th className="py-2.5 px-1.5 text-center w-28">ความเร่งด่วน</th>
                        <th className="py-2.5 px-2 text-center w-40">สถานะปัจจุบัน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {rightColPatients.map((pt, idx) => renderPatientRow(pt, idx, half, true))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. BOTTOM STATUS FOOTER WITH AUTO-SCROLL INDICATOR */}
      <footer className="px-6 py-2 bg-white border-t-2 border-slate-200 flex items-center justify-between text-xs text-slate-600 font-bold shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span className="text-slate-800">เชื่อมต่อฐานข้อมูล HOSxP สดอัตโนมัติ</span>
          <span className="text-slate-400">•</span>
          <span className="text-[11px] text-slate-500 font-normal">สำรวจเคสใหม่อัตโนมัติทุก 15 วินาที</span>
        </div>

        {/* Auto Scroll Indicator */}
        {isAutoScrolling ? (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3.5 py-1 rounded-full text-indigo-950 text-xs font-black shadow-xs">
            <ArrowUpDown size={14} className="text-indigo-600 animate-bounce shrink-0" />
            <span>เลื่อนอัตโนมัติ (ขึ้น-ลง)</span>
            <span className="text-indigo-400">•</span>
            <span className="text-[11px] font-extrabold text-indigo-700">
              {scrollDirection === 'down' ? 'กำลังเลื่อนลง...' : scrollDirection === 'up' ? 'กำลังเลื่อนขึ้น...' : 'หยุด 5 วิ'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-slate-600 text-xs font-medium">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>แสดงผลครบถ้วน {patients.length} รายชื่อ ({isMultiColumn ? 'แบ่ง 2 ฝั่งสมดุล' : 'ตารางเดี่ยวเต็มจอ'})</span>
          </div>
        )}
      </footer>
    </div>
  );
}
