import React from 'react';
import {
  Folder,
  FolderPlus,
  HardDrive,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  Radio,
  PlaySquare,
  Tv,
  Globe,
  Eye,
  X,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import {
  resolveMediaUrl,
  getEmbedUrl,
  parseAnnouncementData,
  ANNOUNCEMENT_THEMES,
} from '../../domain/mediaRegistry';

export function FolderTreeSidebar({
  folders = [],
  selectedFolder,
  setSelectedFolder,
  expandedFolders = {},
  setExpandedFolders,
  setEditingFolder,
  onDeleteFolder,
}) {
  const renderTree = (parentId = null, depth = 0) =>
    folders
      .filter((f) => f.parent_id === parentId)
      .map((folder) => {
        const hasChildren = folders.some((f) => f.parent_id === folder.id);
        const isExpanded = expandedFolders[folder.id];
        const isSelected = selectedFolder === folder.id;
        return (
          <div key={folder.id}>
            <div
              onClick={() => setSelectedFolder(folder.id)}
              style={{ paddingLeft: `${depth * 12 + 10}px` }}
              className={`group h-9 flex items-center justify-between pr-2 rounded-lg cursor-pointer transition-colors text-sm my-0.5 ${
                isSelected
                  ? 'bg-slate-100 text-slate-900 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedFolders((prev) => ({
                        ...prev,
                        [folder.id]: !prev[folder.id],
                      }));
                    }}
                    className="p-0.5 hover:bg-slate-200/70 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} strokeWidth={1.5} />
                    ) : (
                      <ChevronRight size={14} strokeWidth={1.5} />
                    )}
                  </button>
                ) : (
                  <span className="w-4" />
                )}
                <Folder
                  size={16}
                  strokeWidth={1.5}
                  className={isSelected ? 'text-teal-700 shrink-0' : 'text-slate-400 shrink-0'}
                />
                <span className="truncate">{folder.name}</span>
              </div>
              <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingFolder({ id: folder.id, name: folder.name });
                  }}
                  className="p-1 hover:bg-slate-200 rounded text-slate-500"
                >
                  <Edit2 size={12} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={(e) => onDeleteFolder(folder.id, folder.name, e)}
                  className="p-1 hover:bg-rose-50 rounded text-rose-600"
                >
                  <Trash2 size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>
            {hasChildren && isExpanded && renderTree(folder.id, depth + 1)}
          </div>
        );
      });

  return (
    <div className="md:col-span-3 bg-white border border-slate-200/80 rounded-xl p-3.5 h-fit shadow-2xs">
      <div className="text-xs font-normal text-slate-500 mb-2 px-2">
        หมวดหมู่โฟลเดอร์
      </div>
      <div
        onClick={() => setSelectedFolder('all')}
        className={`h-9 flex items-center gap-2.5 px-2.5 rounded-lg cursor-pointer text-sm mb-0.5 transition-colors ${
          selectedFolder === 'all'
            ? 'bg-slate-100 text-slate-900 font-medium'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <HardDrive
          size={16}
          strokeWidth={1.5}
          className={selectedFolder === 'all' ? 'text-teal-700' : 'text-slate-400'}
        />
        <span>สื่อทั้งหมด</span>
      </div>
      <div
        onClick={() => setSelectedFolder('root')}
        className={`h-9 flex items-center gap-2.5 px-2.5 rounded-lg cursor-pointer text-sm mb-2 transition-colors ${
          selectedFolder === 'root'
            ? 'bg-slate-100 text-slate-900 font-medium'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <Folder
          size={16}
          strokeWidth={1.5}
          className={selectedFolder === 'root' ? 'text-teal-700' : 'text-slate-400'}
        />
        <span>โฟลเดอร์หลัก</span>
      </div>
      <div className="border-t border-slate-100 pt-2 max-h-[420px] overflow-y-auto">
        {renderTree(null, 0)}
      </div>
    </div>
  );
}

export function CreateFolderModal({
  open,
  folderName,
  setFolderName,
  onClose,
  onSubmit,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 max-w-md w-full shadow-lg">
        <h3 className="text-base font-medium text-slate-900 mb-4 flex items-center gap-2">
          <FolderPlus size={18} strokeWidth={1.5} className="text-teal-700" />
          สร้างโฟลเดอร์ใหม่
        </h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              ชื่อโฟลเดอร์
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="เช่น สื่อประชาสัมพันธ์ผู้ป่วยนอก"
              className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white"
              autoFocus
              required
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
              สร้างโฟลเดอร์
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RenameFolderModal({
  folder,
  setFolder,
  onSubmit,
}) {
  if (!folder) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 max-w-md w-full shadow-lg">
        <h3 className="text-base font-medium text-slate-900 mb-4 flex items-center gap-2">
          <Edit2 size={18} strokeWidth={1.5} className="text-teal-700" />
          เปลี่ยนชื่อโฟลเดอร์
        </h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              ชื่อโฟลเดอร์ใหม่
            </label>
            <input
              type="text"
              value={folder.name}
              onChange={(e) => setFolder({ ...folder, name: e.target.value })}
              className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white"
              autoFocus
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setFolder(null)}
              className="h-9 px-4 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="h-9 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium cursor-pointer"
            >
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CreateStreamModal({
  open,
  streamForm,
  setStreamForm,
  folders = [],
  onClose,
  onSubmit,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 max-w-lg w-full shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-slate-900 flex items-center gap-2">
            <Radio size={18} strokeWidth={1.5} className="text-teal-700" />
            เพิ่มลิงก์สตรีมสดหรือวิดีโอออนไลน์
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'youtube', label: 'YouTube', icon: PlaySquare },
              { id: 'facebook', label: 'Facebook Live', icon: Tv },
              { id: 'stream', label: 'HLS / Web URL', icon: Globe },
            ].map((type) => {
              const Icon = type.icon;
              const isSelected = streamForm.file_type === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setStreamForm({ ...streamForm, file_type: type.id })}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-teal-50/70 border-teal-700 text-teal-900'
                      : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} strokeWidth={1.5} />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              ชื่อสื่อสำหรับแสดงผล
            </label>
            <input
              type="text"
              value={streamForm.name}
              onChange={(e) => setStreamForm({ ...streamForm, name: e.target.value })}
              placeholder="เช่น ถ่ายทอดสดการประชุมวิชาการ"
              className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              URL ลิงก์วิดีโอหรือสตรีมสด
            </label>
            <input
              type="url"
              value={streamForm.url}
              onChange={(e) => {
                const val = e.target.value;
                let autoType = streamForm.file_type;
                if (val.includes('youtube.com') || val.includes('youtu.be')) autoType = 'youtube';
                else if (val.includes('facebook.com') || val.includes('fb.watch')) autoType = 'facebook';
                setStreamForm({ ...streamForm, url: val, file_type: autoType });
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900 font-mono focus:outline-none focus:border-teal-700 focus:bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                โฟลเดอร์
              </label>
              <select
                value={streamForm.folder_id}
                onChange={(e) => setStreamForm({ ...streamForm, folder_id: e.target.value })}
                className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 text-sm text-slate-900"
              >
                <option value="root">โฟลเดอร์หลัก</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                เวลาแสดงเป็นวินาที
              </label>
              <input
                type="number"
                min="0"
                value={streamForm.default_duration}
                onChange={(e) =>
                  setStreamForm({
                    ...streamForm,
                    default_duration: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900 font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                วันหมดอายุ
              </label>
              <input
                type="date"
                value={streamForm.expires_at || ''}
                onChange={(e) => setStreamForm({ ...streamForm, expires_at: e.target.value })}
                className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
              บันทึกลิงก์สตรีม
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditMediaModal({
  editingMedia,
  setEditingMedia,
  folders = [],
  onSubmit,
}) {
  if (!editingMedia) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 max-w-md w-full shadow-lg">
        <h3 className="text-base font-medium text-slate-900 mb-4 flex items-center gap-2">
          <Edit2 size={18} strokeWidth={1.5} className="text-teal-700" />
          แก้ไขข้อมูลสื่อ
        </h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              ชื่อสื่อแสดงผล
            </label>
            <input
              type="text"
              value={editingMedia.name}
              onChange={(e) => setEditingMedia({ ...editingMedia, name: e.target.value })}
              className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900"
              required
            />
          </div>

          {(editingMedia.file_type === 'youtube' ||
            editingMedia.file_type === 'facebook' ||
            editingMedia.file_type === 'stream') && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                ลิงก์สตรีม
              </label>
              <input
                type="url"
                value={editingMedia.file_path}
                onChange={(e) =>
                  setEditingMedia({ ...editingMedia, file_path: e.target.value })
                }
                className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900 font-mono"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              โฟลเดอร์ปลายทาง
            </label>
            <select
              value={editingMedia.folder_id || 'root'}
              onChange={(e) =>
                setEditingMedia({
                  ...editingMedia,
                  folder_id: e.target.value === 'root' ? null : parseInt(e.target.value),
                })
              }
              className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900"
            >
              <option value="root">โฟลเดอร์หลัก</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                เวลาแสดงเป็นวินาที
              </label>
              <input
                type="number"
                min="0"
                value={editingMedia.default_duration}
                onChange={(e) =>
                  setEditingMedia({
                    ...editingMedia,
                    default_duration: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900 font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar size={12} strokeWidth={1.5} /> วันหมดอายุอัตโนมัติ
              </label>
              <input
                type="date"
                value={editingMedia.expires_at ? String(editingMedia.expires_at).slice(0, 10) : ''}
                onChange={(e) =>
                  setEditingMedia({
                    ...editingMedia,
                    expires_at: e.target.value || null,
                  })
                }
                className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingMedia(null)}
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

export function PreviewMediaModal({
  previewMedia,
  onClose,
  formatBytes,
}) {
  if (!previewMedia) return null;
  const announcement =
    previewMedia.file_type === 'announcement'
      ? parseAnnouncementData(previewMedia)
      : null;
  const annTheme = announcement
    ? ANNOUNCEMENT_THEMES[announcement.theme] || ANNOUNCEMENT_THEMES['hospital-green']
    : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full overflow-hidden shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <Eye size={16} strokeWidth={1.5} className="text-teal-400 shrink-0" />
            <h3 className="text-sm font-medium truncate">{previewMedia.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            {previewMedia.file_type !== 'announcement' && (
              <a
                href={resolveMediaUrl(previewMedia.file_path)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                <ExternalLink size={13} strokeWidth={1.5} />
                <span>เปิดลิงก์ต้นฉบับ</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white cursor-pointer"
              aria-label="ปิดตัวอย่าง"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="bg-black flex items-center justify-center aspect-video w-full max-h-[75vh] overflow-hidden">
          {previewMedia.file_type === 'image' ? (
            <img
              src={resolveMediaUrl(previewMedia.file_path)}
              alt={previewMedia.name}
              className="max-w-full max-h-full object-contain"
            />
          ) : previewMedia.file_type === 'video' ? (
            <video
              src={resolveMediaUrl(previewMedia.file_path)}
              className="w-full h-full object-contain"
              controls
              autoPlay
            />
          ) : previewMedia.file_type === 'announcement' && announcement ? (
            <div
              className="w-full h-full p-10 flex flex-col justify-between text-center"
              style={{ backgroundColor: annTheme.bg, color: annTheme.text }}
            >
              <div>
                <span
                  className="px-4 py-1.5 rounded-md text-sm font-medium"
                  style={{ backgroundColor: annTheme.badgeBg, color: annTheme.accent }}
                >
                  {announcement.department}
                </span>
              </div>
              <div className="my-auto max-w-2xl mx-auto space-y-4">
                <h2 className="text-3xl font-semibold leading-tight">
                  {announcement.headline}
                </h2>
                {announcement.body && (
                  <p className="text-lg opacity-95 whitespace-pre-line leading-relaxed">
                    {announcement.body}
                  </p>
                )}
              </div>
              <div className="text-sm font-medium" style={{ color: annTheme.accent }}>
                {announcement.footer || 'ประชาสัมพันธ์ โรงพยาบาลเถิน'}
              </div>
            </div>
          ) : (
            <iframe
              src={getEmbedUrl(previewMedia)}
              title={previewMedia.name}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>

        <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
          <span>ประเภทสื่อ {previewMedia.file_type.toUpperCase()}</span>
          <span>
            {previewMedia.size > 0
              ? `ขนาดไฟล์ ${formatBytes(previewMedia.size)}`
              : `เวลาแสดง ${previewMedia.default_duration || 15} วินาที`}
          </span>
        </div>
      </div>
    </div>
  );
}
