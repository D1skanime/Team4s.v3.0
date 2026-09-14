import { resolveCoverFilePath } from '@/lib/server/coverFiles'
import { serveImageDisplay } from '@/lib/server/imageDisplay'

export const runtime = 'nodejs'

async function handler(request: Request, context: { params: Promise<{ file: string }> }): Promise<Response> {
  const { file } = await context.params
  const filePath = resolveCoverFilePath(file)
  if (!filePath) return new Response('not found', { status: 404 })
  return serveImageDisplay(request, { filePath })
}

export const GET = handler
export const HEAD = handler
