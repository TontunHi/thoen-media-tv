const express = require('express');
const { getPool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { calculateIncidentSummary } = require('../utils/incidentSummary');
const { isMediaExpired, getNextScheduleTransitionMs } = require('../domain/scheduleModel');

const router = express.Router();

// Helper to sanitize slug
function sanitizeSlug(slug) {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-');
}

// ------------------- PUBLIC ENDPOINT FOR TV CLIENT PLAYER -------------------
router.get('/public/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const pool = getPool();
    const [tvs] = await pool.query(`
      SELECT t.*, p.name as playlist_name 
      FROM tvs t 
      LEFT JOIN playlists p ON t.playlist_id = p.id 
      WHERE t.slug = ?
    `, [slug]);

    if (tvs.length === 0) {
      return res.status(404).json({ error: 'TV screen not found' });
    }

    const tv = tvs[0];

    // Update last_ping
    await pool.query('UPDATE tvs SET is_online = 1, last_ping = CURRENT_TIMESTAMP WHERE id = ?', [tv.id]);

    // Check if TV is in Emergency Incident Override Mode
    if (tv.is_incident_override === 1 && tv.active_incident_id) {
      const [incidents] = await pool.query('SELECT * FROM incidents WHERE id = ? AND is_active = 1', [tv.active_incident_id]);
      if (incidents.length > 0) {
        const incident = incidents[0];
        const [patients] = await pool.query(
          'SELECT * FROM incident_patients WHERE incident_id = ? ORDER BY display_order ASC, id ASC',
          [incident.id]
        );

        const summary = calculateIncidentSummary(patients, incident.refuse_treatment_count);

        return res.json({
          tv,
          is_incident_mode: true,
          incident,
          summary,
          patients,
          playlist: null,
          items: []
        });
      }
    }

    if (!tv.playlist_id) {
      return res.json({ tv, is_incident_mode: false, playlist: null, items: [] });
    }

    // Fetch active playlist items with valid schedule range
    const [rawItems] = await pool.query(`
      SELECT pi.*, mf.name as media_name, mf.file_path, mf.file_type, mf.mime_type, mf.size, mf.default_duration,
             mf.expires_at, mf.announcement_data
      FROM playlist_items pi
      JOIN media_files mf ON pi.media_file_id = mf.id
      WHERE pi.playlist_id = ? AND pi.is_active = 1
      ORDER BY pi.display_order ASC, pi.id ASC
    `, [tv.playlist_id]);

    const now = new Date();
    const validItems = rawItems.filter((item) => !isMediaExpired(item, now));
    const transition = getNextScheduleTransitionMs(validItems, now);

    res.json({
      tv,
      is_incident_mode: false,
      playlist: { id: tv.playlist_id, name: tv.playlist_name },
      items: validItems,
      next_transition_at: transition.nextTransitionAt,
      next_transition_ms: transition.delayMs
    });
  } catch (error) {
    console.error('Error in TV public endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch TV playback data' });
  }
});

