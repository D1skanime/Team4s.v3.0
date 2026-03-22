import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'

const MEDIA_BASE_PATH = process.env.MEDIA_BASE_PATH || path.join(process.cwd(), '..', 'media')

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params

  if (!pathSegments || pathSegments.length === 0) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Security: prevent path traversal
  const requestedPath = pathSegments.join('/')
  if (requestedPath.includes('..') || requestedPath.includes('~')) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const filePath = path.join(MEDIA_BASE_PATH, ...pathSegments)

  // Verify path is within MEDIA_BASE_PATH
  const resolvedPath = path.resolve(filePath)
  const resolvedBase = path.resolve(MEDIA_BASE_PATH)
  if (!resolvedPath.startsWith(resolvedBase)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) {
      return new NextResponse('Not Found', { status: 404 })
    }

    const fileBuffer = await readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Not Found', { status: 404 })
  }
}
