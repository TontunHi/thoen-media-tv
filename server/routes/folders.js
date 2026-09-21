const express = require('express');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { getPool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const {
  rootUploadDir,
  sanitizeFolderName,
  getRelativeFolderPath,
  getFullUploadDirPath
} = require('../utils/folderPath');

const router = express.Router();

// Helper to check if path exists asynchronously
async function fileExists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

// Get all folders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const [folders] = await pool.query('SELECT * FROM folders ORDER BY name ASC');
    res.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Create folder on DB and physical filesystem
router.post('/', authenticateToken, async (req, res) => {
  const { name, parent_id } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Folder name is required' });

  const cleanName = sanitizeFolderName(name.trim());
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO folders (name, parent_id) VALUES (?, ?)',
      [cleanName, parent_id || null]
    );

    // Create physical folder on disk asynchronously
    const relPath = await getRelativeFolderPath(result.insertId, conn);
    const targetDir = getFullUploadDirPath(relPath);
    await fsp.mkdir(targetDir, { recursive: true });

    await conn.commit();
    res.status(201).json({ id: result.insertId, name: cleanName, parent_id: parent_id || null });
  } catch (error) {
    await conn.rollback();
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  } finally {
    conn.release();
  }
});

// Rename folder on DB and physical filesystem
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Folder name is required' });

  const cleanName = sanitizeFolderName(name.trim());
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const oldRelPath = await getRelativeFolderPath(id, conn);
    await conn.query('UPDATE folders SET name = ? WHERE id = ?', [cleanName, id]);
    const newRelPath = await getRelativeFolderPath(id, conn);

    const oldDir = getFullUploadDirPath(oldRelPath);
    const newDir = getFullUploadDirPath(newRelPath);

    if (await fileExists(oldDir) && oldRelPath !== newRelPath) {
      await fsp.rename(oldDir, newDir);

      // Update media file paths in DB
      const oldUrlPrefix = `/uploads/${oldRelPath}/`;
      const newUrlPrefix = `/uploads/${newRelPath}/`;
      const [files] = await conn.query('SELECT id, file_path FROM media_files WHERE file_path LIKE ?', [`${oldUrlPrefix}%`]);
      for (const f of files) {
        const updatedPath = f.file_path.replace(oldUrlPrefix, newUrlPrefix);
        await conn.query('UPDATE media_files SET file_path = ? WHERE id = ?', [updatedPath, f.id]);
      }
    }

    await conn.commit();
    res.json({ success: true, name: cleanName });
  } catch (error) {
    await conn.rollback();
    console.error('Error renaming folder:', error);
    res.status(500).json({ error: 'Failed to rename folder' });
  } finally {
    conn.release();
  }
});

// Recursively find all child folder IDs for a given folder ID
async function getAllDescendantFolderIds(folderId, conn) {
  const descendantIds = [folderId];
  let queue = [folderId];

  while (queue.length > 0) {
    const current = queue.shift();
    const [children] = await conn.query('SELECT id FROM folders WHERE parent_id = ?', [current]);
    for (const child of children) {
      descendantIds.push(child.id);
      queue.push(child.id);
    }
  }

  return descendantIds;
}

// Delete folder on DB and move contained physical files safely to root
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const targetFolderId = parseInt(id);
    const allFolderIds = await getAllDescendantFolderIds(targetFolderId, conn);

    // Find all media files residing in this folder or any descendant subfolder
    const [mediaRows] = await conn.query(
      `SELECT id, file_path, name FROM media_files WHERE folder_id IN (?)`,
      [allFolderIds]
    );

    // Safely move each file back to root uploads directory with collision avoidance
    for (const media of mediaRows) {
      const relPartOfOldFile = media.file_path.replace(/^\/uploads\//, '');
      const oldPhysicalPath = path.join(rootUploadDir, relPartOfOldFile);
      const filename = path.basename(media.file_path);

      let targetFilename = filename;
      let newPhysicalPath = path.join(rootUploadDir, targetFilename);

      // Handle filename collision in root
      if (await fileExists(newPhysicalPath) && oldPhysicalPath !== newPhysicalPath) {
        const ext = path.extname(filename);
        const nameWithoutExt = path.basename(filename, ext);
        targetFilename = `${nameWithoutExt}-${Date.now()}${ext}`;
        newPhysicalPath = path.join(rootUploadDir, targetFilename);
      }

      if (await fileExists(oldPhysicalPath) && oldPhysicalPath !== newPhysicalPath) {
        await fsp.rename(oldPhysicalPath, newPhysicalPath);
      }

      const newDbFilePath = `/uploads/${targetFilename}`;
      await conn.query(
        'UPDATE media_files SET folder_id = NULL, file_path = ? WHERE id = ?',
        [newDbFilePath, media.id]
      );
    }

    // Delete folder directory physically from disk
    const relPath = await getRelativeFolderPath(targetFolderId, conn);
    const folderDir = getFullUploadDirPath(relPath);

    if (await fileExists(folderDir)) {
      await fsp.rm(folderDir, { recursive: true, force: true });
    }

    // Delete folder records (cascades child folders in schema)
    await conn.query('DELETE FROM folders WHERE id = ?', [targetFolderId]);

    await conn.commit();
    res.json({ success: true });
  } catch (error) {
    await conn.rollback();
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  } finally {
    conn.release();
  }
});

module.exports = router;
