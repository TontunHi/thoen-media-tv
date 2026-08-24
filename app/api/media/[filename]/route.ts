import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ filename: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { filename } = await context.params;
    const safeFilename = path.basename(filename);
    
    // Check in uploads first, then thumbnails
    let filePath = path.join(process.cwd(), 'data', 'uploads', safeFilename);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'data', 'thumbnails', safeFilename);
    }
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = request.headers.get('range');

    let mimeType = 'application/octet-stream';
    if (safeFilename.endsWith('.mp4')) mimeType = 'video/mp4';
    else if (safeFilename.endsWith('.webm')) mimeType = 'video/webm';
    else if (safeFilename.endsWith('.jpg') || safeFilename.endsWith('.jpeg')) mimeType = 'image/jpeg';
    else if (safeFilename.endsWith('.png')) mimeType = 'image/png';
    else if (safeFilename.endsWith('.gif')) mimeType = 'image/gif';
    else if (safeFilename.endsWith('.webp')) mimeType = 'image/webp';

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': mimeType,
      };

      return new NextResponse(file as any, {
        status: 206,
        headers: head,
      });
    } else {
      const head = {
        'Content-Length': fileSize.toString(),
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      };
      const file = fs.createReadStream(filePath);
      return new NextResponse(file as any, {
        headers: head,
      });
    }
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
