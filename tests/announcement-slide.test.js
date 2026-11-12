import { describe, it, expect } from 'vitest';
import {
  MEDIA_TYPE_REGISTRY,
  ANNOUNCEMENT_THEMES,
  parseAnnouncementData,
} from '../src/domain/mediaRegistry';

const mediaRoutes = require('../server/routes/media');
const { isMediaExpired } = require('../server/domain/scheduleModel');

describe('PR-7 Built-in hospital announcement slide builder and media expiry', () => {
  it('defines announcement media type and 3 hospital themes in registry', () => {
    expect(MEDIA_TYPE_REGISTRY.announcement).toBeDefined();
    expect(MEDIA_TYPE_REGISTRY.announcement.defaultDuration).toBe(15);
    expect(Object.keys(ANNOUNCEMENT_THEMES)).toEqual([
      'hospital-green',
      'urgent-amber',
      'info-blue',
    ]);
  });

  it('parses announcement_data with safe hospital defaults', () => {
    const item = {
      name: 'แจ้งย้ายจุดซักประวัติ',
      announcement_data: JSON.stringify({
        headline: 'แจ้งย้ายจุดคัดกรองผู้ป่วยนอก',
        body: 'ย้ายไปบริเวณโถงชั้น 1 อาคารผู้ป่วยนอก',
        department: 'งานการพยาบาลผู้ป่วยนอก',
        theme: 'urgent-amber',
        footer: 'โทร 1669',
      }),
    };
    const parsed = parseAnnouncementData(item);
    expect(parsed.headline).toBe('แจ้งย้ายจุดคัดกรองผู้ป่วยนอก');
    expect(parsed.theme).toBe('urgent-amber');
    expect(parsed.footer).toBe('โทร 1669');
  });

  it('exposes POST /announcement on media router and filters expired media in scheduleModel', () => {
    const routePaths = mediaRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    expect(routePaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/announcement', methods: ['post'] }),
      ])
    );

    const now = new Date('2026-11-12T10:00:00');
    expect(isMediaExpired({ expires_at: '2026-11-11' }, now)).toBe(true);
    expect(isMediaExpired({ expires_at: '2026-11-12' }, now)).toBe(false);
    expect(isMediaExpired({ expires_at: new Date('2026-11-12T00:00:00') }, now)).toBe(false);
    expect(isMediaExpired({ expires_at: null }, now)).toBe(false);
  });
});
