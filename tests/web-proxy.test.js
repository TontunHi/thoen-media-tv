import { describe, it, expect } from 'vitest';
import { getStreamEmbedUrl, detectMediaType } from '../src/utils/mediaHelper';
import proxyRouter from '../server/routes/proxy';

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

  it('blocks SSRF loopback and metadata hosts in proxy policy', () => {
    expect(proxyRouter.isAllowedProxyUrl('http://127.0.0.1:3000/api/stats')).toEqual({
      ok: false,
      status: 403,
      reason: 'Host not allowed by proxy policy',
    });
    expect(proxyRouter.isAllowedProxyUrl('http://localhost:3306')).toEqual({
      ok: false,
      status: 403,
      reason: 'Host not allowed by proxy policy',
    });
    expect(proxyRouter.isAllowedProxyUrl('http://169.254.169.254/latest/meta-data')).toEqual({
      ok: false,
      status: 403,
      reason: 'Host not allowed by proxy policy',
    });
  });

  it('enforces PROXY_ALLOWED_HOSTS allowlist when configured', () => {
    const allowlist = '192.168.1.239, *.moph.go.th';
    expect(proxyRouter.isAllowedProxyUrl('http://192.168.1.239/systems/er-out-status', allowlist).ok).toBe(true);
    expect(proxyRouter.isAllowedProxyUrl('https://thlp.moph.go.th/dashboard', allowlist).ok).toBe(true);
    expect(proxyRouter.isAllowedProxyUrl('https://evil.example.com/phish', allowlist)).toEqual({
      ok: false,
      status: 403,
      reason: 'Host not allowed by proxy policy',
    });
  });

  it('escapes HTML characters in proxy error payloads', () => {
    const raw = '<script>alert("xss")</script>';
    expect(proxyRouter.escapeHtml(raw)).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
});
