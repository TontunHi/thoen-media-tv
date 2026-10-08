const bcrypt = require('bcryptjs');

/**
 * Migration 003: Seed initial admin user and data repair
 */
module.exports = {
  version: '003_seed_and_repair',
  description: 'Seed default administrator and repair legacy filename encoding',
  async up(connection) {
    // 1. Seed initial admin user if configured
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminUsername && adminPassword) {
      const [existingUsers] = await connection.query('SELECT * FROM users WHERE username = ?', [adminUsername]);
      if (existingUsers.length === 0) {
        const hash = await bcrypt.hash(adminPassword, 10);
        await connection.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [adminUsername, hash]);
        console.log(`[Migration] Default admin user '${adminUsername}' seeded.`);
      }
    }

    // 2. Auto-repair any legacy mojibake filenames in media_files
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
          console.log(`[Migration] Auto-repaired mojibake filename for media_file #${row.id}: '${row.name}' -> '${fixedName}'`);
        }
      }
    } catch (e) {
      console.warn('[Migration] Media files auto-repair skipped:', e.message);
    }
  }
};
