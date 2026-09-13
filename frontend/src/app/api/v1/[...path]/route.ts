import { proxyBackendApiRequest } from '@/lib/server/apiProxy'

import { IMAGE_DISPLAY_QUERY } from '@/lib/imageDisplayContract'
import { serveImageDisplay } from '@/lib/server/imageDisplay'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ path?: string[] }>
}

async function handler(request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params
  const segments = params.path || []
  const url = new URL(request.url)
  if (['GET', 'HEAD'].includes(request.method) && segments.length === 3 &&
      segments[0] === 'media' && segments[1] === 'files' && url.searchParams.has(IMAGE_DISPLAY_QUERY)) {
    const filename = segments[2]
    if (filename.length > 200 || filename.includes('..') || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return new Response('not found', { status: 404 })
    }
    url.searchParams.delete(IMAGE_DISPLAY_QUERY)
    const headers = new Headers(request.headers)
    for (const key of [...headers.keys()]) {
      if (key.toLowerCase() === 'range' || key.toLowerCase().startsWith('if-')) headers.delete(key)
    }
    return serveImageDisplay(request, {
      load: (signal) => proxyBackendApiRequest(new Request(url, { method: 'GET', headers, signal }), segments),
    })
  }
  return proxyBackendApiRequest(request, segments)
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
export const HEAD = handler
