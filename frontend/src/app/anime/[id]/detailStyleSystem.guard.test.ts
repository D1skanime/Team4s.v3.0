import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const detailStyleFiles = [
  'page.module.css',
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
  // Deklaration (nicht bloß Referenz per var(...)) eines fremden, farbbenannten Override-Hooks
  // (z. B. --breadcrumb-link-color) direkt in der Seite -- Regressionsfund: der Guard prüfte
  // bislang nur Rohfarben, nicht CSS-Variablenzuweisungen. Layout-Hooks ohne "color" im Namen
  // (z. B. --card-public-hero-columns) bleiben erlaubt; Farbentscheidungen gehören als Prop/
  // Variante in den jeweiligen globalen Baustein, nicht als von außen gesetzte CSS-Variable.
  /--[\w-]*color[\w-]*\s*:/i,
]

describe('Anime-Detail: Design-System-Grenze', () => {
  it('hält Farben, Verläufe, Unschärfen, Schatten, Radien und fremde Farb-Override-Hooks aus den Seiten-Styles heraus', () => {
    const violations = detailStyleFiles.flatMap((file) => {
      const source = readFileSync(join(process.cwd(), 'src/app/anime/[id]', file), 'utf8')
      return forbiddenLocalDesign
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${file}: ${pattern}`)
    })

    expect(violations).toEqual([])
  })

  it('erfasst das historische Verstoßmuster (Beispiel-String), damit der Guard selbst nicht stillschweigend bricht', () => {
    const sample = '.breadcrumbsWrapper {\n  --breadcrumb-link-color: var(--scrim-icon);\n}'
    const violations = forbiddenLocalDesign.filter((pattern) => pattern.test(sample))
    expect(violations).toHaveLength(1)
  })

  it('lässt einen erlaubten Layout-Hook ohne "color" im Namen unangetastet (z. B. --card-public-hero-columns)', () => {
    const sample = '.heroContainer {\n  --card-public-hero-columns: var(--media-frame-poster-width) minmax(0, 1fr);\n}'
    const violations = forbiddenLocalDesign.filter((pattern) => pattern.test(sample))
    expect(violations).toEqual([])
  })
})
