import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'

export const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads')
export const THUMBNAIL_DIR = path.join(process.cwd(), 'data', 'thumbnails')

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
]

export function ensureUploadDirs() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }
  if (!fs.existsSync(THUMBNAIL_DIR)) {
    fs.mkdirSync(THUMBNAIL_DIR, { recursive: true })
  }
}

export function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

export async function saveUploadedFile(file: File): Promise<{ filename: string; filePath: string; mimeType: string; type: 'IMAGE' | 'VIDEO'; size: number }> {
  ensureUploadDirs()

  const ext = path.extname(file.name).toLowerCase()
  const filename = `${uuidv4()}${ext}`
  const filePath = path.join(UPLOAD_DIR, filename)
  const mimeType = file.type || getMimeType(file.name)
  const type = mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE'
  const size = file.size

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  fs.writeFileSync(filePath, buffer)

  return { filename, filePath, mimeType, type, size }
}

export async function generateThumbnail(filePath: string, filename: string): Promise<string | null> {
  const mimeType = getMimeType(filename)
  if (mimeType.startsWith('video/')) {
    return null // Thumbnail generation for videos could be added later using ffmpeg
  }

  ensureUploadDirs()
  const thumbnailFilename = `${path.parse(filename).name}_thumb.webp`
  const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFilename)

  try {
    await sharp(filePath)
      .resize({ width: 400 })
      .webp()
      .toFile(thumbnailPath)
    return thumbnailFilename
  } catch (error) {
    console.error('Error generating thumbnail:', error)
    return null
  }
}

export function deleteFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (error) {
    console.error('Error deleting file:', error)
  }
}
