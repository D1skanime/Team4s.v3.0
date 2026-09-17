// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getGroupedEpisodes } from '@/lib/api'

vi.mock('@/lib/api', () => ({ getGroupedEpisodes: vi.fn() }))

import type { PublicGroupedEpisode, PublicGroupedEpisodesResponse, PublicGroupedEpisodesOptions, PublicEpisodeVersion } from '@/types/episodeVersion'
import type { AnimeFansubRelation } from '@/types/fansub'
import { FansubVersionBrowser } from './FansubVersionBrowser'

const groupedMock = vi.mocked(getGroupedEpisodes as (animeID: number, options: PublicGroupedEpisodesOptions) => Promise<PublicGroupedEpisodesResponse>)

/**
 * D-07..D-10 und Pflichtfall G (Gruppenwechsel-Refetch: Dimmung, Abbruch, Fehler,
 * Anti-Vermischung). Eigene Datei, kein Anhang an FansubVersionBrowser.test.tsx
 * (dessen Datei ist bereits bei 364/450 Zeilen -- CLAUDE.md-Limit).
 *
 * Minimaler Fixture-Satz, bewusst lokal dupliziert (nicht importiert) aus
 * FansubVersionBrowser.test.tsx, damit beide Dateien unabhaengig voneinander
 * bleiben. Alle Faelle hier sind RED (Plan 163-03): die aktuelle Komponente
 * loest bei einem Chip-Klick/popstate ueberhaupt keinen Fetch aus.
 */
const fansubs: AnimeFansubRelation[] = [
  { anime_id: 22, fansub_group_id: 7, is_primary: true, created_at: '', fansub_group: { id: 7, slug: 'saved-primary', name: 'AnimeOwnage' } },
  { anime_id: 22, fansub_group_id: 9, is_primary: false, created_at: '', fansub_group: { id: 9, slug: 'saved-secondary', name: 'ProjectMessiah' } },
]
// Pflichtfall G braucht eine dritte, distinkte Gruppe fuer den echten Alle->AO->PM->Alle-Zyklus.
const threeFansubs: AnimeFansubRelation[] = [
  ...fansubs,
  { anime_id: 22, fansub_group_id: 11, is_primary: false, created_at: '', fansub_group: { id: 11, slug: 'saved-third', name: 'DrittGruppe' } },
]

