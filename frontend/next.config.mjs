import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  LOCAL_IMAGE_PATTERNS,
  FIXED_REMOTE_IMAGE_URLS,
  configuredApiMediaPatterns,
} from './src/lib/images/publicImagePatterns.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 1080, 1480, 1920],
    imageSizes: [64, 96, 128, 160, 192, 256, 512],
    // 173-16 Task 0a: localPatterns/remotePatterns now come from the shared
    // `publicImagePatterns.mjs` data module -- the SAME data
    // `ResponsiveImage.tsx` reads to pre-check a `src` before next/image's own
    // SSR validation would throw E426/E231, instead of a second
    // hand-maintained allow-list drifting out of sync with this one.
    localPatterns: LOCAL_IMAGE_PATTERNS,
    remotePatterns: [
      ...FIXED_REMOTE_IMAGE_URLS.map((url) => new URL(url)),
      ...configuredApiMediaPatterns(process.env.NEXT_PUBLIC_API_URL),
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
    // 85 (D-02) is the quality floor the display variant is encoded at; the
    // 173-13/173-14/173-15 component-wiring plans pass quality={85} explicitly
    // on ResponsiveImage for display-sourced public images.
    qualities: [75, 85],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
}

export default nextConfig
