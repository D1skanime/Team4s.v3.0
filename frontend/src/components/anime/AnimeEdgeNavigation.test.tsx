// @vitest-environment jsdom
import fs from 'node:fs'
import path from 'node:path'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAnimeList } from '@/lib/api'
import { buildAnimeDetailHref, buildAnimeGridQuery } from '@/lib/animeGridContext'
import type { AnimeListItem, PaginatedAnimeResponse } from '@/types/anime'

import { AnimeEdgeNavigation } from './AnimeEdgeNavigation'

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

beforeEach(() => {
  vi.mocked(getAnimeList).mockReset().mockImplementation(async (params) => response(params.page ?? 1))
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('AnimeEdgeNavigation', () => {
  it('lädt Nachbarn vorab und rendert die neutrale AdjacentNavigation mit den Grid-Ziel-URLs', async () => {
    render(<AnimeEdgeNavigation currentAnimeID={3} gridQuery={query(2)} />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Vorheriger Anime: Anime 2' }).getAttribute('href'))
        .toBe(buildAnimeDetailHref(2, query(1)))
      expect(screen.getByRole('link', { name: 'Nächster Anime: Anime 4' }).getAttribute('href'))
        .toBe(buildAnimeDetailHref(4, query(2)))
    })
    expect(getAnimeList).toHaveBeenCalledTimes(2)
    for (const [params] of vi.mocked(getAnimeList).mock.calls) expect(params).toMatchObject(filters)
  })

  it('zeigt die Vorschaukarte erst bei Hover oder Fokus des vorab geladenen Links', async () => {
    render(<AnimeEdgeNavigation currentAnimeID={3} gridQuery={query(2)} />)
    const next = await screen.findByRole('link', { name: 'Nächster Anime: Anime 4' })

    expect(screen.queryByText('TV')).toBeNull()
    fireEvent.mouseEnter(next)
    expect(screen.getByText('Anime 4')).toBeTruthy()
    expect(screen.getByText('TV')).toBeTruthy()
    fireEvent.mouseLeave(next)
    expect(screen.queryByText('TV')).toBeNull()
  })

  it.each([[1, 1, 'Vorheriger Anime'], [6, 3, 'Nächster Anime']] as const)('rendert am äußeren Rand keinen erfundenen %s-Link', async (id, page, direction) => {
    render(<AnimeEdgeNavigation currentAnimeID={id} gridQuery={query(page)} />)
    await waitFor(() => expect(getAnimeList).toHaveBeenCalled())
    expect(screen.queryByRole('link', { name: new RegExp(direction) })).toBeNull()
  })

  it('bricht einen noch laufenden Vorabladevorgang beim Entfernen ab', async () => {
    const pending = deferred<PaginatedAnimeResponse>()
    vi.mocked(getAnimeList).mockReturnValueOnce(pending.promise)
    const { unmount } = render(<AnimeEdgeNavigation currentAnimeID={3} gridQuery={query(2)} />)
    await waitFor(() => expect(getAnimeList).toHaveBeenCalledOnce())
    const signal = vi.mocked(getAnimeList).mock.calls[0][1]?.signal

    unmount()
    expect(signal?.aborted).toBe(true)
    await act(async () => pending.resolve(response(2)))
  })
})

describe('AnimeEdgeNavigation.module.css', () => {
  it('positioniert die Vorschaukarte relativ zur Button-Mitte (50% + halbe Button-Höhe + Abstand), nicht relativ zu top:100% des Overlays', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/anime/AnimeEdgeNavigation.module.css'), 'utf8')
    // top:100% ginge faelschlich davon aus, dass der positionierte Vorfahre (.edgeNavigationOverlay)
    // nur so hoch wie der Button selbst ist -- seit dessen inset:0-Korrektur (Regressionsfund) spannt
    // er die volle Hero-Hoehe auf, die Vorschaukarte muss deshalb ab der Button-MITTE rechnen.
    const previewCardRule = css.match(/\.previewCard\s*\{([^}]+)\}/)?.[1]
    expect(previewCardRule, '.previewCard must exist').toBeTruthy()
    expect(previewCardRule).toMatch(/top:\s*calc\(50% \+ \(var\(--control-height-md\) \/ 2\) \+ var\(--space-2\)\);/)
    expect(previewCardRule).not.toMatch(/top:\s*calc\(100%/)
  })
})
