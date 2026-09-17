// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getGroupedEpisodes } from '@/lib/api'

vi.mock('@/lib/api', () => ({ getGroupedEpisodes: vi.fn() }))

import type { PublicGroupedEpisode, PublicGroupedEpisodesOptions, PublicGroupedEpisodesResponse } from '@/types/episodeVersion'
import { FansubVersionBrowser } from './FansubVersionBrowser'

const groupedMock = vi.mocked(getGroupedEpisodes as (animeID: number, options: PublicGroupedEpisodesOptions) => Promise<PublicGroupedEpisodesResponse>)

/**
 * D-27..D-39 (bounded bidirectional windowing). Eigene Datei statt Anhang an
 * FansubVersionBrowser.test.tsx (450-Zeilen-Limit, CLAUDE.md).
 *
 * Manueller IntersectionObserver-Stub (analog useNearViewportActivation.test.ts): jede
 * Instanz wird erfasst, damit ein Test "den Observer, der dieses Sentinel-Element
 * beobachtet" gezielt manuell ausloesen kann.
 */
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  callback: IntersectionObserverCallback
  observed = new Set<Element>()
  root = null
  rootMargin = ''
  thresholds: number[] = []

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  observe = (el: Element) => { this.observed.add(el) }
  unobserve = (el: Element) => { this.observed.delete(el) }
  disconnect = () => { this.observed.clear() }
  takeRecords = () => []

  static fire(el: Element) {
    const observer = MockIntersectionObserver.instances.find((instance) => instance.observed.has(el))
    observer?.callback([{ isIntersecting: true, target: el } as IntersectionObserverEntry], observer as unknown as IntersectionObserver)
  }
}

function ep(id: number): PublicGroupedEpisode {
  return {
    episode_id: id, episode_number: id, version_count: 0, versions: [],
    filler_type: 'unknown', episode_type: 'episode',
  }
}

const ended: PublicGroupedEpisodesResponse['data']['pagination'] = { has_more: false, next_cursor: null, row_limit: 24 }
const continued = (cursor: string): PublicGroupedEpisodesResponse['data']['pagination'] => ({ ...ended, has_more: true, next_cursor: cursor })
function publicPage(episodes: PublicGroupedEpisode[], pagination = ended): PublicGroupedEpisodesResponse {
  return { data: { anime_id: 4, episodes, episode_count: episodes.length, pagination } }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => { resolve = yes })
  return { promise, resolve }
}

async function fireBottomSentinel() {
  const sentinel = screen.getByTestId('bottom-sentinel')
  await act(async () => { MockIntersectionObserver.fire(sentinel) })
}
async function fireTopSentinel() {
  const sentinel = screen.getByTestId('top-sentinel')
  await act(async () => { MockIntersectionObserver.fire(sentinel) })
}

