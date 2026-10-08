import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Plus,
  Radio,
  Tv,
  Users,
  RefreshCw,
  Trash2,
  Edit3,
  CheckCircle2,
  ExternalLink,
  Calendar,
  Clock,
  MapPin,
  Save,
  AlertCircle,
  Sparkles,
  Check,
  X,
  ChevronDown,
  Activity,
  Layers,
  Info,
  Sliders,
  Maximize2,
  Server,
  Zap,
  HelpCircle,
  Copy,
  MonitorPlay,
  RotateCcw,
  Volume2,
  FileText,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import ThaiDateSelector from './ThaiDateSelector';
import IncidentReportModal from './IncidentReportModal';

// Helper to format date string to Thai DD/MM/BBBB
const formatThaiDateShort = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) {
      const yBE = parseInt(parts[0], 10) + 543;
      return `${parts[2]}/${parts[1]}/${yBE}`;
    }
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}`;
  } catch (e) {
    return dateStr;
  }
};

export default function IncidentManager() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [incidentData, setIncidentData] = useState(null);
  const [summary, setSummary] = useState({ red: 0, yellow: 0, green: 0, black: 0, refuse_treatment: 0, total: 0 });
  const [patientCount, setPatientCount] = useState(0);
  const [patientsList, setPatientsList] = useState([]);
  const [tvs, setTvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);

  // Incident Edit Form State
  const [formState, setFormState] = useState({
    title: '',
    location: '',
    incident_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    start_time: '',
    end_time: '',
    refuse_treatment_count: 0,
    is_auto_sync: true,
    notes: '',
  });

  // Emergency Broadcast State
  const [selectedBroadcastTvs, setSelectedBroadcastTvs] = useState([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // New Incident Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newIncidentForm, setNewIncidentForm] = useState({
    title: '',
    location: '',
    incident_date: new Date().toISOString().slice(0, 10),
    start_time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    refuse_treatment_count: 0,
    is_auto_sync: true,
  });

  // Show Toast
  const showToast = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  // Load All Incidents & TVs
  const loadInitialData = async () => {
    try {
      const [incList, tvList] = await Promise.all([
        api.getIncidents().catch(() => []),
        api.getTvs().catch(() => []),
      ]);
      setIncidents(incList);
      setTvs(tvList);

      if (incList.length > 0) {
        const active = incList.find((i) => i.is_active === 1) || incList[0];
        setSelectedIncidentId(active.id);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
      showToast('error', 'ไม่สามารถโหลดข้อมูลเบื้องต้นได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Socket.io Real-time listener
    const socket = getSocket();
    const handleUpdate = () => {
      if (selectedIncidentId) {
        loadIncidentDetails(selectedIncidentId, true);
      }
    };
    socket.on('incident_updated', handleUpdate);
    socket.on('tv_config_changed', () => {
      api.getTvs().then(setTvs).catch(() => {});
    });

    return () => {
      socket.off('incident_updated', handleUpdate);
      socket.off('tv_config_changed');
    };
  }, []);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showNewModal) {
        setShowNewModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNewModal]);

  // Load Selected Incident Details
  const loadIncidentDetails = useCallback(async (id, silent = false) => {
    if (!id) return;
    if (!silent) setSaving(true);
    try {
      const res = await api.getIncident(id);
      setIncidentData(res.incident);
      setPatientsList(res.patients || []);
      setPatientCount(res.patients?.length || 0);
      setSummary(res.summary || { red: 0, yellow: 0, green: 0, black: 0, refuse_treatment: 0, total: 0 });
      setLastSyncTime(new Date());

      setFormState({
        title: res.incident.title || '',
        location: res.incident.location || '',
        incident_date: res.incident.incident_date ? res.incident.incident_date.slice(0, 10) : '',
        end_date: res.incident.end_date ? res.incident.end_date.slice(0, 10) : '',
        start_time: res.incident.start_time || '',
        end_time: res.incident.end_time || '',
        refuse_treatment_count: res.incident.refuse_treatment_count || 0,
        is_auto_sync: res.incident.is_auto_sync !== 0,
        notes: res.incident.notes || '',
      });

      setIsBroadcasting(res.incident.is_active === 1);
      try {
        const tvList = typeof res.incident.broadcast_tvs === 'string'
          ? JSON.parse(res.incident.broadcast_tvs)
          : (res.incident.broadcast_tvs || []);
        setSelectedBroadcastTvs(tvList);
      } catch (e) {
        setSelectedBroadcastTvs([]);
      }
    } catch (err) {
      console.error('Failed to load incident detail:', err);
      showToast('error', 'ไม่สามารถโหลดข้อมูลอุบัติเหตุหมู่นี้ได้');
    } finally {
      if (!silent) setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (selectedIncidentId) {
      loadIncidentDetails(selectedIncidentId);
    }
  }, [selectedIncidentId, loadIncidentDetails]);

  // Handle Save Incident Info
  const handleSaveIncident = async (e) => {
    if (e) e.preventDefault();
    if (!selectedIncidentId) return;
    setSaving(true);
    try {
      await api.updateIncident(selectedIncidentId, {
        ...formState,
        is_auto_sync: formState.is_auto_sync ? 1 : 0,
      });
      showToast('success', 'บันทึกข้อมูลและอัปเดตการกรองข้อมูล HOSxP เรียบร้อยแล้ว');
      loadIncidentDetails(selectedIncidentId, true);
      setPreviewKey((prev) => prev + 1);
    } catch (err) {
      console.error('Save incident error:', err);
      showToast('error', err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  // Handle Manual Auto-Sync from HOSxP
  const handleManualAutoSync = async () => {
    if (!selectedIncidentId) return;
    setSyncing(true);
    try {
      const res = await api.triggerIncidentAutoSync(selectedIncidentId);
      if (res.success) {
        showToast('success', `ซิงค์ HOSxP สำเร็จ (ผู้ป่วยบนบอร์ด: ${res.total || 0} คน, เพิ่มใหม่: ${res.newCount || 0}, อัปเดต: ${res.updatedCount || 0})`);
      } else {
        showToast('error', res.error || 'ไม่สามารถซิงค์ข้อมูลได้');
      }
      loadIncidentDetails(selectedIncidentId, true);
      setPreviewKey((prev) => prev + 1);
    } catch (err) {
      showToast('error', 'ซิงค์ข้อมูลไม่สำเร็จ: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Handle Create New Incident
  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!newIncidentForm.title || !newIncidentForm.incident_date) {
      showToast('error', 'กรุณาระบุชื่อเหตุการณ์และวันที่เกิดเหตุ');
      return;
    }
    setSaving(true);
    try {
      const created = await api.createIncident({
        ...newIncidentForm,
        is_auto_sync: newIncidentForm.is_auto_sync ? 1 : 0,
      });
      showToast('success', 'สร้างรายงานเหตุการณ์และเริ่มดึงข้อมูลสดสำเร็จ');
      setShowNewModal(false);
      setNewIncidentForm({
        title: '',
        location: '',
        incident_date: new Date().toISOString().slice(0, 10),
        start_time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        refuse_treatment_count: 0,
        is_auto_sync: true,
      });
      const list = await api.getIncidents();
      setIncidents(list);
      setSelectedIncidentId(created.id);
    } catch (err) {
      console.error('Create incident error:', err);
      showToast('error', err.message || 'สร้างเหตุการณ์ไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete Incident
  const handleDeleteIncident = async () => {
    if (!selectedIncidentId) return;
    if (!window.confirm(`ยืนยันการลบเหตุการณ์ "${formState.title}"?`)) return;

    setSaving(true);
    try {
      await api.deleteIncident(selectedIncidentId);
      showToast('success', 'ลบเหตุการณ์เรียบร้อยแล้ว');
      const list = await api.getIncidents();
      setIncidents(list);
      setSelectedIncidentId(list.length > 0 ? list[0].id : null);
      if (list.length === 0) {
        setIncidentData(null);
        setPatientCount(0);
      }
    } catch (err) {
      showToast('error', err.message || 'ลบไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  // Handle Emergency Broadcast Toggle
  const handleToggleBroadcast = async () => {
    if (!selectedIncidentId) return;
    const nextState = !isBroadcasting;

    if (nextState && selectedBroadcastTvs.length === 0) {
      showToast('error', 'กรุณาเลือกจอ TV อย่างน้อย 1 จอ เพื่อถ่ายทอดสด');
      return;
    }

    setSaving(true);
    try {
      await api.broadcastIncident(selectedIncidentId, nextState, selectedBroadcastTvs);
      setIsBroadcasting(nextState);
      showToast(
        'success',
        nextState
          ? `🔴 เริ่มถ่ายทอดสดขึ้นจอ TV (${selectedBroadcastTvs.length} จอ)`
          : '⏹️ ปิดการถ่ายทอดสด คืนหน้าจอเป็น Playlist ปกติ'
      );
      loadIncidentDetails(selectedIncidentId, true);
    } catch (err) {
      showToast('error', err.message || 'เกิดข้อผิดพลาดในการสั่งถ่ายทอดสด');
    } finally {
      setSaving(false);
    }
  };

  // Toggle TV checkbox for broadcast
  const handleToggleTvSelection = (tvId) => {
    setSelectedBroadcastTvs((prev) =>
      prev.includes(tvId) ? prev.filter((id) => id !== tvId) : [...prev, tvId]
    );
  };

  // Select all TVs
  const handleSelectAllTvs = () => {
    if (selectedBroadcastTvs.length === tvs.length) {
      setSelectedBroadcastTvs([]);
    } else {
      setSelectedBroadcastTvs(tvs.map((t) => t.id));
    }
  };

  // Copy TV Link
  const handleCopyTvLink = () => {
    const url = `${window.location.origin}/tv-incident?id=${selectedIncidentId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast('success', 'คัดลอกลิงก์จอ TV เรียบร้อยแล้ว');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Quick Time Presets
  const setQuickTime = (type) => {
    const now = new Date();
    if (type === 'now') {
      const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      setFormState((prev) => ({ ...prev, start_time: timeStr }));
    } else if (type === 'midnight') {
      setFormState((prev) => ({ ...prev, start_time: '00:00' }));
    } else if (type === 'minus1h') {
      now.setHours(now.getHours() - 1);
      const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      setFormState((prev) => ({ ...prev, start_time: timeStr }));
    } else if (type === 'minus2h') {
      now.setHours(now.getHours() - 2);
      const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      setFormState((prev) => ({ ...prev, start_time: timeStr }));
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[450px]">
        <div className="w-11 h-11 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-bold text-sm tracking-wide">กำลังเชื่อมต่อศูนย์บัญชาการอุบัติเหตุหมู่...</p>
        <p className="text-slate-400 text-xs mt-1">โรงพยาบาลเถิน จ.ลำปาง</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Alert Notification */}
      {message.text && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-5 right-5 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 animate-fade backdrop-blur-md ${
            message.type === 'error'
              ? 'bg-rose-50/95 text-rose-900 border-rose-300 shadow-rose-900/10'
              : 'bg-emerald-50/95 text-emerald-950 border-emerald-300 shadow-emerald-900/10'
          }`}
        >
          {message.type === 'error' ? (
            <AlertCircle size={22} className="text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
          )}
          <span className="text-sm font-bold tracking-tight">{message.text}</span>
        </div>
      )}

      {/* 1. TOP COMMAND HEADER & INCIDENT SWITCHER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-all">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/25 shrink-0">
              <ShieldAlert size={30} className="stroke-[2.2]" />
            </div>
            {incidentData?.is_active === 1 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 border-2 border-white"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                ศูนย์จัดการอุบัติเหตุหมู่ (MCI Command)
              </h1>
              {incidentData?.is_active === 1 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-[11px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  LIVE ON AIR ({selectedBroadcastTvs.length} จอ)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  STANDBY MODE
                </span>
              )}
            </div>
            <p className="text-slate-500 text-xs mt-1 flex items-center gap-2">
              <span>เชื่อมต่อฐานข้อมูล HOSxP อัตโนมัติ</span>
              <span>•</span>
              <span>สั่งตัดภาพถ่ายทอดสดขึ้นจอ TV ห้องฉุกเฉินทันที</span>
            </p>
          </div>
        </div>

        {/* Incident Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <select
              value={selectedIncidentId || ''}
              onChange={(e) => setSelectedIncidentId(Number(e.target.value))}
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer shadow-xs"
              aria-label="เลือกเหตุการณ์อุบัติเหตุหมู่"
            >
              {incidents.length === 0 ? (
                <option value="">-- ยังไม่มีรายงานเหตุการณ์ --</option>
              ) : (
                incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.is_active ? '🔴 [ถ่ายทอดสด] ' : '📋 '}
                    {inc.title} ({formatThaiDateShort(inc.incident_date)})
                  </option>
                ))
              )}
            </select>
            <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {selectedIncidentId && (
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-sm font-black rounded-2xl shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <FileSpreadsheet size={18} />
              <span>ส่งออกรายงาน (Excel)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-sm font-bold rounded-2xl shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus size={18} className="stroke-[2.5]" />
            <span>สร้างเหตุใหม่</span>
          </button>
        </div>
      </div>

      {selectedIncidentId && incidentData ? (
        <>
          {/* 2. REAL-TIME STATS KPI BAR (WCAG HIGH CONTRAST) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* Red / Critical */}
            <div className="bg-rose-50/90 border-2 border-rose-400/90 hover:border-rose-500 p-4 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shadow-sm" />
                  วิกฤต
                </span>
                <span className="text-[10px] font-black text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded-md border border-rose-200">
                  RED
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-mono font-black text-rose-700 tracking-tight">{summary.red}</span>
                <span className="text-xs font-bold text-rose-800">คน</span>
              </div>
            </div>

            {/* Yellow / Urgent */}
            <div className="bg-amber-50/90 border-2 border-amber-400/90 hover:border-amber-500 p-4 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
                  เร่งด่วน
                </span>
                <span className="text-[10px] font-black text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200">
                  YELLOW
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-mono font-black text-amber-700 tracking-tight">{summary.yellow}</span>
                <span className="text-xs font-bold text-amber-900">คน</span>
              </div>
            </div>

            {/* Green / Non-Urgent */}
            <div className="bg-emerald-50/90 border-2 border-emerald-400/90 hover:border-emerald-500 p-4 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-sm" />
                  ไม่เร่งด่วน
                </span>
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
                  GREEN
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-mono font-black text-emerald-700 tracking-tight">{summary.green}</span>
                <span className="text-xs font-bold text-emerald-900">คน</span>
              </div>
            </div>

            {/* Black / Dead */}
            <div className="bg-slate-100 border-2 border-slate-700/80 hover:border-slate-800 p-4 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-950 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-sm" />
                  เสียชีวิต
                </span>
                <span className="text-[10px] font-black text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md border border-slate-300">
                  DEAD
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-mono font-black text-slate-900 tracking-tight">{summary.black}</span>
                <span className="text-xs font-bold text-slate-700">คน</span>
              </div>
            </div>

            {/* Refuse Treatment */}
            <div className="bg-slate-50 border-2 border-slate-300 hover:border-slate-400 p-4 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">ไม่ประสงค์ตรวจ</span>
                <span className="text-[10px] font-black text-slate-600 bg-slate-200 px-2 py-0.5 rounded-md border border-slate-300">
                  REFUSE
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-mono font-black text-amber-600 tracking-tight">{summary.refuse_treatment}</span>
                <span className="text-xs font-bold text-slate-600">คน</span>
              </div>
            </div>

            {/* Total Patients */}
            <div className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-blue-900 text-white p-4 rounded-3xl shadow-md flex flex-col justify-between transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wide text-indigo-200 flex items-center gap-1">
                  <Users size={14} className="text-indigo-300" /> รวมทั้งหมด
                </span>
                <span className="text-[10px] font-black text-yellow-300 bg-black/40 px-2 py-0.5 rounded-md border border-yellow-300/30">
                  TOTAL
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-mono font-black text-yellow-300 tracking-tight">{summary.total}</span>
                <span className="text-xs font-bold text-indigo-200">คน</span>
              </div>
            </div>
          </div>

          {/* 3. EMERGENCY TV BROADCAST CONTROLLER SWITCHBOARD */}
          <div
            className={`p-6 rounded-3xl border transition-all duration-300 ${
              isBroadcasting
                ? 'bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 border-rose-600 text-white shadow-xl shadow-rose-950/30'
                : 'bg-white border-slate-200/90 text-slate-800 shadow-sm'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/80">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-transform ${
                    isBroadcasting ? 'bg-rose-600 text-white animate-pulse shadow-rose-600/40' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <Radio size={24} className="stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black tracking-tight">
                      แผงควบคุมการถ่ายทอดสดจอ TV (Emergency Broadcast Switchboard)
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                        isBroadcasting
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-400/50'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {isBroadcasting ? '● กำลังถ่ายทอดสด (Active)' : '○ ปิดการถ่ายทอดสด (Standby)'}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isBroadcasting ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                    เลือกจอ TV ที่ต้องการให้ตัดภาพมาแสดงบอร์ดอุบัติเหตุหมู่นี้ทันทีแบบ Real-time
                  </p>
                </div>
              </div>

              {/* Master Broadcast Action Button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleBroadcast}
                  disabled={saving}
                  className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-black shadow-lg transition active:scale-98 cursor-pointer ${
                    isBroadcasting
                      ? 'bg-white text-rose-700 hover:bg-slate-100 shadow-white/10 border-2 border-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${isBroadcasting ? 'bg-rose-600 animate-ping' : 'bg-white'}`} />
                  <span>{isBroadcasting ? '⏹️ ปิดการถ่ายทอดสด (คืนจอปกติ)' : '🔴 ถ่ายทอดสดขึ้นจอ TV ทันที'}</span>
                </button>
              </div>
            </div>

            {/* TV Selection Checkboxes */}
            <div className="pt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black uppercase tracking-wider ${isBroadcasting ? 'text-slate-300' : 'text-slate-600'}`}>
                  เลือกจอ TV สำหรับถ่ายทอดสด ({selectedBroadcastTvs.length}/{tvs.length} จอ):
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllTvs}
                  className={`text-xs font-bold underline underline-offset-4 hover:opacity-85 cursor-pointer ${
                    isBroadcasting ? 'text-amber-300' : 'text-indigo-600'
                  }`}
                >
                  {selectedBroadcastTvs.length === tvs.length ? 'ยกเลิกการเลือกทั้งหมด' : 'เลือกทุกจอทั้งหมด'}
                </button>
              </div>

              {tvs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">ยังไม่มีการลงทะเบียนจอ TV ในระบบ</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {tvs.map((tv) => {
                    const isSelected = selectedBroadcastTvs.includes(tv.id);
                    return (
                      <label
                        key={tv.id}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? isBroadcasting
                              ? 'bg-rose-900/70 border-rose-400 text-white shadow-sm'
                              : 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold shadow-xs'
                            : isBroadcasting
                            ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                            : 'bg-slate-50/90 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleTvSelection(tv.id)}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-extrabold truncate flex items-center justify-between">
                            <span>{tv.name}</span>
                            {tv.is_online === 1 && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="ออนไลน์" />
                            )}
                          </div>
                          <div className="text-[10px] opacity-75 truncate mt-0.5">
                            {tv.location || `Slug: ${tv.slug}`}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 4. INCIDENT SETTINGS & HOSXP CONFIGURATION */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Sliders size={20} />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-black text-slate-800">
                    การตั้งค่าเหตุการณ์และการกรอง HOSxP
                  </h2>
                  <p className="text-xs text-slate-500">
                    ปรับเปลี่ยนวัน/เวลาเริ่มเหตุ ระบบจะดึงข้อมูล HOSxP มาแสดงบนจอทีวีอัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDeleteIncident}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3.5 py-2 rounded-xl transition cursor-pointer"
              >
                ลบเหตุการณ์
              </button>
            </div>

            <form onSubmit={handleSaveIncident} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    ชื่อเหตุการณ์ / เหตุเกิด *
                  </label>
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                    placeholder="เช่น รถบัสตกเขาทางหลวง 106"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    สถานที่เกิดเหตุ
                  </label>
                  <input
                    type="text"
                    value={formState.location}
                    onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                    placeholder="เช่น ทล.106 กม.45 ต.แม่ตื่น"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* TIMEFRAME SECTION: START & OPTIONAL END */}
              <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={17} className="text-indigo-600" />
                    <span className="text-sm font-black text-slate-800">
                      ช่วงวันและเวลาของเหตุการณ์ (HOSxP Query Timeframe)
                    </span>
                  </div>
                  {formState.end_date || formState.end_time ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      กำหนดช่วงเวลาสิ้นสุดแล้ว (ปิดเคส)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      ดึงข้อมูลต่อเนื่องจนถึงปัจจุบัน (Live)
                    </span>
                  )}
                </div>

                {/* 1. START DATE & TIME */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div className="md:col-span-7">
                    <ThaiDateSelector
                      value={formState.incident_date}
                      onChange={(val) => setFormState({ ...formState, incident_date: val })}
                      label="วันที่เริ่มต้นเหตุการณ์ *"
                      required
                    />
                  </div>

                  <div className="md:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1">
                        เวลาเริ่มเหตุ (HH:mm)
                      </label>
                      <input
                        type="text"
                        value={formState.start_time}
                        onChange={(e) => setFormState({ ...formState, start_time: e.target.value })}
                        placeholder="เช่น 14:00"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1">
                        ไม่ประสงค์ตรวจ (คน)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formState.refuse_treatment_count}
                        onChange={(e) => setFormState({ ...formState, refuse_treatment_count: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-amber-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. END DATE & TIME (OPTIONAL - FOR CONCLUDED INCIDENTS) */}
                <div className="pt-3 border-t border-slate-200/80 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none font-extrabold text-xs text-slate-800">
                      <input
                        type="checkbox"
                        checked={Boolean(formState.end_date || formState.end_time)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const now = new Date();
                            const currentTimeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                            setFormState({
                              ...formState,
                              end_date: formState.end_date || formState.incident_date || now.toISOString().slice(0, 10),
                              end_time: formState.end_time || currentTimeStr
                            });
                          } else {
                            setFormState({ ...formState, end_date: '', end_time: '' });
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>🔒 กำหนดวัน-เวลาสิ้นสุดเหตุการณ์ (เลือกเมื่อเสร็จสิ้นเหตุการณ์ หรือต้องการระบุช่วงเวลาย้อนหลัง)</span>
                    </label>

                    {Boolean(formState.end_date || formState.end_time) && (
                      <button
                        type="button"
                        onClick={() => setFormState({ ...formState, end_date: '', end_time: '' })}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                      >
                        ✕ ล้างเวลาสิ้นสุด (เปลี่ยนเป็นดึงสดถึงปัจจุบัน)
                      </button>
                    )}
                  </div>

                  {Boolean(formState.end_date || formState.end_time) ? (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 rounded-2xl bg-white border-2 border-indigo-200 shadow-2xs animate-fade">
                      <div className="md:col-span-7">
                        <ThaiDateSelector
                          value={formState.end_date || formState.incident_date}
                          onChange={(val) => setFormState({ ...formState, end_date: val })}
                          label="วันที่สิ้นสุดเหตุการณ์"
                        />
                      </div>

                      <div className="md:col-span-5 pt-0.5">
                        <label className="block text-xs font-extrabold text-slate-700 mb-1">
                          เวลาสิ้นสุดเหตุการณ์ (HH:mm)
                        </label>
                        <input
                          type="text"
                          value={formState.end_time}
                          onChange={(e) => setFormState({ ...formState, end_time: e.target.value })}
                          placeholder="เช่น 18:00"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          ระบบจะดึงเฉพาะผู้ป่วยที่ลงทะเบียน HOSxP ภายในช่วงเวลาที่กำหนดนี้
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 font-bold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>ขณะนี้ระบบทำงานโหมดถ่ายทอดสด: ดึงข้อมูลผู้ป่วยใหม่จาก HOSxP ต่อเนื่องตั้งแต่เวลาเริ่มเหตุจนถึงปัจจุบัน</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Auto-Sync Toggle & Connection Status Strip */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none font-bold text-xs text-slate-900">
                    <input
                      type="checkbox"
                      checked={formState.is_auto_sync}
                      onChange={(e) => setFormState({ ...formState, is_auto_sync: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>⚡ ดึงข้อมูลจาก HOSxP อัตโนมัติ (ต่อเนื่องจนถึงปัจจุบัน)</span>
                  </label>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-950 text-xs font-black shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>ซิงค์อัตโนมัติทุก 15 วินาที</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                  <span className="flex items-center gap-1 font-medium">
                    <Server size={12} className="text-slate-400" />
                    <span>เชื่อมต่อฐานข้อมูล HOSxP: <strong>192.168.1.4:3306</strong> (er_pt_type = 2)</span>
                  </span>
                  <span className="font-semibold text-slate-600">
                    ซิงค์ล่าสุด: {lastSyncTime ? lastSyncTime.toLocaleTimeString('th-TH') : '-'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-sm font-bold rounded-2xl shadow-sm transition cursor-pointer"
                >
                  <Save size={16} />
                  <span>บันทึกและอัปเดตจอ TV ทันที</span>
                </button>
              </div>
            </form>
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">ยังไม่มีรายงานอุบัติเหตุหมู่</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto mt-1">
              สร้างรายงานอุบัติเหตุใหม่เพื่อดึงข้อมูลผู้ป่วยจาก HOSxP และสั่งถ่ายทอดสดขึ้นจอ TV ห้องฉุกเฉิน
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-2xl shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus size={18} />
            <span>สร้างรายงานเหตุใหม่</span>
          </button>
        </div>
      )}

      {/* ----------------- MODAL: CREATE NEW INCIDENT ----------------- */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-scale space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <ShieldAlert size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-900">สร้างรายงานอุบัติเหตุหมู่ใหม่</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                aria-label="ปิดหน้าต่าง"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  ชื่อเหตุการณ์ / เหตุเกิด *
                </label>
                <input
                  type="text"
                  value={newIncidentForm.title}
                  onChange={(e) => setNewIncidentForm({ ...newIncidentForm, title: e.target.value })}
                  placeholder="เช่น รถบัสพลิกคว่ำ ทางหลวง 106"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  สถานที่เกิดเหตุ
                </label>
                <input
                  type="text"
                  value={newIncidentForm.location}
                  onChange={(e) => setNewIncidentForm({ ...newIncidentForm, location: e.target.value })}
                  placeholder="เช่น ทล.106 กม.45 ต.แม่ตื่น อ.เถิน"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <ThaiDateSelector
                value={newIncidentForm.incident_date}
                onChange={(val) => setNewIncidentForm({ ...newIncidentForm, incident_date: val })}
                label="วันที่เกิดเหตุ *"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    เวลาเริ่มเหตุ (HH:mm)
                  </label>
                  <input
                    type="text"
                    value={newIncidentForm.start_time}
                    onChange={(e) => setNewIncidentForm({ ...newIncidentForm, start_time: e.target.value })}
                    placeholder="เช่น 14:00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    ไม่ประสงค์ตรวจ (คน)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newIncidentForm.refuse_treatment_count}
                    onChange={(e) => setNewIncidentForm({ ...newIncidentForm, refuse_treatment_count: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-amber-600"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-bold text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newIncidentForm.is_auto_sync}
                  onChange={(e) => setNewIncidentForm({ ...newIncidentForm, is_auto_sync: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-black text-emerald-950">⚡ ดึงข้อมูลผู้ป่วยจาก HOSxP อัตโนมัติ</div>
                  <div className="text-[11px] font-normal text-emerald-800">กรองจาก วันที่เกิดเหตุ และ เวลาเริ่มเหตุ และดึงเคสใหม่อัตโนมัติทุก 15 วินาที</div>
                </div>
              </label>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  สร้างเหตุการณ์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: EXPORT INCIDENT REPORT ----------------- */}
      {showExportModal && incidentData && (
        <IncidentReportModal
          incident={incidentData}
          summary={summary}
          patients={patientsList}
          onClose={() => setShowExportModal(false)}
          onUpdateIncident={() => loadIncidentDetails(selectedIncidentId, true)}
        />
      )}
    </div>
  );
}
