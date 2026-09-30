/**
 * Utility functions for parsing and rendering YouTube, Facebook, and Web Streams.
 */

/**
 * Extracts YouTube Video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

/**
 * Returns high quality YouTube thumbnail URL.
 */
export function getYouTubeThumbnail(url) {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/**
 * Returns sanitized YouTube Embed URL with clean kiosk settings.
 */
export function getYouTubeEmbedUrl(url, autoplay = true, mute = true) {
  const id = extractYouTubeId(url);
  if (!id) return url;
  const auto = autoplay ? 1 : 0;
  const m = mute ? 1 : 0;
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=${auto}&mute=${m}&controls=1&rel=0&modestbranding=1&enablejsapi=1&playsinline=1&loop=1&playlist=${id}&iv_load_policy=3`;
}

/**
 * Returns Facebook Video / Live Embed URL.
 */
export function getFacebookEmbedUrl(url, autoplay = true, mute = true) {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('facebook.com/plugins/video.php')) {
    return url;
  }
  const auto = autoplay ? 'true' : 'false';
  const m = mute ? 'true' : 'false';
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=${auto}&muted=${m}&width=1280`;
}

/**
 * Detects media type from URL string.
 */
export function detectMediaType(url) {
  if (!url || typeof url !== 'string') return 'video';
  const lower = url.toLowerCase().trim();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('facebook.com') || lower.includes('fb.watch')) return 'facebook';
  if (lower.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i)) return 'image';
  if (lower.match(/\.(mp4|webm|ogg|m4v)($|\?)/i)) return 'video';
  if (lower.startsWith('http://') || lower.startsWith('https://')) return 'stream';
  return 'video';
}
