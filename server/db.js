const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const rawHost = (process.env.DB_HOST || '192.168.1.7').trim();
const hostParts = rawHost.includes(':') ? rawHost.split(':') : [rawHost, null];
const host = hostParts[0];
const port = parseInt(process.env.DB_PORT || hostParts[1] || '3306');
let rawPass = process.env.DB_PASS || process.env.DB_PASSWORD || 'PRnew11152@';
try {
  if (rawPass && rawPass.includes('%')) {
    rawPass = decodeURIComponent(rawPass);
  }
} catch (e) {}

const dbConfig = {
  host,
  port,
  user: process.env.DB_USER || 'prnew',
  password: rawPass,
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
        file_type VARCHAR(50) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size BIGINT NOT NULL,
        default_duration INT DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure file_type column supports stream / live / youtube / facebook types
    try {
      await connection.query('ALTER TABLE media_files MODIFY COLUMN file_type VARCHAR(50) NOT NULL;');
    } catch (e) {
      // ignore
    }

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
        is_incident_override TINYINT(1) DEFAULT 0,
        active_incident_id INT NULL,
        last_ping TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure columns exist on older tvs table
    try {
      await connection.query('ALTER TABLE tvs ADD COLUMN is_incident_override TINYINT(1) DEFAULT 0;');
    } catch (e) {}
    try {
      await connection.query('ALTER TABLE tvs ADD COLUMN active_incident_id INT NULL;');
    } catch (e) {}

    // Incidents table (Mass Casualty Incidents / อุบัติเหตุหมู่)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        location VARCHAR(255) DEFAULT '',
        incident_date DATE NOT NULL,
        end_date DATE NULL,
        start_time VARCHAR(20) DEFAULT '',
        end_time VARCHAR(20) DEFAULT '',
        refuse_treatment_count INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 0,
        is_auto_sync TINYINT(1) DEFAULT 1,
        broadcast_tvs JSON NULL,
        road_conditions TEXT NULL,
        management_actions TEXT NULL,
        ems_units VARCHAR(255) DEFAULT '',
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure is_auto_sync, end_date and report context columns exist
    try {
      await connection.query('ALTER TABLE incidents ADD COLUMN is_auto_sync TINYINT(1) DEFAULT 1;');
    } catch (e) {}
    try {
      await connection.query('ALTER TABLE incidents ADD COLUMN end_date DATE NULL AFTER incident_date;');
    } catch (e) {}
    try {
      await connection.query('ALTER TABLE incidents ADD COLUMN road_conditions TEXT NULL;');
    } catch (e) {}
    try {
      await connection.query('ALTER TABLE incidents ADD COLUMN management_actions TEXT NULL;');
    } catch (e) {}
    try {
      await connection.query('ALTER TABLE incidents ADD COLUMN ems_units VARCHAR(255) DEFAULT \'\';');
    } catch (e) {}

    // Incident Patients table (รายชื่อผู้ประสบเหตุ/ผู้บาดเจ็บ)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS incident_patients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        incident_id INT NOT NULL,
        tag_number VARCHAR(50) NOT NULL,
        display_order INT DEFAULT 0,
        vn VARCHAR(50) NULL,
        hn VARCHAR(50) NULL,
        pt_name VARCHAR(255) NOT NULL,
        sex VARCHAR(20) DEFAULT 'ไม่ระบุ',
        age VARCHAR(20) DEFAULT '-',
        triage_level VARCHAR(100) DEFAULT 'เขียว',
        triage_color VARCHAR(20) DEFAULT 'green',
        injury_info TEXT NULL,
        transport VARCHAR(100) DEFAULT '-',
        diag TEXT NULL,
        current_status VARCHAR(255) DEFAULT 'ห้องฉุกเฉิน (ER)',
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      await connection.query('ALTER TABLE incident_patients ADD COLUMN transport VARCHAR(100) DEFAULT \'-\';');
    } catch (e) {}
    try {
      await connection.query('ALTER TABLE incident_patients ADD COLUMN diag TEXT NULL;');
    } catch (e) {}

    // Auto-repair any mojibake filenames in media_files
    try {
      const [mediaRows] = await connection.query('SELECT id, name, original_name FROM media_files');
      for (const row of mediaRows) {
        let changed = false;
        let fixedName = row.name;
        let fixedOrig = row.original_name;

        if (fixedName && !/[\u0100-\uFFFF]/.test(fixedName) && /[\u0080-\u00FF]/.test(fixedName)) {
          const dec = Buffer.from(fixedName, 'latin1').toString('utf8');
          if (!dec.includes('\uFFFD')) {
            fixedName = dec;
            changed = true;
          }
        }
        if (fixedOrig && !/[\u0100-\uFFFF]/.test(fixedOrig) && /[\u0080-\u00FF]/.test(fixedOrig)) {
          const dec = Buffer.from(fixedOrig, 'latin1').toString('utf8');
          if (!dec.includes('\uFFFD')) {
            fixedOrig = dec;
            changed = true;
          }
        }

        if (changed) {
          await connection.query(
            'UPDATE media_files SET name = ?, original_name = ? WHERE id = ?',
            [fixedName, fixedOrig, row.id]
          );
          console.log(`Auto-repaired mojibake filename for media_file #${row.id}: '${row.name}' -> '${fixedName}'`);
        }
      }
    } catch (e) {
      console.warn('Notice: Media files auto-repair skipped:', e.message);
    }

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
