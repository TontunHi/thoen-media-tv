const express = require('express');
const { getPool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper to broadcast playlist update to relevant TVs via Socket.io
async function notifyTvClients(req, playlistId) {
  if (!req.io) return;
  try {
    const pool = getPool();
    const [tvs] = await pool.query('SELECT slug FROM tvs WHERE playlist_id = ?', [playlistId]);
    for (const tv of tvs) {
      req.io.to(`tv:${tv.slug}`).emit('playlist_updated', { playlistId, slug: tv.slug, timestamp: Date.now() });
    }
  } catch (err) {
    console.error('Error notifying TV clients:', err);
  }
}

// Get all playlists (includes item_count and first preview media item)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const [playlists] = await pool.query(`
      SELECT 
        p.*, 
        COUNT(DISTINCT pi.id) as item_count,
        (
          SELECT mf.file_path 
          FROM playlist_items pi_sub
          JOIN media_files mf ON pi_sub.media_file_id = mf.id
          WHERE pi_sub.playlist_id = p.id
          ORDER BY pi_sub.display_order ASC, pi_sub.id ASC
          LIMIT 1
        ) as preview_file_path,
        (
          SELECT mf.file_type 
          FROM playlist_items pi_sub
          JOIN media_files mf ON pi_sub.media_file_id = mf.id
          WHERE pi_sub.playlist_id = p.id
          ORDER BY pi_sub.display_order ASC, pi_sub.id ASC
          LIMIT 1
        ) as preview_file_type
      FROM playlists p 
      LEFT JOIN playlist_items pi ON p.id = pi.playlist_id 
      GROUP BY p.id 
      ORDER BY p.updated_at DESC
    `);
    res.json(playlists);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// Get single playlist with items and media info
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [playlists] = await pool.query('SELECT * FROM playlists WHERE id = ?', [id]);
    if (playlists.length === 0) return res.status(404).json({ error: 'Playlist not found' });

    const playlist = playlists[0];
    const [items] = await pool.query(`
      SELECT pi.*, mf.name as media_name, mf.file_path, mf.file_type, mf.mime_type, mf.size
      FROM playlist_items pi
      JOIN media_files mf ON pi.media_file_id = mf.id
      WHERE pi.playlist_id = ?
      ORDER BY pi.display_order ASC, pi.id ASC
    `, [id]);

    playlist.items = items;
    res.json(playlist);
  } catch (error) {
    console.error('Error fetching playlist detail:', error);
    res.status(500).json({ error: 'Failed to fetch playlist detail' });
  }
});

// Create playlist
router.post('/', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Playlist name is required' });

  try {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO playlists (name, description) VALUES (?, ?)',
      [name.trim(), description || '']
    );
    res.status(201).json({ id: result.insertId, name: name.trim(), description });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Update playlist info (name/description)
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const pool = getPool();
    await pool.query('UPDATE playlists SET name = ?, description = ? WHERE id = ?', [name, description, id]);
    await notifyTvClients(req, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating playlist:', error);
    res.status(500).json({ error: 'Failed to update playlist' });
  }
});

// Delete playlist
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    await pool.query('DELETE FROM playlists WHERE id = ?', [id]);
    await notifyTvClients(req, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// Add items to playlist
router.post('/:id/items', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { media_file_ids, duration_seconds } = req.body;

  if (!Array.isArray(media_file_ids) || media_file_ids.length === 0) {
    return res.status(400).json({ error: 'media_file_ids array is required' });
  }

  try {
    const pool = getPool();
    const [maxOrderRow] = await pool.query('SELECT MAX(display_order) as max_order FROM playlist_items WHERE playlist_id = ?', [id]);
    let currentOrder = (maxOrderRow[0].max_order || 0) + 1;

    for (const media_file_id of media_file_ids) {
      await pool.query(
        `INSERT INTO playlist_items (playlist_id, media_file_id, display_order, duration_seconds, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [id, media_file_id, currentOrder++, duration_seconds || 10]
      );
    }

    await pool.query('UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    await notifyTvClients(req, id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding items to playlist:', error);
    res.status(500).json({ error: 'Failed to add items to playlist' });
  }
});

function formatSqlDateTime(dtStr) {
  if (!dtStr || dtStr === '' || dtStr === 'null') return null;
  let clean = dtStr.replace('T', ' ');
  if (clean.length === 16) clean += ':00';
  return clean;
}

// Update playlist item (order, duration, start_time, end_time, is_active)
router.put('/:playlistId/items/:itemId', authenticateToken, async (req, res) => {
  const { playlistId, itemId } = req.params;
  const { display_order, duration_seconds, start_time, end_time, is_active } = req.body;

  try {
    const pool = getPool();
    const updates = [];
    const params = [];

    if (display_order !== undefined) {
      const order = parseInt(display_order);
      if (!isNaN(order) && order >= 0) {
        updates.push('display_order = ?');
        params.push(order);
      }
    }

    if (duration_seconds !== undefined) {
      const duration = parseInt(duration_seconds);
      if (!isNaN(duration) && duration >= 1) {
        updates.push('duration_seconds = ?');
        params.push(Math.min(duration, 86400)); // Cap at 24h
      }
    }

    if (start_time !== undefined) {
      updates.push('start_time = ?');
      params.push(formatSqlDateTime(start_time));
    }

    if (end_time !== undefined) {
      updates.push('end_time = ?');
      params.push(formatSqlDateTime(end_time));
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active === true || is_active === 1 || is_active === '1' ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(itemId, playlistId);
      await pool.query(`UPDATE playlist_items SET ${updates.join(', ')} WHERE id = ? AND playlist_id = ?`, params);
      await pool.query('UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [playlistId]);
      await notifyTvClients(req, playlistId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating playlist item:', error);
    res.status(500).json({ error: 'Failed to update playlist item' });
  }
});

// Reorder playlist items batch
router.put('/:playlistId/reorder', authenticateToken, async (req, res) => {
  const { playlistId } = req.params;
  const { items } = req.body; // Array of { id, display_order }

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items array is required' });
  }

  try {
    const pool = getPool();
    for (const item of items) {
      await pool.query('UPDATE playlist_items SET display_order = ? WHERE id = ? AND playlist_id = ?', [item.display_order, item.id, playlistId]);
    }

    await pool.query('UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [playlistId]);
    await notifyTvClients(req, playlistId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering playlist items:', error);
    res.status(500).json({ error: 'Failed to reorder playlist items' });
  }
});

// Delete item from playlist
router.delete('/:playlistId/items/:itemId', authenticateToken, async (req, res) => {
  const { playlistId, itemId } = req.params;

  try {
    const pool = getPool();
    await pool.query('DELETE FROM playlist_items WHERE id = ? AND playlist_id = ?', [itemId, playlistId]);
    await pool.query('UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [playlistId]);
    await notifyTvClients(req, playlistId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting item from playlist:', error);
    res.status(500).json({ error: 'Failed to remove item from playlist' });
  }
});

module.exports = router;