function variant(id: number, group: number, relations: AnimeFansubRelation[] = fansubs): PublicEpisodeVersion {
  return {
    id, variant_id: id, release_version_id: id + 100, anime_id: 22, episode_number: 1,
    title: `Variante ${group}`,
    fansub_groups: [relations.find((relation) => relation.fansub_group?.id === group)!.fansub_group!],
  }
}
const ended: PublicGroupedEpisodesResponse['data']['pagination'] = { has_more: false, next_cursor: null, row_limit: 24 }
function publicPage(episodes: PublicGroupedEpisode[]): PublicGroupedEpisodesResponse {
  return { data: { anime_id: 22, episodes, episode_count: episodes.length, pagination: ended } }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const initialEpisode: PublicGroupedEpisode = {
  episode_id: 50, episode_number: 1, episode_title: 'Erste Folge', version_count: 1, versions: [variant(10, 7)],
}

beforeEach(() => {
  groupedMock.mockReset()
  window.history.pushState(null, '', '/')
})
afterEach(async () => { await act(async () => {}); cleanup(); vi.restoreAllMocks() })

describe('Gruppenwechsel-Refetch: Dimmung, Abbruch, Fehler, Anti-Vermischung (D-07..D-10/G)', () => {
  it('D-08: waehrend eines Gruppenwechsels bleibt die alte Liste sichtbar und wird als aria-busy markiert', async () => {
    const pending = deferred<PublicGroupedEpisodesResponse>()
    groupedMock.mockReturnValueOnce(pending.promise)
    render(<FansubVersionBrowser animeID={22} fansubs={fansubs} episodes={[initialEpisode]} />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /Erste Folge/ }))
    fireEvent.click(screen.getByRole('button', { name: 'AnimeOwnage' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(1), { timeout: 500 })
    // Waehrend der Wechsel-Fetch pendent ist, bleibt die ALTE Episode sichtbar, als aria-busy markiert.
    expect(screen.getByText('Erste Folge')).toBeTruthy()
    expect(screen.getByRole('list').getAttribute('aria-busy')).toBe('true')
    await act(async () => pending.resolve(publicPage([
      { episode_id: 50, episode_number: 1, episode_title: 'Erste Folge', version_count: 1, versions: [variant(10, 7)] },
    ])))
    expect(screen.getByRole('list').getAttribute('aria-busy')).not.toBe('true')
  })

  it('D-09: ein Gruppenwechsel bricht eine laufende Weitere-laden-Anfrage ab', async () => {
    const loadMorePending = deferred<PublicGroupedEpisodesResponse>()
    const switchPending = deferred<PublicGroupedEpisodesResponse>()
    groupedMock.mockReturnValueOnce(loadMorePending.promise).mockReturnValueOnce(switchPending.promise)
    render(<FansubVersionBrowser
      animeID={22} fansubs={fansubs} episodes={[initialEpisode]}
      pagination={{ has_more: true, next_cursor: 'next', row_limit: 24 }}
    />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'Weitere Episoden und Versionen laden' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(1), { timeout: 500 })
    const loadMoreSignal = groupedMock.mock.calls[0]?.[1]?.signal
    fireEvent.click(screen.getByRole('button', { name: /Erste Folge/ }))
    fireEvent.click(screen.getByRole('button', { name: 'AnimeOwnage' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(2), { timeout: 500 })
    expect(loadMoreSignal?.aborted).toBe(true)
    await act(async () => switchPending.resolve(publicPage([
      { episode_id: 50, episode_number: 1, episode_title: 'Erste Folge', version_count: 1, versions: [variant(10, 7)] },
    ])))
  })

  it('D-10: ein fehlgeschlagener Gruppenwechsel zeigt einen Fehlerhinweis mit Erneut-versuchen-Button, ohne die alte Gruppe zu vermischen', async () => {
    groupedMock.mockRejectedValueOnce(new Error('Netzwerkfehler'))
    render(<FansubVersionBrowser animeID={22} fansubs={fansubs} episodes={[initialEpisode]} />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /Erste Folge/ }))
    fireEvent.click(screen.getByRole('button', { name: 'AnimeOwnage' }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy(), { timeout: 500 })
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeTruthy()
    // Die alte Gruppe (bzw. der alte, ungefilterte Zustand) bleibt darunter sichtbar, nicht vermischt.
    expect(screen.getByText('Erste Folge')).toBeTruthy()
    groupedMock.mockResolvedValueOnce(publicPage([
      { episode_id: 50, episode_number: 1, episode_title: 'Erste Folge', version_count: 1, versions: [variant(10, 7)] },
    ]))
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull(), { timeout: 500 })
  })

  it('Pflichtfall G: Filterwechsel Alle->AnimeOwnage->ProjectMessiah->Alle zeigt bei jedem Schritt ausschliesslich die zuletzt geladene Antwort, keine Vermischung', async () => {
    render(<FansubVersionBrowser animeID={22} fansubs={threeFansubs} episodes={[initialEpisode]} />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /Erste Folge/ }))

    groupedMock.mockResolvedValueOnce(publicPage([
      { episode_id: 50, episode_number: 1, episode_title: 'Erste Folge', version_count: 1, versions: [variant(10, 7, threeFansubs)] },
    ]))
    fireEvent.click(screen.getByRole('button', { name: 'AnimeOwnage' }))
    await waitFor(() => expect(screen.getByText('Variante 7')).toBeTruthy(), { timeout: 500 })
    expect(screen.queryByText('Variante 9')).toBeNull()
    expect(screen.queryByText('Variante 11')).toBeNull()

    groupedMock.mockResolvedValueOnce(publicPage([
      { episode_id: 50, episode_number: 1, episode_title: 'Erste Folge', version_count: 1, versions: [variant(20, 9, threeFansubs)] },
    ]))
    fireEvent.click(screen.getByRole('button', { name: 'ProjectMessiah' }))
    await waitFor(() => expect(screen.getByText('Variante 9')).toBeTruthy(), { timeout: 500 })
    expect(screen.queryByText('Variante 7')).toBeNull()
    expect(screen.queryByText('Variante 11')).toBeNull()

    groupedMock.mockResolvedValueOnce(publicPage([
      { episode_id: 50, episode_number: 1, episode_title: 'Erste Folge', version_count: 3, versions: [
        variant(10, 7, threeFansubs), variant(20, 9, threeFansubs), variant(30, 11, threeFansubs),
      ] },
    ]))
    fireEvent.click(screen.getByRole('button', { name: 'Alle' }))
    await waitFor(() => expect(screen.getByText('Variante 11')).toBeTruthy(), { timeout: 500 })
    expect(screen.getByText('Variante 7')).toBeTruthy()
    expect(screen.getByText('Variante 9')).toBeTruthy()
  })
})
