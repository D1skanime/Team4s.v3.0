// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getGroupedEpisodes } from '@/lib/api'

vi.mock('@/lib/api', () => ({ getGroupedEpisodes: vi.fn() }))

import type { PublicGroupedEpisode, PublicGroupedEpisodesOptions, PublicGroupedEpisodesResponse } from '@/types/episodeVersion'
import type { AnimeFansubRelation } from '@/types/fansub'
import { FansubVersionBrowser } from './FansubVersionBrowser'

const groupedMock = vi.mocked(getGroupedEpisodes as (animeID: number, options: PublicGroupedEpisodesOptions) => Promise<PublicGroupedEpisodesResponse>)

/**
 * 164-06 Task 1 (D-40/D-41/D-42/D-43, REQ-164-40..44/46). Eigene Datei statt Anhang an
 * FansubVersionBrowser.groupSwitch.test.tsx/FansubVersionBrowser.windowing.test.tsx: diese Datei
 * beweist speziell das Race-Verhalten bei UEBERLAPPENDEN (nicht sequenziellen) Anfragen -- die
 * bestehenden Dateien decken den sequenziellen Fall (warten auf Antwort A, dann erst B ausloesen)
 * bereits ab, nicht aber "A, B, C werden ausgeloest, bevor irgendeine antwortet, und ausserdem in
 * der falschen Reihenfolge aufgeloest".
 */
const threeFansubs: AnimeFansubRelation[] = [
  { anime_id: 4, fansub_group_id: 7, is_primary: true, created_at: '', fansub_group: { id: 7, slug: 'ao', name: 'AnimeOwnage' } },
  { anime_id: 4, fansub_group_id: 9, is_primary: false, created_at: '', fansub_group: { id: 9, slug: 'pm', name: 'ProjectMessiah' } },
  { anime_id: 4, fansub_group_id: 11, is_primary: false, created_at: '', fansub_group: { id: 11, slug: 'dg', name: 'DrittGruppe' } },
]

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

