import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { Maximize2, Minimize2, Tv, AlertCircle, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { getYouTubeEmbedUrl, getFacebookEmbedUrl, extractYouTubeId } from '../utils/mediaHelper';
import Hls from 'hls.js';
import IncidentTvScreen from './IncidentTvScreen';

/**
 * Dedicated YouTube Player with automatic unmuting and error recovery
 */
function YouTubePlayer({ videoUrl, isMuted, onEnded }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const videoId = useMemo(() => extractYouTubeId(videoUrl), [videoUrl]);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;
    let player = null;
    let isCancelled = false;

    const initYT = () => {
      if (!window.YT || !window.YT.Player || !containerRef.current || isCancelled) return;
      try {
        player = new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            mute: isMuted ? 1 : 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            playsinline: 1,
            origin: window.location.origin,
            iv_load_policy: 3,
          },
          events: {
            onReady: (event) => {
              try {
                if (!isMuted) {
                  event.target.unMute();
                  event.target.setVolume(100);
                }
                event.target.playVideo();
              } catch (e) {}
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                try {
                  if (!isMuted) {
                    event.target.unMute();
                    event.target.setVolume(100);
                  }
                } catch (e) {}
              } else if (event.data === window.YT.PlayerState.ENDED) {
                if (onEnded) onEnded();
              }
            },
            onError: () => {
              if (onEnded) setTimeout(onEnded, 2000);
            },
          },
        });
        playerRef.current = player;
      } catch (err) {
        console.warn('YouTube Iframe Player init error:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initYT();
    } else {
      const timer = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(timer);
          initYT();
        }
      }, 150);
      return () => clearInterval(timer);
    }

    return () => {
      isCancelled = true;
      if (player && typeof player.destroy === 'function') {
        try {
          player.destroy();
        } catch (e) {}
      }
    };
  }, [videoId, isMuted, onEnded]);

  if (!videoId) {
    return (
      <iframe
        src={videoUrl}
        title="YouTube Video"
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }

  return (
    <div className="w-full h-full relative bg-black flex items-center justify-center">
      <div ref={containerRef} className="w-full h-full pointer-events-auto" />
    </div>
  );
}

