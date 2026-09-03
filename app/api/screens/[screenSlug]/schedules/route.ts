import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { appEmitter, EVENT_TYPES } from '@/lib/events';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ screenSlug: string }>;
}

// GET /api/screens/[screenSlug]/schedules
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { screenSlug } = await context.params;

    const screen = await prisma.screen.findFirst({
      where: {
        OR: [
          { slug: screenSlug },
          { id: screenSlug }
        ]
      }
    });

    if (!screen) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
    }

    const schedules = await prisma.screenPlaylistSchedule.findMany({
      where: { screenId: screen.id },
      include: {
        playlist: {
          select: {
            id: true,
            name: true,
            description: true,
            _count: { select: { items: true } }
          }
        }
      },
      orderBy: { priority: 'asc' }
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching screen schedules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/screens/[screenSlug]/schedules
// Body: { schedules: Array<{ id?: string, playlistId: string, priority: number, startDate?: string, endDate?: string, startTime?: string, endTime?: string, isActive?: boolean }> }
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { screenSlug } = await context.params;
    const body = await request.json();
    const schedulesInput = Array.isArray(body.schedules) ? body.schedules : [];

    const screen = await prisma.screen.findFirst({
      where: {
        OR: [
          { slug: screenSlug },
          { id: screenSlug }
        ]
      }
    });

    if (!screen) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
    }

    // Execute in transaction: delete removed, update/insert existing
    await prisma.$transaction(async (tx) => {
      // Clear existing schedules for this screen
      await tx.screenPlaylistSchedule.deleteMany({
        where: { screenId: screen.id }
      });

      // Insert new schedules with proper priorities
      if (schedulesInput.length > 0) {
        for (let i = 0; i < schedulesInput.length; i++) {
          const item = schedulesInput[i];
          if (!item.playlistId) continue;

          await tx.screenPlaylistSchedule.create({
            data: {
              screenId: screen.id,
              playlistId: item.playlistId,
              priority: item.priority !== undefined ? Number(item.priority) : i + 1,
              startDate: item.startDate ? new Date(item.startDate) : null,
              endDate: item.endDate ? new Date(item.endDate) : null,
              startTime: item.startTime || null,
              endTime: item.endTime || null,
              isActive: item.isActive !== undefined ? Boolean(item.isActive) : true
            }
          });
        }
      }
    });

    // Notify player to refresh active playlist
    appEmitter.emit(EVENT_TYPES.SCREEN_RELOAD, { screenSlug: screen.slug });

    // Return updated schedules
    const updatedSchedules = await prisma.screenPlaylistSchedule.findMany({
      where: { screenId: screen.id },
      include: {
        playlist: {
          select: {
            id: true,
            name: true,
            description: true,
            _count: { select: { items: true } }
          }
        }
      },
      orderBy: { priority: 'asc' }
    });

    return NextResponse.json(updatedSchedules);
  } catch (error) {
    console.error('Error updating screen schedules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
