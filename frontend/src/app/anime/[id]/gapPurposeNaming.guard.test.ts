import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// Stack/Cluster-gap und SplitLayout-firstColumnWidth nehmen ausschließlich benannte
// Zweck-Werte entgegen, nie eine rohe Space-Skalenstufe ("gap=2") oder einen freien
// CSS-Längen-String ("firstColumnWidth='200px'") -- konsistent mit jedem anderen Design-Token
// dieses Projekts. Dieser Wächter prüft NUR die bereits auf Zweck-Werte umgestellten
// Aufrufstellen-Dateien im Anime-Detail-/Fansub-Bereich (Stand Runde 5: acht Dateien), nicht den
// gesamten Baum -- andere, davon unberührte Stack/Cluster/SplitLayout-Aufrufstellen im übrigen
// Code sind nicht Teil dieser Prüfung.
const guardedCallSiteFiles = [
  join(process.cwd(), 'src/app/anime/[id]/AnimeDetailHero.tsx'),
  join(process.cwd(), 'src/app/anime/[id]/AnimeEpisodesSection.tsx'),
  join(process.cwd(), 'src/components/fansubs/FansubGroupPicker.tsx'),
  join(process.cwd(), 'src/components/fansubs/FansubGroupContext.tsx'),
  join(process.cwd(), 'src/components/fansubs/FansubVersionBrowser.tsx'),
  join(process.cwd(), 'src/components/fansubs/ReleasePreviewRow.tsx'),
  join(process.cwd(), 'src/components/fansubs/EpisodeGlassCard.tsx'),
  join(process.cwd(), 'src/components/anime/AnimeEdgeNavigation.tsx'),
]

// Seit Review-Befund 2 (Phase 192, vierte Gap-Closure-Runde) gilt dieselbe Zweck-statt-Groesse-
// Regel auch fuer Cards padding-Prop -- eine rohe Space-Skalenstufe ("padding=3") ist an diesen
// bereits umgestellten Aufrufstellen genauso verboten wie ein rohes gap="N".
const forbiddenRawValuePatterns = [
  /gap="[1-9]"/,
  /firstColumnWidth="(?!poster"|auto")/,
  /padding="[1-9]"/,
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
    const rawCardPaddingSample = '<Card variant="nested" padding="4">'

    expect(forbiddenRawValuePatterns.some((pattern) => pattern.test(rawGapSample))).toBe(true)
    expect(forbiddenRawValuePatterns.some((pattern) => pattern.test(rawFirstColumnWidthSample))).toBe(true)
    expect(forbiddenRawValuePatterns.some((pattern) => pattern.test(rawCardPaddingSample))).toBe(true)

    // Positiv-Gegenprobe: die erlaubten Zweck-Werte duerfen NICHT als Verstoss erkannt werden.
    const allowedSample = '<Stack gap="independentBlocks"><SplitLayout firstColumnWidth="poster"><SplitLayout firstColumnWidth="auto"><SplitLayout gap="none"><Card padding="content"><Card padding="nestedBlock"><Card padding="dividedSection"><Card padding="none"><Card padding="section"><Card padding="contextCard">'
    expect(forbiddenRawValuePatterns.some((pattern) => pattern.test(allowedSample))).toBe(false)
  })
})
