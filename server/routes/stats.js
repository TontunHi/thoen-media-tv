const express = require('express');
const { getPool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/stats - High-performance system summary counts for UI badges
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const [
      [tvRows],
      [mediaRows],
      [playlistRows]
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total, SUM(CASE WHEN is_online = 1 THEN 1 ELSE 0 END) AS online FROM tvs'),
      pool.query('SELECT COUNT(*) AS total FROM media_files'),
      pool.query('SELECT COUNT(*) AS total FROM playlists')
    ]);

    const totalTvs = tvRows[0]?.total || 0;
    const onlineTvs = Number(tvRows[0]?.online) || 0;
    const totalMedia = mediaRows[0]?.total || 0;
    const totalPlaylists = playlistRows[0]?.total || 0;

    res.json({
      totalTvs,
      onlineTvs,
      totalMedia,
      totalPlaylists
    });
  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
