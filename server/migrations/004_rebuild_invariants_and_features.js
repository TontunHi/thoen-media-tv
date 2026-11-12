module.exports = {
  version: '004_rebuild_invariants_and_features',
  description: 'Add media expiry, announcement payload, weekday schedule mask, TV ticker and telemetry, user roles, playback logs, and audit logs',
  async up(connection) {
    const safeAddColumn = async (table, colDef) => {
      try {
        await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN ${colDef};`);
      } catch (e) {
        if (!String(e.message || '').includes('Duplicate column')) {
          // Ignore duplicate column on re-run
        }
      }
    };

    await safeAddColumn('users', "role VARCHAR(30) NOT NULL DEFAULT 'admin'");
    await safeAddColumn('media_files', 'expires_at DATETIME NULL');
    await safeAddColumn('media_files', 'announcement_data TEXT NULL');
    await safeAddColumn('playlist_items', "days_of_week VARCHAR(20) NOT NULL DEFAULT '0,1,2,3,4,5,6'");
    await safeAddColumn('tvs', 'ticker_text TEXT NULL');
    await safeAddColumn('tvs', 'ticker_enabled TINYINT(1) NOT NULL DEFAULT 0');
    await safeAddColumn('tvs', 'device_info TEXT NULL');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tv_playback_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        tv_id INT NOT NULL,
        media_file_id INT NULL,
        media_name VARCHAR(255) NOT NULL DEFAULT '',
        played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tv_played_at (tv_id, played_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        username VARCHAR(100) NOT NULL DEFAULT 'system',
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50) NOT NULL DEFAULT '',
        target_id VARCHAR(100) NULL,
        details TEXT NULL,
        ip_address VARCHAR(64) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }
};