beforeEach(() => {
  groupedMock.mockReset()
  MockIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  window.history.pushState(null, '', '/')
})
afterEach(async () => { await act(async () => {}); cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('Infinite Scroll: bounded DOM-Fenster, Spacer-Wiederherstellung, Ausklapp-Stabilitaet, Nachlade-Fehler (D-27..D-39)', () => {
  it('a/b/c: begrenzt das DOM-Fenster auf 3 Pages, stellt eine ausgelagerte Page wieder her und erhaelt deren Ausklapp-Zustand', async () => {
    render(<FansubVersionBrowser
      animeID={4}
      fansubs={[]}
      episodes={[ep(1)]}
      pagination={continued('c1')}
    />)
    await act(async () => {})

    groupedMock.mockResolvedValueOnce(publicPage([ep(2)], continued('c2')))
    await fireBottomSentinel()
    await waitFor(() => expect(screen.getAllByText('Folge 2').length).toBeGreaterThan(0))
    // Testfall c: Folge 2 wird VOR ihrer Auslagerung ausgeklappt.
    fireEvent.click(screen.getByRole('button', { name: /Folge 2/ }))
    expect(screen.getByRole('button', { name: /Folge 2/ }).getAttribute('aria-expanded')).toBe('true')

    groupedMock.mockResolvedValueOnce(publicPage([ep(3)], continued('c3')))
    await fireBottomSentinel()
    await waitFor(() => expect(screen.getAllByText('Folge 3').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Folge 1').length).toBeGreaterThan(0) // noch alle 3 Pages im Fenster, nichts ausgelagert.

    groupedMock.mockResolvedValueOnce(publicPage([ep(4)], continued('c4')))
    await fireBottomSentinel()
    await waitFor(() => expect(screen.getAllByText('Folge 4').length).toBeGreaterThan(0))
    // Testfall a: die 4. Page hat das Fenster auf 3 begrenzt -- die 1. Page (Folge 1) ist jetzt ein Spacer.
    expect(screen.queryAllByText('Folge 1')).toHaveLength(0)

    groupedMock.mockResolvedValueOnce(publicPage([ep(5)], ended))
    await fireBottomSentinel()
    await waitFor(() => expect(screen.getAllByText('Folge 5').length).toBeGreaterThan(0))
    // Die 5. Page hat auch Folge 2 ausgelagert.
    expect(screen.queryAllByText('Folge 2')).toHaveLength(0)
    const spacerCountBeforeRestore = document.querySelectorAll('div[aria-hidden="true"]:not([data-testid])').length
    expect(spacerCountBeforeRestore).toBe(2)

    const callsBeforeRestore = groupedMock.mock.calls.length
    await fireTopSentinel()
    // Testfall b: Folge 2 (Cache-Hit) wird ohne zusaetzlichen Request wiederhergestellt.
    expect(getGroupedEpisodes).toHaveBeenCalledTimes(callsBeforeRestore)
    await waitFor(() => expect(screen.getAllByText('Folge 2').length).toBeGreaterThan(0))
    // Testfall c: der Ausklapp-Zustand ist keyed by episode_id ueberlebt die Auslagerung/Wiederherstellung.
    expect(screen.getByRole('button', { name: /Folge 2/ }).getAttribute('aria-expanded')).toBe('true')
    // Das Fenster bleibt auf 3 Pages begrenzt -- Folge 5 wurde jetzt stattdessen ausgelagert.
    expect(screen.queryAllByText('Folge 5')).toHaveLength(0)
    expect(screen.getAllByText('Folge 3').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Folge 4').length).toBeGreaterThan(0)
  })

  it('d: ein Nachlade-Fehler laesst bereits geladene Episoden sichtbar und erlaubt einen erfolgreichen Retry', async () => {
    render(<FansubVersionBrowser
      animeID={4}
      fansubs={[]}
      episodes={[ep(1)]}
      pagination={continued('c1')}
    />)
    await act(async () => {})

    groupedMock.mockRejectedValueOnce(new Error('Netzwerkfehler'))
    await fireBottomSentinel()
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByText('Weitere Episoden konnten nicht geladen werden.')).toBeTruthy()
    // Bereits geladene Episoden bleiben unveraendert sichtbar -- kein Blanking der Liste.
    expect(screen.getAllByText('Folge 1').length).toBeGreaterThan(0)

    groupedMock.mockResolvedValueOnce(publicPage([ep(2)], ended))
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(screen.getAllByText('Folge 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Folge 2').length).toBeGreaterThan(0)
    // Nur eine Page nach c1, has_more=false -> Ende-Marker erscheint (mehr als 1 Page geladen).
    expect(screen.getByText('Das waren alle Episoden.')).toBeTruthy()
  })

  it('showEndMarker bleibt aus, solange nur die initiale Page (SSR) existiert', async () => {
    render(<FansubVersionBrowser animeID={4} fansubs={[]} episodes={[ep(1)]} pagination={ended} />)
    await act(async () => {})
    expect(screen.queryByText('Das waren alle Episoden.')).toBeNull()
  })

  it('ein Gruppenwechsel bricht eine laufende Weitere-laden-Anfrage ab (D-40, ueber resetForFilter)', async () => {
    const loadNextPending = deferred<PublicGroupedEpisodesResponse>()
    const switchPending = deferred<PublicGroupedEpisodesResponse>()
    groupedMock.mockReturnValueOnce(loadNextPending.promise).mockReturnValueOnce(switchPending.promise)
    render(<FansubVersionBrowser
      animeID={4}
      fansubs={[
        { anime_id: 4, fansub_group_id: 7, is_primary: true, created_at: '', fansub_group: { id: 7, slug: 'ao', name: 'AnimeOwnage' } },
        { anime_id: 4, fansub_group_id: 9, is_primary: false, created_at: '', fansub_group: { id: 9, slug: 'pm', name: 'ProjectMessiah' } },
      ]}
      episodes={[ep(1)]}
      pagination={continued('c1')}
    />)
    await act(async () => {})
    const sentinel = screen.getByTestId('bottom-sentinel')
    act(() => { MockIntersectionObserver.fire(sentinel) })
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(1))
    const loadNextSignal = groupedMock.mock.calls[0]?.[1]?.signal
    fireEvent.click(screen.getByRole('button', { name: 'AnimeOwnage' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(2))
    expect(loadNextSignal?.aborted).toBe(true)
    await act(async () => { switchPending.resolve(publicPage([ep(1)])) })
  })
})
