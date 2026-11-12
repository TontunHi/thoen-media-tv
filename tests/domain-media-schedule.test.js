import { describe, it, expect } from 'vitest';
import {
  MEDIA_TYPE_REGISTRY,
  detectMediaType,
  getMediaTypeMeta,
  isHlsStreamUrl,
} from '../src/domain/mediaRegistry';
import {
  isItemActiveAt,
  isMediaExpired,
  isWeekdayAllowed,
  getNextScheduleTransitionMs,
} from '../server/domain/scheduleModel';

describe('Media Registry & Schedule Domain Model', () => {
  it('registers all six hospital signage media types with metadata', () => {
    expect(Object.keys(MEDIA_TYPE_REGISTRY)).toEqual([
      'image',
      'video',
      'youtube',
      'facebook',
      'stream',
      'announcement',
    ]);
    expect(detectMediaType('announcement://opd-holiday')).toBe('announcement');
    expect(getMediaTypeMeta('stream', 'https://cdn.example.com/live/ch1.m3u8').shortBadge).toBe('HLS');
    expect(isHlsStreamUrl('https://cdn.example.com/live/ch1.m3u8?token=abc')).toBe(true);
  });

  it('evaluates start_time, end_time, days_of_week, and expires_at in isItemActiveAt', () => {
    // 2026-11-12 is a Thursday (getDay() === 4)
    const now = new Date('2026-11-12T10:00:00');
    expect(
      isItemActiveAt(
        {
          is_active: 1,
          start_time: '2026-11-12 08:00:00',
          end_time: '2026-11-12 16:00:00',
          days_of_week: '1,2,3,4,5',
          expires_at: '2026-11-15 00:00:00',
        },
        now
      )
    ).toBe(true);

    // Excluded weekday (Sunday & Saturday only: 0,6)
    expect(
      isItemActiveAt(
        {
          is_active: 1,
          days_of_week: '0,6',
        },
        now
      )
    ).toBe(false);

    // Expired media
    expect(
      isMediaExpired(
        {
          expires_at: '2026-11-12 09:59:59',
        },
        now
      )
    ).toBe(true);
  });

  it('calculates exact wake delay in getNextScheduleTransitionMs for future items', () => {
    const now = new Date('2026-11-12T07:55:00');
    const items = [
      {
        id: 1,
        is_active: 1,
        start_time: '2026-11-12T08:00:00',
        end_time: '2026-11-12T12:00:00',
      },
    ];
    const transition = getNextScheduleTransitionMs(items, now);
    expect(transition.delayMs).toBe(5 * 60 * 1000);
    expect(new Date(transition.nextTransitionAt).getTime()).toBe(new Date('2026-11-12T08:00:00').getTime());
  });

  it('evaluates 500 scheduled items in under 2ms per call', () => {
    const now = new Date('2026-11-12T10:00:00');
    const items = Array.from({ length: 500 }, (_, i) => ({
      id: i + 1,
      is_active: 1,
      start_time: '2026-11-12T08:00:00',
      end_time: '2026-11-12T18:00:00',
      days_of_week: '1,2,3,4,5',
    }));
    const startMs = performance.now();
    for (let iter = 0; iter < 100; iter++) {
      getNextScheduleTransitionMs(items, now);
    }
    const elapsedMs = performance.now() - startMs;
    expect(elapsedMs / 100).toBeLessThan(2);
  });
});
