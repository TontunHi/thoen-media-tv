const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getPool } = require('../db');
const { JWT_SECRET, authenticateToken, logAudit } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาทีแล้วลองใหม่อีกครั้ง (Too many login attempts. Please try again in 15 minutes)',
  },
});

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [
      username,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const role = user.role || 'admin';
    const token = jwt.sign(
      { id: user.id, username: user.username, role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    req.user = { id: user.id, username: user.username, role };
    await logAudit(pool, req, 'USER_LOGIN', 'user', user.id, { role });

    res.json({ token, username: user.username, role });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      ...req.user,
      role: req.user.role || 'admin',
    },
  });
});

module.exports = router;
