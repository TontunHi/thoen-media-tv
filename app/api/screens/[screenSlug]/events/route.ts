import { NextRequest } from 'next/server';
import { appEmitter, EVENT_TYPES } from '@/lib/events';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ screenSlug: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { screenSlug } = await context.params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (event: string, data: any) => {
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (e) {
          console.error('Error sending SSE event:', e);
        }
      };

      sendEvent('connected', { screenSlug });

      const interval = setInterval(() => {
        sendEvent('ping', { time: Date.now() });
      }, 15000);

      const onPlaylistUpdated = (data: { playlistId: string }) => {
        sendEvent(EVENT_TYPES.PLAYLIST_UPDATED, { type: 'PLAYLIST_UPDATED', ...data });
      };

      const onScreenReload = (data: { screenSlug: string }) => {
        if (!data.screenSlug || data.screenSlug === screenSlug) {
          sendEvent(EVENT_TYPES.SCREEN_RELOAD, { type: 'RELOAD', ...data });
        }
      };

      appEmitter.on(EVENT_TYPES.PLAYLIST_UPDATED, onPlaylistUpdated);
      appEmitter.on(EVENT_TYPES.SCREEN_RELOAD, onScreenReload);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        appEmitter.off(EVENT_TYPES.PLAYLIST_UPDATED, onPlaylistUpdated);
        appEmitter.off(EVENT_TYPES.SCREEN_RELOAD, onScreenReload);
        try {
          controller.close();
        } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
