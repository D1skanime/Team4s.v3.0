import crypto from 'node:crypto'
import path from 'node:path'
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises'

type MediaKind = 'logo' | 'banner'

function isLocalProfile(profile: string): boolean {
  const value = (profile || '').trim().toLowerCase()
  return value === '' || value === 'local' || value === 'dev' || value === 'development' || value === 'test'
}

function parseFansubID(raw: string | null): number | null {
  if (!raw) return null
  const parsed = Number.parseInt(raw.trim(), 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

function parseMediaKind(raw: string | null): MediaKind | null {
  if (raw === 'logo' || raw === 'banner') return raw
  return null
}

function safeExtension(fileName: string, contentType: string): string {
  const ext = path.extname(fileName || '').toLowerCase().replace('.', '')
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp') return ext === 'jpeg' ? 'jpg' : ext

  const type = (contentType || '').toLowerCase()
  if (type === 'image/jpeg') return 'jpg'
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  return 'bin'
}

function resolveRelativePath(fansubID: number, fileName: string): string {
  return `/media/fansubs/${fansubID}/${fileName}`
}

function resolveAbsolutePath(relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, '')
  return path.join(process.cwd(), 'public', clean)
}

function isSafeRelativePath(fansubID: number, relativePath: string): boolean {
  if (!relativePath.startsWith(`/media/fansubs/${fansubID}/`)) return false
  if (relativePath.includes('..')) return false
  return true
}

async function tryDelete(relativePath: string): Promise<void> {
  const absolute = resolveAbsolutePath(relativePath)
  try {
    const info = await stat(absolute)
    if (!info.isFile()) return
    await unlink(absolute)
  } catch {
    // ignore missing files
  }
}

export async function POST(request: Request): Promise<Response> {
  const runtimeProfile = process.env.NEXT_PUBLIC_RUNTIME_PROFILE || 'local'
  if (!isLocalProfile(runtimeProfile)) {
    return Response.json({ error: { message: 'upload ist in dieser umgebung deaktiviert' } }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: { message: 'ungueltiger request body' } }, { status: 400 })
  }

  const fansubID = parseFansubID(String(formData.get('fansub_id') || ''))
  const kind = parseMediaKind(String(formData.get('kind') || ''))
  const previousPath = String(formData.get('previous_path') || '').trim()
  const file = formData.get('file')

  if (!fansubID) return Response.json({ error: { message: 'ungueltige fansub_id' } }, { status: 400 })
  if (!kind) return Response.json({ error: { message: 'ungueltiger media-kind' } }, { status: 400 })
  if (!(file instanceof File)) return Response.json({ error: { message: 'datei fehlt (field: file)' } }, { status: 400 })
  if (!file.type.toLowerCase().startsWith('image/')) {
    return Response.json({ error: { message: 'ungueltiger dateityp (nur bilder)' } }, { status: 400 })
  }
  if (file.size <= 0) return Response.json({ error: { message: 'datei ist leer' } }, { status: 400 })
  if (file.size > 8 * 1024 * 1024) {
    return Response.json({ error: { message: 'datei ist zu gross (max 8MB)' } }, { status: 400 })
  }

  const ext = safeExtension(file.name, file.type)
  if (ext === 'bin') {
    return Response.json({ error: { message: 'ungueltiger dateityp (jpg/png/webp)' } }, { status: 400 })
  }

  const fileName = `${kind}_${Date.now()}_${crypto.randomUUID()}.${ext}`
  const relativePath = resolveRelativePath(fansubID, fileName)
  const absolutePath = resolveAbsolutePath(relativePath)
  const targetDir = path.dirname(absolutePath)
  await mkdir(targetDir, { recursive: true })
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()))

  if (previousPath && isSafeRelativePath(fansubID, previousPath) && previousPath !== relativePath) {
    await tryDelete(previousPath)
  }

  return Response.json(
    {
      data: {
        path: relativePath,
        size_bytes: file.size,
      },
    },
    { status: 201 },
  )
}

export async function DELETE(request: Request): Promise<Response> {
  const runtimeProfile = process.env.NEXT_PUBLIC_RUNTIME_PROFILE || 'local'
  if (!isLocalProfile(runtimeProfile)) {
    return Response.json({ error: { message: 'upload ist in dieser umgebung deaktiviert' } }, { status: 403 })
  }

  let payload: { fansub_id?: number; path?: string }
  try {
    payload = (await request.json()) as { fansub_id?: number; path?: string }
  } catch {
    return Response.json({ error: { message: 'ungueltiger request body' } }, { status: 400 })
  }

  const fansubID = Number(payload.fansub_id)
  const relativePath = String(payload.path || '').trim()
  if (!Number.isInteger(fansubID) || fansubID <= 0) {
    return Response.json({ error: { message: 'ungueltige fansub_id' } }, { status: 400 })
  }
  if (!relativePath || !isSafeRelativePath(fansubID, relativePath)) {
    return Response.json({ error: { message: 'ungueltiger pfad' } }, { status: 400 })
  }

  await tryDelete(relativePath)
  return new Response(null, { status: 204 })
}
