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
})