// Heartbeat telemetry and proof-of-play logging from Smart TV player
router.post('/public/:slug/heartbeat', async (req, res) => {
  const { slug } = req.params;
  const {
    current_media_id,
    current_media_name,
    slide_index,
    total_active,
    resolution,
    user_agent,
    state,
    log_play
  } = req.body || {};

  try {
    const pool = getPool();
    const [tvs] = await pool.query('SELECT id FROM tvs WHERE slug = ?', [slug]);
    if (tvs.length === 0) {
      return res.status(404).json({ error: 'TV screen not found' });
    }
    const tvId = tvs[0].id;
    const deviceInfo = {
      current_media_id: current_media_id || null,
      current_media_name: current_media_name || '',
      slide_index: Number(slide_index) || 0,
      total_active: Number(total_active) || 0,
      resolution: String(resolution || '').slice(0, 40),
      user_agent: String(user_agent || req.headers['user-agent'] || '').slice(0, 200),
      state: String(state || 'PLAYING').slice(0, 30),
      updated_at: new Date().toISOString()
    };

    await pool.query(
      'UPDATE tvs SET is_online = 1, last_ping = CURRENT_TIMESTAMP, device_info = ? WHERE id = ?',
      [JSON.stringify(deviceInfo), tvId]
    );

    if (log_play && (current_media_id || current_media_name)) {
      try {
        await pool.query(
          'INSERT INTO tv_playback_logs (tv_id, media_file_id, media_name) VALUES (?, ?, ?)',
          [tvId, current_media_id || null, String(current_media_name || '').slice(0, 255)]
        );
      } catch {
        // Ignore if table not migrated yet in mocked environment
      }
    }

    if (req.io) {
      req.io.emit('tv_status_updated', { tvId, slug, device_info: deviceInfo });
    }

    res.json({ success: true, device_info: deviceInfo });
  } catch (error) {
    console.error('Error recording TV heartbeat:', error);
    res.status(500).json({ error: 'Failed to record TV heartbeat' });
  }
});

// ------------------- ADMIN ENDPOINTS -------------------

// Get all TVs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const [tvs] = await pool.query(`
      SELECT t.*, p.name as playlist_name,
        CASE WHEN t.last_ping >= NOW() - INTERVAL 1 MINUTE THEN 1 ELSE 0 END as is_online
      FROM tvs t 
      LEFT JOIN playlists p ON t.playlist_id = p.id 
      ORDER BY t.name ASC
    `);
    res.json(tvs);
  } catch (error) {
    console.error('Error fetching TVs:', error);
    res.status(500).json({ error: 'Failed to fetch TVs' });
  }
});

// Create TV with custom slug
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  const { name, slug, location, playlist_id, ticker_text, ticker_enabled } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: 'TV Name and Custom Slug are required' });
  }

  const cleanSlug = sanitizeSlug(slug);
  const cleanTickerText = ticker_text !== undefined ? String(ticker_text || '').trim() : null;
  const cleanTickerEnabled = ticker_enabled ? 1 : 0;

  try {
    const pool = getPool();
    const [existing] = await pool.query('SELECT id FROM tvs WHERE slug = ?', [cleanSlug]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Slug '${cleanSlug}' is already in use` });
    }

    const [result] = await pool.query(
      'INSERT INTO tvs (name, slug, location, playlist_id, ticker_text, ticker_enabled) VALUES (?, ?, ?, ?, ?, ?)',
      [name.trim(), cleanSlug, location || '', playlist_id || null, cleanTickerText, cleanTickerEnabled]
    );

    res.status(201).json({
      id: result.insertId,
      name: name.trim(),
      slug: cleanSlug,
      location,
      playlist_id,
      ticker_text: cleanTickerText,
      ticker_enabled: cleanTickerEnabled
    });
  } catch (error) {
    console.error('Error creating TV:', error);
    res.status(500).json({ error: 'Failed to create TV' });
  }
});

// Bulk assign playlist and/or ticker across multiple TVs
router.post('/bulk-assign', authenticateToken, requireRole('admin'), async (req, res) => {
  const { tvIds, playlist_id, ticker_text, ticker_enabled } = req.body || {};
  if (!Array.isArray(tvIds) || tvIds.length === 0) {
    return res.status(400).json({ error: 'กรุณาเลือกจอ TV อย่างน้อย 1 จอ' });
  }

  const validIds = tvIds.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id));
  if (validIds.length === 0) {
    return res.status(400).json({ error: 'รหัสจอ TV ไม่ถูกต้อง' });
  }

  try {
    const pool = getPool();
    const updates = [];
    const params = [];

    if (playlist_id !== undefined) {
      updates.push('playlist_id = ?');
      params.push(playlist_id || null);
    }
    if (ticker_text !== undefined) {
      updates.push('ticker_text = ?');
      params.push(ticker_text ? String(ticker_text).trim() : null);
    }
    if (ticker_enabled !== undefined) {
      updates.push('ticker_enabled = ?');
      params.push(ticker_enabled ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องการอัปเดต' });
    }

    const placeholders = validIds.map(() => '?').join(', ');
    await pool.query(
      `UPDATE tvs SET ${updates.join(', ')} WHERE id IN (${placeholders})`,
      [...params, ...validIds]
    );

    const [rows] = await pool.query(
      `SELECT id, slug, playlist_id FROM tvs WHERE id IN (${placeholders})`,
      validIds
    );

    if (req.io) {
      for (const tv of rows) {
        req.io.to(`tv:${tv.slug}`).emit('tv_config_changed', {
          slug: tv.slug,
          playlist_id: tv.playlist_id
        });
      }
    }

    res.json({ success: true, updatedCount: rows.length });
  } catch (error) {
    console.error('Error bulk-assigning TVs:', error);
    res.status(500).json({ error: 'Failed to bulk-assign TVs' });
  }
});

