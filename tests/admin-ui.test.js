import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  validateUploadFiles,
  MAX_UPLOAD_FILES,
  MAX_UPLOAD_FILE_BYTES,
} from '../src/services/api';
import { formatDaysOfWeekBadge } from '../src/features/playlists/PlaylistTimeline';

describe('PR-5 Admin UI modularity, upload validation, and weekday helpers', () => {
  it('validates upload files count, MIME type, and 500MB size cap', () => {
    expect(validateUploadFiles([]).valid).toBe(false);

    const tooMany = Array.from({ length: MAX_UPLOAD_FILES + 1 }, (_, i) => ({
      name: `img-${i}.jpg`,
      type: 'image/jpeg',
      size: 1024,
    }));
    expect(validateUploadFiles(tooMany).valid).toBe(false);

    const badMime = [{ name: 'malware.exe', type: 'application/x-msdownload', size: 1024 }];
    expect(validateUploadFiles(badMime).valid).toBe(false);

    const tooLarge = [
      { name: 'huge.mp4', type: 'video/mp4', size: MAX_UPLOAD_FILE_BYTES + 10 },
    ];
    expect(validateUploadFiles(tooLarge).valid).toBe(false);

    const validFiles = [
      { name: 'poster.png', type: 'image/png', size: 250000 },
      { name: 'clip.mp4', type: 'video/mp4', size: 15000000 },
    ];
    expect(validateUploadFiles(validFiles)).toEqual({ valid: true, error: null });
  });

  it('formats Thai weekday badges accurately', () => {
    expect(formatDaysOfWeekBadge('')).toBeNull();
    expect(formatDaysOfWeekBadge('0,1,2,3,4,5,6')).toBeNull();
    expect(formatDaysOfWeekBadge('1,3,5')).toBe('จ. พ. ศ.');
  });

  it('keeps MediaManager, PlaylistManager, and IncidentManager under 450 lines without window.confirm or hardcoded HOSxP IP', () => {
    const files = [
      'src/components/MediaManager.jsx',
      'src/components/PlaylistManager.jsx',
      'src/components/IncidentManager.jsx',
      'src/components/TvManager.jsx',
    ];
    for (const rel of files) {
      const fullPath = path.resolve(process.cwd(), rel);
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split(/\r?\n/).length;
      expect(lines).toBeLessThan(450);
      expect(content).not.toContain('window.confirm');
      expect(content).not.toContain('192.168.1.4:3306');
    }
  });
});
