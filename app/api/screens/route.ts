import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const screens = await prisma.screen.findMany({
      include: {
        playlist: true
      },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(screens);
  } catch (error) {
    console.error('Error fetching screens:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, location, description, playlistId, loop } = body;
    let { slug } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!slug) {
      slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    const existingScreen = await prisma.screen.findUnique({
      where: { slug }
    });

    if (existingScreen) {
      return NextResponse.json({ error: 'Screen with this slug already exists' }, { status: 400 });
    }

    const screen = await prisma.screen.create({
      data: {
        name,
        slug,
        location: location || '',
        description: description || '',
        playlistId: playlistId || null,
        loop: loop !== undefined ? loop : true,
      }
    });

    return NextResponse.json(screen, { status: 201 });
  } catch (error) {
    console.error('Error creating screen:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
