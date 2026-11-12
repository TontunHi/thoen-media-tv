import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Smart TV Player Engine (player.html & tv-sw.js)', () => {
  const playerHtml = fs.readFileSync(
    path.resolve(__dirname, '../server/views/player.html'),
    'utf8'
  );
  const swCode = fs.readFileSync(
    path.resolve(__dirname, '../public/tv-sw.js'),
    'utf8'
  );

  it('maintains ES5 compatibility in player.html inline script and tv-sw.js', () => {
    const inlineMatch = playerHtml.match(/<script>\s*\(function[\s\S]*?<\/script>/);
    expect(inlineMatch).not.toBeNull();
    const inlineJs = inlineMatch[0].replace(/^<script>|<\/script>$/g, '');

    // Verify no ES6 const/let/arrow functions in Smart TV player script
    expect(/\b(const|let)\s+[a-zA-Z_$]/.test(inlineJs)).toBe(false);
    expect(/=>/.test(inlineJs)).toBe(false);
    expect(/\b(const|let)\s+[a-zA-Z_$]/.test(swCode)).toBe(false);
    expect(/=>/.test(swCode)).toBe(false);
  });

  it('schedules wake timers from waiting screen and supports HLS, ticker, and announcement cards', () => {
    expect(playerHtml).toContain('scheduleNextBoundaryWake');
    expect(playerHtml).toContain('wasWaitingAndCanPlay');
    expect(playerHtml).toContain('window.Hls && window.Hls.isSupported()');
    expect(playerHtml).toContain('id="tv-ticker"');
    expect(playerHtml).toContain('renderAnnouncementIntoLayer');
    expect(playerHtml).toContain('tv_force_reload');
  });
});
