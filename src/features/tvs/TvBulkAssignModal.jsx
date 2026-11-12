import React, { useState } from 'react';
import { Layers, X } from 'lucide-react';

export default function TvBulkAssignModal({
  open,
  tvs = [],
  playlists = [],
  submitting = false,
  onClose,
  onSubmit,
}) {
  const [selectedTvIds, setSelectedTvIds] = useState([]);
  const [playlistId, setPlaylistId] = useState('__keep__');
  const [updateTicker, setUpdateTicker] = useState(false);
  const [tickerEnabled, setTickerEnabled] = useState(true);
  const [tickerText, setTickerText] = useState('');

  if (!open) return null;

  const toggleTv = (id) => {
    setSelectedTvIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedTvIds.length === tvs.length) {
      setSelectedTvIds([]);
    } else {
      setSelectedTvIds(tvs.map((t) => t.id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedTvIds.length === 0) return;

    const payload = { tvIds: selectedTvIds };
    if (playlistId !== '__keep__') {
      payload.playlist_id = playlistId ? parseInt(playlistId, 10) : null;
    }
    if (updateTicker) {
      payload.ticker_enabled = tickerEnabled ? 1 : 0;
      payload.ticker_text = tickerText.trim();
    }
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 max-w-xl w-full shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-teal-700 flex items-center justify-center">
              <Layers size={18} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-medium text-slate-900">
                สั่งเปลี่ยนเพลย์ลิสต์และข้อความวิ่งหลายจอ
              </h3>
              <p className="text-xs text-slate-500">
                เลือกจอทีวีที่ต้องการอัปเดตพร้อมกัน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-700">
                เลือกจอทีวี{' '}
                <span className="font-mono tabular-nums text-teal-700">
                  {selectedTvIds.length}/{tvs.length}
                </span>
              </span>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium text-teal-700 hover:underline cursor-pointer"
              >
                {selectedTvIds.length === tvs.length ? 'ยกเลิกทั้งหมด' : 'เลือกทุกจอ'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-0.5">
              {tvs.map((tv) => {
                const checked = selectedTvIds.includes(tv.id);
                return (
                  <label
                    key={tv.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                      checked
                        ? 'bg-teal-50/70 border-teal-700 text-slate-900 font-medium'
                        : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTv(tv.id)}
                      className="w-4 h-4 text-teal-700 rounded"
                    />
                    <span className="truncate">{tv.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              เปลี่ยนเพลย์ลิสต์ของจอที่เลือก
            </label>
            <select
              value={playlistId}
              onChange={(e) => setPlaylistId(e.target.value)}
              className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900"
            >
              <option value="__keep__">คงเพลย์ลิสต์เดิม</option>
              <option value="">ยกเลิกเพลย์ลิสต์</option>
              {playlists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-900 cursor-pointer">
              <input
                type="checkbox"
                checked={updateTicker}
                onChange={(e) => setUpdateTicker(e.target.checked)}
                className="w-4 h-4 text-teal-700 rounded"
              />
              <span>อัปเดตข้อความตัววิ่งด้านล่างจอด้วย</span>
            </label>

            {updateTicker && (
              <div className="space-y-2.5 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tickerEnabled}
                    onChange={(e) => setTickerEnabled(e.target.checked)}
                    className="w-4 h-4 text-teal-700 rounded"
                  />
                  <span>เปิดแสดงแถบข้อความตัววิ่ง</span>
                </label>
                <input
                  type="text"
                  value={tickerText}
                  onChange={(e) => setTickerText(e.target.value)}
                  placeholder="ระบุข้อความตัววิ่งที่ต้องการส่งไปทุกจอที่เลือก"
                  className="w-full h-10 bg-white border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                selectedTvIds.length === 0 ||
                (playlistId === '__keep__' && !updateTicker)
              }
              className="h-9 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium cursor-pointer disabled:opacity-40"
            >
              {submitting ? 'กำลังอัปเดต' : 'สั่งอัปเดตจอที่เลือก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
