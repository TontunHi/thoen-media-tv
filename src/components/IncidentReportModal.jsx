import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  X,
  Save,
  CheckSquare,
  Square,
  ShieldAlert,
  Users,
  Ambulance,
  Sliders,
  CheckCircle2
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
  const [incidentFrequency, setIncidentFrequency] = useState('');
  const [frequencyDetail, setFrequencyDetail] = useState('');
  const [managementActions, setManagementActions] = useState([]);
  const [emsUnits, setEmsUnits] = useState('');
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

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

      setIncidentFrequency(incident.incident_frequency || '');
      setFrequencyDetail(incident.frequency_detail || '');

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
        incident_frequency: incidentFrequency,
        frequency_detail: frequencyDetail,
        management_actions: managementActions,
        ems_units: emsUnits
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      if (onUpdateIncident) {
        onUpdateIncident();
      }
    } catch (err) {
      console.error('Save metadata error:', err);
      alert('บันทึกข้อมูลไม่สำเร็จ: ' + (err.message || err));
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

  // Helper for Triage Sieve: แสดงเฉพาะสี (แดง, เหลือง, เขียว, ดำ) ไม่ต้องบอกระดับ
  const getTriageColorLabel = (color, level) => {
    const c = (color || '').toLowerCase();
    if (c === 'red' || c === 'แดง') return { label: 'แดง', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' };
    if (c === 'yellow' || c === 'เหลือง') return { label: 'เหลือง', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' };
    if (c === 'green' || c === 'เขียว') return { label: 'เขียว', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (c === 'black' || c === 'white' || c === 'ดำ') return { label: 'ดำ', badgeClass: 'bg-slate-900 text-white border-slate-700' };

    if (level) {
      const lvl = String(level).toLowerCase();
      if (lvl.includes('แดง') || lvl.includes('วิกฤต') || lvl.includes('red')) return { label: 'แดง', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' };
      if (lvl.includes('เหลือง') || lvl.includes('เร่งด่วน') || lvl.includes('yellow')) return { label: 'เหลือง', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' };
      if (lvl.includes('เขียว') || lvl.includes('ไม่เร่งด่วน') || lvl.includes('green')) return { label: 'เขียว', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      if (lvl.includes('ดำ') || lvl.includes('เสียชีวิต') || lvl.includes('black')) return { label: 'ดำ', badgeClass: 'bg-slate-900 text-white border-slate-700' };
    }
    return { label: level || '-', badgeClass: 'bg-slate-100 text-slate-800 border-slate-200' };
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      {/* Modal Container */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
              <FileSpreadsheet size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                <span>ส่งออกรายงานอุบัติเหตุหมู่ (Excel)</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                  .xlsx
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
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <FileSpreadsheet size={16} />
              <span>{downloadingExcel ? 'กำลังสร้างไฟล์...' : 'ดาวน์โหลด Excel (.xlsx)'}</span>
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

        {/* INCIDENT INFO BANNER */}
        <div className="px-6 py-3 bg-emerald-50/80 border-b border-emerald-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span className="text-slate-900 font-semibold">เหตุการณ์:</span>
            <span className="text-emerald-950 font-bold">{incident?.title}</span>
            <span className="text-slate-400">•</span>
            <span>{timeframeText}</span>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-100 px-3 py-1 rounded-full animate-fadeIn">
              <CheckCircle2 size={14} />
              <span>บันทึกข้อมูลเรียบร้อยแล้ว</span>
            </div>
          )}
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* SECTION 1: CHECKLIST & METADATA FORM */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Sliders size={18} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                ข้อมูลประกอบแบบรายงาน (บันทึกลงในไฟล์ Excel)
              </h3>
            </div>

            {/* 1. บริเวณที่เกิดเหตุ (อุบัติเหตุจราจร) Checkboxes */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-2">
                บริเวณที่เกิดเหตุ (อุบัติเหตุจราจร) :
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ROAD_OPTIONS.map((item) => {
                  const isChecked = roadConditions.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleRoad(item)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition text-left cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                      ) : (
                        <Square size={16} className="text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. ความถี่ของสถานที่เกิดเหตุ/เดือน */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-2">
                ความถี่ของสถานที่เกิดเหตุ/เดือน :
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'ครั้งแรก', label: 'ครั้งแรก' },
                  { value: 'ครั้งที่ 2', label: 'ครั้งที่ 2' },
                  { value: 'ครั้งที่ 3', label: 'ครั้งที่ 3' },
                  { value: 'มากกว่า3 ครั้ง/ เดือน', label: 'มากกว่า 3 ครั้ง/เดือน' }
                ].map((opt) => {
                  const isSelected = incidentFrequency === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setIncidentFrequency(isSelected ? '' : opt.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition text-left cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                      ) : (
                        <Square size={16} className="text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {incidentFrequency === 'มากกว่า3 ครั้ง/ เดือน' && (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                    (ระบุรายละเอียด/จำนวนครั้ง):
                  </span>
                  <input
                    type="text"
                    value={frequencyDetail}
                    onChange={(e) => setFrequencyDetail(e.target.value)}
                    placeholder="เช่น 4 ครั้ง หรือ เกิดซ้ำทุกสัปดาห์"
                    className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* 3. การจัดการ Checkboxes */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-2">
                การจัดการ :
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MANAGEMENT_OPTIONS.map((item) => {
                  const isChecked = managementActions.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleManagement(item)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition text-left cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                      ) : (
                        <Square size={16} className="text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. ชุดปฏิบัติการฉุกเฉิน */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Ambulance size={16} className="text-emerald-600" />
                <label htmlFor="ems-input" className="text-xs font-semibold text-slate-800">
                  ชุดปฏิบัติการฉุกเฉินที่ออกปฏิบัติการ
                </label>
              </div>
              <input
                id="ems-input"
                type="text"
                value={emsUnits}
                onChange={(e) => setEmsUnits(e.target.value)}
                placeholder="เช่น EMS รพ.เถิน, กู้ภัยเถินบุรี, กู้ภัยออมบุญ"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveMetadata}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Save size={14} />
                <span>{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลเพิ่มเติม'}</span>
              </button>
            </div>
          </div>

          {/* SECTION 2: STATS SUMMARY CARDS */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Users size={16} className="text-emerald-600" />
                <span>สรุปข้อมูลสถิติที่จะลงในรายงาน Excel</span>
              </h3>
              <span className="text-xs font-medium text-slate-500">
                รวมทั้งหมด {totalCount} คน (ตรวจรักษาใน รพ. {regCount} คน, ไม่ประสงค์ตรวจ {refuseCount} คน)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-semibold">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  <span>แดง:</span>
                </span>
                <span className="text-base font-bold font-mono text-rose-700">{summary?.red || 0} คน</span>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>เหลือง:</span>
                </span>
                <span className="text-base font-bold font-mono text-amber-700">{summary?.yellow || 0} คน</span>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span>เขียว:</span>
                </span>
                <span className="text-base font-bold font-mono text-emerald-700">{summary?.green || 0} คน</span>
              </div>

              <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                  <span>ดำ:</span>
                </span>
                <span className="text-base font-bold font-mono text-slate-900">{summary?.black || 0} คน</span>
              </div>
            </div>
          </div>

          {/* SECTION 3: PATIENT DATA PREVIEW TABLE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                ตัวอย่างรายชื่อผู้บาดเจ็บ ({patients.length} ราย)
              </h3>
              <span className="text-[11px] text-slate-500">
                * Triage Sieve ในไฟล์ Excel จะแสดงเฉพาะชื่อสี (แดง, เหลือง, เขียว, ดำ)
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-white font-semibold z-10">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">ลำดับ</th>
                      <th className="py-2.5 px-3">ชื่อสกุล</th>
                      <th className="py-2.5 px-2 text-center w-16">อายุ</th>
                      <th className="py-2.5 px-3 text-center w-24">Triage Sieve</th>
                      <th className="py-2.5 px-3 text-center w-28">พาหนะ</th>
                      <th className="py-2.5 px-3">วินิจฉัยเบื้องต้น</th>
                      <th className="py-2.5 px-2 text-center w-14">D/C</th>
                      <th className="py-2.5 px-2 text-center w-14">Admit</th>
                      <th className="py-2.5 px-3 text-center w-28">Refer</th>
                      <th className="py-2.5 px-2 text-center w-20">Dead</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {patients.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="p-6 text-center text-slate-500 italic">
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

                        let deadText = '';
                        if (isDeadScene) deadText = 'จุดเกิดเหตุ';
                        else if (isDeadTransport) deadText = 'ระหว่างส่ง';
                        else if (isDeadHospital) deadText = 'ใน รพ.';

                        const { label: triageColorOnly, badgeClass } = getTriageColorLabel(pt.triage_color, pt.triage_level);

                        return (
                          <tr key={pt.id || idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-center font-mono font-semibold text-slate-600">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              {pt.pt_name || 'ไม่ระบุชื่อ'}
                            </td>
                            <td className="py-2 px-2 text-center text-slate-700">
                              {pt.age ? `${pt.age} ปี` : '-'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${badgeClass}`}>
                                {triageColorOnly}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center text-slate-700">
                              {pt.transport && pt.transport !== '-' ? pt.transport : '-'}
                            </td>
                            <td className="py-2 px-3 text-slate-800">
                              {pt.diag && pt.diag !== '-' ? pt.diag : (pt.injury_info || '-')}
                            </td>
                            <td className="py-2 px-2 text-center font-semibold text-slate-900">
                              {isDC ? '✓' : ''}
                            </td>
                            <td className="py-2 px-2 text-center font-semibold text-slate-900">
                              {isAdmit ? '✓' : ''}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-800 truncate max-w-[120px]">
                              {referHosp || '-'}
                            </td>
                            <td className="py-2 px-2 text-center font-semibold text-rose-700">
                              {deadText ? `✓ (${deadText})` : ''}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER ACTION BAR */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveMetadata}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-98 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Save size={16} />
              <span>{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <FileSpreadsheet size={18} />
              <span>{downloadingExcel ? 'กำลังสร้างไฟล์ Excel...' : '📥 ดาวน์โหลดรายงาน Excel (.xlsx)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
