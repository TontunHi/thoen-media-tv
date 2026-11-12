import React from 'react';
import {
  Edit2,
  X,
  Check,
  PlaySquare,
  Globe,
  FileText,
  Folder,
} from 'lucide-react';
import {
  resolveMediaUrl,
  getYoutubeThumbnail,
  parseAnnouncementData,
  ANNOUNCEMENT_THEMES,
} from '../../domain/mediaRegistry';

export function CreatePlaylistModal({
  open,
  playlistForm,
  setPlaylistForm,
  onClose,
  onSubmit,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 max-w-md w-full shadow-lg">
        <h3 className="text-base font-medium text-slate-900 mb-4">สร้างเพลย์ลิสต์ใหม่</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              ชื่อเพลย์ลิสต์
            </label>
            <input
              type="text"
              value={playlistForm.name}
              onChange={(e) =>
                setPlaylistForm({ ...playlistForm, name: e.target.value })
              }
              placeholder="เช่น จอประชาสัมพันธ์ผู้ป่วยนอก"
              className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              รายละเอียดเพิ่มเติม
            </label>
            <input
              type="text"
              value={playlistForm.description}
              onChange={(e) =>
                setPlaylistForm({ ...playlistForm, description: e.target.value })
              }
              placeholder="คำอธิบายสั้นๆ"
              className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="h-9 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium cursor-pointer"
            >
              สร้างเพลย์ลิสต์
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditPlaylistModal({
  editingPlaylist,
  setEditingPlaylist,
  onSubmit,
}) {
  if (!editingPlaylist) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 max-w-md w-full shadow-lg">
        <h3 className="text-base font-medium text-slate-900 mb-4 flex items-center gap-2">
          <Edit2 size={18} strokeWidth={1.5} className="text-teal-700" />
          แก้ไขข้อมูลเพลย์ลิสต์
        </h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              ชื่อเพลย์ลิสต์
            </label>
            <input
              type="text"
              value={editingPlaylist.name}
              onChange={(e) =>
                setEditingPlaylist({ ...editingPlaylist, name: e.target.value })
              }
              className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              รายละเอียดเพิ่มเติม
            </label>
            <input
              type="text"
              value={editingPlaylist.description}
              onChange={(e) =>
                setEditingPlaylist({
                  ...editingPlaylist,
                  description: e.target.value,
                })
              }
              placeholder="คำอธิบายสั้นๆ"
              className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingPlaylist(null)}
              className="h-9 px-4 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="h-9 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium cursor-pointer"
            >
              บันทึกการเปลี่ยนแปลง
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MediaPickerModal({
  open,
  folders = [],
  mediaList = [],
  pickerFolder,
  setPickerFolder,
  selectedMediaIds = [],
  toggleSelectMedia,
  onClose,
  onAddSelected,
}) {
  if (!open) return null;

  const filteredPickerMedia = mediaList.filter((m) => {
    if (pickerFolder === 'all') return true;
    if (pickerFolder === 'root') return !m.folder_id;
    return m.folder_id === parseInt(pickerFolder);
  });

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-medium text-slate-900">
              เลือกสื่อเข้าเพลย์ลิสต์
            </h3>
            <p className="text-xs text-slate-500">
              คลิกที่การ์ดเพื่อเลือกสื่อที่ต้องการนำมาเรียงต่อกัน
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 py-3 overflow-x-auto border-b border-slate-100">
          <button
            type="button"
            onClick={() => setPickerFolder('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium shrink-0 cursor-pointer transition-colors ${
              pickerFolder === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => setPickerFolder('root')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium shrink-0 cursor-pointer transition-colors ${
              pickerFolder === 'root'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            โฟลเดอร์หลัก
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setPickerFolder(String(f.id))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium shrink-0 cursor-pointer transition-colors ${
                pickerFolder === String(f.id)
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              <Folder size={13} strokeWidth={1.5} />
              <span>{f.name}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredPickerMedia.map((media) => {
            const isChecked = selectedMediaIds.includes(media.id);
            const announcement =
              media.file_type === 'announcement'
                ? parseAnnouncementData(media)
                : null;
            const annTheme = announcement
              ? ANNOUNCEMENT_THEMES[announcement.theme] ||
                ANNOUNCEMENT_THEMES['hospital-green']
              : null;

            return (
              <div
                key={media.id}
                onClick={() => toggleSelectMedia(media.id)}
                className={`relative rounded-xl overflow-hidden border cursor-pointer transition-colors ${
                  isChecked
                    ? 'border-teal-700 ring-2 ring-teal-700/20 bg-teal-50/30'
                    : 'border-slate-200/80 bg-white hover:border-slate-300'
                }`}
              >
                <div className="aspect-video bg-slate-900 relative flex items-center justify-center">
                  {media.file_type === 'image' ? (
                    <img
                      src={resolveMediaUrl(media.file_path)}
                      alt={media.name}
                      className="w-full h-full object-cover"
                    />
                  ) : media.file_type === 'video' ? (
                    <video
                      src={resolveMediaUrl(media.file_path)}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : media.file_type === 'announcement' && announcement ? (
                    <div
                      className="w-full h-full p-2 flex flex-col items-center justify-center text-center"
                      style={{ backgroundColor: annTheme.bg, color: annTheme.text }}
                    >
                      <FileText size={16} strokeWidth={1.5} style={{ color: annTheme.accent }} />
                      <span className="text-[10px] font-medium line-clamp-2 mt-1">
                        {announcement.headline}
                      </span>
                    </div>
                  ) : media.file_type === 'youtube' &&
                    getYoutubeThumbnail(media.file_path) ? (
                    <div className="relative w-full h-full">
                      <img
                        src={getYoutubeThumbnail(media.file_path)}
                        alt={media.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <PlaySquare size={18} strokeWidth={1.5} className="text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <Globe size={18} strokeWidth={1.5} />
                      <span className="text-[10px] font-mono text-slate-400 mt-1">
                        {media.file_type}
                      </span>
                    </div>
                  )}
                  {isChecked && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-md bg-teal-700 text-white flex items-center justify-center shadow-xs">
                      <Check size={14} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="p-2.5 text-xs font-medium text-slate-800 truncate">
                  {media.name}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            เลือกแล้ว{' '}
            <strong className="font-mono tabular-nums text-teal-700">
              {selectedMediaIds.length}
            </strong>{' '}
            รายการ
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={!selectedMediaIds.length}
              onClick={onAddSelected}
              className="h-9 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white text-xs font-medium cursor-pointer"
            >
              เพิ่มเข้าเพลย์ลิสต์
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
