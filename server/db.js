const mysql = require('mysql2/promise');
require('dotenv').config();
const { runMigrations } = require('./migrations/runner');

const rawHost = (process.env.DB_HOST || '127.0.0.1').trim();
const hostParts = rawHost.includes(':') ? rawHost.split(':') : [rawHost, null];
const host = hostParts[0];
const port = parseInt(process.env.DB_PORT || hostParts[1] || '3306', 10);
let rawPass = process.env.DB_PASS || process.env.DB_PASSWORD || '';
try {
  if (rawPass && rawPass.includes('%')) {
    rawPass = decodeURIComponent(rawPass);
  }
} catch (e) {}

const dbConfig = {
  host,
  port,
  user: process.env.DB_USER || 'root',
  password: rawPass,
  database: process.env.DB_NAME || 'thoen_media_tv',
  charset: 'utf8mb4',
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;

/**
 * Initialize database connection and run versioned migrations
 */
async function initDB() {
  try {
    // Attempt creating the database if it doesn't exist yet
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      charset: 'utf8mb4'
    });
    
    await tempConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await tempConnection.end();
  } catch (err) {
    console.warn('Notice: Direct connection to MySQL server used:', err.message);
  }

  pool = mysql.createPool(dbConfig);
  pool.on('connection', (conn) => {
    conn.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");
  });

  // Run versioned schema migrations
  await runMigrations(pool);
  return pool;
}

/**
 * Retrieve initialized database pool
 * @returns {import('mysql2/promise').Pool}
 */
function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDB() first.');
  }
  return pool;
}

/**
 * Close pool gracefully on server shutdown
 */
async function closeDB() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  initDB,
  getPool,
  closeDB,
  dbConfig
};
