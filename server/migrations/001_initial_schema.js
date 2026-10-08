/**
 * Migration 001: Initial Core Tables
 */
module.exports = {
  version: '001_initial_schema',
  description: 'Create core tables: users, folders, media_files, playlists, playlist_items, tvs, incidents, incident_patients',
  async up(connection) {
    await connection.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");

    // 1. Users
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Folders
    await connection.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parent_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Media Files
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Playlists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS playlists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Playlist Items
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. TVs
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Incidents
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
        incident_frequency VARCHAR(100) DEFAULT '',
        frequency_detail VARCHAR(255) DEFAULT '',
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Incident Patients
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }
};
