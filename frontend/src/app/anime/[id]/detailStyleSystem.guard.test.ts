import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const detailStyleFiles = [
  'page.module.css',
  'page.poster.module.css',
  'page.infoCard.module.css',
  'page.episodes.module.css',
]

const forbiddenLocalDesign = [
  /#[0-9a-f]{3,8}\b/i,
  /rgba?\(/i,
  /color-mix\(/i,
  /linear-gradient\(/i,
  /(?:-webkit-)?backdrop-filter\s*:/i,
  /filter\s*:\s*blur\(/i,
  /box-shadow\s*:/i,
  /border-radius\s*:\s*(?!var\()/i,
]

describe('Anime-Detail: Design-System-Grenze', () => {
  it('hält Farben, Verläufe, Unschärfen, Schatten und Radien aus den Seiten-Styles heraus', () => {
    const violations = detailStyleFiles.flatMap((file) => {
      const source = readFileSync(join(process.cwd(), 'src/app/anime/[id]', file), 'utf8')
      return forbiddenLocalDesign
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${file}: ${pattern}`)
    })

    expect(violations).toEqual([])
  })
})
