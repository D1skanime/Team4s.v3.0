// @vitest-environment jsdom
import fs from 'node:fs'
import path from 'node:path'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAnimeList } from '@/lib/api'
import { buildAnimeDetailHref, buildAnimeGridQuery } from '@/lib/animeGridContext'
import type { AnimeNeighbors } from '@/lib/animeGridContext'
import { Card, ResponsiveImage, type AdjacentNavigationItem } from '@/components/ui'
import type { AnimeListItem, PaginatedAnimeResponse } from '@/types/anime'

import { AnimeEdgeNavigation, AnimeEdgeNavigationPreviewCard } from './AnimeEdgeNavigation'
import { useAnimeEdgeNavigationHover } from './useAnimeEdgeNavigationHover'

/** Materialisiert den von `AnimeEdgeNavigationPreviewCard` zurückgegebenen Element-Baum ohne
 *  DOM-Render (dieselbe Technik wie `AnimeDetailView.test.tsx`) -- die Komponente ist hookfrei,
 *  ein direkter Funktionsaufruf reicht deshalb aus, um ihre Grundbaustein-Props nachzuweisen. */
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Record<string, unknown>>(child)) return []
    return [child, ...elements(child.props.children as ReactNode)]
  })
}

vi.mock('@/lib/api', () => ({ getAnimeList: vi.fn() }))

const filters = { per_page: 2, q: 'Ein Titel', letter: 'E', content_type: 'anime' as const, status: 'done' as const }
const query = (page: number) => buildAnimeGridQuery({ ...filters, page })
const item = (id: number): AnimeListItem => ({ id, title: `Anime ${id}`, type: 'tv', status: 'done' })
function response(page: number, ids = [page * 2 - 1, page * 2]): PaginatedAnimeResponse {
  return { data: ids.map(item), meta: { page, per_page: 2, total: 6, total_pages: 3 } }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => { resolve = yes })
  return { promise, resolve }
}
/** Baut das serverseitig aufgelöste Navigations-Item, wie es `page.tsx` liefert --
 *  die Tests übergeben es direkt als Prop, statt es aus einem gemockten Fetch zu erwarten. */
function navItem(targetID: number, page: number, direction: 'prev' | 'next'): AdjacentNavigationItem {
  const isPrevious = direction === 'prev'
  return {
    href: buildAnimeDetailHref(targetID, query(page)),
    label: isPrevious ? 'Zurück' : 'Weiter',
    ariaLabel: `${isPrevious ? 'Vorheriger' : 'Nächster'} Anime: Anime ${targetID}`,
  }
}

