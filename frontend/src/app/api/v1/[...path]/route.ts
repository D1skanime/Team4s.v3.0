import { proxyBackendApiRequest } from '@/lib/server/apiProxy'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params:
    | {
        path?: string[]
      }
    | Promise<{
        path?: string[]
      }>
}

async function handler(request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params
  return proxyBackendApiRequest(request, params.path || [])
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
export const HEAD = handler
