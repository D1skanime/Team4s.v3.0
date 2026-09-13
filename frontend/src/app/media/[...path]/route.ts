import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { createReadStream } from 'fs'
import { Readable } from 'node:stream'
import path from 'path'
import { IMAGE_DISPLAY_QUERY } from '@/lib/imageDisplayContract'
import { serveImageDisplay } from '@/lib/server/imageDisplay'

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

type ByteRange = { start: number; end: number }

// RFC 7233 single-range parsing only: exactly one `bytes=` range. Any header carrying a
// different unit, a comma (multiple ranges), or an otherwise unparseable shape returns `null`
// so the caller falls back to the existing whole-file 200 response -- multiple ranges are
// deliberately answered with a full 200 body rather than a `multipart/byteranges` response,
// per this plan's scope.
function parseByteRange(header: string | null, size: number): ByteRange | 'unsatisfiable' | null {
  if (!header) return null
  const trimmed = header.trim()
  if (!trimmed.startsWith('bytes=')) return null

  const spec = trimmed.slice('bytes='.length)
  if (spec.includes(',')) return null

  const dashIndex = spec.indexOf('-')
  if (dashIndex === -1) return null

  const firstStr = spec.slice(0, dashIndex)
  const lastStr = spec.slice(dashIndex + 1)

  if (firstStr === '') {
    // Suffix form: bytes=-N (last N bytes)
    const suffixLength = Number(lastStr)
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null
    // A suffix length longer than the file just means "the whole file" (RFC 7233 §2.1),
    // not unsatisfiable.
    const start = Math.max(0, size - suffixLength)
    return { start, end: size - 1 }
  }

  const start = Number(firstStr)
  if (!Number.isFinite(start) || start < 0) return null
  if (start >= size) return 'unsatisfiable'

  if (lastStr === '') {
    // Open-ended form: bytes=N-
    return { start, end: size - 1 }
  }

  const end = Number(lastStr)
  if (!Number.isFinite(end)) return null
  if (end < start) return 'unsatisfiable'

  return { start, end: Math.min(end, size - 1) }
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

  // Verify path is within MEDIA_BASE_PATH. Hardened to a separator-aware comparison (exact
  // match or resolvedBase + path.sep prefix) as defense-in-depth against a sibling directory
  // sharing resolvedBase as a plain string prefix (e.g. ".../media-evil" next to ".../media").
  // Not currently reachable as an exploit: the "..": "~" filter above already rejects every
  // pathSegments value that could reach a sibling directory before this check ever runs.
  const resolvedPath = path.resolve(filePath)
  const resolvedBase = path.resolve(MEDIA_BASE_PATH)
  if (resolvedPath !== resolvedBase && !resolvedPath.startsWith(resolvedBase + path.sep)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  if (pathSegments[0] === 'anime' && new URL(request.url).searchParams.has(IMAGE_DISPLAY_QUERY)) {
    return serveImageDisplay(request, { filePath: resolvedPath })
  }

  try {
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) {
      return new NextResponse('Not Found', { status: 404 })
    }

    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    const range = parseByteRange(request.headers.get('range'), fileStat.size)

    if (range === 'unsatisfiable') {
      return new NextResponse(null, {
        status: 416,
        headers: {
          'Content-Range': `bytes */${fileStat.size}`,
          'Accept-Ranges': 'bytes',
        },
      })
    }

    if (range !== null) {
      const { start, end } = range
      const contentLength = end - start + 1
      const stream = Readable.toWeb(
        createReadStream(filePath, { start, end })
      ) as ReadableStream<Uint8Array>

      return new NextResponse(stream, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Length': contentLength.toString(),
          'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    const fileBuffer = await readFile(filePath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStat.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Not Found', { status: 404 })
  }
}

export async function HEAD(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const response = await GET(request, context)
  await response.body?.cancel()
  return new Response(null, { status: response.status, headers: response.headers })
}
