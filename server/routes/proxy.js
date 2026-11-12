const express = require('express');
const router = express.Router();

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isBlockedInternalHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '0:0:0:0:0:0:0:1' ||
    host.endsWith('.localhost')
  ) {
    return true;
  }
  if (/^127\./.test(host) || /^169\.254\./.test(host) || /^0\./.test(host)) {
    return true;
  }
  return false;
}

function isAllowedProxyUrl(rawUrl, allowedHostsEnv = process.env.PROXY_ALLOWED_HOSTS) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { ok: false, status: 400, reason: 'Missing or invalid "url" query parameter' };
  }
  if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    return { ok: false, status: 400, reason: 'Invalid URL protocol. Only http:// and https:// are supported.' };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, status: 400, reason: 'Malformed target URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, status: 400, reason: 'Invalid URL protocol. Only http:// and https:// are supported.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isBlockedInternalHost(hostname)) {
    return { ok: false, status: 403, reason: 'Host not allowed by proxy policy' };
  }

  if (allowedHostsEnv && allowedHostsEnv.trim() !== '' && allowedHostsEnv.trim() !== '*') {
    const allowedList = allowedHostsEnv
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    const matched = allowedList.some((pattern) => {
      if (pattern.startsWith('*.')) {
        const suffix = pattern.slice(1);
        return hostname.endsWith(suffix) || hostname === pattern.slice(2);
      }
      return hostname === pattern || parsed.host.toLowerCase() === pattern;
    });
    if (!matched) {
      return { ok: false, status: 403, reason: 'Host not allowed by proxy policy' };
    }
  }

  return { ok: true, parsed };
}

/**
 * Universal Web Proxy for Thoen Media TV
 * Proxies HTML pages without X-Frame-Options or CSP headers so they can be embedded in TV iframes.
 */
router.all('/', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed by proxy policy' });
  }

  const targetUrl = req.query.url;
  const check = isAllowedProxyUrl(targetUrl);
  if (!check.ok) {
    if (check.status === 403) {
      return res.status(403).json({ error: check.reason });
    }
    return res.status(check.status).send(check.reason);
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': req.headers['accept'] || '*/*',
        'Accept-Language': req.headers['accept-language'] || 'th,en-US;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
      redirect: 'manual',
    };

    const targetRes = await fetch(check.parsed.toString(), fetchOptions);
    const contentType = targetRes.headers.get('content-type') || '';

    // Strip frame blocking headers and set allow-all frame ancestors
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    res.removeHeader('X-Frame-Options');
    res.removeHeader('X-Content-Type-Options');

    if (contentType.includes('text/html')) {
      const html = await targetRes.text();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(targetRes.status).send(html);
    } else {
      if (contentType) res.setHeader('Content-Type', contentType);
      const buffer = Buffer.from(await targetRes.arrayBuffer());
      return res.status(targetRes.status).send(buffer);
    }
  } catch (err) {
    console.error(`[Web Proxy Error] Failed to fetch ${targetUrl}:`, err.message);
    if (!res.headersSent) {
      const safeUrl = escapeHtml(targetUrl);
      const safeMessage = escapeHtml(err.message);
      res.status(502).send(`
        <div style="font-family: sans-serif; padding: 2rem; text-align: center; color: #334155; background: #ffffff; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <h2 style="color: #ef4444; margin-bottom: 0.5rem;">ไม่สามารถเชื่อมต่อหน้าเว็บเป้าหมายได้</h2>
          <p style="font-size: 0.95rem; color: #475569;">URL: <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${safeUrl}</code></p>
          <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 0.5rem;">ข้อผิดพลาด: ${safeMessage}</p>
        </div>
      `);
    }
  }
});

router.escapeHtml = escapeHtml;
router.isAllowedProxyUrl = isAllowedProxyUrl;

module.exports = router;
