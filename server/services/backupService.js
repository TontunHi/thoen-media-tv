const path = require('path');
const fsp = require('fs').promises;
const { getPool } = require('../db');

const DEFAULT_BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');

async function exportDatabaseSnapshot(pool) {
  const db = pool || getPool();
  const tables = [
    { name: 'users', query: 'SELECT * FROM users ORDER BY id ASC' },
    { name: 'folders', query: 'SELECT * FROM folders ORDER BY id ASC' },
    { name: 'media_files', query: 'SELECT * FROM media_files ORDER BY id ASC' },
    { name: 'playlists', query: 'SELECT * FROM playlists ORDER BY id ASC' },
    { name: 'playlist_items', query: 'SELECT * FROM playlist_items ORDER BY id ASC' },
    { name: 'tvs', query: 'SELECT * FROM tvs ORDER BY id ASC' },
    { name: 'incidents', query: 'SELECT * FROM incidents ORDER BY id ASC' },
    { name: 'incident_patients', query: 'SELECT * FROM incident_patients ORDER BY id ASC' },
    { name: 'tv_playback_logs', query: 'SELECT * FROM tv_playback_logs ORDER BY id DESC LIMIT 1000' },
    { name: 'audit_logs', query: 'SELECT * FROM audit_logs ORDER BY id DESC LIMIT 1000' },
  ];

  const data = {};
  for (const t of tables) {
    try {
      const [rows] = await db.query(t.query);
      data[t.name] = rows;
    } catch {
      data[t.name] = [];
    }
  }

  return {
    exported_at: new Date().toISOString(),
    system: 'Thoen Hospital Digital Signage & MCI Command',
    tables: data,
  };
}

async function writeBackupSnapshotToDisk(pool, backupDir = DEFAULT_BACKUP_DIR) {
  await fsp.mkdir(backupDir, { recursive: true });
  const snapshot = await exportDatabaseSnapshot(pool);
  const dateTag = snapshot.exported_at.slice(0, 10);
  const filename = `thoen-media-tv-backup-${dateTag}.json`;
  const fullPath = path.join(backupDir, filename);

  await fsp.writeFile(fullPath, JSON.stringify(snapshot, null, 2), 'utf8');

  // Prune backup files older than 14 days
  try {
    const entries = await fsp.readdir(backupDir);
    const cutoffMs = Date.now() - 14 * 24 * 60 * 60 * 1000;
    for (const entry of entries) {
      if (!entry.startsWith('thoen-media-tv-backup-') || !entry.endsWith('.json')) continue;
      const p = path.join(backupDir, entry);
      const stat = await fsp.stat(p);
      if (stat.mtimeMs < cutoffMs) {
        await fsp.unlink(p);
      }
    }
  } catch {
    // Ignore cleanup errors
  }

  return { filename, fullPath, exported_at: snapshot.exported_at };
}

let backupIntervalId = null;

function startBackupScheduler() {
  if (backupIntervalId) return;
  // Run once every 24 hours
  backupIntervalId = setInterval(() => {
    writeBackupSnapshotToDisk().catch((err) => {
      console.warn('[BackupScheduler] Scheduled backup skipped:', err.message);
    });
  }, 24 * 60 * 60 * 1000);
  if (backupIntervalId.unref) {
    backupIntervalId.unref();
  }
}

module.exports = {
  exportDatabaseSnapshot,
  writeBackupSnapshotToDisk,
  startBackupScheduler,
  DEFAULT_BACKUP_DIR,
};
