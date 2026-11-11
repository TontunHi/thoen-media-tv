const express = require('express');
const router = express.Router();

/**
 * Universal Web Proxy for Thoen Media TV
 * Proxies HTML pages without X-Frame-Options or CSP headers so they can be embedded in TV iframes.
 */
router.all('/', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).send('Missing or invalid "url" query parameter');
  }

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    return res.status(400).send('Invalid URL protocol. Only http:// and https:// are supported.');
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
      redirect: 'follow',
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.headers['Content-Type'] = req.headers['content-type'] || 'application/json';
      fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
    }

    const targetRes = await fetch(targetUrl, fetchOptions);
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
      res.status(502).send(`
        <div style="font-family: sans-serif; padding: 2rem; text-align: center; color: #334155; background: #ffffff; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <h2 style="color: #ef4444; margin-bottom: 0.5rem;">ไม่สามารถเชื่อมต่อหน้าเว็บเป้าหมายได้</h2>
          <p style="font-size: 0.95rem; color: #475569;">URL: <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${targetUrl}</code></p>
          <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 0.5rem;">ข้อผิดพลาด: ${err.message}</p>
        </div>
      `);
    }
  }
});

module.exports = router;
