import { describe, it, expect } from 'vitest';
import { getStreamEmbedUrl, detectMediaType } from '../src/utils/mediaHelper';

describe('Web Stream Helper & Proxy Routing', () => {
  it('detects webpage URLs as stream', () => {
    expect(detectMediaType('http://192.168.1.239/systems/er-out-status')).toBe('stream');
    expect(detectMediaType('https://thlp.moph.go.th/systems/er-out-status')).toBe('stream');
  });

  it('routes standard web streams through /api/proxy-web', () => {
    const rawUrl = 'http://192.168.1.239/systems/er-out-status';
    const proxyUrl = getStreamEmbedUrl(rawUrl);
    expect(proxyUrl).toBe(`/api/proxy-web?url=${encodeURIComponent(rawUrl)}`);
  });

  it('leaves .m3u8 video streams direct without proxy', () => {
    const m3u8Url = 'http://example.com/live/stream.m3u8';
    expect(getStreamEmbedUrl(m3u8Url)).toBe(m3u8Url);
  });

  it('does not re-encode already proxied URLs', () => {
    const alreadyProxied = '/api/proxy-web?url=http%3A%2F%2F192.168.1.239%2Fsystems%2Fer-out-status';
    expect(getStreamEmbedUrl(alreadyProxied)).toBe(alreadyProxied);
  });

  it('returns empty string for null or empty url', () => {
    expect(getStreamEmbedUrl(null)).toBe('');
    expect(getStreamEmbedUrl('')).toBe('');
  });
});
