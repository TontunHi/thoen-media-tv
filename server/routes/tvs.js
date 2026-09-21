const express = require('express');
const { getPool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

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

    if (!tv.playlist_id) {
      return res.json({ tv, playlist: null, items: [] });
    }

    // Fetch active playlist items with valid schedule range
    const [rawItems] = await pool.query(`
      SELECT pi.*, mf.name as media_name, mf.file_path, mf.file_type, mf.mime_type, mf.size, mf.default_duration
      FROM playlist_items pi
      JOIN media_files mf ON pi.media_file_id = mf.id
      WHERE pi.playlist_id = ? AND pi.is_active = 1
      ORDER BY pi.display_order ASC, pi.id ASC
    `, [tv.playlist_id]);

    res.json({
      tv,
      playlist: { id: tv.playlist_id, name: tv.playlist_name },
      items: rawItems
    });
  } catch (error) {
    console.error('Error in TV public endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch TV playback data' });
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
router.post('/', authenticateToken, async (req, res) => {
  const { name, slug, location, playlist_id } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: 'TV Name and Custom Slug are required' });
  }

  const cleanSlug = sanitizeSlug(slug);

  try {
    const pool = getPool();
    const [existing] = await pool.query('SELECT id FROM tvs WHERE slug = ?', [cleanSlug]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Slug '${cleanSlug}' is already in use` });
    }

    const [result] = await pool.query(
      'INSERT INTO tvs (name, slug, location, playlist_id) VALUES (?, ?, ?, ?)',
      [name.trim(), cleanSlug, location || '', playlist_id || null]
    );

    res.status(201).json({ id: result.insertId, name: name.trim(), slug: cleanSlug, location, playlist_id });
  } catch (error) {
    console.error('Error creating TV:', error);
    res.status(500).json({ error: 'Failed to create TV' });
  }
});

// Update TV
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, slug, location, playlist_id } = req.body;

  try {
    const pool = getPool();
    const [oldTv] = await pool.query('SELECT slug, playlist_id FROM tvs WHERE id = ?', [id]);
    if (oldTv.length === 0) return res.status(404).json({ error: 'TV not found' });

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (location !== undefined) { updates.push('location = ?'); params.push(location); }
    if (playlist_id !== undefined) { updates.push('playlist_id = ?'); params.push(playlist_id || null); }

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
router.delete('/:id', authenticateToken, async (req, res) => {
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
