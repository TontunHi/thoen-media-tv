import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { saveUploadedFile, generateThumbnail, ALLOWED_MIME_TYPES, deleteFile, THUMBNAIL_DIR } from '@/lib/storage';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    const where: any = {};
    if (folderId === 'none' || folderId === 'null') {
      where.folderId = null;
    } else if (folderId && folderId !== 'all') {
      where.folderId = folderId;
    }

    const mediaItems = await prisma.mediaItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        folder: true
      }
    });
    
    const formatted = mediaItems.map(item => ({
      ...item,
      url: `/api/media/${item.filename}`,
      thumbnailUrl: item.thumbnailPath ? `/api/media/${item.thumbnailPath}` : (item.type === 'IMAGE' ? `/api/media/${item.filename}` : null)
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('file') as File[];
    const folderId = formData.get('folderId') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const createdItems = [];

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        continue;
      }

      const { filename, filePath, mimeType, type, size } = await saveUploadedFile(file);
      const thumbnailPath = await generateThumbnail(filePath, filename);

      const mediaItem = await prisma.mediaItem.create({
        data: {
          title: file.name,
          filename,
          filePath,
          mimeType,
          type,
          size,
          thumbnailPath,
          folderId: folderId && folderId !== 'null' && folderId !== 'all' && folderId !== 'none' ? folderId : null,
        }
      });

      createdItems.push({
        ...mediaItem,
        url: `/api/media/${filename}`,
        thumbnailUrl: thumbnailPath ? `/api/media/${thumbnailPath}` : (type === 'IMAGE' ? `/api/media/${filename}` : null)
      });
    }

    return NextResponse.json(createdItems, { status: 201 });
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, folderId, title } = body;

    if (!id) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    const data: any = {};
    if (folderId !== undefined) {
      data.folderId = folderId === 'none' || folderId === null ? null : folderId;
    }
    if (title !== undefined) {
      data.title = title;
    }

    const updated = await prisma.mediaItem.update({
      where: { id },
      data
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    const mediaItem = await prisma.mediaItem.findUnique({
      where: { id }
    });

    if (!mediaItem) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    if (mediaItem.filePath) {
      deleteFile(mediaItem.filePath);
    }
    if (mediaItem.thumbnailPath) {
      deleteFile(path.join(THUMBNAIL_DIR, mediaItem.thumbnailPath));
    }

    await prisma.playlistItem.deleteMany({
      where: { mediaItemId: id }
    });

    await prisma.mediaItem.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
