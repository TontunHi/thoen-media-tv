'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import FallbackSlide from './FallbackSlide'
import { Maximize, WifiOff } from 'lucide-react'

interface Media {
  id: string
  url: string
  type: 'image' | 'video'
}

interface PlaylistItem {
  id: string
  duration: number
  media: Media
}

interface TVPlayerProps {
  screenSlug: string
  screenName: string
  initialItems: PlaylistItem[]
  isLooping: boolean
}

export default function TVPlayer({ screenSlug, screenName, initialItems, isLooping }: TVPlayerProps) {
  const [items, setItems] = useState<PlaylistItem[]>(initialItems)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const wakeLockRef = useRef<any>(null)

  // Cache items for offline use
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem(`tv-cache-${screenSlug}`, JSON.stringify(items))
    }
  }, [items, screenSlug])

  // Load from cache if online fetch failed/empty
  useEffect(() => {
    if (initialItems.length === 0) {
      const cached = localStorage.getItem(`tv-cache-${screenSlug}`)
      if (cached) {
        try {
          setItems(JSON.parse(cached))
        } catch (e) {
          console.error('Failed to parse cached items')
        }
      }
    }
  }, [initialItems, screenSlug])

  // Screen Wake Lock API
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        }
      } catch (err) {
        console.error('Wake Lock failed', err)
      }
    }

    requestWakeLock()
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.error)
      }
    }
  }, [])

  // Heartbeat
  useEffect(() => {
    const sendHeartbeat = () => {
      fetch(`/api/screens/${screenSlug}/heartbeat`, { method: 'POST' })
        .then(() => setIsOffline(false))
        .catch(() => setIsOffline(true))
    }
    
    sendHeartbeat()
    const intervalId = setInterval(sendHeartbeat, 20000)
    
    return () => clearInterval(intervalId)
  }, [screenSlug])

  // Auto Refresh at 3:30 AM
  useEffect(() => {
    const checkTime = () => {
      const now = new Date()
      if (now.getHours() === 3 && now.getMinutes() === 30) {
        window.location.reload()
      }
    }
    const intervalId = setInterval(checkTime, 60000) // check every minute
    return () => clearInterval(intervalId)
  }, [])

  // SSE and periodic schedule evaluation for instant playlist switching
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let currentActiveScheduleId: string | null = null;
    let currentPlaylistId: string | null = null;

    const reloadData = async () => {
      try {
        const res = await fetch(`/api/screens/${screenSlug}?t=${Date.now()}`);
        if (res.ok) {
          const screenData = await res.json();
          const newActiveScheduleId = screenData?.activeScheduleId || null;
          const newPlaylistId = screenData?.playlist?.id || null;

          // Check if the active playlist or active schedule layer has changed
          const hasPlaylistChanged = 
            (currentPlaylistId !== null && currentPlaylistId !== newPlaylistId) ||
            (currentActiveScheduleId !== null && currentActiveScheduleId !== newActiveScheduleId);

          currentPlaylistId = newPlaylistId;
          currentActiveScheduleId = newActiveScheduleId;

          if (screenData && screenData.playlist && Array.isArray(screenData.playlist.items) && screenData.playlist.items.length > 0) {
            const formatted = screenData.playlist.items.map((item: any) => ({
              id: item.id,
              duration: item.customDuration || item.mediaItem?.defaultDuration || 10,
              media: {
                id: item.mediaItem?.id || item.mediaItemId,
                url: `/api/media/${item.mediaItem?.filename}`,
                type: (item.mediaItem?.type || 'IMAGE').toLowerCase() as 'image' | 'video'
              }
            }));
            
            setItems(formatted);
            localStorage.setItem(`tv_cache_${screenSlug}`, JSON.stringify(formatted));

            // If playlist transitioned to another priority layer, immediately restart from first item
            if (hasPlaylistChanged) {
              setCurrentIndex(0);
              setIsTransitioning(false);
            }
          } else {
            // No playlist or playlist has 0 items -> Switch to Standby
            setItems([]);
            localStorage.removeItem(`tv_cache_${screenSlug}`);
          }
        }
      } catch (e) {
        console.error('[TVPlayer] Failed to reload playlist', e);
      }
    };

    // Evaluate every 15 seconds so when a scheduled layer starts, player switches immediately
    const scheduleInterval = setInterval(reloadData, 15000);

    try {
      eventSource = new EventSource(`/api/screens/${screenSlug}/events`);

      eventSource.addEventListener('PLAYLIST_UPDATED', () => {
        reloadData();
      });

      eventSource.addEventListener('SCREEN_RELOAD', () => {
        reloadData();
      });

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PLAYLIST_UPDATED' || data.type === 'SCREEN_UPDATED' || data.type === 'RELOAD') {
            reloadData();
          }
        } catch {}
      };
    } catch (e) {
      console.error('[TVPlayer] SSE init error', e);
    }

    return () => {
      clearInterval(scheduleInterval);
      if (eventSource) eventSource.close();
    };
  }, [screenSlug])

  const nextSlide = useCallback(() => {
    if (items.length <= 1) return
    
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1
        if (next >= items.length) {
          return isLooping ? 0 : prev // If not looping, stop at last slide
        }
        return next
      })
      setIsTransitioning(false)
    }, 800) // matches slide-transition CSS duration
  }, [items.length, isLooping])

  // Slide Engine
  useEffect(() => {
    if (items.length === 0) return

    const currentItem = items[currentIndex]
    
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current)
    
    if (currentItem.media.type === 'image') {
      // Preload next image
      if (items.length > 1) {
        const nextIdx = (currentIndex + 1) % items.length
        if (items[nextIdx].media.type === 'image') {
          const img = new Image()
          img.src = items[nextIdx].media.url
        }
      }
      
      // Set timer for image
      const duration = (currentItem.duration || 15) * 1000
      timerRef.current = setTimeout(nextSlide, duration)
    } else if (currentItem.media.type === 'video') {
      // Video is handled by onEnded event on the video element itself
      // but we add a safety timeout just in case it gets stuck
      timerRef.current = setTimeout(() => {
        if (videoRef.current && videoRef.current.paused) {
          nextSlide()
        }
      }, 10000) // 10 sec safety net
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [currentIndex, items, nextSlide])

  // Handle Video playback
  useEffect(() => {
    if (items.length > 0 && items[currentIndex].media.type === 'video' && videoRef.current) {
      // If it's a video, play it
      if (timerRef.current) clearTimeout(timerRef.current) // remove safety net
      
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(err => {
        console.error('Video autoplay failed', err)
        // If autoplay fails, skip to next slide
        nextSlide()
      })
    }
  }, [currentIndex, items, nextSlide, isTransitioning])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (items.length === 0) {
    return <FallbackSlide screenName={screenName} />
  }

  const currentItem = items[currentIndex]

  return (
    <div className="w-full h-full relative bg-black overflow-hidden group">
      {/* Offline Indicator */}
      {isOffline && (
        <div className="absolute top-4 right-4 z-50 bg-red-600/80 text-white px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-sm">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Offline</span>
        </div>
      )}

      {/* Fullscreen Toggle (shows on hover) */}
      <button 
        onClick={toggleFullscreen}
        className="absolute bottom-4 right-4 z-50 p-3 bg-black/40 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
        title="Toggle Fullscreen (F11)"
      >
        <Maximize className="w-6 h-6" />
      </button>

      {/* Main Content Area */}
      <div 
        className={`w-full h-full absolute inset-0 flex items-center justify-center slide-transition ${isTransitioning ? 'slide-enter' : 'slide-active'}`}
      >
        {currentItem.media.type === 'image' ? (
          <img 
            src={currentItem.media.url} 
            alt="Slide"
            className="w-full h-full object-contain bg-black tv-slide-image"
          />
        ) : (
          <video
            ref={videoRef}
            src={currentItem.media.url}
            className="w-full h-full object-contain bg-black"
            autoPlay
            muted
            playsInline
            onEnded={nextSlide}
            onError={nextSlide}
          />
        )}
      </div>
    </div>
  )
}
