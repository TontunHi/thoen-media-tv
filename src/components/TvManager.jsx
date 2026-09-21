import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Monitor,
  Plus,
  ExternalLink,
  Copy,
  Trash2,
  Edit2,
  Check,
  Radio,
  RefreshCw,
  X,
  MapPin,
  ListVideo,
  Cast,
  Tv,
  Film,
  Image as ImageIcon,
} from 'lucide-react';

export default function TvManager() {
  const [tvs, setTvs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [playlistPreviews, setPlaylistPreviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTv, setEditingTv] = useState(null);
  const [copiedSlug, setCopiedSlug] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [location, setLocation] = useState('');
  const [playlistId, setPlaylistId] = useState('');

  const loadData = async () => {
    try {
      const [tvsData, playlistsData] = await Promise.all([
        api.getTvs(),
        api.getPlaylists(),
      ]);
      setTvs(tvsData);
      setPlaylists(playlistsData);

      // Map first item preview for each playlist directly from API response (O(1), zero extra HTTP calls)
      const previewMap = {};
      for (const pl of playlistsData) {
        if (pl.preview_file_path) {
          previewMap[pl.id] = {
            file_path: pl.preview_file_path,
            file_type: pl.preview_file_type || 'image',
          };
        }
      }
      setPlaylistPreviews(previewMap);
    } catch (err) {
      console.error('Failed to load TV data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const openCreateModal = () => {
    setEditingTv(null);
    setName('');
    setSlug('');
    setLocation('');
    setPlaylistId(playlists[0]?.id || '');
    setShowAddModal(true);
  };

  const openEditModal = (tv) => {
    setEditingTv(tv);
    setName(tv.name);
    setSlug(tv.slug);
    setLocation(tv.location || '');
    setPlaylistId(tv.playlist_id || '');
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        slug,
        location,
        playlist_id: playlistId ? parseInt(playlistId) : null,
      };

      if (editingTv) {
        await api.updateTv(editingTv.id, payload);
      } else {
        await api.createTv(payload);
      }

      setShowAddModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'บันทึกข้อมูลจอทีวีไม่สำเร็จ');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('ยืนยันลบข้อมูลจอทีวีนี้?')) return;
    try {
      await api.deleteTv(id);
      loadData();
    } catch (err) {
      alert(err.message || 'ลบไม่สำเร็จ');
    }
  };

  const getTvUrl = (tvSlug) => {
    return `${window.location.origin}/tv/${tvSlug}`;
  };

  const handleCopyLink = (tvSlug) => {
    const url = getTvUrl(tvSlug);
    navigator.clipboard.writeText(url);
    setCopiedSlug(tvSlug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-teal-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Radio size={15} className="animate-pulse" />
            <span>Digital Signage Studio Control</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span>ผังควบคุมจอโทรทัศน์</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
              {tvs.length} เครื่อง
            </span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            จัดการอุปกรณ์ฉายภาพ กำหนด URL ประจำจุดบริการ (Custom Slug) และผูกชุดสื่อ Playlist
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80 rounded-2xl shadow-xs transition cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={17} />
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus size={18} />
            <span>เพิ่มจอทีวีใหม่</span>
          </button>
        </div>
      </div>

      {/* TV Displays Grid */}
      {loading ? (
        <div className="py-24 text-center bg-white border border-slate-200/80 rounded-3xl shadow-xs">
          <div className="w-10 h-10 border-3 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">กำลังเชื่อมต่อสถานะสัญญาณโทรทัศน์...</p>
        </div>
      ) : tvs.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center shadow-xs">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-indigo-100 text-indigo-600">
            <Monitor size={40} />
          </div>
          <h3 className="text-slate-800 font-bold text-lg mb-1">ยังไม่มีจอทีวีในระบบ</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto mb-6">
            เริ่มต้นเพิ่มจอแรกเพื่อกำหนด Custom URL Slug เช่น <code className="text-indigo-600">/tv/opd-1</code> สำหรับเปิดบนทีวีแต่ละจุด
          </p>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl font-semibold cursor-pointer shadow-md shadow-indigo-600/20"
          >
            เพิ่มจอทีวีแรกทันที
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tvs.map((tv) => {
            const isOnline = tv.is_online === 1;
            const previewMedia = tv.playlist_id ? playlistPreviews[tv.playlist_id] : null;

            return (
              <div
                key={tv.id}
                className="bg-white border border-slate-200/80 hover:border-indigo-300 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Realistic TV Mockup Frame */}
                  <div className="relative aspect-video bg-slate-950 rounded-2xl border-4 border-slate-900 shadow-inner overflow-hidden mb-4 group/screen flex items-center justify-center">
                    {/* Simulated Content */}
                    {previewMedia ? (
                      previewMedia.file_type === 'video' ? (
                        <video
                          src={previewMedia.file_path}
                          className="w-full h-full object-cover opacity-80"
                          muted
                        />
                      ) : (
                        <img
                          src={previewMedia.file_path}
                          alt=""
                          className="w-full h-full object-cover opacity-90 group-hover/screen:scale-105 transition duration-500"
                        />
                      )
                    ) : (
                      <div className="text-center p-4">
                        <Tv size={32} className="mx-auto text-slate-700 mb-2" />
                        <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                          No Broadcast Signal
                        </span>
                      </div>
                    )}

                    {/* Top Status Bar Overlays */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                      {/* Live Badge */}
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider border backdrop-blur-md shadow-xs ${
                          isOnline
                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 shadow-emerald-500/20'
                            : 'bg-slate-900/80 text-slate-400 border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOnline ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                          }`}
                        />
                        <span>{isOnline ? 'LIVE BROADCAST' : 'STANDBY'}</span>
                      </div>

                      {/* Location Badge */}
                      {tv.location && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-black/60 text-slate-300 backdrop-blur-md border border-white/10 truncate max-w-[140px]">
                          <MapPin size={11} className="text-teal-400 shrink-0" />
                          <span className="truncate">{tv.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Preview Hover Overlay */}
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs opacity-0 group-hover/screen:opacity-100 transition-opacity flex items-center justify-center">
                      <a
                        href={getTvUrl(tv.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-white/95 text-slate-900 text-xs font-bold rounded-xl shadow-lg hover:bg-white flex items-center gap-1.5 transition transform scale-95 group-hover/screen:scale-100"
                      >
                        <ExternalLink size={14} className="text-indigo-600" />
                        <span>เปิดจอพรีวิวแบบเต็ม</span>
                      </a>
                    </div>
                  </div>

                  {/* TV Info Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-base text-slate-900 truncate tracking-tight">
                        {tv.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <ListVideo size={13} className="text-indigo-500 shrink-0" />
                          <span className="font-semibold text-slate-700 truncate">
                            {tv.playlist_name || 'ยังไม่กำหนด Playlist'}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(tv)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                        title="แก้ไขข้อมูล"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(tv.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="ลบจอ"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Custom Slug Box */}
                  <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 mb-4">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Static TV Link (Custom Slug)
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs font-mono font-bold text-indigo-600 truncate">
                        /tv/{tv.slug}
                      </code>
                      <button
                        onClick={() => handleCopyLink(tv.slug)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition cursor-pointer shrink-0 border border-transparent hover:border-slate-200"
                        title="คัดลอก Full URL"
                      >
                        {copiedSlug === tv.slug ? (
                          <Check size={14} className="text-emerald-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    สถานะ: {isOnline ? '🟢 ออนไลน์อยู่' : '⚪ รอสัญญาณ'}
                  </span>
                  <a
                    href={getTvUrl(tv.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition"
                  >
                    <span>เปิดจอภาพ</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit TV Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Monitor size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingTv ? 'แก้ไขข้อมูลจอทีวี' : 'ลงทะเบียนจอทีวีใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  ชื่อจอทีวี (TV Name)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingTv && !slug) {
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]/g, '-')
                          .replace(/-+/g, '-')
                      );
                    }
                  }}
                  placeholder="เช่น TV แผนกผู้ป่วยนอก (OPD-1), จอหน้าห้องยา"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Custom Slug (URL ถาวรสำหรับเปิดบน TV)
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-500 text-xs font-mono font-medium">
                    /tv/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="เช่น opd-1, drug-1, emergency"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-r-xl text-slate-900 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  ใช้ภาษาอังกฤษ ตัวเลข และขีดกลาง (-)
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  สถานที่ติดตั้ง (Location)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="เช่น อาคารผู้ป่วยนอก ชั้น 1 หน้าห้องตรวจ 3"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  เลือก Playlist ที่จะนำไปแสดงผล
                </label>
                <select
                  value={playlistId}
                  onChange={(e) => setPlaylistId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- ยังไม่กำหนด (หน้าจอดำ/รอสัญญาณ) --</option>
                  {playlists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name} ({pl.item_count || 0} รายการ)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
