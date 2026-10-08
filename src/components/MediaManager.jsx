import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  FolderPlus,
  Folder as FolderIcon,
  Upload,
  Image as ImageIcon,
  Film,
  Trash2,
  ChevronRight,
  FolderInput,
  RefreshCw,
  X,
  Check,
  HardDrive,
  Sparkles,
  FileCheck,
  Eye,
  Edit2,
  Radio,
  Link2,
  Play,
  Tv,
} from 'lucide-react';
import {
  extractYouTubeId,
  getYouTubeThumbnail,
  getYouTubeEmbedUrl,
  getFacebookEmbedUrl,
  detectMediaType,
} from '../utils/mediaHelper';

export default function MediaManager() {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null); // null = all
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null); // { id, name }
  const [editFolderName, setEditFolderName] = useState('');
  const [editingMedia, setEditingMedia] = useState(null); // { id, name }
  const [editMediaName, setEditMediaName] = useState('');
  const [previewMedia, setPreviewMedia] = useState(null);
  const [movingMedia, setMovingMedia] = useState(null);
  const [targetFolderId, setTargetFolderId] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Live Stream / Online Video Modal state
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [streamName, setStreamName] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamDuration, setStreamDuration] = useState(0);
  const [streamSubmitting, setStreamSubmitting] = useState(false);

  // Handle Media Rename
  const handleRenameMedia = async (e) => {
    e.preventDefault();
    if (!editingMedia || !editMediaName.trim()) return;

    try {
      await api.updateMedia(editingMedia.id, { name: editMediaName.trim() });
      setEditingMedia(null);
      setEditMediaName('');
      loadData();
    } catch (err) {
      alert(err.message || 'ไม่สามารถเปลี่ยนชื่อสื่อได้');
    }
  };

  // Load folders & media
  const loadData = async () => {
    setLoading(true);
    try {
      const [foldersData, mediaData] = await Promise.all([
        api.getFolders(),
        api.getMedia(selectedFolder ? selectedFolder.id : 'all'),
      ]);
      setFolders(foldersData);
      setMediaFiles(mediaData);
    } catch (err) {
      console.error('Error loading media data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFolder]);

  // Handle Folder Creation
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await api.createFolder(newFolderName.trim(), selectedFolder?.id || null);
      setNewFolderName('');
      setShowNewFolderModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'ไม่สามารถสร้างโฟลเดอร์ได้');
    }
  };

  // Handle Folder Rename
  const handleRenameFolder = async (e) => {
    e.preventDefault();
    if (!editingFolder || !editFolderName.trim()) return;

    try {
      await api.renameFolder(editingFolder.id, editFolderName.trim());
      if (selectedFolder?.id === editingFolder.id) {
        setSelectedFolder((prev) => ({ ...prev, name: editFolderName.trim() }));
      }
      setEditingFolder(null);
      setEditFolderName('');
      loadData();
    } catch (err) {
      alert(err.message || 'ไม่สามารถเปลี่ยนชื่อโฟลเดอร์ได้');
    }
  };

  // Handle Folder Deletion
  const handleDeleteFolder = async (folderId, e) => {
    e.stopPropagation();
    if (!confirm('ยืนยันลบโฟลเดอร์นี้? ไฟล์ภายในจะไม่ถูกลบแต่จะถูกย้ายออกมายังโฟลเดอร์หลัก')) return;
    try {
      await api.deleteFolder(folderId);
      if (selectedFolder?.id === folderId) setSelectedFolder(null);
      loadData();
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบ');
    }
  };

  // Handle File Upload
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    if (selectedFolder) {
      formData.append('folder_id', selectedFolder.id);
    }

    try {
      await api.uploadMedia(formData);
      loadData();
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Add Live / Online Stream Media
  const handleAddStreamMedia = async (e) => {
    e.preventDefault();
    if (!streamName.trim() || !streamUrl.trim()) return;

    setStreamSubmitting(true);
    try {
      const detectedType = detectMediaType(streamUrl);
      await api.createStreamMedia({
        name: streamName.trim(),
        url: streamUrl.trim(),
        file_type: detectedType,
        folder_id: selectedFolder?.id || null,
        default_duration: parseInt(streamDuration) || 60,
      });

      setShowStreamModal(false);
      setStreamName('');
      setStreamUrl('');
      setStreamDuration(60);
      loadData();
    } catch (err) {
      alert(err.message || 'ไม่สามารถเพิ่มลิงก์ Live Video ได้');
    } finally {
      setStreamSubmitting(false);
    }
  };

  // Handle Media Delete
  const handleDeleteMedia = async (id) => {
    if (!confirm('ยืนยันลบสื่อนี้?')) return;
    try {
      await api.deleteMedia(id);
      loadData();
    } catch (err) {
      alert(err.message || 'ไม่สามารถลบไฟล์ได้');
    }
  };

  // Handle Move Media to Folder
  const handleConfirmMove = async (e) => {
    e.preventDefault();
    if (!movingMedia) return;

    try {
      const folder_id = targetFolderId === '' || targetFolderId === 'root' ? null : parseInt(targetFolderId);
      await api.updateMedia(movingMedia.id, { folder_id });
      setMovingMedia(null);
      loadData();
    } catch (err) {
      alert(err.message || 'ไม่สามารถย้ายไฟล์ได้');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return 'ออนไลน์ (Live/URL)';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const currentDetectedStreamType = detectMediaType(streamUrl);

  return (
    <div
      className="p-8 max-w-7xl mx-auto space-y-8 relative"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.relatedTarget === null) setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFileUpload(e.dataTransfer.files);
      }}
    >
      {/* Global Drag Overlay */}
      {isDragOver && (
        <div className="fixed inset-0 bg-teal-900/60 backdrop-blur-xs z-50 flex flex-col items-center justify-center pointer-events-none border-4 border-dashed border-teal-400 m-4 rounded-3xl animate-in fade-in duration-150">
          <div className="w-20 h-20 rounded-3xl bg-white shadow-2xl flex items-center justify-center text-teal-600 mb-4 animate-bounce">
            <Upload size={38} />
          </div>
          <h3 className="text-2xl font-bold text-white drop-shadow">ปล่อยไฟล์ที่นี่เพื่ออัปโหลดทันที</h3>
          <p className="text-teal-200 text-sm mt-1">
            ไฟล์จะถูกบันทึกไปยังโฟลเดอร์ "{selectedFolder ? selectedFolder.name : 'สื่อทั้งหมด'}"
          </p>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-teal-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles size={15} />
            <span>Digital Asset Management</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <span>คลังจัดการสื่อ (Media Assets)</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            อัปโหลดไฟล์ จัดการโฟลเดอร์ และแนบวิดีโอสด Live Video (YouTube, Facebook Live) เพื่อจัดฉายบนจอทีวี
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {/* Add Live Video / Stream Button */}
          <button
            onClick={() => setShowStreamModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-rose-500/20 transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
          >
            <Radio size={17} className="animate-pulse" />
            <span>แนบ Live VDO (YouTube / FB)</span>
          </button>

          {/* New Folder Button */}
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-sm font-semibold transition cursor-pointer shadow-xs"
          >
            <FolderPlus size={18} className="text-amber-500" />
            <span>สร้างโฟลเดอร์</span>
          </button>

          {/* File Upload Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e.target.files)}
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
            className="hidden"
          />

          {/* Upload Files Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-teal-600/20 transition-all duration-200 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5"
          >
            {uploading ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Upload size={18} />
            )}
            <span>{uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดสื่อ'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Folders Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                โฟลเดอร์แผนก & การจัดเก็บ
              </span>
              <button
                onClick={loadData}
                className="text-slate-400 hover:text-teal-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="space-y-1.5">
              {/* All Media Option */}
              <button
                onClick={() => setSelectedFolder(null)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium transition cursor-pointer ${
                  selectedFolder === null
                    ? 'bg-gradient-to-r from-teal-50/80 to-indigo-50/50 text-teal-950 font-bold border border-teal-300 shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      selectedFolder === null
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-teal-50 text-teal-600'
                    }`}
                  >
                    <FolderIcon size={16} />
                  </div>
                  <span>สื่อทั้งหมด (All Media)</span>
                </div>
                <ChevronRight
                  size={15}
                  className={selectedFolder === null ? 'text-teal-600' : 'text-slate-300'}
                />
              </button>

              {/* Folders List */}
              {folders.map((f) => {
                const isSelected = selectedFolder?.id === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFolder(f)}
                    className={`group flex items-center justify-between p-3 rounded-xl text-sm transition cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-teal-50/80 to-indigo-50/50 text-teal-950 font-bold border border-teal-300 shadow-xs'
                        : 'text-slate-700 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-amber-50 text-amber-500'
                        }`}
                      >
                        <FolderIcon size={16} />
                      </div>
                      <span className="truncate">{f.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Rename folder button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolder(f);
                          setEditFolderName(f.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition cursor-pointer"
                        title="เปลี่ยนชื่อโฟลเดอร์"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Delete folder button */}
                      <button
                        onClick={(e) => handleDeleteFolder(f.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition cursor-pointer"
                        title="ลบโฟลเดอร์"
                      >
                        <Trash2 size={13} />
                      </button>

                      <ChevronRight
                        size={15}
                        className={isSelected ? 'text-teal-600' : 'text-slate-300'}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Media Grid & Dropzone */}
        <div className="lg:col-span-8 space-y-4">
          {/* Breadcrumb Info Bar */}
          <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <HardDrive size={15} className="text-teal-600" />
              <span>คลังจัดเก็บ</span>
              <ChevronRight size={13} className="text-slate-400" />
              <span className="text-slate-900 font-bold">
                {selectedFolder ? selectedFolder.name : 'สื่อทั้งหมด'}
              </span>
              {selectedFolder && (
                <button
                  onClick={() => {
                    setEditingFolder(selectedFolder);
                    setEditFolderName(selectedFolder.name);
                  }}
                  className="ml-2 p-1 text-slate-400 hover:text-teal-600 rounded transition cursor-pointer"
                  title="เปลี่ยนชื่อโฟลเดอร์นี้"
                >
                  <Edit2 size={13} />
                </button>
              )}
            </div>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/60">
              {mediaFiles.length} รายการ
            </span>
          </div>

          {/* Media Grid */}
          {loading ? (
            <div className="py-24 text-center bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              <div className="w-9 h-9 border-3 border-teal-500/20 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-xs font-medium">กำลังโหลดคลังสื่อ...</p>
            </div>
          ) : mediaFiles.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200/90 rounded-3xl p-16 text-center bg-white shadow-xs">
              <div className="w-16 h-16 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-center text-teal-600 mx-auto mb-4 shadow-xs">
                <Upload size={30} />
              </div>
              <h4 className="text-slate-800 font-bold text-base">ยังไม่มีไฟล์สื่อในส่วนนี้</h4>
              <p className="text-slate-400 text-xs mt-1 mb-5 max-w-sm mx-auto">
                ลากไฟล์มาวางเพื่ออัปโหลดทันที หรือแนบลิงก์ Live Video (YouTube, Facebook Live)
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setShowStreamModal(true)}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-xl font-semibold transition cursor-pointer shadow-sm flex items-center gap-2"
                >
                  <Radio size={15} />
                  <span>แนบ Live Video</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs rounded-xl font-semibold transition cursor-pointer shadow-sm"
                >
                  เลือกไฟล์จากเครื่อง
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {mediaFiles.map((media) => {
                const isVideo = media.file_type === 'video';
                const isYouTube = media.file_type === 'youtube';
                const isFacebook = media.file_type === 'facebook';
                const isStream = media.file_type === 'stream';
                const isLiveOrEmbed = isYouTube || isFacebook || isStream;

                const ytThumb = isYouTube ? getYouTubeThumbnail(media.file_path) : null;

                return (
                  <div
                    key={media.id}
                    className="group bg-white border border-slate-200/90 hover:border-teal-300 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5"
                  >
                    {/* Thumbnail Area */}
                    <div
                      onClick={() => setPreviewMedia(media)}
                      className="relative aspect-video bg-slate-950 flex items-center justify-center cursor-pointer overflow-hidden"
                    >
                      {isYouTube && ytThumb ? (
                        <img
                          src={ytThumb}
                          alt={media.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : isFacebook ? (
                        <div className="w-full h-full bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 flex flex-col items-center justify-center text-white p-3 text-center">
                          <Radio size={28} className="text-blue-400 mb-1 animate-pulse" />
                          <span className="text-[11px] font-bold text-blue-200">Facebook Video / Live</span>
                        </div>
                      ) : isStream ? (
                        <div className="w-full h-full bg-gradient-to-br from-purple-950 via-slate-900 to-black flex flex-col items-center justify-center text-white p-3 text-center">
                          <Radio size={28} className="text-purple-400 mb-1 animate-pulse" />
                          <span className="text-[11px] font-bold text-purple-200">Web Live Stream</span>
                        </div>
                      ) : isVideo ? (
                        <video
                          src={media.file_path}
                          className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition duration-300"
                          muted
                        />
                      ) : (
                        <img
                          src={media.file_path}
                          alt={media.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      )}

                      {/* Badge indicator */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 border border-white/20">
                        {isYouTube ? (
                          <>
                            <Radio size={11} className="text-rose-400 animate-pulse" />
                            <span className="text-rose-300">YOUTUBE</span>
                          </>
                        ) : isFacebook ? (
                          <>
                            <Radio size={11} className="text-blue-400 animate-pulse" />
                            <span className="text-blue-300">FB LIVE</span>
                          </>
                        ) : isStream ? (
                          <>
                            <Radio size={11} className="text-purple-400 animate-pulse" />
                            <span className="text-purple-300">STREAM</span>
                          </>
                        ) : isVideo ? (
                          <>
                            <Film size={11} className="text-amber-400" />
                            <span>VIDEO</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon size={11} className="text-emerald-400" />
                            <span>IMAGE</span>
                          </>
                        )}
                      </span>

                      {/* Quick Preview Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                        <Eye size={22} className="drop-shadow" />
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-3.5 flex flex-col justify-between flex-1">
                      <p
                        className="text-xs font-bold text-slate-800 truncate"
                        title={media.name}
                      >
                        {media.name}
                      </p>

                      <div className="flex items-center justify-between text-xs text-slate-400 mt-2.5 pt-2 border-t border-slate-100">
                        <span className="text-[11px] font-medium truncate max-w-[110px]" title={media.file_path}>
                          {isLiveOrEmbed ? `${media.default_duration || 60} วินาที` : formatFileSize(media.size)}
                        </span>

                        <div className="flex items-center gap-1">
                          {/* Rename media button */}
                          <button
                            onClick={() => {
                              setEditingMedia(media);
                              setEditMediaName(media.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition cursor-pointer"
                            title="เปลี่ยนชื่อสื่อ"
                          >
                            <Edit2 size={15} />
                          </button>

                          {/* Move to folder button */}
                          <button
                            onClick={() => {
                              setMovingMedia(media);
                              setTargetFolderId(media.folder_id ? String(media.folder_id) : 'root');
                            }}
                            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition cursor-pointer"
                            title="ย้ายโฟลเดอร์"
                          >
                            <FolderInput size={15} />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteMedia(media.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="ลบสื่อ"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Live Video / Stream Modal */}
      {showStreamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-xs">
                  <Radio size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">แนบ Live Video / สตรีมมิ่งสด</h3>
                  <p className="text-[11px] text-slate-400">รองรับ YouTube Live, Facebook Live และวิดีโอออนไลน์</p>
                </div>
              </div>
              <button
                onClick={() => setShowStreamModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStreamMedia} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ชื่อสื่อ / หัวข้อสตรีม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={streamName}
                  onChange={(e) => setStreamName(e.target.value)}
                  placeholder="เช่น ถ่ายทอดสดข่าวสารโรงพยาบาล, สาระสุขภาพช่อง 3"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ลิงก์ URL (YouTube / Facebook Live) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... หรือ https://fb.watch/..."
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition font-mono"
                  />
                </div>
              </div>

              {/* Detected Type Badge & Preview Hint */}
              {streamUrl.trim() && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">ประเภทที่ตรวจพบ:</span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                      currentDetectedStreamType === 'youtube'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : currentDetectedStreamType === 'facebook'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-purple-100 text-purple-700 border border-purple-200'
                    }`}
                  >
                    {currentDetectedStreamType === 'youtube'
                      ? '📺 YouTube Live / Video'
                      : currentDetectedStreamType === 'facebook'
                      ? '📘 Facebook Live / Video'
                      : '🌐 Web Stream'}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ระยะเวลาแสดงผลใน Playlist
                </label>
                <select
                  value={streamDuration}
                  onChange={(e) => setStreamDuration(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition font-semibold cursor-pointer"
                >
                  <option value="0">♾️ เล่นต่อเนื่องตลอด (ไม่จำกัดเวลา)</option>
                  <option value="60">1 นาที (60 วินาที)</option>
                  <option value="180">3 นาที (180 วินาที)</option>
                  <option value="300">5 นาที (300 วินาที)</option>
                  <option value="600">10 นาที (600 วินาที)</option>
                  <option value="1800">30 นาที</option>
                  <option value="3600">1 ชั่วโมง</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  * หากเลือกเล่นต่อเนื่องตลอด สตรีมจะเล่นสดไปเรื่อยๆ โดยไม่ถูกตัดเวลา
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStreamModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={streamSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 cursor-pointer transition disabled:opacity-50"
                >
                  {streamSubmitting ? 'กำลังบันทึก...' : 'แนบสื่อ Live'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Folder Modal */}
      {editingFolder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Edit2 size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">เปลี่ยนชื่อโฟลเดอร์</h3>
              </div>
              <button
                onClick={() => setEditingFolder(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRenameFolder}>
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ชื่อโฟลเดอร์ใหม่
                </label>
                <input
                  type="text"
                  value={editFolderName}
                  onChange={(e) => setEditFolderName(e.target.value)}
                  placeholder="ระบุชื่อโฟลเดอร์"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingFolder(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 cursor-pointer transition"
                >
                  บันทึกชื่อใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Media Modal */}
      {movingMedia && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <FolderInput size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">ย้ายไฟล์ไปยังโฟลเดอร์</h3>
              </div>
              <button
                onClick={() => setMovingMedia(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3 truncate">
              ไฟล์: <span className="font-bold text-slate-800">{movingMedia.name}</span>
            </p>

            <form onSubmit={handleConfirmMove}>
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  เลือกโฟลเดอร์ปลายทาง
                </label>
                <select
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                >
                  <option value="root">📁 สื่อทั้งหมด / โฟลเดอร์หลัก (Root)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMovingMedia(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 cursor-pointer transition"
                >
                  ย้ายไฟล์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Media Modal */}
      {editingMedia && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Edit2 size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">เปลี่ยนชื่อสื่อ</h3>
              </div>
              <button
                onClick={() => setEditingMedia(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRenameMedia}>
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ชื่อสื่อใหม่
                </label>
                <input
                  type="text"
                  value={editMediaName}
                  onChange={(e) => setEditMediaName(e.target.value)}
                  placeholder="ระบุชื่อสื่อ"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMedia(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 cursor-pointer transition"
                >
                  บันทึกชื่อใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                  <FolderPlus size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">สร้างโฟลเดอร์ใหม่</h3>
              </div>
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFolder}>
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ชื่อโฟลเดอร์
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="เช่น แผนกฉุกเฉิน, ข่าวสาร OPD"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 cursor-pointer transition"
                >
                  สร้างโฟลเดอร์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Preview Modal */}
      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm truncate">{previewMedia.name}</span>
              <button
                onClick={() => setPreviewMedia(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              {previewMedia.file_type === 'youtube' ? (
                <iframe
                  src={getYouTubeEmbedUrl(previewMedia.file_path, true, false)}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={previewMedia.name}
                />
              ) : previewMedia.file_type === 'facebook' ? (
                <iframe
                  src={getFacebookEmbedUrl(previewMedia.file_path, true, false)}
                  className="w-full h-full border-0"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title={previewMedia.name}
                />
              ) : previewMedia.file_type === 'video' ? (
                <video src={previewMedia.file_path} controls autoPlay className="max-h-[72vh] w-full" />
              ) : (
                <img
                  src={previewMedia.file_path}
                  alt={previewMedia.name}
                  className="max-h-[72vh] max-w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
