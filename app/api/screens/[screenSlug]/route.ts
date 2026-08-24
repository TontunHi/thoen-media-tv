import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { appEmitter, EVENT_TYPES } from '@/lib/events';
import { isItemActiveNow } from '@/lib/schedule';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ screenSlug: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { screenSlug } = await context.params;
    
    // Find by slug OR id
    const screen = await prisma.screen.findFirst({
      where: {
        OR: [
          { slug: screenSlug },
          { id: screenSlug }
        ]
      },
      include: {
        playlist: {
          include: {
            items: {
              include: { mediaItem: true },
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    if (!screen) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
    }

    if (screen.playlist) {
      screen.playlist.items = screen.playlist.items.filter(item => isItemActiveNow(item as any));
    }

    return NextResponse.json(screen);
  } catch (error) {
    console.error('Error fetching screen:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { screenSlug } = await context.params;
    const { name, slug, location, description, playlistId, loop } = await request.json();

    // Check if target screen exists by slug or id
    const existing = await prisma.screen.findFirst({
      where: {
        OR: [
          { slug: screenSlug },
          { id: screenSlug }
        ]
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
    }

    const screen = await prisma.screen.update({
      where: { id: existing.id },
      data: {
        name,
        slug: slug || existing.slug,
        location,
        description,
        playlistId: playlistId || null,
        loop: loop !== undefined ? loop : true
      }
    });

    appEmitter.emit(EVENT_TYPES.SCREEN_RELOAD, { screenSlug: screen.slug });

    return NextResponse.json(screen);
  } catch (error) {
    console.error('Error updating screen:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { screenSlug } = await context.params;

    const existing = await prisma.screen.findFirst({
      where: {
        OR: [
          { slug: screenSlug },
          { id: screenSlug }
        ]
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
    }

    await prisma.screen.delete({
      where: { id: existing.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting screen:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
