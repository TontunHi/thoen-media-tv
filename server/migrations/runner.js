const migration001 = require('./001_initial_schema');
const migration002 = require('./002_schema_updates');
const migration003 = require('./003_seed_and_repair');

const migrations = [
  migration001,
  migration002,
  migration003
];

/**
 * Execute pending database schema migrations in order
 * @param {import('mysql2/promise').Pool} pool
 */
async function runMigrations(pool) {
  const connection = await pool.getConnection();

  try {
    // 1. Ensure migrations tracking table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) PRIMARY KEY,
        description VARCHAR(255) NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Fetch already executed migrations
    const [rows] = await connection.query('SELECT version FROM schema_migrations');
    const appliedSet = new Set(rows.map((r) => r.version));

    // 3. Run pending migrations in order
    for (const migration of migrations) {
      if (!appliedSet.has(migration.version)) {
        console.log(`[Migrations] Applying ${migration.version}: ${migration.description || ''}...`);
        
        await connection.beginTransaction();
        try {
          await migration.up(connection);
          await connection.query(
            'INSERT INTO schema_migrations (version, description) VALUES (?, ?)',
            [migration.version, migration.description || '']
          );
          await connection.commit();
          console.log(`[Migrations] Successfully applied ${migration.version}.`);
        } catch (err) {
          await connection.rollback();
          console.error(`[Migrations] Failed applying ${migration.version}:`, err.message);
          throw err;
        }
      }
    }

    console.log('[Migrations] All database migrations are up to date.');
  } finally {
    connection.release();
  }
}

module.exports = {
  runMigrations
};
