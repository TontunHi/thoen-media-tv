import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { Maximize2, Minimize2, Tv, AlertCircle, Volume2, VolumeX, RefreshCw } from 'lucide-react';

export default function TvPlayer() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [tvData, setTvData] = useState(null);
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [cycleTick, setCycleTick] = useState(0);

  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Load TV Playback data
  const loadTvData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getTvPublic(slug);
      setTvData(data.tv);
      setItems(data.items || []);
      setError('');
    } catch (err) {
      console.error('Failed to load TV playback:', err);
      if (!silent) setError(err.message || 'ไม่พบหน้าจอทีวีนี้');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadTvData();

    // Setup Socket.io real-time listener
    const socket = getSocket();
    socket.emit('join_tv_room', { slug });

    const handleUpdate = () => {
      console.log('Realtime notification received: Refreshing TV playlist...');
      loadTvData(true);
    };

    socket.on('playlist_updated', handleUpdate);
    socket.on('tv_config_changed', handleUpdate);
    socket.on('media_deleted', handleUpdate);

    // Periodic Background Sync: every 15s to update last_ping and verify sync
    const syncInterval = setInterval(() => {
      loadTvData(true);
    }, 15000);

    // Live clock update every 1 second
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      socket.off('playlist_updated', handleUpdate);
      socket.off('tv_config_changed', handleUpdate);
      socket.off('media_deleted', handleUpdate);
      clearInterval(syncInterval);
      clearInterval(clockInterval);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [slug]);

  // Check if an item is active according to schedule at the given time
  const isItemActiveNow = useCallback((item, now) => {
    if (!item || item.is_active === 0 || item.is_active === false) return false;
    if (item.start_time) {
      const start = new Date(String(item.start_time).replace(' ', 'T'));
      if (!isNaN(start.getTime()) && start > now) return false;
    }
    if (item.end_time) {
      const end = new Date(String(item.end_time).replace(' ', 'T'));
      if (!isNaN(end.getTime()) && end < now) return false;
    }
    return true;
  }, []);

  // Filter items in real-time according to current second
  const validItems = useMemo(() => {
    return items.filter((it) => isItemActiveNow(it, currentTime));
  }, [items, currentTime, isItemActiveNow]);

  const validItemsRef = useRef(validItems);
  validItemsRef.current = validItems;

  const currentItem = validItems[currentIndex] || validItems[0];
  const currentItemId = currentItem?.id;

  // Advance to next item or restart cycle for single-item playlists
  const nextItem = useCallback(() => {
    const list = validItemsRef.current;
    if (!list || list.length === 0) return;

    if (list.length === 1) {
      // For a single item, re-trigger playback cycle (re-evaluate schedules and loop)
      setCycleTick((c) => c + 1);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch((err) => console.log('Video replay handled:', err));
      }
      return;
    }

    setCurrentIndex((prev) => (prev + 1) % list.length);
  }, []);

  // Handle slide transition when item or cycle tick changes
  useEffect(() => {
    if (!currentItem) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    // Image slides: advance after duration_seconds
    if (currentItem.file_type === 'image') {
      const durationMs = Math.max((currentItem.duration_seconds || 10) * 1000, 1000);
      timerRef.current = setTimeout(() => {
        nextItem();
      }, durationMs);
    }
    // Video slides: advance naturally on `onEnded` event

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentItemId, currentItem?.file_type, currentItem?.duration_seconds, cycleTick, nextItem]);

  // Adjust index if out of bounds when validItems list changes
  useEffect(() => {
    if (validItems.length > 0 && currentIndex >= validItems.length) {
      setCurrentIndex(0);
    }
  }, [validItems.length, currentIndex]);

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Handle mouse move to show bottom controls momentarily
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-base font-light">กำลังเชื่อมต่อสัญญาณโทรทัศน์ ({slug})...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4 text-center">
        <AlertCircle size={56} className="text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">ไม่สามารถแสดงผลหน้าจอได้</h1>
        <p className="text-slate-400 max-w-md">{error}</p>
        <div className="mt-6 text-xs text-slate-600 font-mono">Slug: {slug}</div>
      </div>
    );
  }

  if (validItems.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4 text-center select-none">
        <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
          <Tv size={38} className="text-teal-500 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold mb-1">{tvData?.name || 'โรงพยาบาลเถิน'}</h2>
        <p className="text-slate-400 text-sm max-w-md mb-6">
          {items.length > 0
            ? 'มีสื่อในระบบแต่ยังไม่ถึงเวลาเริ่มแสดง หรือหมดเวลาแสดงผลแล้ว'
            : 'ยังไม่มีสื่อใน Playlist ของจอนี้'}
        </p>
        <div className="flex items-center gap-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs rounded-full font-mono">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
          <span>เวลาปัจจุบัน {currentTime.toLocaleTimeString('th-TH')} (รอเริ่มแสดงอัตโนมัติ...)</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative w-screen h-screen bg-black overflow-hidden select-none cursor-none group"
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Media Display Area */}
      {currentItem && (
        <div className="w-full h-full flex items-center justify-center bg-black">
          {currentItem.file_type === 'video' ? (
            <video
              ref={videoRef}
              key={`${currentItem.id}-${cycleTick}`}
              src={currentItem.file_path}
              autoPlay
              muted={isMuted}
              playsInline
              onEnded={nextItem}
              onError={(e) => {
                console.error('Video error (possibly moved or removed):', e);
                // Evict failed media and advance to avoid black screen
                setTimeout(nextItem, 1000);
              }}
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              key={`${currentItem.id}-${cycleTick}`}
              src={currentItem.file_path}
              alt={currentItem.media_name}
              onError={(e) => {
                console.error('Image error (possibly moved or removed):', e);
                setTimeout(nextItem, 1000);
              }}
              className="w-full h-full object-contain transition-opacity duration-700 animate-fade"
            />
          )}
        </div>
      )}

      {/* Top Overlay: Digital Clock & Hospital Info */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-none drop-shadow-md">
        <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-semibold text-white tracking-wide">
            {tvData?.name || 'โรงพยาบาลเถิน'}
          </span>
        </div>

        <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-white font-mono text-sm tracking-wider">
          {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* Interactive Controls Bar (Appears on Mouse Move) */}
      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-4 py-2.5 rounded-2xl flex items-center gap-4 transition-all duration-300 shadow-2xl ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <span className="text-xs text-slate-300 font-medium font-mono">
          {validItems.length > 0 ? currentIndex + 1 : 0} / {validItems.length}
        </span>

        {currentItem?.file_type === 'video' && (
          <button
            onClick={() => {
              setIsMuted(!isMuted);
              if (videoRef.current) videoRef.current.muted = !isMuted;
            }}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        )}

        <button
          onClick={toggleFullscreen}
          className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          title="เต็มหน้าจอ"
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
    </div>
  );
}
