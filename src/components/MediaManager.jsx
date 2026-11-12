import React, { useState, useEffect, useRef } from 'react';
import {
  FolderPlus,
  Upload,
  Search,
  Loader2,
  Radio,
  FileText,
} from 'lucide-react';
import {
  api,
  validateUploadFiles,
  extractVideoDuration,
  uploadMediaWithProgress,
} from '../services/api';
import { useToast } from '../features/common/ToastProvider';
import ConfirmDialog from '../features/common/ConfirmDialog';
import UploadProgressBar from '../features/media/UploadProgressBar';
import AnnouncementSlideModal from '../features/media/AnnouncementSlideModal';
import MediaGrid from '../features/media/MediaGrid';
import {
  FolderTreeSidebar,
  CreateFolderModal,
  RenameFolderModal,
  CreateStreamModal,
  EditMediaModal,
  PreviewMediaModal,
} from '../features/media/MediaModals';

export default function MediaManager() {
  const { showToast } = useToast();
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileCount, setUploadFileCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [expandedFolders, setExpandedFolders] = useState({});

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState(null);
  const [editingMedia, setEditingMedia] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [streamForm, setStreamForm] = useState({
    name: '',
    url: '',
    file_type: 'youtube',
    default_duration: 0,
    expires_at: '',
    folder_id: 'root',
  });
  const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', onConfirm: null });
  const fileInputRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [foldersData, mediaData] = await Promise.all([api.getFolders(), api.getMedia(selectedFolder)]);
      setFolders(foldersData);
      setMediaFiles(mediaData);
    } catch (err) {
      showToast('error', err.message || 'ไม่สามารถโหลดข้อมูลคลังสื่อได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedFolder]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const check = validateUploadFiles(files);
    if (!check.valid) {
      showToast('error', check.error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress(5);
    setUploadFileCount(files.length);
    try {
      const durationsMap = {};
      for (const file of files) {
        if (String(file.type || '').startsWith('video/')) {
          const dur = await extractVideoDuration(file);
          if (dur > 0) durationsMap[file.name] = dur;
        }
      }
      const formData = new FormData();
      if (selectedFolder !== 'all' && selectedFolder !== 'root') {
        formData.append('folder_id', selectedFolder);
      }
      if (Object.keys(durationsMap).length > 0) {
        formData.append('durations', JSON.stringify(durationsMap));
      }
      files.forEach((f) => formData.append('files', f));
      await uploadMediaWithProgress(formData, ({ percent }) => setUploadProgress(percent));
      showToast('success', `อัปโหลดสำเร็จ ${files.length} ไฟล์`);
      await loadData();
    } catch (err) {
      showToast('error', 'อัปโหลดล้มเหลว: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadFileCount(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const parent_id =
        selectedFolder !== 'all' && selectedFolder !== 'root' ? selectedFolder : null;
      await api.createFolder(newFolderName.trim(), parent_id);
      setNewFolderName('');
      setShowFolderModal(false);
      showToast('success', 'สร้างโฟลเดอร์สำเร็จ');
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleRenameFolder = async (e) => {
    e.preventDefault();
    if (!editingFolder?.name?.trim()) return;
    try {
      await api.renameFolder(editingFolder.id, editingFolder.name.trim());
      setEditingFolder(null);
      showToast('success', 'เปลี่ยนชื่อโฟลเดอร์สำเร็จ');
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const requestDeleteFolder = (id, name, e) => {
    e.stopPropagation();
    setConfirmState({
      open: true,
      title: 'ยืนยันการลบโฟลเดอร์',
      message: `ต้องการลบโฟลเดอร์ "${name}" หรือไม่? ไฟล์ข้างในจะถูกย้ายออกไปยังโฟลเดอร์หลัก`,
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        try {
          await api.deleteFolder(id);
          if (selectedFolder === id) setSelectedFolder('all');
          showToast('success', 'ลบโฟลเดอร์เรียบร้อยแล้ว');
          loadData();
        } catch (err) {
          showToast('error', err.message);
        }
      },
    });
  };

  const handleCreateStream = async (e) => {
    e.preventDefault();
    if (!streamForm.name.trim() || !streamForm.url.trim()) return;
    try {
      const targetFolder =
        streamForm.folder_id !== 'root' && streamForm.folder_id !== 'all'
          ? streamForm.folder_id
          : null;
      await api.createStreamMedia({
        name: streamForm.name.trim(),
        url: streamForm.url.trim(),
        file_type: streamForm.file_type,
        default_duration: parseInt(streamForm.default_duration) || 0,
        expires_at: streamForm.expires_at || null,
        folder_id: targetFolder,
      });
      setShowStreamModal(false);
      showToast('success', 'บันทึกลิงก์สตรีมสำเร็จ');
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleCreateAnnouncement = async (payload) => {
    setCreatingAnnouncement(true);
    try {
      await api.createAnnouncementMedia(payload);
      setShowAnnouncementModal(false);
      showToast('success', 'สร้างป้ายประกาศโรงพยาบาลสำเร็จ');
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setCreatingAnnouncement(false);
    }
  };

  const handleUpdateMedia = async (e) => {
    e.preventDefault();
    if (!editingMedia) return;
    try {
      await api.updateMedia(editingMedia.id, {
        name: editingMedia.name,
        folder_id: editingMedia.folder_id,
        default_duration: editingMedia.default_duration,
        file_path: editingMedia.file_path,
        expires_at: editingMedia.expires_at || null,
      });
      setEditingMedia(null);
      showToast('success', 'อัปเดตข้อมูลสื่อเรียบร้อยแล้ว');
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const requestDeleteMedia = (file) => {
    setConfirmState({
      open: true,
      title: 'ยืนยันการลบสื่อ',
      message: `ต้องการลบสื่อ "${file.name}" ออกจากระบบอย่างถาวรหรือไม่?`,
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        try {
          await api.deleteMedia(file.id);
          showToast('success', 'ลบสื่อเรียบร้อยแล้ว');
          loadData();
        } catch (err) {
          showToast('error', err.message);
        }
      },
    });
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const filteredMedia = mediaFiles.filter((m) => {
    if (!m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    const isExp = m.expires_at && String(m.expires_at).slice(0, 10) < todayStr;
    if (expiryFilter === 'active') return !isExp;
    if (expiryFilter === 'expired') return Boolean(isExp);
    return true;
  });

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-medium text-slate-900 tracking-tight">คลังจัดการสื่อ</h1>
          <p className="text-sm text-slate-500 mt-1">
            จัดการไฟล์ภาพ วิดีโอ ลิงก์ถ่ายทอดสด และป้ายประกาศสำหรับออกอากาศบนจอทีวี
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFolderModal(true)}
            className="h-9 flex items-center gap-2 px-3 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 text-xs font-medium cursor-pointer"
          >
            <FolderPlus size={16} strokeWidth={1.5} className="text-slate-500" />
            <span>สร้างโฟลเดอร์</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAnnouncementModal(true)}
            className="h-9 flex items-center gap-2 px-3 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 text-xs font-medium cursor-pointer"
          >
            <FileText size={16} strokeWidth={1.5} className="text-slate-500" />
            <span>สร้างป้ายประกาศ</span>
          </button>
          <button
            type="button"
            onClick={() => setShowStreamModal(true)}
            className="h-9 flex items-center gap-2 px-3 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 text-xs font-medium cursor-pointer"
          >
            <Radio size={16} strokeWidth={1.5} className="text-slate-500" />
            <span>เพิ่มลิงก์สตรีม</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-9 flex items-center gap-2 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium cursor-pointer disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} strokeWidth={1.5} className="animate-spin" /> : <Upload size={16} strokeWidth={1.5} />}
            <span>{uploading ? `กำลังอัปโหลด ${uploadProgress}%` : 'อัปโหลดสื่อ'}</span>
          </button>
        </div>
      </div>

      <UploadProgressBar uploading={uploading} progress={uploadProgress} fileCount={uploadFileCount} />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <FolderTreeSidebar
          folders={folders}
          selectedFolder={selectedFolder}
          setSelectedFolder={setSelectedFolder}
          expandedFolders={expandedFolders}
          setExpandedFolders={setExpandedFolders}
          setEditingFolder={setEditingFolder}
          onDeleteFolder={requestDeleteFolder}
        />

        <div className="md:col-span-9 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5 flex-1">
              <Search size={16} strokeWidth={1.5} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="ค้นหาชื่อสื่อ"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400 w-full"
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {[
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'active', label: 'ใช้งานอยู่' },
                { id: 'expired', label: 'หมดอายุแล้ว' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setExpiryFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                    expiryFilter === tab.id
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
            <div className="flex items-center justify-center py-24 text-slate-500 bg-white border border-slate-200/80 rounded-xl text-sm">
              <Loader2 className="animate-spin mr-2 text-teal-700" size={18} strokeWidth={1.5} />
              กำลังโหลดไฟล์สื่อ
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200/80 rounded-xl text-slate-500">
              <Upload size={32} strokeWidth={1.5} className="mx-auto mb-3 text-slate-400" />
              <p className="text-sm font-normal text-slate-600">ไม่พบไฟล์สื่อในหมวดหมู่นี้</p>
            </div>
          ) : (
            <MediaGrid
              files={filteredMedia}
              onPreview={setPreviewMedia}
              onEdit={setEditingMedia}
              onDelete={requestDeleteMedia}
              formatBytes={formatBytes}
            />
          )}
        </div>
      </div>

      <CreateFolderModal
        open={showFolderModal}
        folderName={newFolderName}
        setFolderName={setNewFolderName}
        onClose={() => setShowFolderModal(false)}
        onSubmit={handleCreateFolder}
      />
      <RenameFolderModal
        folder={editingFolder}
        setFolder={setEditingFolder}
        onSubmit={handleRenameFolder}
      />
      <CreateStreamModal
        open={showStreamModal}
        streamForm={streamForm}
        setStreamForm={setStreamForm}
        folders={folders}
        onClose={() => setShowStreamModal(false)}
        onSubmit={handleCreateStream}
      />
      <AnnouncementSlideModal
        open={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        onSubmit={handleCreateAnnouncement}
        folders={folders}
        currentFolderId={selectedFolder}
        submitting={creatingAnnouncement}
      />
      <EditMediaModal
        editingMedia={editingMedia}
        setEditingMedia={setEditingMedia}
        folders={folders}
        onSubmit={handleUpdateMedia}
      />
      <PreviewMediaModal
        previewMedia={previewMedia}
        onClose={() => setPreviewMedia(null)}
        formatBytes={formatBytes}
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
