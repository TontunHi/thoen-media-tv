import { describe, it, expect } from 'vitest';
import { fixMulterFilename, fileExists, safeResolve } from '../server/utils/fs';
import path from 'path';

describe('Shared Filesystem & Encoding Utilities', () => {
  it('correctly handles already-valid UTF-8 Thai filenames', () => {
    const thaiName = 'วิดีโอประชาสัมพันธ์.mp4';
    expect(fixMulterFilename(thaiName)).toBe(thaiName);
  });

  it('correctly decodes latin1-encoded Thai filenames from Multer', () => {
    // Simulate what Multer produces when receiving UTF-8 bytes decoded as latin1
    const original = 'ตารางแพทย์.pdf';
    const latin1Corrupted = Buffer.from(original, 'utf8').toString('latin1');
    expect(fixMulterFilename(latin1Corrupted)).toBe(original);
  });

  it('preserves ASCII filenames untouched', () => {
    expect(fixMulterFilename('hospital_promo_2026.mp4')).toBe('hospital_promo_2026.mp4');
  });

  it('handles empty and non-string inputs safely', () => {
    expect(fixMulterFilename('')).toBe('');
    expect(fixMulterFilename(null)).toBe(null);
    expect(fixMulterFilename(undefined)).toBe(undefined);
  });

  it('checks file existence asynchronously', async () => {
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    expect(await fileExists(packageJsonPath)).toBe(true);

    const nonExistentPath = path.resolve(__dirname, '../does-not-exist-12345.xyz');
    expect(await fileExists(nonExistentPath)).toBe(false);
  });

  it('blocks directory traversal attempts in safeResolve', () => {
    const baseDir = path.resolve(__dirname, '../uploads');
    expect(() => safeResolve(baseDir, '../../etc/passwd')).toThrow('Directory traversal attempt detected');
  });
});
