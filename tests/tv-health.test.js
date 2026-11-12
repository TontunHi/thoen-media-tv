import { describe, it, expect, vi } from 'vitest';
import { parseDeviceInfo } from '../src/features/tvs/TvHealthCard';

const tvRoutes = require('../server/routes/tvs');

describe('PR-6 TV health telemetry, remote reload, and bulk assignment', () => {
  it('parses device_info JSON safely', () => {
    expect(parseDeviceInfo(null)).toBeNull();
    expect(parseDeviceInfo('{bad json')).toBeNull();
    const parsed = parseDeviceInfo(
      JSON.stringify({
        current_media_name: 'OPD Slide 1',
        slide_index: 2,
        total_active: 5,
        resolution: '1920x1080',
      })
    );
    expect(parsed.current_media_name).toBe('OPD Slide 1');
    expect(parsed.slide_index).toBe(2);
    expect(parsed.total_active).toBe(5);
  });

  it('exposes /public/:slug/heartbeat, /bulk-assign, /:id/reload, and /:id/logs routes on tvs router', () => {
    const routePaths = tvRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    expect(routePaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/public/:slug/heartbeat', methods: ['post'] }),
        expect.objectContaining({ path: '/bulk-assign', methods: ['post'] }),
        expect.objectContaining({ path: '/:id/reload', methods: ['post'] }),
        expect.objectContaining({ path: '/:id/logs', methods: ['get'] }),
      ])
    );
  });
});
