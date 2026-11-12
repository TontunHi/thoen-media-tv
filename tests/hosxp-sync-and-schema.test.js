import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { hasPatientChanged } from '../server/services/incidentSyncService';
import { formatHosxpPatientRow } from '../server/hosxpDb';
import { isValidScheduleWindow, normalizeDaysOfWeek, isValidTimeHm } from '../server/middleware/validate';
import migration004 from '../server/migrations/004_rebuild_invariants_and_features';

describe('HOSxP Sync Idempotency & Schema Migration 004', () => {
  it('returns false in hasPatientChanged when existing row includes unchanged transport and diag', () => {
    const hosxpRow = {
      vn: '6911120001',
      hn: '0012345',
      pt_name: 'นายสมชาย ใจดี',
      sex: 'ชาย',
      age: '42',
      triage_level: 'เร่งด่วน',
      triage_color: 'yellow',
      injury_info: 'แผลถลอก / S00',
      transport: 'ALS',
      diag: 'S00 แผลถลอก',
      current_status: 'ห้องฉุกเฉิน (ER)',
    };
    const dbRowWithTransportAndDiag = { ...hosxpRow };
    expect(hasPatientChanged(hosxpRow, dbRowWithTransportAndDiag)).toBe(false);
  });

  it('detects real clinical changes in hasPatientChanged', () => {
    const base = {
      vn: '6911120001',
      hn: '0012345',
      pt_name: 'นายสมชาย ใจดี',
      sex: 'ชาย',
      age: '42',
      triage_level: 'เร่งด่วน',
      triage_color: 'yellow',
      injury_info: 'แผลถลอก',
      transport: '-',
      diag: '-',
      current_status: 'ห้องฉุกเฉิน (ER)',
    };
    expect(hasPatientChanged({ ...base, triage_color: 'red' }, base)).toBe(true);
    expect(hasPatientChanged({ ...base, current_status: 'รับไว้รักษาใน รพ. (Admit)' }, base)).toBe(true);
  });

  it('maps accident_dead_before_arrive, accident_dead_in_hospital, and accident_admit in formatHosxpPatientRow', () => {
    const formatted = formatHosxpPatientRow({
      vn: '6911120099',
      hn: '0099999',
      vstdate: '2026-11-12',
      vsttime: '10:30:00',
      pt_name: 'นายทดสอบ ระบบ',
      sex: 'ชาย',
      age: 35,
      triage_level: 'วิกฤต',
      transport: 'FR',
      injury_info: 'หมดสติ',
      diag: 'S06.9',
      er_status: 'เสียชีวิต',
      dead: 'เสียชีวิตก่อนถึง รพ.',
      accident_dead_before_arrive: 'Y',
      accident_dead_in_hospital: 'N',
      accident_admit: 'Y',
      refer_to: '-',
    });

    expect(formatted.dead_before_arrive).toBe(true);
    expect(formatted.dead_in_hospital).toBe(false);
    expect(formatted.accident_admit).toBe(true);
    expect(formatted.triage_color).toBe('black');
  });

  it('validates schedule windows and normalizes weekday masks', () => {
    expect(isValidScheduleWindow('2026-11-12T10:00:00', '2026-11-12T12:00:00')).toEqual({ ok: true });
    expect(isValidScheduleWindow('2026-11-12T14:00:00', '2026-11-12T10:00:00').ok).toBe(false);
    expect(normalizeDaysOfWeek([5, 1, 3, 1, 9])).toBe('1,3,5');
    expect(normalizeDaysOfWeek('')).toBe('0,1,2,3,4,5,6');
    expect(isValidTimeHm('08:30')).toBe(true);
    expect(isValidTimeHm('25:99')).toBe(false);
  });

  it('runs migration 004 idempotently against a mock connection', async () => {
    const executed = [];
    const mockConn = {
      async query(sql) {
        executed.push(sql.trim());
        return [[]];
      },
    };
    await migration004.up(mockConn);
    await migration004.up(mockConn);
    expect(executed.some((q) => q.includes('CREATE TABLE IF NOT EXISTS tv_playback_logs'))).toBe(true);
    expect(executed.some((q) => q.includes('CREATE TABLE IF NOT EXISTS audit_logs'))).toBe(true);
    expect(executed.some((q) => q.includes('ADD COLUMN ticker_text'))).toBe(true);

    const runnerContent = fs.readFileSync(
      path.resolve(process.cwd(), 'server/migrations/runner.js'),
      'utf8'
    );
    expect(runnerContent).toContain('004_rebuild_invariants_and_features');
  });
});