/**
 * Manueller IntersectionObserver-Stub (analog useNearViewportActivation.test.ts / anderen
 * FansubVersionBrowser-Testdateien dieser Phase): jede Instanz wird erfasst, damit ein Test
 * gezielt den Observer ausloesen kann, der ein bestimmtes Sentinel-Element beobachtet.
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

describe('Filterwechsel-/Windowing-Kooperation: Race-Sicherheit bei ueberlappenden Anfragen (D-40..D-43)', () => {
  it('A->B->C in schneller Folge, ausserhalb der Reihenfolge aufgeloest (A zuletzt) -- nur C rendert jemals', async () => {
    const requestA = deferred<PublicGroupedEpisodesResponse>()
    const requestB = deferred<PublicGroupedEpisodesResponse>()
    const requestC = deferred<PublicGroupedEpisodesResponse>()
    groupedMock
      .mockReturnValueOnce(requestA.promise)
      .mockReturnValueOnce(requestB.promise)
      .mockReturnValueOnce(requestC.promise)

    render(<FansubVersionBrowser
      animeID={4}
      fansubs={threeFansubs}
      episodes={[ep(1)]}
    />)
    await act(async () => {})

    // Alle drei Wechsel werden ausgeloest, BEVOR irgendeine Antwort eintrifft (echte
    // Ueberlappung, kein sequenzielles Warten wie in FansubVersionBrowser.groupSwitch.test.tsx
    // Pflichtfall G).
    fireEvent.click(screen.getByRole('button', { name: 'AnimeOwnage' }))
    fireEvent.click(screen.getByRole('button', { name: 'ProjectMessiah' }))
    fireEvent.click(screen.getByRole('button', { name: 'DrittGruppe' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(3))

    // Aufloesungsreihenfolge bewusst vertauscht: A (aelteste Auswahl) loest zuletzt auf.
    await act(async () => { requestB.resolve(publicPage([ep(200)])) })
    expect(screen.queryAllByText('Folge 200')).toHaveLength(0)

    await act(async () => { requestC.resolve(publicPage([ep(300)])) })
    await waitFor(() => expect(screen.getAllByText('Folge 300').length).toBeGreaterThan(0))

    await act(async () => { requestA.resolve(publicPage([ep(100)])) })
    // A's (und B's) Daten duerfen zu keinem Zeitpunkt sichtbar werden, auch nicht nachtraeglich.
    expect(screen.queryAllByText('Folge 100')).toHaveLength(0)
    expect(screen.queryAllByText('Folge 200')).toHaveLength(0)
    expect(screen.getAllByText('Folge 300').length).toBeGreaterThan(0)
  })

  it('ein vorwaerts-Nachladen in der Schwebe wird bei einem Filterwechsel verworfen -- spaete Aufloesung mutiert nichts', async () => {
    const forwardPending = deferred<PublicGroupedEpisodesResponse>()
    const switchPending = deferred<PublicGroupedEpisodesResponse>()
    groupedMock.mockReturnValueOnce(forwardPending.promise).mockReturnValueOnce(switchPending.promise)

    render(<FansubVersionBrowser
      animeID={4}
      fansubs={threeFansubs}
      episodes={[ep(1)]}
      pagination={continued('c1')}
    />)
    await act(async () => {})

    act(() => { MockIntersectionObserver.fire(screen.getByTestId('bottom-sentinel')) })
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(1))
    const forwardSignal = groupedMock.mock.calls[0]?.[1]?.signal

    fireEvent.click(screen.getByRole('button', { name: 'AnimeOwnage' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(2))
    expect(forwardSignal?.aborted).toBe(true)

    // Die spaete Aufloesung des abgebrochenen Vorwaerts-Ladevorgangs darf den Zustand nicht
    // mehr aendern -- auch wenn das Mock (anders als ein echter Browser-Fetch) sie trotzdem
    // resolved.
    await act(async () => { forwardPending.resolve(publicPage([ep(999)])) })
    expect(screen.queryAllByText('Folge 999')).toHaveLength(0)

    await act(async () => { switchPending.resolve(publicPage([ep(7)])) })
    await waitFor(() => expect(screen.getAllByText('Folge 7').length).toBeGreaterThan(0))
    expect(screen.queryAllByText('Folge 999')).toHaveLength(0)
    // Genau eine frische Anfrage fuer die neue Filterauswahl (Page 1) -- keine dritte Anfrage.
    expect(getGroupedEpisodes).toHaveBeenCalledTimes(2)
  })

  it('ein rueckwaerts-Wiederherstellungs-Fetch in der Schwebe wird bei einem Filterwechsel identisch verworfen', async () => {
    render(<FansubVersionBrowser
      animeID={4}
      fansubs={threeFansubs}
      episodes={[ep(0)]}
      pagination={continued('c1')}
    />)
    await act(async () => {})

    // Sechs Vorwaerts-Ladevorgaenge fuellen den Cache (CACHE_MAX_PAGES=6) vollstaendig und
    // laesst genau die aelteste Page (die initiale p0) daraus verdraengt zurueck, waehrend das
    // DOM-Fenster (DOM_WINDOW_SIZE=3) auf die letzten 3 Pages begrenzt bleibt.
    for (let i = 1; i <= 6; i += 1) {
      const next = i < 6 ? continued(`c${i + 1}`) : continued('c7')
      groupedMock.mockResolvedValueOnce(publicPage([ep(i)], next))
      await fireBottomSentinel()
      await waitFor(() => expect(screen.getAllByText(`Folge ${i}`).length).toBeGreaterThan(0))
    }

    // Drei rueckwaerts-Restores sind reine Cache-Hits (synchron, kein Netzwerk) und schieben das
    // Fenster schrittweise zurueck bis kurz vor die verdraengte p0.
    await fireTopSentinel()
    await waitFor(() => expect(screen.getAllByText('Folge 3').length).toBeGreaterThan(0))
    await fireTopSentinel()
    await waitFor(() => expect(screen.getAllByText('Folge 2').length).toBeGreaterThan(0))
    await fireTopSentinel()
    await waitFor(() => expect(screen.getAllByText('Folge 1').length).toBeGreaterThan(0))

    const callsBeforeMiss = groupedMock.mock.calls.length
    const backwardPending = deferred<PublicGroupedEpisodesResponse>()
    const switchPending = deferred<PublicGroupedEpisodesResponse>()
    groupedMock.mockReturnValueOnce(backwardPending.promise).mockReturnValueOnce(switchPending.promise)

    // Vierter Restore: die urspruengliche p0 (Folge 0) ist nicht mehr im Cache -- echter
    // Cache-Miss, ein Netzwerk-Request fuer die rueckwaertige Wiederherstellung startet.
    await fireTopSentinel()
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(callsBeforeMiss + 1))
    const backwardSignal = groupedMock.mock.calls[callsBeforeMiss]?.[1]?.signal

    fireEvent.click(screen.getByRole('button', { name: 'AnimeOwnage' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(callsBeforeMiss + 2))
    expect(backwardSignal?.aborted).toBe(true)

    await act(async () => { backwardPending.resolve(publicPage([ep(0)])) })
    // Die verworfene rueckwaertige Wiederherstellung darf keine Episode aus der alten
    // Filterauswahl einbringen.
    expect(screen.queryAllByText('Folge 0')).toHaveLength(0)

    await act(async () => { switchPending.resolve(publicPage([ep(7)])) })
    await waitFor(() => expect(screen.getAllByText('Folge 7').length).toBeGreaterThan(0))
  })

  it('Aufklappen/Zuklappen/erneutes Aufklappen einer bereits geladenen Episode erzeugt null zusaetzliche Requests', async () => {
    render(<FansubVersionBrowser
      animeID={4}
      fansubs={[]}
      episodes={[ep(1)]}
    />)
    await act(async () => {})

    const callsBeforeToggle = groupedMock.mock.calls.length
    const toggle = screen.getByRole('button', { name: /Folge 1/ })

    fireEvent.click(toggle) // aufklappen
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(getGroupedEpisodes).toHaveBeenCalledTimes(callsBeforeToggle)

    fireEvent.click(toggle) // zuklappen
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(getGroupedEpisodes).toHaveBeenCalledTimes(callsBeforeToggle)

    fireEvent.click(toggle) // erneut aufklappen
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    // Explizite Vorher/Nachher-Zaehlung (nicht nur "der Test ist gruen"): identischer Wert.
    expect(getGroupedEpisodes).toHaveBeenCalledTimes(callsBeforeToggle)
  })
})
