import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

function isLocalProfile(profile: string): boolean {
  const value = (profile || '').trim().toLowerCase()
  return value === '' || value === 'local' || value === 'dev' || value === 'development' || value === 'test'
}

function safeExtension(fileName: string, contentType: string): string {
  const fromName = path.extname(fileName || '').toLowerCase().replace('.', '')
  if (fromName && /^[a-z0-9]+$/.test(fromName)) {
    return fromName
  }

  const type = (contentType || '').toLowerCase()
  if (type === 'image/webp') return 'webp'
  if (type === 'image/png') return 'png'
  if (type === 'image/jpeg') return 'jpg'
  if (type === 'image/gif') return 'gif'

  return 'bin'
}

export async function POST(request: Request): Promise<Response> {
  // Local-dev helper only: writing to public/ on a server is not a durable storage strategy.
  const runtimeProfile = process.env.NEXT_PUBLIC_RUNTIME_PROFILE || 'local'
  if (!isLocalProfile(runtimeProfile)) {
    return Response.json({ error: { message: 'upload ist in dieser umgebung deaktiviert' } }, { status: 403 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: { message: 'ungueltiger request body' } }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return Response.json({ error: { message: 'datei fehlt (field: file)' } }, { status: 400 })
  }

  if (file.size <= 0) {
    return Response.json({ error: { message: 'datei ist leer' } }, { status: 400 })
  }

  if (!file.type || !file.type.toLowerCase().startsWith('image/')) {
    return Response.json({ error: { message: 'ungueltiger dateityp (nur bilder)' } }, { status: 400 })
  }

  const maxBytes = 10 * 1024 * 1024
  if (file.size > maxBytes) {
    return Response.json({ error: { message: 'datei ist zu gross (max 10MB)' } }, { status: 400 })
  }

  const ext = safeExtension(file.name, file.type)
  const fileName = `cover_${Date.now()}_${crypto.randomUUID()}.${ext}`
  const coversDir = path.join(process.cwd(), 'public', 'covers')
  const targetPath = path.join(coversDir, fileName)

  await mkdir(coversDir, { recursive: true })
  const bytes = Buffer.from(await file.arrayBuffer())
  await writeFile(targetPath, bytes)

  return Response.json({ data: { file_name: fileName } }, { status: 201 })
}
