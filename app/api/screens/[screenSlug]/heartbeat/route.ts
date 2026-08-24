import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ screenSlug: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { screenSlug } = await context.params;
    
    let currentSlideIndex = null;
    try {
      const body = await request.json();
      currentSlideIndex = body.currentSlideIndex;
    } catch (e) {
      // Ignore if no body or invalid json
    }

    await prisma.screen.update({
      where: { slug: screenSlug },
      data: {
        lastPingAt: new Date(),
        isOnline: true,
        ...(currentSlideIndex !== undefined && currentSlideIndex !== null ? { currentSlideIndex } : {})
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating heartbeat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
