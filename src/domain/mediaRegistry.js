export const MEDIA_TYPE_REGISTRY = {
  image: {
    type: 'image',
    label: 'รูปภาพ',
    shortBadge: 'IMG',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80',
    defaultDuration: 10,
    timerMode: 'fixed_duration',
    hasFixedDuration: true,
  },
  video: {
    type: 'video',
    label: 'วิดีโอ',
    shortBadge: 'MP4',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    defaultDuration: 0,
    timerMode: 'play_until_end',
    hasFixedDuration: false,
  },
  youtube: {
    type: 'youtube',
    label: 'YouTube',
    shortBadge: 'YT',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
    defaultDuration: 0,
    timerMode: 'optional_duration',
    hasFixedDuration: true,
  },
  facebook: {
    type: 'facebook',
    label: 'Facebook',
    shortBadge: 'FB',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
    defaultDuration: 0,
    timerMode: 'optional_duration',
    hasFixedDuration: true,
  },
  stream: {
    type: 'stream',
    label: 'เว็บ / สตรีมสด',
    shortBadge: 'LIVE',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    defaultDuration: 30,
    timerMode: 'fixed_duration',
    hasFixedDuration: true,
  },
  announcement: {
    type: 'announcement',
    label: 'สไลด์ประกาศ รพ.',
    shortBadge: 'ประกาศ',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
    defaultDuration: 15,
    timerMode: 'fixed_duration',
    hasFixedDuration: true,
  },
};

export const ANNOUNCEMENT_THEMES = {
  'hospital-green': {
    id: 'hospital-green',
    label: 'สีเขียวโรงพยาบาล (มาตรฐาน)',
    bg: '#064e3b',
    accent: '#34d399',
    badgeBg: 'rgba(16, 185, 129, 0.22)',
    text: '#f8fafc',
  },
  'urgent-amber': {
    id: 'urgent-amber',
    label: 'สีทองแจ้งเตือนสำคัญ (เร่งด่วน)',
    bg: '#451a03',
    accent: '#fbbf24',
    badgeBg: 'rgba(245, 158, 11, 0.25)',
    text: '#fffbeb',
  },
  'info-blue': {
    id: 'info-blue',
    label: 'สีน้ำเงินประชาสัมพันธ์ (ทั่วไป)',
    bg: '#0f172a',
    accent: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.22)',
    text: '#f8fafc',
  },
};

export function parseAnnouncementData(item) {
  if (!item) {
    return {
      headline: '',
      body: '',
      department: 'โรงพยาบาลเถิน จ.ลำปาง',
      theme: 'hospital-green',
      footer: '',
    };
  }
  const raw = item.announcement_data;
  let parsed = {};
  if (raw && typeof raw === 'object') {
    parsed = raw;
  } else if (typeof raw === 'string' && raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
  }
  const theme = ANNOUNCEMENT_THEMES[parsed.theme] ? parsed.theme : 'hospital-green';
  return {
    headline: String(parsed.headline || item.name || item.media_name || '').trim(),
    body: String(parsed.body || '').trim(),
    department: String(parsed.department || 'โรงพยาบาลเถิน จ.ลำปาง').trim(),
    theme,
    footer: String(parsed.footer || '').trim(),
  };
}

export function resolveMediaUrl(filePath) {
  if (!filePath) return '';
  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('announcement://')
  ) {
    return filePath;
  }
  return filePath;
}

export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

export function getYouTubeThumbnail(url) {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export const getYoutubeThumbnail = getYouTubeThumbnail;

export function getYouTubeEmbedUrl(url, autoplay = true, mute = false) {
  const id = extractYouTubeId(url);
  if (!id) return url;
  const auto = autoplay ? 1 : 0;
  const m = mute ? 1 : 0;
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=${auto}&mute=${m}&controls=1&rel=0&modestbranding=1&enablejsapi=1&playsinline=1&loop=1&playlist=${id}&iv_load_policy=3`;
}

export function getFacebookEmbedUrl(url, autoplay = true, mute = false) {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('facebook.com/plugins/video.php')) {
    return url;
  }
  const auto = autoplay ? '1' : '0';
  const m = mute ? '1' : '0';
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
    url
  )}&show_text=0&autoplay=${auto}&mute=${m}&muted=${m}&allowfullscreen=true&width=1280`;
}

export function isHlsStreamUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /\.m3u8($|\?)/i.test(url.trim());
}

export function detectMediaType(url) {
  if (!url || typeof url !== 'string') return 'video';
  const lower = url.toLowerCase().trim();
  if (lower.startsWith('announcement://')) return 'announcement';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('facebook.com') || lower.includes('fb.watch')) return 'facebook';
  if (lower.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i)) return 'image';
  if (lower.match(/\.(mp4|webm|ogg|m4v)($|\?)/i)) return 'video';
  if (lower.startsWith('http://') || lower.startsWith('https://')) return 'stream';
  return 'video';
}

export function getStreamEmbedUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.includes('.m3u8')) return trimmed;
  if (trimmed.startsWith('/api/proxy-web')) return trimmed;
  return `/api/proxy-web?url=${encodeURIComponent(trimmed)}`;
}

export function getEmbedUrl(media) {
  if (!media) return '';
  const type = media.file_type || detectMediaType(media.file_path);
  const url = media.file_path || '';
  if (type === 'youtube') return getYouTubeEmbedUrl(url, true, false);
  if (type === 'facebook') return getFacebookEmbedUrl(url, true, false);
  if (type === 'stream') return getStreamEmbedUrl(url);
  return resolveMediaUrl(url);
}

export function getMediaTypeMeta(fileType, filePath = '') {
  const normalized = String(fileType || '').toLowerCase();
  if (MEDIA_TYPE_REGISTRY[normalized]) {
    if (normalized === 'stream' && isHlsStreamUrl(filePath)) {
      return {
        ...MEDIA_TYPE_REGISTRY.stream,
        label: 'HLS สตรีมสด',
        shortBadge: 'HLS',
      };
    }
    return MEDIA_TYPE_REGISTRY[normalized];
  }
  return MEDIA_TYPE_REGISTRY[detectMediaType(filePath)] || MEDIA_TYPE_REGISTRY.video;
}
