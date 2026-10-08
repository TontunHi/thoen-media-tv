/**
 * Migration 002: Ensure schema backward compatibility on existing installations
 */
module.exports = {
  version: '002_schema_updates',
  description: 'Ensure columns and charset conversions for upgraded databases',
  async up(connection) {
    const tables = ['users', 'folders', 'media_files', 'playlists', 'playlist_items', 'tvs', 'incidents', 'incident_patients'];
    for (const tbl of tables) {
      try {
        await connection.query(`ALTER TABLE \`${tbl}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      } catch (e) {
        // Ignore if table already utf8mb4
      }
    }

    // Helper to safely add column if it does not exist
    const safeAddColumn = async (table, colDef) => {
      try {
        await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN ${colDef};`);
      } catch (e) {
        // Column may already exist
      }
    };

    // TV columns
    await safeAddColumn('tvs', 'is_incident_override TINYINT(1) DEFAULT 0');
    await safeAddColumn('tvs', 'active_incident_id INT NULL');

    // Incidents columns
    await safeAddColumn('incidents', 'is_auto_sync TINYINT(1) DEFAULT 1');
    await safeAddColumn('incidents', 'end_date DATE NULL AFTER incident_date');
    await safeAddColumn('incidents', 'road_conditions TEXT NULL');
    await safeAddColumn('incidents', 'management_actions TEXT NULL');
    await safeAddColumn('incidents', "ems_units VARCHAR(255) DEFAULT ''");
    await safeAddColumn('incidents', "incident_frequency VARCHAR(100) DEFAULT ''");
    await safeAddColumn('incidents', "frequency_detail VARCHAR(255) DEFAULT ''");

    // Incident Patients columns
    await safeAddColumn('incident_patients', "transport VARCHAR(100) DEFAULT '-'");
    await safeAddColumn('incident_patients', 'diag TEXT NULL');
  }
};
