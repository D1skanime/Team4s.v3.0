import { readFile } from 'node:fs/promises'
import path from 'node:path'

function isSafeFileName(value: string): boolean {
  const name = (value || '').trim()
  if (!name) return false
  if (name.length > 200) return false
  if (name.includes('/') || name.includes('\\')) return false
  if (name.includes('..')) return false
  return /^[a-zA-Z0-9._-]+$/.test(name)
}

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
  if (!isSafeFileName(file)) {
    return new Response('not found', { status: 404 })
  }

  const coverPath = path.join(process.cwd(), 'public', 'covers', file)
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

