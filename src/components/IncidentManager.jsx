import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Plus, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { useToast } from '../features/common/ToastProvider';
import ConfirmDialog from '../features/common/ConfirmDialog';
import IncidentReportModal from './IncidentReportModal';
import IncidentBroadcastPanel from '../features/incidents/IncidentBroadcastPanel';
import {
  CreateIncidentModal,
  IncidentSettingsForm,
} from '../features/incidents/IncidentModals';

const formatThaiDateShort = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) {
      const yBE = parseInt(parts[0], 10) + 543;
      return `${parts[2]}/${parts[1]}/${yBE}`;
    }
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(
      d.getMonth() + 1
    ).padStart(2, '0')}/${d.getFullYear() + 543}`;
  } catch {
    return dateStr;
  }
};

export default function IncidentManager() {
  const { showToast } = useToast();
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [incidentData, setIncidentData] = useState(null);
  const [summary, setSummary] = useState({
    red: 0,
    yellow: 0,
    green: 0,
    black: 0,
    refuse_treatment: 0,
    total: 0,
  });
  const [patientsList, setPatientsList] = useState([]);
  const [tvs, setTvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

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

  const [selectedBroadcastTvs, setSelectedBroadcastTvs] = useState([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newIncidentForm, setNewIncidentForm] = useState({
    title: '',
    location: '',
    incident_date: new Date().toISOString().slice(0, 10),
    start_time: new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    refuse_treatment_count: 0,
    is_auto_sync: true,
  });

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  });

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
    } catch {
      showToast('error', 'ไม่สามารถโหลดข้อมูลเบื้องต้นได้');
    } finally {
      setLoading(false);
    }
  };

  const loadIncidentDetails = useCallback(
    async (id, silent = false) => {
      if (!id) return;
      if (!silent) setSaving(true);
      try {
        const res = await api.getIncident(id);
        setIncidentData(res.incident);
        setPatientsList(res.patients || []);
        setSummary(
          res.summary || {
            red: 0,
            yellow: 0,
            green: 0,
            black: 0,
            refuse_treatment: 0,
            total: 0,
          }
        );
        setLastSyncTime(new Date());
        setFormState({
          title: res.incident.title || '',
          location: res.incident.location || '',
          incident_date: res.incident.incident_date
            ? res.incident.incident_date.slice(0, 10)
            : '',
          end_date: res.incident.end_date ? res.incident.end_date.slice(0, 10) : '',
          start_time: res.incident.start_time || '',
          end_time: res.incident.end_time || '',
          refuse_treatment_count: res.incident.refuse_treatment_count || 0,
          is_auto_sync: res.incident.is_auto_sync !== 0,
          notes: res.incident.notes || '',
        });
        setIsBroadcasting(res.incident.is_active === 1);
        try {
          const tvList =
            typeof res.incident.broadcast_tvs === 'string'
              ? JSON.parse(res.incident.broadcast_tvs)
              : res.incident.broadcast_tvs || [];
          setSelectedBroadcastTvs(tvList);
        } catch {
          setSelectedBroadcastTvs([]);
        }
      } catch {
        showToast('error', 'ไม่สามารถโหลดข้อมูลอุบัติเหตุหมู่นี้ได้');
      } finally {
        if (!silent) setSaving(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadInitialData();
    const socket = getSocket();
    const handleUpdate = () => {
      if (selectedIncidentId) loadIncidentDetails(selectedIncidentId, true);
    };
    socket.on('incident_updated', handleUpdate);
    socket.on('tv_config_changed', () => {
      api.getTvs().then(setTvs).catch(() => {});
    });
    return () => {
      socket.off('incident_updated', handleUpdate);
      socket.off('tv_config_changed');
    };
  }, [selectedIncidentId, loadIncidentDetails]);

  useEffect(() => {
    if (selectedIncidentId) loadIncidentDetails(selectedIncidentId);
  }, [selectedIncidentId, loadIncidentDetails]);

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
    } catch (err) {
      showToast('error', err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

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
      const list = await api.getIncidents();
      setIncidents(list);
      setSelectedIncidentId(created.id);
    } catch (err) {
      showToast('error', err.message || 'สร้างเหตุการณ์ไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteIncident = () => {
    if (!selectedIncidentId) return;
    setConfirmState({
      open: true,
      title: 'ยืนยันการลบเหตุการณ์',
      message: `ต้องการลบเหตุการณ์ "${formState.title}" ออกจากระบบหรือไม่?`,
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        setSaving(true);
        try {
          await api.deleteIncident(selectedIncidentId);
          showToast('success', 'ลบเหตุการณ์เรียบร้อยแล้ว');
          const list = await api.getIncidents();
          setIncidents(list);
          setSelectedIncidentId(list.length > 0 ? list[0].id : null);
          if (list.length === 0) setIncidentData(null);
        } catch (err) {
          showToast('error', err.message || 'ลบไม่สำเร็จ');
        } finally {
          setSaving(false);
        }
      },
    });
  };

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
          ? `เริ่มถ่ายทอดสดขึ้นจอ TV (${selectedBroadcastTvs.length} จอ)`
          : 'ปิดการถ่ายทอดสด คืนหน้าจอเป็น Playlist ปกติ'
      );
      loadIncidentDetails(selectedIncidentId, true);
    } catch (err) {
      showToast('error', err.message || 'เกิดข้อผิดพลาดในการสั่งถ่ายทอดสด');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[450px]">
        <div className="w-7 h-7 border-2 border-slate-200 border-t-teal-700 rounded-full animate-spin mb-3" />
        <p className="text-slate-500 font-normal text-sm">
          กำลังโหลดข้อมูลศูนย์อุบัติเหตุหมู่
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0">
            <ShieldAlert size={20} strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-medium text-slate-900 tracking-tight">
                ศูนย์สั่งการอุบัติเหตุหมู่
              </h1>
              {incidentData?.is_active === 1 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/80 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  <span>ถ่ายทอดสด {selectedBroadcastTvs.length} จอ</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-normal">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>พร้อมใช้งาน</span>
                </span>
              )}
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              ซิงค์ข้อมูลผู้บาดเจ็บจากฐานข้อมูล HOSxP อัตโนมัติและสั่งตัดภาพขึ้นจอทีวีห้องฉุกเฉิน
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <select
              value={selectedIncidentId || ''}
              onChange={(e) => setSelectedIncidentId(Number(e.target.value))}
              className="w-full h-9 pl-3 pr-9 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-900 appearance-none cursor-pointer"
              aria-label="เลือกเหตุการณ์อุบัติเหตุหมู่"
            >
              {incidents.length === 0 ? (
                <option value="">ยังไม่มีรายงานเหตุการณ์</option>
              ) : (
                incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.is_active ? '[ถ่ายทอดสด] ' : ''}
                    {inc.title} ({formatThaiDateShort(inc.incident_date)})
                  </option>
                ))
              )}
            </select>
            <ChevronDown
              size={15}
              strokeWidth={1.5}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          {selectedIncidentId && (
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="h-9 flex items-center gap-2 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              <FileSpreadsheet size={15} strokeWidth={1.5} className="text-slate-500" />
              <span>ส่งออกรายงาน Excel</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="h-9 flex items-center gap-2 px-4 bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            <Plus size={16} strokeWidth={1.5} />
            <span>สร้างเหตุใหม่</span>
          </button>
        </div>
      </div>

      {selectedIncidentId && incidentData ? (
        <>
          <IncidentBroadcastPanel
            summary={summary}
            isBroadcasting={isBroadcasting}
            selectedBroadcastTvs={selectedBroadcastTvs}
            tvs={tvs}
            saving={saving}
            onToggleBroadcast={handleToggleBroadcast}
            onToggleTvSelection={(tvId) =>
              setSelectedBroadcastTvs((prev) =>
                prev.includes(tvId) ? prev.filter((id) => id !== tvId) : [...prev, tvId]
              )
            }
            onSelectAllTvs={() =>
              setSelectedBroadcastTvs(
                selectedBroadcastTvs.length === tvs.length ? [] : tvs.map((t) => t.id)
              )
            }
          />
          <IncidentSettingsForm
            formState={formState}
            setFormState={setFormState}
            saving={saving}
            lastSyncTime={lastSyncTime}
            onSave={handleSaveIncident}
            onDelete={requestDeleteIncident}
          />
        </>
      ) : (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200/80 space-y-3">
          <h2 className="text-base font-medium text-slate-900">
            ยังไม่มีรายงานอุบัติเหตุหมู่
          </h2>
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="h-9 inline-flex items-center gap-2 px-4 bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium rounded-lg cursor-pointer"
          >
            <Plus size={16} strokeWidth={1.5} />
            <span>สร้างรายงานเหตุใหม่</span>
          </button>
        </div>
      )}

      <CreateIncidentModal
        open={showNewModal}
        newIncidentForm={newIncidentForm}
        setNewIncidentForm={setNewIncidentForm}
        saving={saving}
        onClose={() => setShowNewModal(false)}
        onSubmit={handleCreateIncident}
      />

      {showExportModal && incidentData && (
        <IncidentReportModal
          incident={incidentData}
          summary={summary}
          patients={patientsList}
          onClose={() => setShowExportModal(false)}
          onUpdateIncident={() => loadIncidentDetails(selectedIncidentId, true)}
        />
      )}

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
