import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { animeBackdropManifestFixture } from './animeFixtures'

const PUBLIC_DIR = path.resolve(process.cwd(), 'public')

describe('animeFixtures.ts', () => {
  it('verweist nicht mehr auf den nicht dekodierbaren /covers/placeholder.jpg (Commit 159-05)', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), '.storybook/mocks/animeFixtures.ts'), 'utf8')
    expect(source).not.toMatch(/placeholder\.jpg/)
  })

  it('liefert Backdrop-/Banner-/Logo-Pfade, die AnimeMediaProvider zu einer in Storybook tatsächlich erreichbaren Datei auflöst', () => {
    const { backdrops, banner_url: bannerUrl, logo_url: logoUrl } = animeBackdropManifestFixture.data
    for (const source of [...backdrops, bannerUrl, logoUrl]) {
      expect(source, `${source} muss unter /covers/ liegen`).toMatch(/^\/covers\//)
      const filename = source!.replace(/^\/covers\//, '')
      // resolveAnimeImageURL (animeBackdrops.ts) hängt /covers/-Pfade unter /covers/display/ um --
      // Storybook hat dafür keinen Next-Rewrite/Route-Handler, sondern liefert ausschließlich
      // statische Dateien aus public/ (staticDirs, .storybook/main.ts). Die Zieldatei muss daher
      // tatsächlich auf der Platte liegen.
      const displayPath = path.join(PUBLIC_DIR, 'covers', 'display', filename)
      expect(fs.existsSync(displayPath), `${displayPath} muss existieren, damit Storybook /covers/display/${filename} ausliefern kann`).toBe(true)
    }
  })
})