beforeEach(() => {
  vi.mocked(getAnimeList).mockReset().mockImplementation(async (params) => response(params.page ?? 1))
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('AnimeEdgeNavigation', () => {
  it('rendert die vom Server übergebenen Grid-Ziel-URLs synchron, ohne auf den Vorschau-Fetch zu warten', async () => {
    render(
      <AnimeEdgeNavigation
        currentAnimeID={3}
        gridQuery={query(2)}
        previous={navItem(2, 1, 'prev')}
        next={navItem(4, 2, 'next')}
      />,
    )

    // Die hrefs stehen bereits VOR dem ersten Flush der Vorschau-Fetch-Promise bereit -- kein
    // waitFor()/act() nötig, um sie zu lesen.
    expect(screen.getByRole('link', { name: 'Vorheriger Anime: Anime 2' }).getAttribute('href'))
      .toBe(buildAnimeDetailHref(2, query(1)))
    expect(screen.getByRole('link', { name: 'Nächster Anime: Anime 4' }).getAttribute('href'))
      .toBe(buildAnimeDetailHref(4, query(2)))

    // Den noch laufenden, hier nicht relevanten Vorschau-Fetch sauber abschließen lassen, damit
    // sein State-Update nicht erst beim nächsten Test als act()-Warnung auftaucht.
    await waitFor(() => expect(getAnimeList).toHaveBeenCalled())
  })

  it('wechselt die Vorschau abhängig von der gehoverten/fokussierten Richtung (direkter Hook-Aufruf statt simulierter Maus-/Fokus-Ereignisse)', () => {
    // Die Hover-/Fokus-Vorschauzustandslogik lebt in useAnimeEdgeNavigationHover
    // (ausgelagert aus AnimeEdgeNavigationContext) -- derselbe Zustandsautomat, den die echte
    // Vorschaukarte im Browser treibt, wird hier direkt per renderHook aufgerufen, ohne
    // DOM-Rendering oder simulierte Maus-/Fokus-Ereignisse.
    const neighbors: AnimeNeighbors = {
      prev: { anime: item(2), page: 1 },
      next: { anime: item(4), page: 2 },
    }
    const { result } = renderHook(() => useAnimeEdgeNavigationHover(neighbors))

    expect(result.current.hoverDirection).toBeNull()
    expect(result.current.previewAnime).toBeNull()

    act(() => result.current.handlersFor('next').onMouseEnter())
    expect(result.current.hoverDirection).toBe('next')
    expect(result.current.previewAnime?.title).toBe('Anime 4')

    act(() => result.current.handlersFor('next').onMouseLeave())
    expect(result.current.hoverDirection).toBeNull()
    expect(result.current.previewAnime).toBeNull()
  })

  it('rendert am äußeren Rand keinen erfundenen Link, wenn der Server bereits null liefert', async () => {
    render(<AnimeEdgeNavigation currentAnimeID={1} gridQuery={query(1)} previous={null} next={navItem(2, 1, 'next')} />)
    expect(screen.queryByRole('link', { name: /Vorheriger Anime/ })).toBeNull()
    expect(screen.getByRole('link', { name: /Nächster Anime/ })).toBeTruthy()
    await waitFor(() => expect(getAnimeList).toHaveBeenCalled())
  })

  it('bricht einen noch laufenden Vorschau-Vorabladevorgang beim Entfernen ab', async () => {
    const pending = deferred<PaginatedAnimeResponse>()
    vi.mocked(getAnimeList).mockReturnValueOnce(pending.promise)
    const { unmount } = render(
      <AnimeEdgeNavigation
        currentAnimeID={3}
        gridQuery={query(2)}
        previous={navItem(2, 1, 'prev')}
        next={navItem(4, 2, 'next')}
      />,
    )
    await waitFor(() => expect(getAnimeList).toHaveBeenCalledOnce())
    const signal = vi.mocked(getAnimeList).mock.calls[0][1]?.signal

    unmount()
    expect(signal?.aborted).toBe(true)
    await act(async () => pending.resolve(response(2)))
  })
})

describe('AnimeEdgeNavigation.module.css', () => {
  it('positioniert die Vorschaukarte direkt unterhalb des Buttons (top:100% des button-hohen Overlays), nicht vertikal zur ganzen Hero-Karte', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/anime/AnimeEdgeNavigation.module.css'), 'utf8')
    // .edgeNavigationOverlay (page.infoCard.module.css) ist bewusst auf Button-Höhe begrenzt
    // (--control-height-md), nicht auf die volle (ggf. sehr hohe) Hero-Karte -- top:100% landet
    // dadurch exakt am unteren Rand des Buttons.
    const previewCardRule = css.match(/\.previewCard\s*\{([^}]+)\}/)?.[1]
    expect(previewCardRule, '.previewCard must exist').toBeTruthy()
    expect(previewCardRule).toMatch(/top:\s*calc\(100% \+ var\(--space-2\)\);/)
  })

  /*
   * .previewCovers Rundung kommt aus ResponsiveImages roundedThumbnail-Prop, .previewCards
   * Hoechstbreite aus Cards widthPurpose="compactPreview" -- beide Werte duerfen hier nicht
   * mehr lokal stehen, sonst laufen sie der Grundbaustein-Faehigkeit zuwider.
   */
  it('.previewCover deklariert keine eigene border-radius mehr, .previewCard keine eigene width mehr', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/anime/AnimeEdgeNavigation.module.css'), 'utf8')
    const previewCoverRule = css.match(/\.previewCover\s*\{([^}]+)\}/)?.[1]
    expect(previewCoverRule, '.previewCover must exist').toBeTruthy()
    expect(previewCoverRule).not.toMatch(/border-radius\s*:/)
    expect(previewCoverRule).not.toMatch(/object-fit\s*:/)

    const previewCardRule = css.match(/\.previewCard\s*\{([^}]+)\}/)?.[1]
    expect(previewCardRule, '.previewCard must exist').toBeTruthy()
    expect(previewCardRule).not.toMatch(/\bwidth\s*:/)
  })
})

describe('AnimeEdgeNavigationPreviewCard', () => {
  it('trägt ResponsiveImages roundedThumbnail-Klasse und Cards compactPreview-Breiten-Zweck (direkter Funktionsaufruf statt simuliertem Hover-Ereignis)', () => {
    const tree = AnimeEdgeNavigationPreviewCard({
      title: 'Anime 4',
      type: 'tv',
      coverUrl: '/covers/anime-4.jpg',
      direction: 'next',
    })
    const all = elements(tree)

    const image = all.find((el) => el.type === ResponsiveImage)
    expect(image?.props.roundedThumbnail).toBe(true)

    const card = all.find((el) => el.type === Card)
    expect(card?.props.widthPurpose).toBe('compactPreview')
  })
})
