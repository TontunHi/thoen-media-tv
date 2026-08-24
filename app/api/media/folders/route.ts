import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { deleteFile, THUMBNAIL_DIR } from '@/lib/storage';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const folders = await prisma.mediaFolder.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { items: true }
        }
      }
    });

    const totalMediaCount = await prisma.mediaItem.count();
    const uncategorizedCount = await prisma.mediaItem.count({
      where: { folderId: null }
    });

    return NextResponse.json({
      folders,
      totalMediaCount,
      uncategorizedCount
    });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'ชื่อโฟลเดอร์จำเป็นต้องกรอก' }, { status: 400 });
    }

    const folder = await prisma.mediaFolder.create({
      data: {
        name: name.trim(),
        color: color || 'blue'
      }
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, color } = body;

    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const folder = await prisma.mediaFolder.update({
      where: { id },
      data: {
        name: name.trim(),
        color: color || 'blue'
      }
    });

    return NextResponse.json(folder);
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    // 1. Find all media items inside this folder
    const itemsInFolder = await prisma.mediaItem.findMany({
      where: { folderId: id }
    });

    // 2. Delete all physical files and thumbnail files
    for (const item of itemsInFolder) {
      if (item.filePath) {
        deleteFile(item.filePath);
      }
      if (item.thumbnailPath) {
        deleteFile(path.join(THUMBNAIL_DIR, item.thumbnailPath));
      }
    }

    // 3. Delete playlist items referencing these media items
    const itemIds = itemsInFolder.map(item => item.id);
    if (itemIds.length > 0) {
      await prisma.playlistItem.deleteMany({
        where: { mediaItemId: { in: itemIds } }
      });

      // 4. Delete media items from database
      await prisma.mediaItem.deleteMany({
        where: { id: { in: itemIds } }
      });
    }

    // 5. Delete the folder itself
    await prisma.mediaFolder.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, deletedCount: itemsInFolder.length });
  } catch (error) {
    console.error('Error deleting folder and contents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
