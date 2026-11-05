import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// Effekte (Blur/backdrop-filter/color-mix/Scrim-Transparenz) sind Zweck-Tokens in
// styles/tokens/effects.css, eingesetzt nur innerhalb von components/ui/*.module.css als benannte
// Variante -- ein zusammengesetzter Baustein oder eine Seite schreibt niemals selbst ein rohes
// filter:/backdrop-filter:/color-mix(/rgba(/hsla(-Literal. Dieser Waechter prueft NUR die acht
// bereits auf dieses Muster umgestellten zusammengesetzten Baustein-Dateien, nicht den gesamten
// Baum -- im uebrigen Frontend bestehen ca. 941 rohe Vorkommen in noch unberuehrten
// Seiten/Komponenten, deren repo-weite Migration ausdrueckliche Folgearbeit ist.
const guardedCompositeBlockFiles = [
  join(process.cwd(), 'src/app/anime/[id]/AnimeDetailHero.module.css'),
  join(process.cwd(), 'src/components/fansubs/ReleasePreviewRow.module.css'),
  join(process.cwd(), 'src/components/fansubs/FansubGroupPicker.module.css'),
  join(process.cwd(), 'src/components/fansubs/FansubVersionBrowser.module.css'),
  join(process.cwd(), 'src/components/anime/AnimeEdgeNavigation.module.css'),
  join(process.cwd(), 'src/components/ui/Stack.module.css'),
  join(process.cwd(), 'src/components/ui/Cluster.module.css'),
  join(process.cwd(), 'src/components/ui/SplitLayout.module.css'),
]

const forbiddenEffectLiteralPatterns = [
  /filter\s*:/i,
  /backdrop-filter\s*:/i,
  /color-mix\(/i,
  /rgba\(/i,
  /hsla\(/i,
]

describe('Anime-Detail/Fansub-Bausteine: keine rohen Effekt-Literale statt Zweck-Tokens', () => {
  it('verbietet rohe filter:/backdrop-filter:/color-mix(/rgba(/hsla(-Literale in den bereits umgestellten zusammengesetzten Baustein-Dateien', () => {
    const violations = guardedCompositeBlockFiles.flatMap((filePath) => {
      const source = readFileSync(filePath, 'utf8')
      return forbiddenEffectLiteralPatterns
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${filePath}: ${pattern}`)
    })

    expect(violations).toEqual([])
  })

  it('erfasst das historische Verstoßmuster (Beispiel-String), damit der Guard selbst nicht stillschweigend bricht', () => {
    const sample = '.foo { backdrop-filter: blur(4px); background: rgba(0,0,0,0.5); }'
    const violations = forbiddenEffectLiteralPatterns.filter((pattern) => pattern.test(sample))
    expect(violations.length).toBeGreaterThan(0)
  })
})
