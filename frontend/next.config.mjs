import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function configuredApiMediaPatterns() {
  const publicApiURL = (process.env.NEXT_PUBLIC_API_URL || '').trim()
  if (!publicApiURL) return []

  const mediaOrigin = new URL(publicApiURL)

  return [{
    protocol: mediaOrigin.protocol.slice(0, -1),
    hostname: mediaOrigin.hostname,
    port: mediaOrigin.port,
    pathname: '/api/v1/media/**',
  }]
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 1080, 1480, 1920],
    imageSizes: [64, 96, 128, 160, 192, 256, 512],
    localPatterns: [
      { pathname: '/__phase120-image-probe/alpha-badge.png', search: '' },
      { pathname: '/member-achievement-badges/**', search: '' },
      { pathname: '/covers/**', search: '' },
      // T-143-07-01: narrowed from a blanket /media/** wildcard to the explicit set of
      // legitimate namespaces the app actually serves (confirmed via a repo-wide grep of
      // backend PublicURL construction, 143-07-PLAN.md Task 2) -- /media/admin/** (or any
      // other future namespace) is deliberately excluded so it can never be optimized/served
      // through the public image endpoint.
      { pathname: '/media/anime/**', search: '' },
      { pathname: '/media/profile/**', search: '' },
      { pathname: '/media/release-version/**', search: '' },
    ],
    remotePatterns: [
      new URL('http://127.0.0.1:3101/api/v1/media/phase120-project-cover.png'),
      new URL('http://127.0.0.1:3101/api/v1/media/phase120-group-logo.png'),
      ...configuredApiMediaPatterns(),
    ],
    // The deterministic probe origin is loopback-only and still constrained
    // by the two exact URL patterns above.
    // Next.js itself documents dangerouslyAllowLocalIP as "not recommended for
    // most users" outside a controlled environment, so it is gated to
    // development/test and unreachable in any production deployment, EXCEPT
    // for the deliberately opt-in PHASE120_IMAGE_PROBE=1 harness (Phase 120/
    // 131/133/134's run-profile-image-probe.mjs), which always exercises the
    // real production runner image (NODE_ENV=production) against the same
    // two exact loopback remotePatterns above. A genuine production
    // deployment never sets PHASE120_IMAGE_PROBE, so this does not reopen the
    // local-IP surface outside the controlled probe harness (Phase 134-06
    // fix: the plain NODE_ENV gate broke this still-relied-upon harness for
    // its api-project/api-group URL classes).
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production' || process.env.PHASE120_IMAGE_PROBE === '1',
    // Explicit quality allow-list (75 is Next.js 16's own default when unset),
    // making the bound a config-level guarantee rather than an implicit default.
    qualities: [75],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
}

export default nextConfig
