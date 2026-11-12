const jwt = require('jsonwebtoken');
require('dotenv').config();
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? (() => {
        throw new Error('JWT_SECRET environment variable is required in production');
      })()
    : 'dev_jwt_secret_change_in_production_key');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = {
      ...user,
      role: user.role || 'admin',
    };
    next();
  });
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const role = req.user.role || 'admin';
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: 'สิทธิ์การใช้งานไม่เพียงพอสำหรับคำสั่งนี้ (Insufficient role permissions)',
      });
    }
    next();
  };
}

async function logAudit(pool, req, action, targetType, targetId = null, details = null) {
  if (!pool) return;
  try {
    const userId = req?.user?.id || null;
    const username = req?.user?.username || 'system';
    const ipAddress =
      (req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '')
        .toString()
        .slice(0, 64);
    const serializedDetails =
      details === null || details === undefined
        ? null
        : typeof details === 'string'
        ? details
        : JSON.stringify(details);

    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, target_type, target_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        String(username).slice(0, 100),
        String(action).slice(0, 100),
        String(targetType || '').slice(0, 50),
        targetId !== null && targetId !== undefined ? String(targetId).slice(0, 50) : null,
        serializedDetails,
        ipAddress,
      ]
    );
  } catch {
    // Do not fail request if audit table is unavailable in mock environments
  }
}

module.exports = { authenticateToken, requireRole, logAudit, JWT_SECRET };
