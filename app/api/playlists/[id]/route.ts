import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { appEmitter, EVENT_TYPES } from '@/lib/events';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    
    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: {
        items: {
          include: { mediaItem: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    return NextResponse.json(playlist);
  } catch (error) {
    console.error('Error fetching playlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { name, description, items } = await request.json();

    const updatedPlaylist = await prisma.$transaction(async (tx) => {
      const p = await tx.playlist.update({
        where: { id },
        data: { name, description }
      });

      if (items && Array.isArray(items)) {
        await tx.playlistItem.deleteMany({
          where: { playlistId: id }
        });

        for (const item of items) {
          await tx.playlistItem.create({
            data: {
              playlistId: id,
              mediaItemId: item.mediaItemId,
              order: item.order,
              customDuration: item.customDuration,
              startDate: item.startDate ? new Date(item.startDate) : null,
              endDate: item.endDate ? new Date(item.endDate) : null,
              startTime: item.startTime || null,
              endTime: item.endTime || null,
              daysOfWeek: item.daysOfWeek || null,
            }
          });
        }
      }
      return p;
    });

    appEmitter.emit(EVENT_TYPES.PLAYLIST_UPDATED, { playlistId: id });

    return NextResponse.json(updatedPlaylist);
  } catch (error) {
    console.error('Error updating playlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    await prisma.$transaction(async (tx) => {
      await tx.screen.updateMany({
        where: { playlistId: id },
        data: { playlistId: null }
      });

      await tx.playlistItem.deleteMany({
        where: { playlistId: id }
      });

      await tx.playlist.delete({
        where: { id }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
