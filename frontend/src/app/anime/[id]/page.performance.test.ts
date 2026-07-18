import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const detailPageSource = () => readFileSync(join(process.cwd(), 'src/app/anime/[id]/page.tsx'), 'utf8')

describe('Anime-Detailseite Performance-Grenze', () => {
  it('blockiert das Server-Rendering nicht mehr auf dem Backdrop-Manifest', () => {
    const source = detailPageSource()

    expect(source).not.toMatch(/\bgetAnimeBackdrops\b/)
    expect(source).not.toContain('backdropResult')
    expect(source).toContain('<AnimeMediaProvider')
    expect(source).toContain('<AnimeBackdropRotator coverImage={anime.cover_image} />')
  })
})
