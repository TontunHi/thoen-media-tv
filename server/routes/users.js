const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool } = require('../db');
const { authenticateToken, requireRole, logAudit } = require('../middleware/auth');
const {
  exportDatabaseSnapshot,
  writeBackupSnapshotToDisk,
} = require('../services/backupService');

const router = express.Router();

const ALLOWED_ROLES = ['admin', 'er_staff'];

// List all users (admin only)
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const pool = getPool();
    const [users] = await pool.query(
      'SELECT id, username, role, created_at FROM users ORDER BY id ASC'
    );
    res.json(
      users.map((u) => ({
        ...u,
        role: u.role || 'admin',
      }))
    );
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create a new user (admin only)
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !String(username).trim() || !password || String(password).length < 4) {
    return res.status(400).json({
      error: 'กรุณาระบุชื่อผู้ใช้งานและรหัสผ่านอย่างน้อย 4 ตัวอักษร',
    });
  }

  const cleanUsername = String(username).trim();
  const cleanRole = ALLOWED_ROLES.includes(role) ? role : 'er_staff';

  try {
    const pool = getPool();
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [
      cleanUsername,
    ]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [cleanUsername, passwordHash, cleanRole]
    );

    await logAudit(pool, req, 'USER_CREATE', 'user', result.insertId, {
      username: cleanUsername,
      role: cleanRole,
    });

    res.status(201).json({
      id: result.insertId,
      username: cleanUsername,
      role: cleanRole,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user role or password (admin only)
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { role, password } = req.body || {};

  try {
    const pool = getPool();
    const updates = [];
    const params = [];

    if (role !== undefined && ALLOWED_ROLES.includes(role)) {
      updates.push('role = ?');
      params.push(role);
    }

    if (password && String(password).length >= 4) {
      const hash = await bcrypt.hash(String(password), 10);
      updates.push('password_hash = ?');
      params.push(hash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องการแก้ไข' });
    }

    params.push(id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    await logAudit(pool, req, 'USER_UPDATE', 'user', id, {
      role,
      passwordChanged: Boolean(password),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only, cannot delete own account)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  if (String(req.user?.id) === String(id)) {
    return res.status(400).json({ error: 'ไม่สามารถลบบัญชีที่กำลังเข้าสู่ระบบอยู่ได้' });
  }

  try {
    const pool = getPool();
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    await logAudit(pool, req, 'USER_DELETE', 'user', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get recent audit logs (admin only)
router.get('/audit-logs', authenticateToken, requireRole('admin'), async (req, res) => {
  const limit = Math.min(200, Math.max(10, parseInt(req.query.limit, 10) || 100));
  try {
    const pool = getPool();
    const [logs] = await pool.query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT ?',
      [limit]
    );
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Trigger on-disk database backup snapshot (admin only)
router.post('/backup', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const pool = getPool();
    const result = await writeBackupSnapshotToDisk(pool);
    await logAudit(pool, req, 'DB_BACKUP_WRITE', 'system', null, {
      filename: result.filename,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create database backup' });
  }
});

// Download JSON database backup snapshot (admin only)
router.get(
  '/backup/download',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const pool = getPool();
      const snapshot = await exportDatabaseSnapshot(pool);
      await logAudit(pool, req, 'DB_BACKUP_DOWNLOAD', 'system', null);
      const filename = `thoen-media-tv-backup-${snapshot.exported_at.slice(0, 10)}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(JSON.stringify(snapshot, null, 2));
    } catch (error) {
      console.error('Error downloading backup:', error);
      res.status(500).json({ error: 'Failed to download database backup' });
    }
  }
);

module.exports = router;
