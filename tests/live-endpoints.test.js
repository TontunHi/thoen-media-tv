import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import http from 'http';
import path from 'path';

const proxyRoutes = require('../server/routes/proxy');

describe('Live HTTP endpoint verification for TV player, Service Worker, HLS vendor, and SSRF guard', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.get('/vendor/hls.min.js', (req, res) => {
      res.sendFile(
        path.join(process.cwd(), 'node_modules/hls.js/dist/hls.min.js')
      );
    });
    app.use(express.static(path.join(process.cwd(), 'public')));
    app.use('/api/proxy-web', proxyRoutes);
    app.get('/tv/:slug', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(process.cwd(), 'server/views/player.html'));
    });

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('serves /tv/:slug standalone ES5 player with wake timer, HLS, ticker, and announcement renderer', async () => {
    const res = await fetch(`${baseUrl}/tv/opd-1`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="tv-ticker"');
    expect(html).toContain('scheduleNextBoundaryWake');
    expect(html).toContain('renderAnnouncementIntoLayer');
    expect(html).toContain('/vendor/hls.min.js');
    expect(html).toContain('/tv-sw.js');
  });

  it('serves /tv-sw.js Service Worker and /vendor/hls.min.js intranet bundle', async () => {
    const swRes = await fetch(`${baseUrl}/tv-sw.js`);
    expect(swRes.status).toBe(200);
    const swText = await swRes.text();
    expect(swText).toContain('PRECACHE_URLS');

    const hlsRes = await fetch(`${baseUrl}/vendor/hls.min.js`);
    expect(hlsRes.status).toBe(200);
    const hlsBytes = await hlsRes.arrayBuffer();
    expect(hlsBytes.byteLength).toBeGreaterThan(100000);
  });

  it('blocks SSRF loopback and non-GET requests on /api/proxy-web', async () => {
    const ssrfRes = await fetch(
      `${baseUrl}/api/proxy-web?url=${encodeURIComponent('http://127.0.0.1:3306/secret')}`
    );
    expect(ssrfRes.status).toBe(403);

    const postRes = await fetch(
      `${baseUrl}/api/proxy-web?url=${encodeURIComponent('http://192.168.1.239/er')}`,
      { method: 'POST' }
    );
    expect(postRes.status).toBe(405);
  });
});
