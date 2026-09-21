const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || '192.168.1.7',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'prnew',
  password: process.env.DB_PASSWORD || 'PRnew11152@',
  database: process.env.DB_NAME || 'thoen_media_tv',
  charset: 'utf8mb4',
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;

async function initDB() {
  try {
    // First try connecting to MySQL server to ensure DB exists
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      charset: 'utf8mb4'
    });
    
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConnection.end();
  } catch (err) {
    console.warn('Notice: Unable to create database automatically (may already exist or insufficient privileges). Will connect directly.', err.message);
  }

  pool = mysql.createPool(dbConfig);
  pool.on('connection', (conn) => {
    conn.query("SET NAMES 'utf8mb4'");
  });

  // Initialize tables
  try {
    const connection = await pool.getConnection();

    // Users table
    await connection.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");
    
    // Ensure all tables are explicitly utf8mb4_unicode_ci
    const tables = ['users', 'folders', 'media_files', 'playlists', 'playlist_items', 'tvs'];
    for (const tbl of tables) {
      try {
        await connection.query(`ALTER TABLE \`${tbl}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      } catch (e) {
        // Ignore if table doesn't exist yet
      }
    }
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure default admin user exists
    const adminUsername = process.env.ADMIN_USERNAME || 'thoen';
    const adminPassword = process.env.ADMIN_PASSWORD || 'thlp11152';
    const [existingUsers] = await connection.query('SELECT * FROM users WHERE username = ?', [adminUsername]);
    if (existingUsers.length === 0) {
      const hash = await bcrypt.hash(adminPassword, 10);
      await connection.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [adminUsername, hash]);
      console.log(`Default admin user '${adminUsername}' created.`);
    }

    // Folders table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parent_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Media files table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS media_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        folder_id INT NULL,
        name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type ENUM('image', 'video') NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size BIGINT NOT NULL,
        default_duration INT DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Playlists table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS playlists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Playlist items table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS playlist_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        playlist_id INT NOT NULL,
        media_file_id INT NOT NULL,
        display_order INT DEFAULT 0,
        duration_seconds INT DEFAULT 10,
        start_time DATETIME NULL,
        end_time DATETIME NULL,
        is_active TINYINT(1) DEFAULT 1,
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
        FOREIGN KEY (media_file_id) REFERENCES media_files(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // TVs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tvs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        location VARCHAR(255),
        playlist_id INT NULL,
        is_online TINYINT(1) DEFAULT 0,
        last_ping TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    connection.release();
    console.log('Database initialized successfully tables ready.');
  } catch (error) {
    console.error('Failed to initialize database tables:', error.message);
    throw error;
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDB() first.');
  }
  return pool;
}

module.exports = { initDB, getPool };
