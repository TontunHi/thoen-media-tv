const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const { getPool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const {
  rootUploadDir,
  getRelativeFolderPath,
  getFullUploadDirPath
} = require('../utils/folderPath');

const router = express.Router();

// Helper to check if file/directory exists asynchronously
async function fileExists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, rootUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideo = ['video/mp4', 'video/webm'];

  if (allowedImage.includes(file.mimetype) || allowedVideo.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPG, PNG, GIF, WebP) and videos (MP4, WebM) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Upload media file(s) and physically place into target folder
router.post('/upload', authenticateToken, upload.array('files', 10), async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();
  const filesToCleanup = (req.files || []).map((f) => f.path);

  try {
    await conn.beginTransaction();

    const rawFolderId = req.body.folder_id;
    const folder_id = rawFolderId && rawFolderId !== 'root' && rawFolderId !== 'all' ? parseInt(rawFolderId) : null;
    const insertedFiles = [];

    // Resolve target physical folder
    const relFolderPath = await getRelativeFolderPath(folder_id, conn);
    const targetDir = getFullUploadDirPath(relFolderPath);
    if (!(await fileExists(targetDir))) {
      await fsp.mkdir(targetDir, { recursive: true });
    }

    for (const file of req.files) {
      const isVideo = file.mimetype.startsWith('video/');
      const file_type = isVideo ? 'video' : 'image';
      const default_duration = isVideo ? 0 : 10;

      // If target folder is not root, move the file physically into the subfolder
      let finalFilePath = `/uploads/${file.filename}`;
      if (relFolderPath) {
        const srcPath = path.join(rootUploadDir, file.filename);
        const destPath = path.join(targetDir, file.filename);
        if (await fileExists(srcPath)) {
          await fsp.rename(srcPath, destPath);
        }
        finalFilePath = `/uploads/${relFolderPath}/${file.filename}`;
      }

      const [result] = await conn.query(
        `INSERT INTO media_files (folder_id, name, original_name, file_path, file_type, mime_type, size, default_duration)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          folder_id,
          file.originalname,
          file.originalname,
          finalFilePath,
          file_type,
          file.mimetype,
          file.size,
          default_duration
        ]
      );

      insertedFiles.push({
        id: result.insertId,
        folder_id,
        name: file.originalname,
        original_name: file.originalname,
        file_path: finalFilePath,
        file_type,
        mime_type: file.mimetype,
        size: file.size,
        default_duration
      });
    }

    await conn.commit();
    res.status(201).json({ success: true, files: insertedFiles });
  } catch (error) {
    await conn.rollback();
    console.error('Upload error, cleaning up written files on disk:', error);

    // Atomically clean up all files from disk that were written during this failed request
    for (const p of filesToCleanup) {
      try {
        if (await fileExists(p)) {
          await fsp.unlink(p);
        }
      } catch (unlinkErr) {
        console.warn('Could not clean up uploaded file:', p, unlinkErr.message);
      }
    }

    res.status(500).json({ error: error.message || 'Failed to upload media files' });
  } finally {
    conn.release();
  }
});

// Get media files (filterable by folder_id)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { folder_id } = req.query;
    const pool = getPool();

    let query = 'SELECT * FROM media_files';
    const params = [];

    if (folder_id === 'root' || folder_id === 'null' || folder_id === '0') {
      query += ' WHERE folder_id IS NULL';
    } else if (folder_id && folder_id !== 'all') {
      query += ' WHERE folder_id = ?';
      params.push(parseInt(folder_id));
    }

    query += ' ORDER BY created_at DESC';

    const [files] = await pool.query(query, params);
    res.json(files);
  } catch (error) {
    console.error('Error fetching media files:', error);
    res.status(500).json({ error: 'Failed to fetch media files' });
  }
});

// Update media file (rename or physical folder move)
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, folder_id, default_duration } = req.body;
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [existing] = await conn.query('SELECT * FROM media_files WHERE id = ?', [id]);
    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Media file not found' });
    }

    const currentMedia = existing[0];
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (default_duration !== undefined) {
      updates.push('default_duration = ?');
      params.push(parseInt(default_duration));
    }

    // Physical move if folder_id changed
    if (folder_id !== undefined) {
      const newFolderId = folder_id === 'root' || folder_id === null || folder_id === '' ? null : parseInt(folder_id);

      if (newFolderId !== currentMedia.folder_id) {
        const newRelPath = await getRelativeFolderPath(newFolderId, conn);
        const targetDir = getFullUploadDirPath(newRelPath);
        if (!(await fileExists(targetDir))) {
          await fsp.mkdir(targetDir, { recursive: true });
        }

        const relPartOfOldFile = currentMedia.file_path.replace(/^\/uploads\//, '');
        const oldPhysicalPath = path.join(rootUploadDir, relPartOfOldFile);
        const filename = path.basename(currentMedia.file_path);
        const newPhysicalPath = path.join(targetDir, filename);

        if (await fileExists(oldPhysicalPath) && oldPhysicalPath !== newPhysicalPath) {
          await fsp.rename(oldPhysicalPath, newPhysicalPath);
        }

        const newFilePath = newRelPath ? `/uploads/${newRelPath}/${filename}` : `/uploads/${filename}`;
        updates.push('folder_id = ?');
        params.push(newFolderId);
        updates.push('file_path = ?');
        params.push(newFilePath);
      }
    }

    if (updates.length > 0) {
      params.push(id);
      await conn.query(`UPDATE media_files SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    await conn.commit();
    res.json({ success: true });
  } catch (error) {
    await conn.rollback();
    console.error('Error updating media file:', error);
    res.status(500).json({ error: 'Failed to update media file' });
  } finally {
    conn.release();
  }
});

// Delete media file physically from disk and database
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT file_path FROM media_files WHERE id = ?', [id]);
    
    if (rows.length > 0) {
      const relPartOfFile = rows[0].file_path.replace(/^\/uploads\//, '');
      const fullPath = path.join(rootUploadDir, relPartOfFile);
      if (await fileExists(fullPath)) {
        await fsp.unlink(fullPath);
      }
    }

    await conn.query('DELETE FROM media_files WHERE id = ?', [id]);
    await conn.commit();

    // Notify all active TV sockets that media has been removed so they refresh immediately
    if (req.io) {
      req.io.emit('media_deleted', { mediaId: id, timestamp: Date.now() });
    }

    res.json({ success: true });
  } catch (error) {
    await conn.rollback();
    console.error('Error deleting media file:', error);
    res.status(500).json({ error: 'Failed to delete media file' });
  } finally {
    conn.release();
  }
});

module.exports = router;
