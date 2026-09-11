import { describe, expect, it } from 'vitest'

import { buildFansubProjectNavigation } from './fansubProjectNavigation'
import type { PublicFansubProject } from '@/types/fansub'

function project(overrides: Partial<PublicFansubProject>): PublicFansubProject {
  return {
    id: 1,
    anime_slug: 'fallback',
    title: 'Fallback',
    type: 'TV',
    status: 'ongoing',
    ...overrides,
  }
}

describe('buildFansubProjectNavigation', () => {
  it('navigiert nur innerhalb der aktuellen Fansub-Projektliste', () => {
    const result = buildFansubProjectNavigation({
      currentAnimeID: 13,
      currentAnimeSlug: 'vipers-creed',
      currentFansubGroupID: 1,
      currentFansubSlug: 'c-subs',
      projects: [
        project({ id: 44, anime_slug: 'another', title: 'Another' }),
        project({ id: 13, anime_slug: 'vipers-creed', title: "Viper's Creed" }),
        project({ id: 99, anime_slug: 'zeta', title: 'Zeta' }),
      ],
    })

    expect(result.previous?.href).toBe('/fansubs/c-subs/fansubprojekt/another')
    expect(result.next?.href).toBe('/fansubs/c-subs/fansubprojekt/zeta')
  })

  it("nimmt Honto / Viper's Creed nicht als weiteres C-Subs-Projekt", () => {
    const result = buildFansubProjectNavigation({
      currentAnimeID: 13,
      currentAnimeSlug: 'vipers-creed',
      currentFansubGroupID: 1,
      currentFansubSlug: 'c-subs',
      projects: [project({ id: 13, anime_slug: 'vipers-creed', title: "Viper's Creed" })],
    })

    expect(result.previous).toBeNull()
    expect(result.next).toBeNull()
  })

  it('sortiert deterministisch nach deutschem Titel und ID-Tie-Breaker', () => {
    const result = buildFansubProjectNavigation({
      currentAnimeID: 20,
      currentAnimeSlug: 'beta-two',
      currentFansubGroupID: 1,
      currentFansubSlug: 'c-subs',
      projects: [
        project({ id: 30, anime_slug: 'zeta', title: 'Zeta' }),
        project({ id: 20, anime_slug: 'beta-two', title: 'Beta' }),
        project({ id: 10, anime_slug: 'beta-one', title: 'Beta' }),
      ],
    })

    expect(result.previous?.href).toBe('/fansubs/c-subs/fansubprojekt/beta-one')
    expect(result.next?.href).toBe('/fansubs/c-subs/fansubprojekt/zeta')
  })

  it('Previous Project am Listenanfang: previous ist null, next zeigt auf das zweite Projekt', () => {
    const result = buildFansubProjectNavigation({
      currentAnimeID: 1,
      currentAnimeSlug: 'alpha',
      currentFansubGroupID: 1,
      currentFansubSlug: 'c-subs',
      projects: [
        project({ id: 1, anime_slug: 'alpha', title: 'Alpha' }),
        project({ id: 2, anime_slug: 'mitte', title: 'Mitte' }),
        project({ id: 3, anime_slug: 'omega', title: 'Omega' }),
      ],
    })

    expect(result.previous).toBeNull()
    expect(result.next).not.toBeNull()
    expect(result.next?.href).toBe('/fansubs/c-subs/fansubprojekt/mitte')
  })

  it('Next Project am Listenende: next ist null, previous zeigt auf das vorletzte Projekt', () => {
    const result = buildFansubProjectNavigation({
      currentAnimeID: 3,
      currentAnimeSlug: 'omega',
      currentFansubGroupID: 1,
      currentFansubSlug: 'c-subs',
      projects: [
        project({ id: 1, anime_slug: 'alpha', title: 'Alpha' }),
        project({ id: 2, anime_slug: 'mitte', title: 'Mitte' }),
        project({ id: 3, anime_slug: 'omega', title: 'Omega' }),
      ],
    })

    expect(result.next).toBeNull()
    expect(result.previous).not.toBeNull()
    expect(result.previous?.href).toBe('/fansubs/c-subs/fansubprojekt/mitte')
  })

  it('ordnet Umlaute nach deutscher localeCompare-Basissensitivitaet, nicht nach UTF-16-Codepoint', () => {
    // Diese drei Titel unterscheiden sich gezielt durch ein fuehrendes akzentuiertes
    // Zeichen: rohe UTF-16-Codepoint-Ordnung wuerde "Z" vor "Ä" einsortieren, weil "Ä"
    // (U+00C4) einen hoeheren Codepoint als "Z" (U+005A) hat. Der Comparator muss das
    // deutsche localeCompare-Verhalten abbilden, nicht die rohe Codepoint-Ordnung.
    const titleToSlug: Record<string, string> = {
      Änderung: 'aenderung',
      Zeta: 'zeta',
      Zwiebel: 'zwiebel',
    }
    const titles = ['Änderung', 'Zeta', 'Zwiebel']
    // Berechnet die tatsaechliche, in dieser Umgebung ausgefuehrte localeCompare-Reihenfolge,
    // statt eine angenommene Reihenfolge hart zu kodieren.
    const expectedOrder = [...titles].sort((a, b) =>
      a.localeCompare(b, 'de', { sensitivity: 'base' }),
    )
    const currentTitle = 'Zeta'
    const currentIndex = expectedOrder.indexOf(currentTitle)
    const expectedPreviousTitle = currentIndex > 0 ? expectedOrder[currentIndex - 1] : null
    const expectedNextTitle =
      currentIndex < expectedOrder.length - 1 ? expectedOrder[currentIndex + 1] : null

    const result = buildFansubProjectNavigation({
      currentAnimeID: 2,
      currentAnimeSlug: titleToSlug[currentTitle],
      currentFansubGroupID: 1,
      currentFansubSlug: 'c-subs',
      projects: [
        project({ id: 1, anime_slug: titleToSlug.Änderung, title: 'Änderung' }),
        project({ id: 2, anime_slug: titleToSlug.Zeta, title: 'Zeta' }),
        project({ id: 3, anime_slug: titleToSlug.Zwiebel, title: 'Zwiebel' }),
      ],
    })

    expect(result.previous?.href ?? null).toBe(
      expectedPreviousTitle ? `/fansubs/c-subs/fansubprojekt/${titleToSlug[expectedPreviousTitle]}` : null,
    )
    expect(result.next?.href ?? null).toBe(
      expectedNextTitle ? `/fansubs/c-subs/fansubprojekt/${titleToSlug[expectedNextTitle]}` : null,
    )
    // "Änderung" muss vor "Zeta" UND vor "Zwiebel" stehen, sonst wuerde die rohe
    // Codepoint-Ordnung ("Z" < "Ä") durchschlagen.
    expect(expectedOrder[0]).toBe('Änderung')
  })
})
