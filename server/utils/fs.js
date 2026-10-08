const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

/**
 * Check if a file or directory path exists asynchronously without throwing
 * @param {string} targetPath - Path to verify
 * @returns {Promise<boolean>}
 */
async function fileExists(targetPath) {
  if (!targetPath) return false;
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Fix Multer latin1 encoding bug for non-ASCII filenames (such as Thai characters).
 * Multer treats headers as ISO-8859-1 (latin1) when browsers actually transmit UTF-8.
 * @param {string} filename
 * @returns {string}
 */
function fixMulterFilename(filename) {
  if (!filename || typeof filename !== 'string') return filename;
  try {
    // If the string already contains high unicode characters (> 0xFF, e.g. Thai \u0E00-\u0E7F),
    // it is already properly decoded UTF-8.
    if (/[\u0100-\uFFFF]/.test(filename)) {
      return filename;
    }
    // If it only contains standard ASCII (<= 0x7F), no conversion needed.
    if (!/[\u0080-\u00FF]/.test(filename)) {
      return filename;
    }
    // Attempt decoding latin1 bytes into UTF-8
    const decoded = Buffer.from(filename, 'latin1').toString('utf8');
    // If decoding produced valid characters without replacement character '\uFFFD', use decoded
    if (!decoded.includes('\uFFFD')) {
      return decoded;
    }
    return filename;
  } catch {
    return filename;
  }
}

/**
 * Ensures a target path stays securely within the base directory (preventing directory traversal attacks)
 * @param {string} baseDir
 * @param {string} relativePath
 * @returns {string} Absolute resolved path
 */
function safeResolve(baseDir, relativePath) {
  const resolved = path.resolve(baseDir, relativePath);
  const normalizedBase = path.resolve(baseDir);
  if (!resolved.startsWith(normalizedBase)) {
    throw new Error('Directory traversal attempt detected');
  }
  return resolved;
}

module.exports = {
  fileExists,
  fixMulterFilename,
  safeResolve
};
