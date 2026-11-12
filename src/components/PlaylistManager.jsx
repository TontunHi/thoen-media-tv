import React, { useState, useEffect } from 'react';
import { ListVideo, Plus, Trash2, Edit2, Loader2, Film } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../features/common/ToastProvider';
import ConfirmDialog from '../features/common/ConfirmDialog';
import PlaylistTimeline from '../features/playlists/PlaylistTimeline';
import ScheduleModal from '../features/playlists/ScheduleModal';
import {
  CreatePlaylistModal,
  EditPlaylistModal,
  MediaPickerModal,
} from '../features/playlists/PlaylistModals';

export default function PlaylistManager() {
  const { showToast } = useToast();
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [playlistForm, setPlaylistForm] = useState({ name: '', description: '' });
  const [editingPlaylist, setEditingPlaylist] = useState(null);

  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaList, setMediaList] = useState([]);
  const [folders, setFolders] = useState([]);
  const [pickerFolder, setPickerFolder] = useState('all');
  const [selectedMediaIds, setSelectedMediaIds] = useState([]);

  const [scheduleModal, setScheduleModal] = useState(null);
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const data = await api.getPlaylists();
      setPlaylists(data);
      if (data.length > 0 && !selectedPlaylist) {
        loadPlaylistDetail(data[0].id);
      } else if (selectedPlaylist) {
        loadPlaylistDetail(selectedPlaylist.id);
      }
    } catch (err) {
      showToast('error', err.message || 'ไม่สามารถโหลดเพลย์ลิสต์ได้');
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylistDetail = async (id) => {
    try {
      const data = await api.getPlaylist(id);
      setSelectedPlaylist(data.playlist || data);
      setItems(data.items || []);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, []);

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!playlistForm.name.trim()) return;
    try {
      const created = await api.createPlaylist(
        playlistForm.name.trim(),
        playlistForm.description.trim()
      );
      setPlaylistForm({ name: '', description: '' });
      setShowCreateModal(false);
      showToast('success', 'สร้างเพลย์ลิสต์สำเร็จ');
      await loadPlaylists();
      loadPlaylistDetail(created.id);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleUpdatePlaylist = async (e) => {
    e.preventDefault();
    if (!editingPlaylist?.name?.trim()) return;
    try {
      await api.updatePlaylist(editingPlaylist.id, {
        name: editingPlaylist.name.trim(),
        description: editingPlaylist.description.trim(),
      });
      setEditingPlaylist(null);
      showToast('success', 'อัปเดตเพลย์ลิสต์สำเร็จ');
      await loadPlaylists();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const requestDeletePlaylist = (id, name, e) => {
    e.stopPropagation();
    setConfirmState({
      open: true,
      title: 'ยืนยันการลบเพลย์ลิสต์',
      message: `ต้องการลบเพลย์ลิสต์ "${name}" หรือไม่?`,
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        try {
          await api.deletePlaylist(id);
          if (selectedPlaylist?.id === id) {
            setSelectedPlaylist(null);
            setItems([]);
          }
          showToast('success', 'ลบเพลย์ลิสต์เรียบร้อยแล้ว');
          loadPlaylists();
        } catch (err) {
          showToast('error', err.message);
        }
      },
    });
  };

  const openMediaPicker = async () => {
    try {
      const [m, f] = await Promise.all([api.getMedia('all'), api.getFolders()]);
      setMediaList(m);
      setFolders(f);
      setSelectedMediaIds([]);
      setShowMediaPicker(true);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleAddSelectedMedia = async () => {
    if (!selectedPlaylist || !selectedMediaIds.length) return;
    try {
      await api.addPlaylistItems(selectedPlaylist.id, selectedMediaIds, 10);
      setShowMediaPicker(false);
      showToast('success', `เพิ่มสื่อ ${selectedMediaIds.length} รายการเข้าเพลย์ลิสต์แล้ว`);
      loadPlaylistDetail(selectedPlaylist.id);
      loadPlaylists();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const reorderAndSave = async (updated) => {
    const reorderedPayload = updated.map((item, idx) => ({
      id: item.id,
      display_order: idx + 1,
    }));
    setItems(updated.map((it, idx) => ({ ...it, display_order: idx + 1 })));
    try {
      await api.reorderPlaylistItems(selectedPlaylist.id, reorderedPayload);
    } catch (err) {
      showToast('error', err.message);
      loadPlaylistDetail(selectedPlaylist.id);
    }
  };

  const handleMoveItem = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const updated = [...items];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    reorderAndSave(updated);
  };

  const handleReorderDrag = (draggedIndex, dropIndex) => {
    const updated = [...items];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, moved);
    reorderAndSave(updated);
  };

  const handleUpdateDuration = async (item, newDuration) => {
    try {
      await api.updatePlaylistItem(selectedPlaylist.id, item.id, {
        duration_seconds: newDuration,
      });
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, duration_seconds: newDuration } : it))
      );
    } catch (err) {
      showToast('error', err.message);
      loadPlaylistDetail(selectedPlaylist.id);
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await api.updatePlaylistItem(selectedPlaylist.id, item.id, {
        is_active: item.is_active ? 0 : 1,
      });
      loadPlaylistDetail(selectedPlaylist.id);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleModal) return;
    if (
      scheduleModal.start_date &&
      scheduleModal.end_date &&
      scheduleModal.start_date > scheduleModal.end_date
    ) {
      showToast('error', 'วันที่เริ่มแสดงต้องไม่มากกว่าวันที่สิ้นสุด');
      return;
    }
    try {
      await api.updatePlaylistItem(selectedPlaylist.id, scheduleModal.id, {
        start_date: scheduleModal.start_date || null,
        end_date: scheduleModal.end_date || null,
        start_time: scheduleModal.start_time || null,
        end_time: scheduleModal.end_time || null,
        days_of_week: scheduleModal.days_of_week || null,
      });
      setScheduleModal(null);
      showToast('success', 'บันทึกตารางเวลาแสดงผลสำเร็จ');
      loadPlaylistDetail(selectedPlaylist.id);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const requestRemoveItem = (itemId) => {
    setConfirmState({
      open: true,
      title: 'เอาสื่อออกจากเพลย์ลิสต์',
      message: 'ต้องการนำสื่อนี้ออกจากเพลย์ลิสต์หรือไม่?',
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        try {
          await api.deletePlaylistItem(selectedPlaylist.id, itemId);
          loadPlaylistDetail(selectedPlaylist.id);
          loadPlaylists();
        } catch (err) {
          showToast('error', err.message);
        }
      },
    });
  };

  const formatDateStr = (d) => (typeof d === 'string' ? d.split('T')[0] : '');

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-medium text-slate-900 tracking-tight">
            จัดสรรเพลย์ลิสต์และตารางเวลา
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            เรียงลำดับสื่อ กำหนดระยะเวลาแสดงผล และตั้งวันเวลาออกอากาศอัตโนมัติ
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="h-9 flex items-center gap-2 px-3.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 text-xs font-medium cursor-pointer"
        >
          <Plus size={16} strokeWidth={1.5} className="text-slate-500" />
          <span>สร้างเพลย์ลิสต์ใหม่</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-normal text-slate-500 mb-2.5 px-2">
              <span>รายการเพลย์ลิสต์</span>
              <span className="font-mono tabular-nums">{playlists.length}</span>
            </div>
            {loading ? (
              <div className="py-12 flex justify-center text-slate-400">
                <Loader2 size={18} strokeWidth={1.5} className="animate-spin text-teal-700" />
              </div>
            ) : (
              <div className="space-y-1">
                {playlists.map((pl) => {
                  const isSelected = selectedPlaylist?.id === pl.id;
                  return (
                    <div
                      key={pl.id}
                      onClick={() => loadPlaylistDetail(pl.id)}
                      className={`group px-3 py-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'bg-slate-100 text-slate-900'
                          : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ListVideo
                          size={16}
                          strokeWidth={1.5}
                          className={isSelected ? 'text-teal-700 shrink-0' : 'text-slate-400 shrink-0'}
                        />
                        <div className="truncate">
                          <div className="font-medium text-sm truncate text-slate-900">
                            {pl.name}
                          </div>
                          <div className="text-xs text-slate-500 font-mono tabular-nums">
                            {pl.item_count || 0} รายการ
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPlaylist({
                              id: pl.id,
                              name: pl.name,
                              description: pl.description || '',
                            });
                          }}
                          className="p-1.5 rounded-md hover:bg-slate-200/70 text-slate-500"
                        >
                          <Edit2 size={13} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => requestDeletePlaylist(pl.id, pl.name, e)}
                          className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600"
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          {!selectedPlaylist ? (
            <div className="bg-white border border-slate-200/80 rounded-xl p-16 text-center text-slate-500">
              <Film size={32} strokeWidth={1.5} className="mx-auto mb-3 text-slate-400" />
              <p className="text-slate-600 text-sm font-normal">
                เลือกเพลย์ลิสต์ทางด้านซ้าย หรือสร้างเพลย์ลิสต์ใหม่
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
              <div className="px-5 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-medium text-slate-900">
                    {selectedPlaylist.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedPlaylist.description ||
                      'ลากวางหรือใช้ปุ่มลูกศรเพื่อจัดลำดับการเล่นสื่อบนจอทีวี'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openMediaPicker}
                  className="h-9 flex items-center gap-2 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium cursor-pointer shrink-0"
                >
                  <Plus size={15} strokeWidth={1.5} />
                  <span>เพิ่มสื่อเข้าลิสต์</span>
                </button>
              </div>

              <PlaylistTimeline
                items={items}
                onMoveItem={handleMoveItem}
                onReorderDrag={handleReorderDrag}
                onUpdateDuration={handleUpdateDuration}
                onToggleActive={handleToggleActive}
                onOpenSchedule={(item) =>
                  setScheduleModal({
                    id: item.id,
                    media_name: item.media_name,
                    start_date: formatDateStr(item.start_date),
                    end_date: formatDateStr(item.end_date),
                    start_time: item.start_time ? item.start_time.slice(0, 5) : '',
                    end_time: item.end_time ? item.end_time.slice(0, 5) : '',
                    days_of_week: item.days_of_week || '',
                  })
                }
                onRemoveItem={requestRemoveItem}
                formatDateStr={formatDateStr}
              />
            </div>
          )}
        </div>
      </div>

      <CreatePlaylistModal
        open={showCreateModal}
        playlistForm={playlistForm}
        setPlaylistForm={setPlaylistForm}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePlaylist}
      />
      <EditPlaylistModal
        editingPlaylist={editingPlaylist}
        setEditingPlaylist={setEditingPlaylist}
        onSubmit={handleUpdatePlaylist}
      />
      <MediaPickerModal
        open={showMediaPicker}
        folders={folders}
        mediaList={mediaList}
        pickerFolder={pickerFolder}
        setPickerFolder={setPickerFolder}
        selectedMediaIds={selectedMediaIds}
        toggleSelectMedia={(id) =>
          setSelectedMediaIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
          )
        }
        onClose={() => setShowMediaPicker(false)}
        onAddSelected={handleAddSelectedMedia}
      />
      <ScheduleModal
        scheduleModal={scheduleModal}
        setScheduleModal={setScheduleModal}
        onSave={handleSaveSchedule}
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
