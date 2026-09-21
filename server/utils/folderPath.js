const path = require('path');
const fs = require('fs');

const rootUploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(rootUploadDir)) {
  fs.mkdirSync(rootUploadDir, { recursive: true });
}

function sanitizeFolderName(name) {
  if (!name) return 'folder';
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

/**
 * Recursively resolves the relative folder path string from root uploadDir.
 * Includes depth limit (max 20) and cycle detection via visited Set.
 * e.g. "" (root) or "แผนกอุบัติเหตุ" or "ตึกอำนวยการ/ชั้น1"
 */
async function getRelativeFolderPath(folderId, pool) {
  if (!folderId) return '';

  const segments = [];
  let currentId = folderId;
  const visited = new Set();
  let depth = 0;

  while (currentId && depth < 20) {
    if (visited.has(currentId)) {
      console.warn(`Circular reference detected in folder hierarchy at ID ${currentId}`);
      break;
    }
    visited.add(currentId);
    depth++;

    const [rows] = await pool.query('SELECT id, name, parent_id FROM folders WHERE id = ?', [currentId]);
    if (rows.length === 0) break;
    segments.unshift(sanitizeFolderName(rows[0].name));
    currentId = rows[0].parent_id;
  }

  return segments.join('/');
}

function getFullUploadDirPath(relativeFolderPath = '') {
  return path.join(rootUploadDir, relativeFolderPath);
}

module.exports = {
  rootUploadDir,
  sanitizeFolderName,
  getRelativeFolderPath,
  getFullUploadDirPath
};
