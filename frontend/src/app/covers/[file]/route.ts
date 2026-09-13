import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { resolveCoverFilePath } from '@/lib/server/coverFiles'

function contentTypeForExtension(ext: string): string {
  switch ((ext || '').toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    case '.svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }): Promise<Response> {
  const { file } = await context.params
  const coverPath = resolveCoverFilePath(file)
  if (!coverPath) {
    return new Response('not found', { status: 404 })
  }

  try {
    const bytes = await readFile(coverPath)
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentTypeForExtension(path.extname(file)),
        // Keep caching conservative: covers can be replaced during admin edits in local workflows.
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch {
    return new Response('not found', { status: 404 })
  }
}