export default function TvPlayer() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [tvData, setTvData] = useState(null);
  const [items, setItems] = useState([]);
  const [isIncidentMode, setIsIncidentMode] = useState(false);
  const [incidentData, setIncidentData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [cycleTick, setCycleTick] = useState(0);

  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const fbPlayerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const hlsRef = useRef(null);

  // Load YouTube Iframe Player API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize Facebook SDK for automatic unmuting via Embedded Video Player API
  useEffect(() => {
    if (!window.FB && !document.getElementById('facebook-jssdk')) {
      const fbRoot = document.getElementById('fb-root') || document.createElement('div');
      fbRoot.id = 'fb-root';
      if (!document.getElementById('fb-root')) document.body.appendChild(fbRoot);

      window.fbAsyncInit = function () {
        window.FB.init({
          xfbml: true,
          version: 'v20.0',
        });

        window.FB.Event.subscribe('xfbml.ready', function (msg) {
          if (msg.type === 'video') {
            fbPlayerRef.current = msg.instance;
            try {
              msg.instance.unmute();
              msg.instance.play();
            } catch (e) {
              console.log('FB player auto-unmute attempt:', e);
            }
          }
        });
      };

      const js = document.createElement('script');
      js.id = 'facebook-jssdk';
      js.src = 'https://connect.facebook.net/th_TH/sdk.js';
      js.async = true;
      js.defer = true;
      document.body.appendChild(js);
    }
  }, []);

  // Unlock all Audio Subsystems
  const unlockAudio = useCallback(() => {
    setIsMuted(false);
    setIsAudioBlocked(false);

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      }
    } catch (e) {}

    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
      videoRef.current.play().catch(() => {});
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.unMute === 'function') {
      try {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(100);
        ytPlayerRef.current.playVideo();
      } catch (e) {}
    }
    if (fbPlayerRef.current) {
      try {
        fbPlayerRef.current.unmute();
        fbPlayerRef.current.play();
      } catch (e) {}
    }
  }, []);

  // Initialize AudioContext and Auto-unmute Subsystems for TV Displays
  useEffect(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      }
    } catch (e) {}

    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    window.addEventListener('pointerdown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
    };
  }, [unlockAudio]);

  // Load TV Playback data
  const loadTvData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getTvPublic(slug);
      setTvData(data.tv);
      setIsIncidentMode(!!data.is_incident_mode);
      setIncidentData(data.incident || null);
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
    socket.on('incident_updated', handleUpdate);
    socket.on('incident_broadcast_toggled', handleUpdate);

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
      socket.off('incident_updated', handleUpdate);
      socket.off('incident_broadcast_toggled', handleUpdate);
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

  // Video unmuted autoplay: immediately play with full audio without requiring user tap/click
  useEffect(() => {
    if (currentItem?.file_type === 'video' && videoRef.current) {
      const videoEl = videoRef.current;
      videoEl.muted = false;
      videoEl.volume = 1.0;

      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            videoEl.muted = false;
            videoEl.volume = 1.0;
          })
          .catch((err) => {
            console.warn('Initial unmuted play rejected by browser policy, executing immediate auto-unmute sequence:', err);
            // Fallback: start playback muted, then immediately unmute after first frame
            videoEl.muted = true;
            videoEl.play().then(() => {
              setTimeout(() => {
                videoEl.muted = false;
                videoEl.volume = 1.0;
              }, 120);
            }).catch(() => {});
          });
      }
    }
  }, [currentItemId, cycleTick, currentItem?.file_type]);

  // HLS (.m3u8) Direct Stream playback support (OBS / Live Streaming server / CCTV)
  useEffect(() => {
    const isM3u8 = currentItem?.file_path && currentItem.file_path.includes('.m3u8');
    if (!isM3u8 || !videoRef.current) return;

    const streamUrl = currentItem.file_path;
    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (videoRef.current) {
          videoRef.current.muted = isMuted;
          videoRef.current.play().catch((e) => console.log('HLS play unmuted attempt:', e));
        }
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('Fatal HLS error:', data);
          setTimeout(nextItem, 2000);
        }
      });

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = streamUrl;
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {});
    }
  }, [currentItemId, cycleTick, isMuted, currentItem?.file_type, currentItem?.file_path, nextItem]);

  // Handle slide transition when item or cycle tick changes
  useEffect(() => {
    if (!currentItem) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    const isStreamType = ['youtube', 'facebook', 'stream'].includes(currentItem.file_type);

    // 1. Image slides: advance after duration_seconds (default 10s)
    if (currentItem.file_type === 'image') {
      const durationMs = Math.max((currentItem.duration_seconds || 10) * 1000, 1000);
      timerRef.current = setTimeout(() => {
        nextItem();
      }, durationMs);
    } else if (isStreamType) {
      // 2. Live Stream slides (YouTube Live, Facebook Live, Web Stream):
      // If duration_seconds > 0 and playlist has multiple items, rotate after duration.
      // If duration_seconds is 0 / empty or only 1 item in playlist: PLAY CONTINUOUSLY WITHOUT LIMIT (ไม่มีการจำกัดเวลา)!
      const streamDuration = parseInt(currentItem.duration_seconds);
      if (validItems.length > 1 && streamDuration > 0) {
        const durationMs = Math.max(streamDuration * 1000, 1000);
        timerRef.current = setTimeout(() => {
          nextItem();
        }, durationMs);
      }
    }
    // 3. Local video slides: advance naturally on `onEnded` event

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentItemId, currentItem?.file_type, currentItem?.duration_seconds, cycleTick, nextItem, validItems.length]);

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

  // If TV is set to Emergency Incident Override mode, display the Incident Screen immediately
  if (isIncidentMode) {
    return <IncidentTvScreen directIncidentId={incidentData?.id} />;
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
      onClick={unlockAudio}
      onTouchStart={unlockAudio}
      onPointerDown={unlockAudio}
      className="relative w-screen h-screen bg-black overflow-hidden select-none cursor-none group"
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Media Display Area */}
      {currentItem && (
        <div className="w-full h-full flex items-center justify-center bg-black">
          {currentItem.file_type === 'youtube' ? (
            <YouTubePlayer
              key={`${currentItem.id}-${cycleTick}`}
              videoUrl={currentItem.file_path}
              isMuted={isMuted}
              onEnded={nextItem}
            />
          ) : currentItem.file_type === 'facebook' ? (
            <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
              <iframe
                key={`${currentItem.id}-${cycleTick}`}
                src={getFacebookEmbedUrl(currentItem.file_path, true, isMuted)}
                title={currentItem.media_name}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
              />
            </div>
          ) : currentItem.file_type === 'stream' && currentItem.file_path?.includes('.m3u8') ? (
            <video
              ref={videoRef}
              key={`${currentItem.id}-${cycleTick}`}
              autoPlay
              muted={isMuted}
              playsInline
              onEnded={nextItem}
              onError={(e) => {
                console.error('HLS Stream error:', e);
                setTimeout(nextItem, 2000);
              }}
              className="w-full h-full object-contain"
            />
          ) : currentItem.file_type === 'stream' ? (
            <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
              <iframe
                key={`${currentItem.id}-${cycleTick}`}
                src={currentItem.file_path}
                title={currentItem.media_name}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
              />
            </div>
          ) : currentItem.file_type === 'video' ? (
            <video
              ref={videoRef}
              key={`${currentItem.id}-${cycleTick}`}
              src={currentItem.file_path}
              autoPlay
              playsInline
              onPlaying={(e) => {
                e.target.muted = false;
                e.target.volume = 1.0;
              }}
              onCanPlay={(e) => {
                e.target.muted = false;
                e.target.volume = 1.0;
                const p = e.target.play();
                if (p) {
                  p.catch(() => {
                    setIsAudioBlocked(true);
                  });
                }
              }}
              onTimeUpdate={(e) => {
                if (e.target.muted && !isMuted) {
                  e.target.muted = false;
                  e.target.volume = 1.0;
                }
              }}
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

      {/* Floating 1-tap audio unlock button if browser blocked autoplay sound before first touch */}
      {isAudioBlocked && (
        <button
          type="button"
          onClick={unlockAudio}
          className="absolute top-4 right-6 z-50 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs animate-bounce cursor-pointer border border-amber-300 pointer-events-auto"
        >
          <Volume2 size={16} />
          <span>แตะหน้าจอเพื่อเปิดเสียง</span>
        </button>
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

        {(currentItem?.file_type === 'video' || ['youtube', 'facebook', 'stream'].includes(currentItem?.file_type)) && (
          <button
            onClick={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              if (videoRef.current) videoRef.current.muted = nextMuted;
              if (fbPlayerRef.current) {
                try {
                  if (nextMuted) {
                    fbPlayerRef.current.mute();
                  } else {
                    fbPlayerRef.current.unmute();
                    fbPlayerRef.current.play();
                  }
                } catch (e) {}
              }
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
