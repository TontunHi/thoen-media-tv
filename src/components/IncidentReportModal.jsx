import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Printer,
  X,
  Save,
  CheckSquare,
  Square,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  FileText,
  Clock,
  MapPin,
  Ambulance,
  Sliders,
  Users
} from 'lucide-react';
import { api } from '../services/api';

// Helper to format Date in Thai
const formatThaiDateFull = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const parts = String(dateStr).slice(0, 10).split('-');
    if (parts.length === 3) {
      const d = parseInt(parts[2], 10);
      const m = parseInt(parts[1], 10) - 1;
      const yBE = parseInt(parts[0], 10) + 543;
      const monthNames = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      return `${d} ${monthNames[m] || ''} ${yBE}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

const ROAD_OPTIONS = [
  'ทางตรง',
  'ทางโค้ง',
  'ทางแยก',
  'ตัดหน้ากระชั้นชิด',
  'ผิวทางชำรุด',
  'ลงเขา',
  'ฝนตก',
  'ถนนลื่น'
];

const MANAGEMENT_OPTIONS = [
  'ใช้แผนอุบัติเหตุหมู่',
  'รายงานศูนย์รับแจ้งเหตุ',
  'รายงาน สสจ.',
  'รายงาน สพฉ.(ศูนย์นเรนทร)'
];

export default function IncidentReportModal({ incident, summary, patients = [], onClose, onUpdateIncident }) {
  const [roadConditions, setRoadConditions] = useState([]);
  const [managementActions, setManagementActions] = useState([]);
  const [emsUnits, setEmsUnits] = useState('');
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'form'
  const printRef = useRef(null);

  // Initialize from incident
  useEffect(() => {
    if (incident) {
      try {
        const rc = typeof incident.road_conditions === 'string'
          ? (incident.road_conditions.startsWith('[') ? JSON.parse(incident.road_conditions) : incident.road_conditions.split(',').map(s => s.trim()))
          : (Array.isArray(incident.road_conditions) ? incident.road_conditions : []);
        setRoadConditions(rc.filter(Boolean));
      } catch (e) {
        setRoadConditions([]);
      }

      try {
        const ma = typeof incident.management_actions === 'string'
          ? (incident.management_actions.startsWith('[') ? JSON.parse(incident.management_actions) : incident.management_actions.split(',').map(s => s.trim()))
          : (Array.isArray(incident.management_actions) ? incident.management_actions : []);
        setManagementActions(ma.filter(Boolean));
      } catch (e) {
        setManagementActions([]);
      }

      setEmsUnits(incident.ems_units || '');
    }
  }, [incident]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Toggle Road condition
  const toggleRoad = (item) => {
    setRoadConditions((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  // Toggle Management action
  const toggleManagement = (item) => {
    setManagementActions((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  // Save current checklist fields to database
  const handleSaveMetadata = async () => {
    if (!incident?.id) return;
    setSaving(true);
    try {
      await api.updateIncident(incident.id, {
        road_conditions: roadConditions,
        management_actions: managementActions,
        ems_units: emsUnits
      });
      if (onUpdateIncident) {
        onUpdateIncident();
      }
    } catch (err) {
      console.error('Save metadata error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Download Excel
  const handleDownloadExcel = async () => {
    if (!incident?.id) return;
    setDownloadingExcel(true);
    try {
      await handleSaveMetadata();
      await api.downloadIncidentExcel(incident.id);
    } catch (err) {
      alert('ดาวน์โหลด Excel ไม่สำเร็จ: ' + (err.message || err));
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Trigger Print (A4 Portrait)
  const handlePrint = async () => {
    await handleSaveMetadata();
    window.print();
  };

  // Format Timeframe Text
  const sDate = incident?.incident_date ? String(incident.incident_date).slice(0, 10) : '';
  const eDate = incident?.end_date ? String(incident.end_date).slice(0, 10) : '';
  const sTime = incident?.start_time ? `${incident.start_time} น.` : '';
  const eTime = incident?.end_time ? `${incident.end_time} น.` : '';

  let timeframeText = '';
  if (eDate && eDate !== sDate) {
    timeframeText = `${formatThaiDateFull(sDate)} ${sTime} ถึง ${formatThaiDateFull(eDate)} ${eTime || ''}`.trim();
  } else if (eTime) {
    timeframeText = `${formatThaiDateFull(sDate)} เวลา ${sTime} ถึง ${eTime}`.trim();
  } else {
    timeframeText = `${formatThaiDateFull(sDate)} เวลา ${sTime} (ดึงสดถึงปัจจุบัน)`.trim();
  }

  const regCount = summary?.registered_count !== undefined ? summary.registered_count : patients.length;
  const refuseCount = summary?.refuse_treatment || summary?.refuse_treatment_count || 0;
  const totalCount = summary?.total !== undefined ? summary.total : (regCount + refuseCount);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 print:p-0 print:bg-white print:static">
      {/* Modal Container */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* MODAL HEADER (Hidden when printing) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
              <FileText size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>ส่งออกรายงานอุบัติเหตุหมู่ / สาธารณภัย</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                  A4 Portrait / Excel
                </span>
              </h2>
              <p className="text-xs text-slate-400">โรงพยาบาลเถิน จ.ลำปาง</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-black rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <FileSpreadsheet size={16} />
              <span>{downloadingExcel ? 'กำลังสร้าง Excel...' : 'ดาวน์โหลด Excel (.xlsx)'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs sm:text-sm font-black rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <Printer size={16} />
              <span>พิมพ์ / บันทึก PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer ml-1"
              aria-label="ปิด"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTROLS STRIP (Hidden when printing) */}
        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span className="text-slate-900 font-extrabold">เหตุการณ์:</span>
            <span className="text-indigo-900 font-black">{incident?.title}</span>
            <span className="text-slate-400">•</span>
            <span>{timeframeText}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📄 ตัวอย่างเอกสาร A4
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                activeTab === 'form'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ✏️ กรอก/ติ๊กข้อมูลเพิ่มเติม
            </button>
          </div>
        </div>

        {/* MODAL BODY (Scrollable on screen, Full on print) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
          {/* TAB 1: FORM & CHECKLIST EDITOR */}
          {activeTab === 'form' && (
            <div className="space-y-5 print:hidden max-w-4xl mx-auto pb-4">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <Sliders size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-800">
                    บริเวณที่เกิดเหตุ (อุบัติเหตุจราจร) [ติ๊กเลือกได้หลายข้อ]
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {ROAD_OPTIONS.map((opt) => {
                    const isChecked = roadConditions.includes(opt);
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => toggleRoad(opt)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer select-none text-left ${
                          isChecked
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-black shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare size={16} className="text-indigo-600 shrink-0" />
                        ) : (
                          <Square size={16} className="text-slate-400 shrink-0" />
                        )}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <ShieldAlert size={18} className="text-emerald-600" />
                  <h3 className="text-sm font-black text-slate-800">
                    การจัดการ [ติ๊กเลือกได้หลายข้อ]
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {MANAGEMENT_OPTIONS.map((opt) => {
                    const isChecked = managementActions.includes(opt);
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => toggleManagement(opt)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer select-none text-left ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-black shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                        ) : (
                          <Square size={16} className="text-slate-400 shrink-0" />
                        )}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <Ambulance size={18} className="text-amber-600" />
                  <label htmlFor="ems-input" className="text-sm font-black text-slate-800">
                    ชุดปฏิบัติการฉุกเฉินที่ออกปฏิบัติการ
                  </label>
                </div>
                <input
                  id="ems-input"
                  type="text"
                  value={emsUnits}
                  onChange={(e) => setEmsUnits(e.target.value)}
                  placeholder="เช่น EMS รพ.เถิน, กู้ภัยเถินบุรี, กู้ภัยออมบุญ"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveMetadata}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Save size={15} />
                  <span>{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
                >
                  <FileText size={15} />
                  <span>ดูตัวอย่างเอกสาร A4</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2 / PRINTABLE VIEW: PIXEL-PERFECT A4 PORTRAIT DOCUMENT */}
          {(activeTab === 'preview' || true) && (
            <div
              ref={printRef}
              className={`${activeTab === 'form' ? 'hidden print:block' : 'block'} bg-white mx-auto text-slate-900 font-sans max-w-[210mm] p-6 sm:p-8 border border-slate-200 shadow-lg rounded-2xl print:max-w-none print:p-0 print:border-none print:shadow-none print:rounded-none`}
              style={{ minHeight: '297mm' }}
            >
              {/* PRINT CSS STYLES */}
              <style>{`
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 12mm 10mm 12mm 10mm;
                  }
                  body {
                    background: white !important;
                    color: black !important;
                    font-size: 11pt;
                  }
                  .print\\:hidden {
                    display: none !important;
                  }
                }
              `}</style>

              {/* 1. DOCUMENT TITLE */}
              <div className="text-center pb-2 border-b-2 border-slate-900">
                <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight leading-tight">
                  แบบรายงานอุบัติเหตุหมู่/สาธารณภัย ในโรงพยาบาลเถิน จังหวัดลำปาง
                </h1>
              </div>

              {/* 2. INCIDENT METADATA HEADER */}
              <div className="text-xs sm:text-sm text-slate-900 font-medium py-3 space-y-1.5 border-b border-slate-300">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <strong>เหตุการณ์:</strong> <span className="font-bold underline decoration-slate-400 underline-offset-2">{incident?.title || '-'}</span>
                  </div>
                  <div>
                    <strong>วัน-เวลาที่เกิดเหตุ:</strong> <span>{timeframeText}</span>
                  </div>
                </div>

                <div>
                  <strong>สถานที่เกิดเหตุ (ถนน, ตำบล, อำเภอ, จังหวัด)(รายละเอียด):</strong>{' '}
                  <span>{incident?.location || '-'}</span>
                </div>

                {/* Road Conditions Checkboxes */}
                <div>
                  <strong className="mr-1">บริเวณที่เกิดเหตุ(อุบัติเหตุจราจร):</strong>
                  <span className="space-x-3 text-xs leading-relaxed">
                    {ROAD_OPTIONS.map((opt) => (
                      <span key={opt} className="inline-flex items-center gap-1">
                        <span className="font-mono text-sm font-black">
                          {roadConditions.includes(opt) ? '[✓]' : '[ ]'}
                        </span>
                        <span>{opt}</span>
                      </span>
                    ))}
                  </span>
                </div>

                {/* Management Actions Checkboxes */}
                <div>
                  <strong className="mr-1">การจัดการ:</strong>
                  <span className="space-x-3 text-xs leading-relaxed">
                    {MANAGEMENT_OPTIONS.map((opt) => (
                      <span key={opt} className="inline-flex items-center gap-1">
                        <span className="font-mono text-sm font-black">
                          {managementActions.includes(opt) ? '[✓]' : '[ ]'}
                        </span>
                        <span>{opt}</span>
                      </span>
                    ))}
                  </span>
                </div>

                <div>
                  <strong>ชุดปฎิบัติการฉุกเฉินที่ออกปฏิบัติการ:</strong>{' '}
                  <span className="font-bold">{emsUnits || '-'}</span>
                </div>
              </div>

              {/* 3. PATIENTS TABLE SECTION */}
              <div className="pt-3">
                <h2 className="text-xs sm:text-sm font-black text-slate-950 mb-2">
                  ข้อมูลผู้บาดเจ็บ
                </h2>

                <div className="w-full overflow-hidden border border-slate-900 rounded-sm">
                  <table className="w-full text-left border-collapse table-fixed text-[11px] sm:text-xs">
                    <thead>
                      {/* Sub-Header Row 1 */}
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900 text-center">
                        <th rowSpan="2" className="border-r border-slate-900 p-1 w-9 align-middle">ลำดับ</th>
                        <th rowSpan="2" className="border-r border-slate-900 p-1.5 w-32 align-middle text-left">ชื่อสกุล</th>
                        <th rowSpan="2" className="border-r border-slate-900 p-1 w-12 align-middle">อายุ (ปี)</th>
                        <th rowSpan="2" className="border-r border-slate-900 p-1 w-20 align-middle">Triage Sieve</th>
                        <th rowSpan="2" className="border-r border-slate-900 p-1 w-22 align-middle">พาหนะผู้บาดเจ็บ</th>
                        <th rowSpan="2" className="border-r border-slate-900 p-1.5 w-36 align-middle text-left">วินิจฉัยเบื้องต้น</th>
                        <th colSpan="6" className="border-b border-slate-900 p-1 bg-slate-200/80 font-black">ผลการรักษา</th>
                      </tr>

                      {/* Sub-Header Row 2 */}
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900 text-center">
                        <th className="border-r border-slate-900 p-1 w-9 align-middle">D/C</th>
                        <th className="border-r border-slate-900 p-1 w-9 align-middle">Admit</th>
                        <th className="border-r border-slate-900 p-1 w-24 align-middle">Refer (ระบุ รพ.)</th>
                        <th className="border-r border-slate-900 p-0.5 w-14 align-middle text-[10px]">จุดเกิดเหตุ</th>
                        <th className="border-r border-slate-900 p-0.5 w-14 align-middle text-[10px]">ระหว่างนำส่ง</th>
                        <th className="p-0.5 w-14 align-middle text-[10px]">ใน รพ.</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800">
                      {patients.length === 0 ? (
                        <tr>
                          <td colSpan="12" className="p-4 text-center text-slate-500 italic">
                            ไม่พบข้อมูลผู้บาดเจ็บในช่วงเวลาที่ระบุ
                          </td>
                        </tr>
                      ) : (
                        patients.map((pt, idx) => {
                          const status = (pt.current_status || '').toLowerCase();
                          const isDC = status.includes('กลับบ้าน') || status.includes('d/c') || status.includes('discharge');
                          const isAdmit = status.includes('admit') || status.includes('นอนโรงพยาบาล') || status.includes('ตึก');

                          let referHosp = '';
                          if (status.includes('ส่งต่อ') || status.includes('refer')) {
                            referHosp = pt.current_status.replace(/^ส่งต่อ:\s*/i, '').replace(/^refer:\s*/i, '').trim();
                          }

                          const isDead = pt.triage_color === 'black' || pt.triage_color === 'white' || status.includes('เสียชีวิต') || status.includes('ตาย');
                          const isDeadScene = isDead && (status.includes('ก่อนถึง') || pt.dead_before_arrive || status.includes('จุดเกิดเหตุ'));
                          const isDeadHospital = isDead && (status.includes('ใน รพ') || pt.dead_in_hospital || status.includes('ในโรงพยาบาล'));
                          const isDeadTransport = isDead && !isDeadScene && !isDeadHospital;

                          let triageBadgeColor = 'text-slate-900 font-extrabold';
                          let triageLabel = pt.triage_level || '-';
                          if (pt.triage_color === 'red') {
                            triageLabel = 'วิกฤต (แดง)';
                            triageBadgeColor = 'text-rose-700 font-black';
                          } else if (pt.triage_color === 'yellow') {
                            triageLabel = 'เร่งด่วน (เหลือง)';
                            triageBadgeColor = 'text-amber-800 font-black';
                          } else if (pt.triage_color === 'green') {
                            triageLabel = 'ไม่เร่งด่วน (เขียว)';
                            triageBadgeColor = 'text-emerald-800 font-bold';
                          } else if (pt.triage_color === 'black' || pt.triage_color === 'white') {
                            triageLabel = 'เสียชีวิต (ดำ)';
                            triageBadgeColor = 'text-slate-900 font-black';
                          }

                          return (
                            <tr key={pt.id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="border-r border-slate-800 p-1 text-center font-mono align-middle">
                                {idx + 1}
                              </td>
                              <td className="border-r border-slate-800 p-1.5 font-bold align-middle truncate">
                                {pt.pt_name || 'ไม่ระบุชื่อ'}
                              </td>
                              <td className="border-r border-slate-800 p-1 text-center align-middle">
                                {pt.age || '-'}
                              </td>
                              <td className={`border-r border-slate-800 p-1 text-center align-middle text-[10px] ${triageBadgeColor}`}>
                                {triageLabel}
                              </td>
                              <td className="border-r border-slate-800 p-1 text-center align-middle text-[11px] truncate">
                                {pt.transport && pt.transport !== '-' ? pt.transport : '-'}
                              </td>
                              <td className="border-r border-slate-800 p-1.5 align-middle text-[11px] break-words">
                                {pt.diag && pt.diag !== '-' ? pt.diag : (pt.injury_info || '-')}
                              </td>
                              <td className="border-r border-slate-800 p-1 text-center font-bold text-slate-900 align-middle">
                                {isDC ? '✓' : ''}
                              </td>
                              <td className="border-r border-slate-800 p-1 text-center font-bold text-slate-900 align-middle">
                                {isAdmit ? '✓' : ''}
                              </td>
                              <td className="border-r border-slate-800 p-1 text-center font-medium text-[11px] align-middle truncate">
                                {referHosp || '-'}
                              </td>
                              <td className="border-r border-slate-800 p-0.5 text-center font-bold text-rose-700 align-middle">
                                {isDeadScene ? '✓' : ''}
                              </td>
                              <td className="border-r border-slate-800 p-0.5 text-center font-bold text-rose-700 align-middle">
                                {isDeadTransport ? '✓' : ''}
                              </td>
                              <td className="p-0.5 text-center font-bold text-rose-700 align-middle">
                                {isDeadHospital ? '✓' : ''}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. SUMMARY STATISTICS FOOTER (Matching user's request) */}
              <div className="mt-4 p-3 border border-slate-800 rounded-lg bg-slate-50 text-xs sm:text-sm text-slate-900 space-y-1.5">
                <div className="font-bold flex flex-wrap items-center justify-between">
                  <span>
                    <strong>สรุปผลผู้บาดเจ็บทั้งหมด:</strong>{' '}
                    <span className="text-sm sm:text-base font-black text-slate-950 underline decoration-slate-400">
                      {totalCount} คน
                    </span>{' '}
                    (รับการตรวจรักษาใน รพ.: <strong>{regCount}</strong> คน, ไม่ประสงค์ตรวจรักษา: <strong>{refuseCount}</strong> คน)
                  </span>
                </div>
                <div className="text-xs text-slate-800 font-medium flex flex-wrap items-center gap-3 pt-1 border-t border-slate-200">
                  <span><strong>สถิติตามระดับความรุนแรง:</strong></span>
                  <span className="text-rose-700 font-bold">วิกฤต (แดง): {summary?.red || 0} คน</span>
                  <span>|</span>
                  <span className="text-amber-800 font-bold">เร่งด่วน (เหลือง): {summary?.yellow || 0} คน</span>
                  <span>|</span>
                  <span className="text-emerald-800 font-bold">ไม่เร่งด่วน (เขียว): {summary?.green || 0} คน</span>
                  <span>|</span>
                  <span className="text-slate-950 font-bold">เสียชีวิต (ดำ): {summary?.black || 0} คน</span>
                </div>
              </div>

              {/* 5. REPORT FOOTER NOTICE */}
              <div className="mt-6 pt-3 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
                <span>ระบบศูนย์บัญชาการอุบัติเหตุหมู่ (MCI Command) • โรงพยาบาลเถิน จ.ลำปาง</span>
                <span>พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
