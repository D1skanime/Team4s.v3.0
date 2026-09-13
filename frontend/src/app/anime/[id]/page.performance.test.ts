import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const detailPageSource = () => readFileSync(join(process.cwd(), 'src/app/anime/[id]/page.tsx'), 'utf8')

describe('Anime-Detailseite Performance-Grenze', () => {
  it('blockiert das Server-Rendering nicht mehr auf dem Backdrop-Manifest', () => {
    const source = detailPageSource()

    expect(source).not.toMatch(/\bgetAnimeBackdrops\b/)
    expect(source).toMatch(/<AnimeMediaProvider\b/)
    expect(source).toMatch(/<AnimeBackdropRotator\b/)
  })

  it('keeps viewer auth and extra link-resolution fetches outside the public server page', () => {
    const source = detailPageSource()
    expect(source).not.toMatch(/\b(cookies|AUTH_BEARER_TOKEN|AUTH_TOKEN_COOKIE_NAME|getWatchlistEntry|getWatchlistStatus)\b/)
    expect(source).not.toMatch(/\b(getGroupDetail|getPublicFansubProfileBySlug|resolveFansubProject)\b/)
  })
})
