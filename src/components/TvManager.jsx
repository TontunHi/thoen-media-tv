import React, { useState, useEffect } from 'react';
import { Monitor, Plus, Layers, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { useToast } from '../features/common/ToastProvider';
import ConfirmDialog from '../features/common/ConfirmDialog';
import TvHealthCard from '../features/tvs/TvHealthCard';
import { TvFormModal, TvLogsModal } from '../features/tvs/TvTickerModal';
import TvBulkAssignModal from '../features/tvs/TvBulkAssignModal';

export default function TvManager() {
  const { showToast } = useToast();
  const [tvs, setTvs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editingTv, setEditingTv] = useState(null);
  const [tvForm, setTvForm] = useState({
    name: '',
    slug: '',
    location: '',
    playlist_id: '',
    ticker_text: '',
    ticker_enabled: false,
  });

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [copiedId, setCopiedId] = useState(null);
  const [reloadingId, setReloadingId] = useState(null);

  const [logsTv, setLogsTv] = useState(null);
  const [tvLogs, setTvLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const loadData = async () => {
    try {
      const [tvData, plData] = await Promise.all([
        api.getTvs(),
        api.getPlaylists(),
      ]);
      setTvs(tvData);
      setPlaylists(plData);
    } catch (err) {
      showToast('error', err.message || 'ไม่สามารถโหลดข้อมูลจอทีวีได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);

    const socket = getSocket();
    const handleStatusUpdate = (payload) => {
      if (!payload || !payload.tvId) return;
      setTvs((prev) =>
        prev.map((tv) =>
          tv.id === payload.tvId
            ? {
                ...tv,
                is_online: 1,
                last_ping: new Date().toISOString(),
                device_info: payload.device_info,
              }
            : tv
        )
      );
    };
    socket.on('tv_status_updated', handleStatusUpdate);

    return () => {
      clearInterval(interval);
      socket.off('tv_status_updated', handleStatusUpdate);
    };
  }, []);

  const openCreateModal = () => {
    setEditingTv(null);
    setTvForm({
      name: '',
      slug: '',
      location: '',
      playlist_id: '',
      ticker_text: '',
      ticker_enabled: false,
    });
    setShowModal(true);
  };

  const openEditModal = (tv) => {
    setEditingTv(tv);
    setTvForm({
      name: tv.name,
      slug: tv.slug,
      location: tv.location || '',
      playlist_id: tv.playlist_id || '',
      ticker_text: tv.ticker_text || '',
      ticker_enabled: tv.ticker_enabled === 1,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...tvForm,
        playlist_id: tvForm.playlist_id ? parseInt(tvForm.playlist_id, 10) : null,
        ticker_enabled: tvForm.ticker_enabled ? 1 : 0,
      };
      if (editingTv) {
        await api.updateTv(editingTv.id, payload);
        showToast('success', 'บันทึกการตั้งค่าจอทีวีสำเร็จ');
      } else {
        await api.createTv(payload);
        showToast('success', 'ลงทะเบียนจอทีวีใหม่สำเร็จ');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const requestDeleteTv = (id, name) => {
    setConfirmState({
      open: true,
      title: 'ยืนยันการลบจอทีวี',
      message: `ต้องการลบจอทีวี "${name}" ออกจากระบบหรือไม่?`,
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        try {
          await api.deleteTv(id);
          showToast('success', 'ลบจอทีวีเรียบร้อยแล้ว');
          loadData();
        } catch (err) {
          showToast('error', err.message);
        }
      },
    });
  };

  const handleQuickPlaylistChange = async (tv, newPlaylistId) => {
    try {
      await api.updateTv(tv.id, {
        playlist_id: newPlaylistId ? parseInt(newPlaylistId, 10) : null,
      });
      showToast('success', `เปลี่ยนเพลย์ลิสต์ของ "${tv.name}" แล้ว`);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleReloadTv = async (tv) => {
    setReloadingId(tv.id);
    try {
      await api.reloadTv(tv.id);
      showToast('success', `ส่งคำสั่งรีโหลดไปยังจอ "${tv.name}" แล้ว`);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setReloadingId(null);
    }
  };

  const handleViewLogs = async (tv) => {
    setLogsTv(tv);
    setLogsLoading(true);
    try {
      const data = await api.getTvLogs(tv.id);
      setTvLogs(data || []);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleBulkAssign = async (payload) => {
    setBulkSubmitting(true);
    try {
      const res = await api.bulkAssignTvs(payload);
      setShowBulkModal(false);
      showToast('success', `อัปเดตสำเร็จ ${res.updatedCount || 0} จอ`);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBulkSubmitting(false);
    }
  };

  const copyUrl = (slug, id) => {
    const url = `${window.location.origin}/tv/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast('info', 'คัดลอก URL จอทีวีแล้ว');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const onlineCount = tvs.filter((t) => t.is_online === 1).length;
  const filteredTvs = tvs.filter((t) => {
    if (statusFilter === 'online') return t.is_online === 1;
    if (statusFilter === 'offline') return t.is_online !== 1;
    return true;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-medium text-slate-900 tracking-tight">
            จัดการจอทีวีและสถานะออกอากาศ
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ตรวจสอบสื่อที่กำลังแสดงผลบนจอ ตั้งข้อความตัววิ่ง และสั่งรีโหลดจอระยะไกล
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tvs.length > 0 && (
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="h-9 flex items-center gap-2 px-3.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 text-xs font-medium cursor-pointer"
            >
              <Layers size={15} strokeWidth={1.5} className="text-slate-500" />
              <span>สั่งงานหลายจอ</span>
            </button>
          )}
          <button
            type="button"
            onClick={openCreateModal}
            className="h-9 flex items-center gap-2 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium cursor-pointer"
          >
            <Plus size={16} strokeWidth={1.5} />
            <span>เพิ่มจอทีวีใหม่</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-xl px-4 py-2.5 mb-5 shadow-2xs">
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5 font-medium text-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
            <span>ออนไลน์</span>
            <span className="font-mono tabular-nums text-teal-700">{onlineCount}</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>ออฟไลน์</span>
            <span className="font-mono tabular-nums">{tvs.length - onlineCount}</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'online', label: 'ออนไลน์' },
            { id: 'offline', label: 'ออฟไลน์' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center text-slate-500 text-sm">
          <Loader2 size={18} strokeWidth={1.5} className="animate-spin mr-2 text-teal-700" />
          กำลังโหลดข้อมูลจอทีวี
        </div>
      ) : filteredTvs.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-xl p-16 text-center text-slate-500">
          <Monitor size={32} strokeWidth={1.5} className="mx-auto mb-3 text-slate-400" />
          <p className="text-slate-600 text-sm font-normal mb-3">ไม่พบจอทีวีในหมวดหมู่นี้</p>
          <button
            type="button"
            onClick={openCreateModal}
            className="h-9 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium cursor-pointer"
          >
            เพิ่มจอทีวีใหม่
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTvs.map((tv) => (
            <TvHealthCard
              key={tv.id}
              tv={tv}
              playlists={playlists}
              copiedId={copiedId}
              reloadingId={reloadingId}
              onCopyUrl={copyUrl}
              onChangePlaylist={handleQuickPlaylistChange}
              onReloadTv={handleReloadTv}
              onViewLogs={handleViewLogs}
              onEditTv={openEditModal}
              onDeleteTv={requestDeleteTv}
            />
          ))}
        </div>
      )}

      <TvFormModal
        open={showModal}
        editingTv={editingTv}
        tvForm={tvForm}
        setTvForm={setTvForm}
        playlists={playlists}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
      />

      <TvBulkAssignModal
        open={showBulkModal}
        tvs={tvs}
        playlists={playlists}
        submitting={bulkSubmitting}
        onClose={() => setShowBulkModal(false)}
        onSubmit={handleBulkAssign}
      />

      <TvLogsModal
        tv={logsTv}
        logs={tvLogs}
        loading={logsLoading}
        onClose={() => setLogsTv(null)}
      />

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
