import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  ListVideo,
  Plus,
  Trash2,
  Clock,
  CalendarClock,
  Film,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  X,
  GripVertical,
  ChevronRight,
  Layers,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Info,
  Calendar,
  Check,
  Edit2,
} from 'lucide-react';

export default function PlaylistManager() {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistDetail, setPlaylistDetail] = useState(null);
  const [mediaList, setMediaList] = useState([]);
  const [showAddMediaModal, setShowAddMediaModal] = useState(false);
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [editPlaylistName, setEditPlaylistName] = useState('');
  const [editPlaylistDesc, setEditPlaylistDesc] = useState('');
  const [selectedMediaIds, setSelectedMediaIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Schedule modal state
  const [schedulingItem, setSchedulingItem] = useState(null);
  const [schedStartTime, setSchedStartTime] = useState('');
  const [schedEndTime, setSchedEndTime] = useState('');

  // Drag and drop reordering state
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const dragItemRef = useRef(null);

  // Load playlists
  const loadPlaylists = async () => {
    try {
      const data = await api.getPlaylists();
      setPlaylists(data);
      if (!selectedPlaylist && data.length > 0) {
        setSelectedPlaylist(data[0]);
      }
    } catch (err) {
      console.error('Failed to load playlists:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load playlist items
  const loadPlaylistDetail = async (id) => {
    if (!id) return;
    try {
      const detail = await api.getPlaylist(id);
      setPlaylistDetail(detail);
    } catch (err) {
      console.error('Failed to load playlist detail:', err);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, []);

  useEffect(() => {
    if (selectedPlaylist) {
      loadPlaylistDetail(selectedPlaylist.id);
    }
  }, [selectedPlaylist]);

  // Handle create playlist
  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    try {
      const created = await api.createPlaylist(newPlaylistName.trim(), newPlaylistDesc);
      setNewPlaylistName('');
      setNewPlaylistDesc('');
      setShowNewPlaylistModal(false);
      await loadPlaylists();
      setSelectedPlaylist(created);
    } catch (err) {
      alert(err.message || 'สร้าง Playlist ไม่สำเร็จ');
    }
  };

  // Handle edit playlist
  const handleEditPlaylist = async (e) => {
    e.preventDefault();
    if (!editingPlaylist || !editPlaylistName.trim()) return;
    try {
      await api.updatePlaylist(editingPlaylist.id, {
        name: editPlaylistName.trim(),
        description: editPlaylistDesc.trim(),
      });
      const updated = { ...editingPlaylist, name: editPlaylistName.trim(), description: editPlaylistDesc.trim() };
      if (selectedPlaylist?.id === editingPlaylist.id) {
        setSelectedPlaylist(updated);
      }
      setEditingPlaylist(null);
      await loadPlaylists();
    } catch (err) {
      alert(err.message || 'แก้ไข Playlist ไม่สำเร็จ');
    }
  };

  // Handle delete playlist
  const handleDeletePlaylist = async (id, e) => {
    e.stopPropagation();
    if (!confirm('ยืนยันการลบ Playlist นี้?')) return;
    try {
      await api.deletePlaylist(id);
      setSelectedPlaylist(null);
      setPlaylistDetail(null);
      loadPlaylists();
    } catch (err) {
      alert(err.message || 'ลบ Playlist ไม่สำเร็จ');
    }
  };

  // Open Add Media Modal
  const handleOpenAddMedia = async () => {
    try {
      const files = await api.getMedia('all');
      setMediaList(files);
      setSelectedMediaIds([]);
      setShowAddMediaModal(true);
    } catch (err) {
      alert('ไม่สามารถโหลดรายการสื่อได้');
    }
  };

  // Confirm Add Media to Playlist
  const handleConfirmAddMedia = async () => {
    if (selectedMediaIds.length === 0 || !selectedPlaylist) return;
    try {
      await api.addPlaylistItems(selectedPlaylist.id, selectedMediaIds, 10);
      setShowAddMediaModal(false);
      loadPlaylistDetail(selectedPlaylist.id);
      loadPlaylists();
    } catch (err) {
      alert(err.message || 'เพิ่มสื่อไม่สำเร็จ');
    }
  };

  // Reorder items (drag-and-drop or move buttons)
  const reorderItems = async (fromIndex, toIndex) => {
    if (fromIndex === toIndex || !playlistDetail?.items) return;
    if (toIndex < 0 || toIndex >= playlistDetail.items.length) return;

    const items = [...playlistDetail.items];
    const [movedItem] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, movedItem);

    // Optimistically update UI immediately so user sees the change right away
    const updatedItems = items.map((it, idx) => ({ ...it, display_order: idx + 1 }));
    setPlaylistDetail((prev) => ({
      ...prev,
      items: updatedItems,
    }));

    // Send new order to server
    const payload = updatedItems.map((it) => ({ id: it.id, display_order: it.display_order }));
    try {
      await api.reorderPlaylistItems(selectedPlaylist.id, payload);
    } catch (err) {
      console.error('Failed to save reorder to server:', err);
      loadPlaylistDetail(selectedPlaylist.id);
    }
  };

  // Update item setting (duration, active)
  const handleUpdateItem = async (itemId, data) => {
    try {
      await api.updatePlaylistItem(selectedPlaylist.id, itemId, data);
      loadPlaylistDetail(selectedPlaylist.id);
    } catch (err) {
      alert(err.message || 'บันทึกการตั้งค่าไม่สำเร็จ');
    }
  };

  // Open schedule modal
  const openScheduleModal = (item) => {
    setSchedulingItem(item);
    const formatForInput = (dt) => {
      if (!dt) return '';
      if (typeof dt === 'string' && dt.length >= 16) {
        return dt.slice(0, 16).replace(' ', 'T');
      }
      const d = new Date(dt);
      if (isNaN(d.getTime())) return '';
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setSchedStartTime(formatForInput(item.start_time));
    setSchedEndTime(formatForInput(item.end_time));
  };

  // Save schedule
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!schedulingItem) return;
    try {
      await api.updatePlaylistItem(selectedPlaylist.id, schedulingItem.id, {
        start_time: schedStartTime || null,
        end_time: schedEndTime || null,
      });
      setSchedulingItem(null);
      loadPlaylistDetail(selectedPlaylist.id);
    } catch (err) {
      alert(err.message || 'บันทึกตารางเวลาไม่สำเร็จ');
    }
  };

  // Clear schedule
  const handleClearSchedule = async () => {
    if (!schedulingItem) return;
    try {
      await api.updatePlaylistItem(selectedPlaylist.id, schedulingItem.id, {
        start_time: null,
        end_time: null,
      });
      setSchedulingItem(null);
      loadPlaylistDetail(selectedPlaylist.id);
    } catch (err) {
      alert(err.message || 'ล้างตารางเวลาไม่สำเร็จ');
    }
  };

  // Helper to compute schedule status badge
  const getScheduleStatus = (item) => {
    if (!item.is_active) {
      return {
        text: 'ปิดพักไว้',
        badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
        dotClass: 'bg-slate-400',
      };
    }
    const now = new Date();
    const hasStart = !!item.start_time;
    const hasEnd = !!item.end_time;

    if (!hasStart && !hasEnd) {
      return {
        text: 'แสดงตลอดเวลา (24/7)',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dotClass: 'bg-emerald-500',
      };
    }

    const startDate = hasStart ? new Date(String(item.start_time).replace(' ', 'T')) : null;
    const endDate = hasEnd ? new Date(String(item.end_time).replace(' ', 'T')) : null;

    if (startDate && !isNaN(startDate.getTime()) && now < startDate) {
      return {
        text: `รอเริ่ม: ${startDate.toLocaleDateString('th-TH')} ${startDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
        dotClass: 'bg-amber-500',
      };
    }

    if (endDate && !isNaN(endDate.getTime()) && now > endDate) {
      return {
        text: `หมดเวลา: ${endDate.toLocaleDateString('th-TH')} ${endDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
        dotClass: 'bg-rose-500',
      };
    }

    return {
      text: 'กำลังแสดงตามช่วงเวลา',
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200/80',
      dotClass: 'bg-teal-500 animate-pulse',
    };
  };

  // Remove item from playlist
  const handleRemoveItem = async (itemId) => {
    if (!confirm('ต้องการนำสื่อนี้ออกจาก Playlist?')) return;
    try {
      await api.deletePlaylistItem(selectedPlaylist.id, itemId);
      loadPlaylistDetail(selectedPlaylist.id);
      loadPlaylists();
    } catch (err) {
      alert(err.message || 'ลบรายการไม่สำเร็จ');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-teal-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles size={15} />
            <span>Broadcast Storyboard & Sequence</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>จัดสรร Playlist & ตารางเวลาแสดงผล</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            จัดเรียงลำดับสื่อแบบไทม์ไลน์ ลากวางสลับลำดับอิสระ พร้อมกำหนดช่วงเวลาเริ่มต้น-สิ้นสุด
          </p>
        </div>

        <button
          onClick={() => setShowNewPlaylistModal(true)}
          className="flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-teal-600/20 transition-all duration-200 cursor-pointer self-start sm:self-auto hover:-translate-y-0.5"
        >
          <Plus size={18} />
          <span>สร้าง Playlist ใหม่</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Playlists Left Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                รายการเพลย์ลิสต์ ({playlists.length})
              </span>
              <span className="text-[11px] text-teal-600 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60">
                พร้อมใช้งาน
              </span>
            </div>

            <div className="space-y-2">
              {playlists.length === 0 ? (
                <div className="text-center py-8 px-4 text-slate-400 text-xs">
                  ยังไม่มี Playlist ในระบบ
                </div>
              ) : (
                playlists.map((pl) => {
                  const isSelected = selectedPlaylist?.id === pl.id;
                  return (
                    <div
                      key={pl.id}
                      onClick={() => setSelectedPlaylist(pl)}
                      className={`group relative flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-teal-50/70 to-indigo-50/50 border-teal-300 shadow-sm'
                          : 'bg-white border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition ${
                            isSelected
                              ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                              : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                          }`}
                        >
                          <ListVideo size={20} />
                        </div>
                        <div className="truncate flex-1">
                          <div
                            className={`truncate text-sm font-bold ${
                              isSelected ? 'text-teal-950' : 'text-slate-800'
                            }`}
                          >
                            {pl.name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span className="font-semibold text-teal-600 bg-teal-50/80 px-1.5 py-0.2 rounded border border-teal-200/50">
                              {pl.item_count || 0} สื่อ
                            </span>
                            {pl.description && (
                              <span className="truncate text-slate-400 font-normal">
                                • {pl.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 pl-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPlaylist(pl);
                            setEditPlaylistName(pl.name);
                            setEditPlaylistDesc(pl.description || '');
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition cursor-pointer"
                          title="แก้ไขชื่อและรายละเอียด"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={(e) => handleDeletePlaylist(pl.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="ลบ Playlist"
                        >
                          <Trash2 size={15} />
                        </button>
                        <ChevronRight
                          size={16}
                          className={`transition ${
                            isSelected ? 'text-teal-600 translate-x-0.5' : 'text-slate-300'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Storyboard Timeline Studio */}
        <div className="lg:col-span-8">
          {selectedPlaylist ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              {/* Studio Header Bar */}
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/70 via-white to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
                    <Layers size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        {selectedPlaylist.name}
                      </h3>
                      <button
                        onClick={() => {
                          setEditingPlaylist(selectedPlaylist);
                          setEditPlaylistName(selectedPlaylist.name);
                          setEditPlaylistDesc(selectedPlaylist.description || '');
                        }}
                        className="p-1 text-slate-400 hover:text-teal-600 rounded transition cursor-pointer"
                        title="แก้ไขชื่อและรายละเอียด"
                      >
                        <Edit2 size={14} />
                      </button>
                      <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/80">
                        {playlistDetail?.items?.length || 0} ลำดับ
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {selectedPlaylist.description || 'ไม่มีคำอธิบายเพิ่มเติมสำหรับ Playlist นี้'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleOpenAddMedia}
                  className="flex items-center gap-2 px-4 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200/80 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  <Plus size={16} />
                  <span>เพิ่มสื่อลง Playlist</span>
                </button>
              </div>

              {/* Storyboard Timeline Sequence Items */}
              <div className="p-6">
                {!playlistDetail?.items || playlistDetail.items.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-3 shadow-xs">
                      <ListVideo size={28} />
                    </div>
                    <p className="text-slate-800 font-bold text-sm">ยังไม่มีสื่อใน Storyboard นี้</p>
                    <p className="text-slate-400 text-xs mt-1 mb-4">
                      คลิกปุ่ม "เพิ่มสื่อลง Playlist" ด้านบน เพื่อเริ่มต้นนำรูปภาพหรือคลิปวิดีโอมาจัดฉาย
                    </p>
                    <button
                      onClick={handleOpenAddMedia}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-teal-700 border border-teal-200 rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      เลือกสื่อจากคลัง
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 relative">
                    {/* Visual Timeline Bar guide on left */}
                    <div className="absolute top-4 bottom-4 left-6 w-0.5 bg-slate-100 -z-10 hidden sm:block" />

                    {playlistDetail.items.map((item, idx) => {
                      const isVideo = item.file_type === 'video';
                      const sched = getScheduleStatus(item);

                      return (
                        <div
                          key={item.id}
                          draggable={true}
                          onDragStart={(e) => {
                            dragItemRef.current = idx;
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDragEnter={() => setDragOverIdx(idx)}
                          onDragLeave={() => {
                            if (dragOverIdx === idx) setDragOverIdx(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOverIdx(null);
                            if (dragItemRef.current !== null && dragItemRef.current !== idx) {
                              reorderItems(dragItemRef.current, idx);
                              dragItemRef.current = null;
                            }
                          }}
                          className={`group relative p-4 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 select-none ${
                            dragOverIdx === idx
                              ? 'ring-2 ring-teal-500 bg-teal-50/60 border-teal-400 shadow-md scale-[1.01]'
                              : item.is_active
                              ? 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                              : 'bg-slate-50/60 border-slate-200/60 opacity-60'
                          }`}
                        >
                          {/* Storyboard Number & Media Info */}
                          <div className="flex items-center gap-3.5 min-w-0 w-full md:w-5/12">
                            {/* Drag Handle & Step Sequence Badge */}
                            <div
                              className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing text-slate-400 hover:text-teal-600 p-1.5 rounded-xl hover:bg-slate-100 transition shrink-0"
                              title="คลิกค้างแล้วลากเพื่อเปลี่ยนลำดับ (Drag to Reorder)"
                            >
                              <GripVertical size={18} />
                              <span className="text-[11px] font-black font-mono px-2 py-0.5 rounded-md bg-slate-100 group-hover:bg-teal-50 group-hover:text-teal-700 text-slate-600 transition">
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                            </div>

                            {/* Mini Thumbnail */}
                            <div className="w-16 h-11 bg-slate-900 rounded-xl overflow-hidden shrink-0 border border-slate-200/80 shadow-xs flex items-center justify-center relative">
                              {isVideo ? (
                                <video
                                  src={item.file_path}
                                  className="w-full h-full object-cover"
                                  muted
                                />
                              ) : (
                                <img
                                  src={item.file_path}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              )}
                              <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-black/70 rounded text-[8px] font-mono text-white">
                                {isVideo ? 'VID' : 'IMG'}
                              </span>
                            </div>

                            {/* Media Name & Schedule Status */}
                            <div className="truncate flex-1 min-w-0">
                              <div className="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5">
                                {isVideo ? (
                                  <Film size={14} className="text-amber-500 shrink-0" />
                                ) : (
                                  <ImageIcon size={14} className="text-emerald-500 shrink-0" />
                                )}
                                <span className="truncate">{item.media_name}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${sched.badgeClass}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${sched.dotClass}`} />
                                  <span>{sched.text}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Duration & Scheduling Controls */}
                          <div className="flex flex-wrap items-center gap-2.5 text-xs">
                            {/* Duration badge/input */}
                            <div className="flex items-center gap-1.5 bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600">
                              <Clock size={14} className="text-slate-400" />
                              <span className="text-[11px] font-medium text-slate-500">เวลา:</span>
                              {isVideo ? (
                                <span className="text-amber-700 font-bold text-[11px] bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                                  ตามคลิป
                                </span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="1"
                                    max="3600"
                                    value={item.duration_seconds}
                                    onChange={(e) =>
                                      handleUpdateItem(item.id, {
                                        duration_seconds: parseInt(e.target.value) || 1,
                                      })
                                    }
                                    className="w-12 bg-white px-1.5 py-0.5 rounded-lg border border-slate-200 text-center text-slate-800 font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                  />
                                  <span className="text-slate-400 font-medium text-[10px]">วิ</span>
                                </div>
                              )}
                            </div>

                            {/* Schedule Setting Button */}
                            <button
                              onClick={() => openScheduleModal(item)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                                item.start_time || item.end_time
                                  ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                              title="ตั้งตารางเวลาแสดงผล"
                            >
                              <CalendarClock size={14} />
                              <span>
                                {item.start_time || item.end_time ? 'แก้ไขเวลา' : 'ตั้งเวลา'}
                              </span>
                            </button>

                            {/* Active Toggle Button */}
                            <button
                              onClick={() =>
                                handleUpdateItem(item.id, { is_active: !item.is_active })
                              }
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                                item.is_active
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {item.is_active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                              <span>{item.is_active ? 'แสดง' : 'ปิดพัก'}</span>
                            </button>
                          </div>

                          {/* Action Buttons: Arrow Reorder & Delete */}
                          <div className="flex items-center gap-1 self-end md:self-auto shrink-0">
                            <button
                              disabled={idx === 0}
                              onClick={() => reorderItems(idx, idx - 1)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded-lg hover:bg-slate-100 border border-transparent transition cursor-pointer"
                              title="เลื่อนขึ้น"
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              disabled={idx === playlistDetail.items.length - 1}
                              onClick={() => reorderItems(idx, idx + 1)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded-lg hover:bg-slate-100 border border-transparent transition cursor-pointer"
                              title="เลื่อนลง"
                            >
                              <ArrowDown size={16} />
                            </button>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer ml-1"
                              title="นำออกจาก Playlist"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 shadow-xs">
              กรุณาเลือกหรือสร้าง Playlist จากแถบด้านซ้าย
            </div>
          )}
        </div>
      </div>

      {/* Schedule Settings Modal */}
      {schedulingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                  <CalendarClock size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">กำหนดเวลาแสดงผลของสื่อ</h3>
                  <p className="text-[11px] text-slate-400">ระบบจะควบคุมการเล่นตามเวลาที่ระบุ</p>
                </div>
              </div>
              <button
                onClick={() => setSchedulingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs text-slate-500 block">สื่อที่เลือก:</span>
              <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">
                {schedulingItem.media_name}
              </span>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  เวลาเริ่มแสดงผล (Start Date & Time)
                </label>
                <input
                  type="datetime-local"
                  value={schedStartTime}
                  onChange={(e) => setSchedStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  เว้นว่างไว้หากต้องการให้แสดงทันที
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  เวลาสิ้นสุดการแสดงผล (End Date & Time)
                </label>
                <input
                  type="datetime-local"
                  value={schedEndTime}
                  onChange={(e) => setSchedEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  เว้นว่างไว้หากต้องการให้แสดงต่อเนื่องไม่จำกัดเวลาสิ้นสุด
                </p>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClearSchedule}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  ล้างเวลา (แสดงตลอดเวลา)
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSchedulingItem(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 cursor-pointer transition"
                  >
                    บันทึกตารางเวลา
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Playlist Modal */}
      {showNewPlaylistModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">สร้าง Playlist ใหม่</h3>
              <button
                onClick={() => setShowNewPlaylistModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    ชื่อ Playlist
                  </label>
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="เช่น วิดีโอแนะนำโรงพยาบาล, ข่าวสาร OPD เช้า"
                    required
                    autoFocus
                    className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    คำอธิบาย / รายละเอียด (ถ้ามี)
                  </label>
                  <textarea
                    value={newPlaylistDesc}
                    onChange={(e) => setNewPlaylistDesc(e.target.value)}
                    placeholder="ระบุจุดประสงค์หรือแผนกที่ใช้งาน..."
                    rows={2}
                    className="w-full px-4 py-2 bg-slate-50/60 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPlaylistModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 cursor-pointer transition"
                >
                  สร้าง Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Playlist Modal */}
      {editingPlaylist && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Edit2 size={16} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">แก้ไขข้อมูล Playlist</h3>
              </div>
              <button
                onClick={() => setEditingPlaylist(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditPlaylist}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    ชื่อ Playlist
                  </label>
                  <input
                    type="text"
                    value={editPlaylistName}
                    onChange={(e) => setEditPlaylistName(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    คำอธิบาย / รายละเอียด (ถ้ามี)
                  </label>
                  <textarea
                    value={editPlaylistDesc}
                    onChange={(e) => setEditPlaylistDesc(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 bg-slate-50/60 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlaylist(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 cursor-pointer transition"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Media Picker Modal */}
      {showAddMediaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">เลือกสื่อเพื่อเพิ่มลง Playlist</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  คลิกเพื่อเลือกสื่อที่ต้องการ (เลือกได้พร้อมกันหลายรายการ)
                </p>
              </div>
              <button
                onClick={() => setShowAddMediaModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Media list */}
            <div className="py-4 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {mediaList.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400 text-sm">
                  ไม่พบไฟล์สื่อในคลัง กรุณาไปอัปโหลดสื่อที่แท็บ "คลังจัดการสื่อ" ก่อน
                </div>
              ) : (
                mediaList.map((m) => {
                  const isSelected = selectedMediaIds.includes(m.id);
                  const isVideo = m.file_type === 'video';
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        setSelectedMediaIds((prev) =>
                          isSelected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                        );
                      }}
                      className={`relative aspect-video rounded-2xl overflow-hidden border cursor-pointer transition select-none shadow-xs group ${
                        isSelected
                          ? 'border-teal-500 ring-3 ring-teal-500/30'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {isVideo ? (
                        <video src={m.file_path} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={m.file_path} alt="" className="w-full h-full object-cover" />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20 flex flex-col justify-between p-2.5">
                        <div className="flex justify-between items-start">
                          <span className="px-1.5 py-0.5 bg-black/60 backdrop-blur-xs rounded text-[9px] font-mono text-white">
                            {isVideo ? 'VIDEO' : 'IMAGE'}
                          </span>
                          <div
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                              isSelected
                                ? 'bg-teal-500 border-teal-500 text-white'
                                : 'bg-black/40 border-white/50'
                            }`}
                          >
                            {isSelected && <Check size={13} className="stroke-[3]" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-white truncate font-medium">{m.name}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                เลือกแล้ว <span className="text-teal-600 font-bold">{selectedMediaIds.length}</span> รายการ
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddMediaModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  disabled={selectedMediaIds.length === 0}
                  onClick={handleConfirmAddMedia}
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 cursor-pointer transition"
                >
                  เพิ่มลง Playlist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
