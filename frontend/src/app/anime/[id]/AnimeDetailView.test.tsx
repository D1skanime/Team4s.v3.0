import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { AnimeBackdropRotator } from '@/components/anime/AnimeBackdropRotator'
import { BannerSection } from '@/components/ui'
import { resolveAnimeCoverURL } from '@/lib/animeBackdrops'

import { AnimeDetailView } from './AnimeDetailView'
import {
  buildAnimeDetailFixture,
  normalAnimeFansubsResponse,
  normalGroupedEpisodesResponse,
  normalRelationsResponse,
} from './AnimeDetailView.fixtures'

/** Materialisiert den React-Baum ohne vollen DOM-Render (dieselbe Technik wie page.test.tsx/
 *  page.performance.test.ts) -- AnimeDetailView komponiert mehrere Client-Bausteine mit eigener
 *  Datenbeschaffung (AnimeMediaProvider/AnimeBackdropRotator/WatchlistAddButton), ein echter
 *  render() bräuchte dafür denselben MSW-Mock-Aufwand wie Storybook. */
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Record<string, unknown>>(child)) return []
    return [child, ...elements(child.props.children as ReactNode)]
  })
}

describe('AnimeDetailView', () => {
  it('löst ein fehlendes Cover (coverUrl="") über den kanonischen Platzhalter-Resolver auf, nicht über den verworfenen /covers/placeholder.jpg-Literal', () => {
    // Exakt dieselben Props wie die Storybook-Story "Fehlendes Cover" (AnimeDetailView.
    // stories.tsx) -- der Pflichtfall "fehlende Bilder" wird hier direkt an der Komponente
    // selbst geprüft, nicht nur in Story-/Fixture-Dateien (Regressionsfund: die Komponente
    // hatte weiterhin ihr eigenes, nicht dekodierbares /covers/placeholder.jpg-Literal als
    // Fallback).
    const content = AnimeDetailView({
      anime: buildAnimeDetailFixture({ cover_image: '' }),
      breadcrumbItems: [{ label: 'Anime', href: '/anime' }],
      gridQuery: '',
      embySeriesUrl: null,
      animeFansubsResponse: normalAnimeFansubsResponse,
      groupedEpisodesResponse: normalGroupedEpisodesResponse,
      fansubStoryGroups: [],
      relationsResponse: normalRelationsResponse,
      episodeCount: 0,
      coverUrl: '',
      previous: null,
      next: null,
    })

    const all = elements(content)
    const banner = all.find((item) => item.type === BannerSection)
    const rotator = all.find((item) => item.type === AnimeBackdropRotator)

    const expected = resolveAnimeCoverURL('')
    // Vollständigkeitsnachweis: die erwartete URL ist tatsächlich die begrenzte, in Storybook
    // erreichbare Auslieferungs-Route des dekodierbaren PNG-Platzhalters (siehe
    // animeFixtures.test.ts für den statischen-Datei-Nachweis), nicht mehr .jpg.
    expect(expected).toBe('/covers/display/placeholder.png?display_width=512')

    expect(banner?.props.imageUrl).toBe(expected)
    expect(rotator?.props.fallbackImageURL).toBe(expected)
  })
})
