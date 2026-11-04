import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// Stack/Cluster-gap und SplitLayout-firstColumnWidth nehmen ausschliesslich benannte
// Zweck-Werte entgegen, nie eine rohe Space-Skalenstufe ("gap=2") oder einen freien
// CSS-Laengen-String ("firstColumnWidth='200px'") -- konsistent mit jedem anderen Design-Token
// dieses Projekts. Dieser Waechter prueft NUR die vier bereits auf Zweck-Werte umgestellten
// Aufrufstellen-Dateien im Anime-Detail-/Fansub-Bereich, nicht den gesamten Baum -- andere,
// davon unberuehrte Stack/Cluster/SplitLayout-Aufrufstellen im uebrigen Code sind nicht Teil
// dieser Pruefung.
const guardedCallSiteFiles = [
  join(process.cwd(), 'src/app/anime/[id]/AnimeDetailHero.tsx'),
  join(process.cwd(), 'src/components/fansubs/FansubGroupPicker.tsx'),
  join(process.cwd(), 'src/components/fansubs/FansubVersionBrowser.tsx'),
  join(process.cwd(), 'src/components/fansubs/ReleasePreviewRow.tsx'),
  join(process.cwd(), 'src/components/fansubs/EpisodeGlassCard.tsx'),
  join(process.cwd(), 'src/components/anime/AnimeEdgeNavigation.tsx'),
]

const forbiddenRawValuePatterns = [
  /gap="[1-9]"/,
  /firstColumnWidth="(?!poster"|auto")/,
]

describe('Anime-Detail/Fansub-Bausteine: Zweck-Namen statt Groessen-/Nummernnamen fuer gap/firstColumnWidth', () => {
  it('verbietet rohe gap="N"-Werte und freie firstColumnWidth-Strings in den bereits umgestellten Aufrufstellen', () => {
    const violations = guardedCallSiteFiles.flatMap((filePath) => {
      const source = readFileSync(filePath, 'utf8')
      return forbiddenRawValuePatterns
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${filePath}: ${pattern}`)
    })

    expect(violations).toEqual([])
  })

  it('erfasst das historische Verstoßmuster (Beispiel-Strings), damit der Guard selbst nicht stillschweigend bricht', () => {
    const rawGapSample = '<Stack gap="3">'
    const rawFirstColumnWidthSample = '<SplitLayout firstColumnWidth="200px">'

    expect(forbiddenRawValuePatterns.some((pattern) => pattern.test(rawGapSample))).toBe(true)
    expect(forbiddenRawValuePatterns.some((pattern) => pattern.test(rawFirstColumnWidthSample))).toBe(true)

    // Positiv-Gegenprobe: die erlaubten Zweck-Werte duerfen NICHT als Verstoss erkannt werden.
    const allowedSample = '<Stack gap="section"><SplitLayout firstColumnWidth="poster"><SplitLayout firstColumnWidth="auto"><SplitLayout gap="none">'
    expect(forbiddenRawValuePatterns.some((pattern) => pattern.test(allowedSample))).toBe(false)
  })
})
