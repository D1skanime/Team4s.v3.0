import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const MEMBER_PATH = /^\/members\/([^/]+)(\/.*)?$/
const STORED_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UNSAFE_PATH_CHARACTER = /[\/\\\u0000-\u001f\u007f]/

function canonicalMemberSlug(encodedSegment: string): string | null {
  let decodedSegment: string
  try {
    decodedSegment = decodeURIComponent(encodedSegment)
  } catch {
    return null
  }

  const trimmedSegment = decodedSegment.trim()
  if (UNSAFE_PATH_CHARACTER.test(trimmedSegment)) return null

  const canonicalSlug = trimmedSegment.toLowerCase()
  if (
    canonicalSlug.length === 0
    || canonicalSlug.length > 512
    || /^\d+$/.test(canonicalSlug)
    || !STORED_SLUG.test(canonicalSlug)
  ) {
    return null
  }

  return canonicalSlug
}

export function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(MEMBER_PATH)
  if (!match) return NextResponse.next()

  const canonicalSlug = canonicalMemberSlug(match[1])
  if (!canonicalSlug) return NextResponse.next()

  const canonicalPath = `/members/${encodeURIComponent(canonicalSlug)}${match[2] ?? ''}`
  if (request.nextUrl.pathname === canonicalPath) return NextResponse.next()

  const destination = request.nextUrl.clone()
  destination.pathname = canonicalPath
  return NextResponse.redirect(destination, 308)
}

export const config = {
  matcher: '/members/:path*',
}