// Remote force reload a Smart TV player
router.post('/:id/reload', authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT id, slug, name FROM tvs WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'TV not found' });
    }
    const tv = rows[0];
    if (req.io) {
      req.io.to(`tv:${tv.slug}`).emit('tv_force_reload', {
        tvId: tv.id,
        slug: tv.slug,
        timestamp: Date.now()
      });
    }
    res.json({ success: true, slug: tv.slug });
  } catch (error) {
    console.error('Error reloading TV:', error);
    res.status(500).json({ error: 'Failed to reload TV' });
  }
});

// Get recent proof-of-play logs for a TV
router.get('/:id/logs', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [logs] = await pool.query(
      'SELECT * FROM tv_playback_logs WHERE tv_id = ? ORDER BY played_at DESC LIMIT 50',
      [id]
    );
    res.json(logs);
  } catch (error) {
    console.error('Error fetching TV playback logs:', error);
    res.status(500).json({ error: 'Failed to fetch TV playback logs' });
  }
});

// Update TV
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, slug, location, playlist_id, ticker_text, ticker_enabled } = req.body;

  try {
    const pool = getPool();
    const [oldTv] = await pool.query('SELECT slug, playlist_id FROM tvs WHERE id = ?', [id]);
    if (oldTv.length === 0) return res.status(404).json({ error: 'TV not found' });

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (location !== undefined) { updates.push('location = ?'); params.push(location); }
    if (playlist_id !== undefined) { updates.push('playlist_id = ?'); params.push(playlist_id || null); }
    if (ticker_text !== undefined) { updates.push('ticker_text = ?'); params.push(ticker_text ? String(ticker_text).trim() : null); }
    if (ticker_enabled !== undefined) { updates.push('ticker_enabled = ?'); params.push(ticker_enabled ? 1 : 0); }

    let newSlug = oldTv[0].slug;
    if (slug !== undefined) {
      newSlug = sanitizeSlug(slug);
      const [existing] = await pool.query('SELECT id FROM tvs WHERE slug = ? AND id != ?', [newSlug, id]);
      if (existing.length > 0) {
        return res.status(400).json({ error: `Slug '${newSlug}' is already in use by another TV` });
      }
      updates.push('slug = ?');
      params.push(newSlug);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE tvs SET ${updates.join(', ')} WHERE id = ?`, params);

      // Notify TV socket client
      if (req.io) {
        req.io.to(`tv:${oldTv[0].slug}`).emit('tv_config_changed', { slug: newSlug, playlist_id });
        if (newSlug !== oldTv[0].slug) {
          req.io.to(`tv:${newSlug}`).emit('tv_config_changed', { slug: newSlug, playlist_id });
        }
      }
    }

    res.json({ success: true, slug: newSlug });
  } catch (error) {
    console.error('Error updating TV:', error);
    res.status(500).json({ error: 'Failed to update TV' });
  }
});

// Delete TV
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    await pool.query('DELETE FROM tvs WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting TV:', error);
    res.status(500).json({ error: 'Failed to delete TV' });
  }
});

module.exports = router;
