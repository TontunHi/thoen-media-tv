import { describe, it, expect, vi } from 'vitest';

const { requireRole, logAudit } = require('../server/middleware/auth');
const { exportDatabaseSnapshot } = require('../server/services/backupService');

describe('PR-8 Role-based access control, audit logging, and automated DB backup', () => {
  it('blocks er_staff from admin-only endpoints while allowing admin', () => {
    const middleware = requireRole('admin');

    const erReq = { user: { id: 2, username: 'er01', role: 'er_staff' } };
    const erRes = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    let nextCalled = false;
    middleware(erReq, erRes, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(erRes.statusCode).toBe(403);

    const adminReq = { user: { id: 1, username: 'admin', role: 'admin' } };
    const adminRes = { status: vi.fn(), json: vi.fn() };
    let adminNextCalled = false;
    middleware(adminReq, adminRes, () => {
      adminNextCalled = true;
    });
    expect(adminNextCalled).toBe(true);
  });

  it('writes audit log entries via logAudit', async () => {
    const queries = [];
    const mockPool = {
      async query(sql, params) {
        queries.push({ sql, params });
        return [{ insertId: 1 }];
      },
    };
    const req = {
      user: { id: 1, username: 'admin', role: 'admin' },
      headers: { 'x-forwarded-for': '192.168.1.50' },
    };

    await logAudit(mockPool, req, 'INCIDENT_BROADCAST_START', 'incident', 9, {
      tvIds: [1, 2],
    });

    expect(queries.length).toBe(1);
    expect(queries[0].sql).toContain('INSERT INTO audit_logs');
    expect(queries[0].params[1]).toBe('admin');
    expect(queries[0].params[2]).toBe('INCIDENT_BROADCAST_START');
  });

  it('exports all 8 core tables in exportDatabaseSnapshot', async () => {
    const mockPool = {
      async query(sql) {
        if (sql.includes('FROM users')) {
          return [[{ id: 1, username: 'admin', role: 'admin' }]];
        }
        return [[]];
      },
    };

    const snapshot = await exportDatabaseSnapshot(mockPool);
    expect(snapshot.exported_at).toBeDefined();
    expect(Object.keys(snapshot.tables)).toEqual([
      'users',
      'folders',
      'media_files',
      'playlists',
      'playlist_items',
      'tvs',
      'incidents',
      'incident_patients',
      'tv_playback_logs',
      'audit_logs',
    ]);
    expect(snapshot.tables.users[0].username).toBe('admin');
  });
});
