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
      { pathname: '/media/profile/**', search: '' },
      { pathname: '/media/release-version/**', search: '' },
      { pathname: '/media/anime/**', search: '' },
    ],
    remotePatterns: [
      new URL('http://127.0.0.1:3101/api/v1/media/phase120-project-cover.png'),
      new URL('http://127.0.0.1:3101/api/v1/media/phase120-group-logo.png'),
      ...configuredApiMediaPatterns(),
    ],
    // The deterministic probe origin is loopback-only and still constrained
    // by the two exact URL patterns above.
    dangerouslyAllowLocalIP: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
}

export default nextConfig
