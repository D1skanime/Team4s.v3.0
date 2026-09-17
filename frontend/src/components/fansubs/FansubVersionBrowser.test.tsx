// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getGroupedEpisodes } from '@/lib/api'

vi.mock('@/lib/api', () => ({ getGroupedEpisodes: vi.fn() }))

import type { PublicGroupedEpisode, PublicGroupedEpisodesResponse, PublicGroupedEpisodesOptions, PublicEpisodeVersion } from '@/types/episodeVersion'
import type { AnimeFansubRelation } from '@/types/fansub'
import { FansubVersionBrowser } from './FansubVersionBrowser'

const groupedMock = vi.mocked(getGroupedEpisodes as (animeID: number, options: PublicGroupedEpisodesOptions) => Promise<PublicGroupedEpisodesResponse>)

const fansubs: AnimeFansubRelation[] = [
  { anime_id: 22, fansub_group_id: 7, is_primary: true, created_at: '', fansub_group: { id: 7, slug: 'saved-primary', name: 'Anderer Gruppenname' } },
  { anime_id: 22, fansub_group_id: 9, is_primary: false, created_at: '', fansub_group: { id: 9, slug: 'saved-secondary', name: 'Zweite Gruppe' } },
]
const singleFansub: AnimeFansubRelation[] = [fansubs[0]]
const noFansubs: AnimeFansubRelation[] = []

beforeEach(() => {
  groupedMock.mockReset()
  // D-01: der Gruppenzustand lebt ausschliesslich in der URL -- Rueckstellung verhindert
  // Testverschmutzung ueber window.history hinweg (kein localStorage mehr zu leeren).
  window.history.pushState(null, '', '/')
})
afterEach(async () => { await act(async () => {}); cleanup(); vi.restoreAllMocks() })

describe('authoritative anime project navigation', () => {
  it('verlinkt Zur-Fansub-Gruppe und Zum-Projekt ueber die jeweils aktive Gruppen-Slug', () => {
    render(<FansubVersionBrowser animeID={22} animeSlug="stored-anime" fansubs={fansubs} episodes={[]} />)
    // D-02: 2+ Gruppen ohne Parameter -> "Alle" aktiv, Gruppenbereich vollstaendig ausgeblendet.
    expect(screen.queryByRole('link', { name: 'Zur Fansub-Gruppe' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Zum Projekt' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Anderer Gruppenname' }))
    expect(screen.getByRole('link', { name: 'Zur Fansub-Gruppe' }).getAttribute('href')).toBe('/fansubs/saved-primary')
    expect(screen.getByRole('link', { name: 'Zum Projekt' }).getAttribute('href')).toBe('/fansubs/saved-primary/fansubprojekt/stored-anime')

    fireEvent.click(screen.getByRole('button', { name: 'Zweite Gruppe' }))
    expect(screen.getByRole('link', { name: 'Zur Fansub-Gruppe' }).getAttribute('href')).toBe('/fansubs/saved-secondary')
    expect(screen.getByRole('link', { name: 'Zum Projekt' }).getAttribute('href')).toBe('/fansubs/saved-secondary/fansubprojekt/stored-anime')
  })

  it('nutzt fuer Zum-Projekt weiterhin den bestehenden Encoder samt Trimmen', () => {
    render(<FansubVersionBrowser animeID={22} animeSlug=" stored/anime " fansubs={[{ ...fansubs[0], fansub_group: { id: 7, slug: ' saved-group ', name: 'Kein Slug' } }]} episodes={[]} />)
    // Genau eine Gruppe -> automatisch aktiv, kein Klick noetig.
    expect(screen.getByRole('link', { name: 'Zum Projekt' }).getAttribute('href')).toBe('/fansubs/saved-group/fansubprojekt/stored%2Fanime')
  })

  it.each([undefined, '', '   '])('rendert keinen Zum-Projekt-Link ohne animeSlug (kein Fallback auf die technische Route), animeSlug=%j', (animeSlug) => {
    render(<FansubVersionBrowser animeID={22} animeSlug={animeSlug} fansubs={fansubs} episodes={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Anderer Gruppenname' }))
    expect(screen.queryByRole('link', { name: 'Zum Projekt' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Zur Fansub-Gruppe' }).getAttribute('href')).toBe('/fansubs/saved-primary')
  })

  it('rendert keinen Zum-Projekt-Link, wenn die aktive Gruppe keinen Slug hat', () => {
    render(<FansubVersionBrowser animeID={22} animeSlug="stored-anime" fansubs={[{ ...fansubs[0], fansub_group: { id: 7, slug: ' ', name: 'Kein Slug' } }]} episodes={[]} />)
    expect(screen.queryByRole('link', { name: 'Zum Projekt' })).toBeNull()
  })

  it('rendert keine erfundenen Navigationsziele ohne Gruppe', () => {
    render(<FansubVersionBrowser animeID={22} animeSlug="stored-anime" fansubs={[]} episodes={[]} />)
    expect(screen.queryByRole('link', { name: 'Zur Fansub-Gruppe' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Zum Projekt' })).toBeNull()
  })

  it('behaelt echte Episodentitel und Ausklapp-Verhalten', async () => {
    render(<FansubVersionBrowser animeID={22} animeSlug="stored-anime" fansubs={fansubs} episodes={[{
      episode_id: 50, episode_number: 1, episode_title: 'Gespeicherter Episodentitel', version_count: 0, versions: [],
    }]} />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'Anderer Gruppenname' }))
    const toggle = screen.getByRole('button', { name: /Gespeicherter Episodentitel/ })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    // D-15: der Hinweisblock "Keine Version dieser Gruppe verfuegbar." entfaellt ersatzlos --
    // der Server liefert nie mehr eine Episode ohne mindestens eine passende Version.
    expect(screen.queryByText('Keine Version dieser Gruppe verfügbar.')).toBeNull()
  })

  it('gives the white episode card the existing dark text token inherited by its header', () => {
    const css = readFileSync(join(process.cwd(), 'src/components/fansubs/FansubVersionBrowser.module.css'), 'utf8')
    // jsdom cannot resolve custom properties; 158-04 verifies actual computed colors.
    expect(css.match(/\.episodeCard\s*\{([^}]+)\}/)?.[1]).toContain('color: var(--color-text-primary)')
    expect(css.match(/\.episodeHeader\s*\{([^}]+)\}/)?.[1]).toContain('color: inherit')
  })
})

const variant = (id: number, group: number): PublicEpisodeVersion => ({
  id, variant_id: id, release_version_id: id + 100, anime_id: 22, episode_number: 1,
  title: `Variante ${group}`, fansub_groups: [fansubs[group === 7 ? 0 : 1].fansub_group!],
})
const stateEpisodes = [{ episode_id: 50, episode_number: 1, episode_title: 'Gruppenfolge', version_count: 2, versions: [variant(10, 7), variant(20, 9)] }]
function stateBrowser(relations: AnimeFansubRelation[] = fansubs, animeID = 22, initialActiveSlug: string | null = null) {
  return (
    <FansubVersionBrowser
      animeID={animeID}
      fansubs={relations}
      episodes={stateEpisodes}
      initialActiveSlug={initialActiveSlug}
    />
  )
}
function assertGroup(id: 7 | 9) {
  const selected = fansubs[id === 7 ? 0 : 1].fansub_group!
  expect(screen.getByRole('button', { name: selected.name }).getAttribute('aria-pressed')).toBe('true')
  // D-13: der Gruppenbereich rendert den Gruppennamen als reine Ueberschrift OHNE Link.
  const heading = within(screen.getByRole('article')).getByRole('heading', { name: selected.name })
  expect(heading).toBeTruthy()
  expect(within(screen.getByRole('article')).queryByRole('link', { name: selected.name })).toBeNull()
  expect(screen.getByText(`Variante ${id}`)).toBeTruthy()
  expect(screen.queryByText(`Variante ${id === 7 ? 9 : 7}`)).toBeNull()
}
function assertAllSelected() {
  expect(screen.getByRole('button', { name: 'Alle' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.queryByRole('article')).toBeNull()
}

describe('Fansub-Gruppenauswahl: URL-Zustand (D-01..D-04, D-09, D-13, D-14)', () => {
  it('Testfall A: zeigt ohne Fansub-Gruppe weder Chip-Zeile noch Gruppenbereich noch einen leeren Platzhalter', () => {
    render(<FansubVersionBrowser animeID={22} fansubs={noFansubs} episodes={[]} />)
    expect(screen.queryByRole('group', { name: 'Fansub-Gruppe' })).toBeNull()
    expect(screen.queryByText('Alle')).toBeNull()
    expect(screen.queryByRole('article')).toBeNull()
  })

  it('Testfall B/C: aktiviert die einzige Gruppe automatisch, ohne Alle-Chip und ohne Klick', () => {
    render(<FansubVersionBrowser animeID={22} fansubs={singleFansub} episodes={stateEpisodes} />)
    expect(screen.queryByText('Alle')).toBeNull()
    const chip = screen.getByRole('button', { name: fansubs[0].fansub_group!.name })
    expect(chip.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('heading', { name: fansubs[0].fansub_group!.name })).toBeTruthy()
  })

  it('Testfall D: waehlt bei 2+ Gruppen ohne URL-Parameter automatisch Alle, Gruppenbereich vollstaendig ausgeblendet', () => {
    render(stateBrowser())
    assertAllSelected()
  })

  it('Testfall E/F: ein Chip-Wechsel zeigt vollstaendig den Inhalt der neu gewaehlten Gruppe (Server-Refetch statt Client-Filter, D-07)', async () => {
    render(stateBrowser())
    fireEvent.click(screen.getByRole('button', { name: /Gruppenfolge/ }))
    groupedMock.mockResolvedValueOnce(publicPage([
      { episode_id: 50, episode_number: 1, episode_title: 'Gruppenfolge', version_count: 1, versions: [variant(10, 7)] },
    ]))
    fireEvent.click(screen.getByRole('button', { name: 'Anderer Gruppenname' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(1), { timeout: 500 })
    assertGroup(7)
    groupedMock.mockResolvedValueOnce(publicPage([
      { episode_id: 50, episode_number: 1, episode_title: 'Gruppenfolge', version_count: 1, versions: [variant(20, 9)] },
    ]))
    fireEvent.click(screen.getByRole('button', { name: 'Zweite Gruppe' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(2), { timeout: 500 })
    assertGroup(9)
    groupedMock.mockResolvedValueOnce(publicPage([
      { episode_id: 50, episode_number: 1, episode_title: 'Gruppenfolge', version_count: 2, versions: [variant(10, 7), variant(20, 9)] },
    ]))
    fireEvent.click(screen.getByRole('button', { name: 'Alle' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(3), { timeout: 500 })
    assertAllSelected()
  })

  it('Testfall G: initialActiveSlug aktiviert die passende Gruppe bereits beim ersten Render', () => {
    render(stateBrowser(fansubs, 22, 'saved-secondary'))
    fireEvent.click(screen.getByRole('button', { name: /Gruppenfolge/ }))
    assertGroup(9)
  })

  it('Testfall H: ein ungueltiger/entfernter initialActiveSlug faellt sauber auf Alle zurueck, ohne Fehler', () => {
    render(stateBrowser(fansubs, 22, 'does-not-exist'))
    assertAllSelected()
  })

  it('D-07: ein Chip-Wechsel loest einen Refetch mit dem Ziel-Slug aus', async () => {
    render(stateBrowser())
    groupedMock.mockClear()
    groupedMock.mockResolvedValueOnce({ data: { anime_id: 22, episodes: [], episode_count: 0, pagination: { has_more: false, next_cursor: null, row_limit: 24 } } })
    fireEvent.click(screen.getByRole('button', { name: 'Anderer Gruppenname' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledExactlyOnceWith(22, expect.objectContaining({
      projection: 'public', limit: 24, fansub: 'saved-primary', signal: expect.any(AbortSignal),
    })), { timeout: 500 })
  })

  it('D-02: andere Query-Parameter bleiben beim Gruppenwechsel erhalten', () => {
    window.history.pushState(null, '', '/anime/22?from=search')
    render(stateBrowser())
    fireEvent.click(screen.getByRole('button', { name: 'Anderer Gruppenname' }))
    const params = new URLSearchParams(window.location.search)
    expect(params.get('from')).toBe('search')
    expect(params.get('fansub')).toBe('saved-primary')
  })

  it('Browser Zurueck/Vor stellt ueber popstate die vorherige Gruppenauswahl wieder her, MIT Refetch (D-09)', async () => {
    render(stateBrowser())
    fireEvent.click(screen.getByRole('button', { name: 'Anderer Gruppenname' }))
    expect(screen.getByRole('button', { name: 'Anderer Gruppenname' }).getAttribute('aria-pressed')).toBe('true')
    groupedMock.mockClear()
    groupedMock.mockResolvedValueOnce({ data: { anime_id: 22, episodes: [], episode_count: 0, pagination: { has_more: false, next_cursor: null, row_limit: 24 } } })
    // Simuliert einen Browser-Zurueck-Schritt: die URL verliert den Parameter wieder,
    // ein popstate-Event feuert (kein erneuter pushState durch die Komponente selbst).
    // D-09: "immer neu laden" -- kein Cache pro Gruppe, auch bei Zurueck/Vor.
    act(() => {
      window.history.pushState(null, '', window.location.pathname)
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    assertAllSelected()
    // Kein "fansub"-Schluessel: die URL nach dem Zurueck-Schritt hat keinen Parameter mehr ("Alle").
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledExactlyOnceWith(22, {
      projection: 'public', limit: 24, signal: expect.any(AbortSignal),
    }), { timeout: 500 })
  })

  it('Testfall I: eine Coop-Version erzeugt keinen dritten Chip, jede beteiligte Gruppe bleibt einzeln auswaehlbar (Server-Refetch, D-07)', async () => {
    const coopVersion: PublicEpisodeVersion = {
      ...variant(30, 7),
      fansub_groups: [fansubs[0].fansub_group!, fansubs[1].fansub_group!],
    }
    const coopEpisodes = [{ episode_id: 60, episode_number: 2, episode_title: 'Gemeinsame Folge', version_count: 1, versions: [coopVersion] }]
    render(<FansubVersionBrowser animeID={22} fansubs={fansubs} episodes={coopEpisodes} />)
    expect(screen.queryByText(/coop/i)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Gemeinsame Folge/ }))
    // Eine Coop-Version gehoert per Definition zu beiden Gruppen -- der server-gefilterte
    // Refetch fuer jede der beiden Gruppen liefert dieselbe coopEpisodes-Antwort zurueck.
    groupedMock.mockResolvedValueOnce(publicPage(coopEpisodes))
    fireEvent.click(screen.getByRole('button', { name: 'Anderer Gruppenname' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(1), { timeout: 500 })
    expect(screen.getByText('Variante 7')).toBeTruthy()
    groupedMock.mockResolvedValueOnce(publicPage(coopEpisodes))
    fireEvent.click(screen.getByRole('button', { name: 'Zweite Gruppe' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(2), { timeout: 500 })
    expect(screen.getByText('Variante 7')).toBeTruthy()
  })

  it('a11y: Chip-Zeile hat role=group und aria-label Fansub-Gruppe ab 2 Gruppen', () => {
    render(stateBrowser())
    expect(screen.getByRole('group', { name: 'Fansub-Gruppe' })).toBeTruthy()
  })
})

const ended: PublicGroupedEpisodesResponse['data']['pagination'] = { has_more: false, next_cursor: null, row_limit: 24 }
const continued = (cursor: string) => ({ ...ended, has_more: true, next_cursor: cursor })
function publicPage(episodes: PublicGroupedEpisode[], pagination = ended): PublicGroupedEpisodesResponse {
  return { data: { anime_id: 22, episodes, episode_count: episodes.length, pagination } }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
describe('bounded public inventory continuation', () => {
  it('merges 125 variants over explicit pages by episode_id/variant_id, retaining counts and neutral equal-number episodes', async () => {
    const variants = Array.from({ length: 125 }, (_, index) => ({ ...variant(index + 100, index === 124 ? 9 : 7), title: `Geladene Variante ${index}` }))
    const episode = (versions: typeof variants): PublicGroupedEpisode => ({ episode_id: 50, episode_number: 1, episode_title: 'Große Folge', version_count: 125, versions })
    const group9Match = variants.filter((item) => item.title === 'Geladene Variante 124')
    // D-07: die "Zweite Gruppe"- und "Anderer Gruppenname"-Chip-Klicks loesen jetzt je einen
    // eigenen gruppengefilterten Refetch aus (vorher clientseitig kostenlos gefiltert, kein Request).
    groupedMock.mockResolvedValueOnce(publicPage([episode(group9Match)]))
    groupedMock.mockResolvedValueOnce(publicPage([episode(variants.slice(0, 23))]))
    for (let offset = 23; offset < 125; offset += 23) {
      const last = offset + 23 >= 125
      groupedMock.mockResolvedValueOnce(publicPage([
        episode(variants.slice(offset - 1, Math.min(offset + 23, 125))),
        ...(last ? [{ episode_id: 51, episode_number: 1, episode_title: 'Neutrale gleiche Nummer', version_count: 0, versions: [] }] : []),
      ], last ? ended : continued(`cursor-${offset + 23}`)))
    }
    groupedMock.mockResolvedValueOnce(publicPage([episode(group9Match)]))
    render(<FansubVersionBrowser animeID={22} fansubs={fansubs} episodes={[episode(variants.slice(0, 23))]} pagination={continued('cursor-23')} />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /Große Folge/ }))
    expect(screen.getByText('+125 Versionen')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Zweite Gruppe' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(1), { timeout: 500 })
    fireEvent.click(screen.getByRole('button', { name: 'Anderer Gruppenname' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(2), { timeout: 500 })
    for (let index = 0; index < 5; index++) {
      fireEvent.click(screen.getByRole('button', { name: 'Weitere Episoden und Versionen laden' }))
      await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(index + 3), { timeout: 500 })
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Weitere Episoden und Versionen laden' })?.hasAttribute('disabled')).not.toBe(true), { timeout: 500 })
    }
    expect(screen.queryByRole('button', { name: 'Weitere Episoden und Versionen laden' })).toBeNull()
    expect(screen.getByRole('button', { name: /Große Folge/ }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: /Neutrale gleiche Nummer/ }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.getAllByRole('link', { name: 'Version abspielen' })).toHaveLength(124)
    expect(screen.getByText('+125 Versionen')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Zweite Gruppe' }))
    await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(8), { timeout: 500 })
    expect(screen.getByText('Geladene Variante 124')).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Version abspielen' })).toHaveLength(1)
    expect(getGroupedEpisodes).toHaveBeenNthCalledWith(3, 22, expect.objectContaining({ projection: 'public', limit: 24, cursor: 'cursor-23', signal: expect.any(AbortSignal) }))
  })
  it('uses canonical version plus exact variant even when the legacy number collides', async () => {
    render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[{
      episode_id: 70, episode_number: 4, version_count: 2, versions: [
        { ...variant(100, 7), release_version_id: 10 }, { ...variant(10, 7), release_version_id: 20 },
      ],
    }]} pagination={ended} />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /Folge 4/ }))
    expect(screen.getAllByRole('link', { name: 'Version abspielen' }).map((link) => link.getAttribute('href'))).toEqual([
      '/api/releases/10/stream?variant_id=100', '/api/releases/20/stream?variant_id=10',
    ])
  })
  it('keeps a failed cursor retryable and deduplicates repeated pending clicks', async () => {
    const pending = deferred<PublicGroupedEpisodesResponse>()
    groupedMock.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(publicPage([]))
    render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[]} pagination={continued('retry')} />)
    await act(async () => {})
    const load = screen.getByRole('button', { name: 'Weitere Episoden und Versionen laden' })
    fireEvent.click(load); fireEvent.click(load)
    expect(getGroupedEpisodes).toHaveBeenCalledTimes(1)
    await act(async () => pending.reject(new Error('test failure')))
    expect(screen.getByRole('alert').textContent).toContain('Weitere Episoden konnten nicht geladen werden.')
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(getGroupedEpisodes).toHaveBeenNthCalledWith(2, 22, expect.objectContaining({ cursor: 'retry' }))
  })
  it.each(['resolve', 'reject'] as const)('aborts an old anime and ignores its late %s while the new cursor is pending', async (outcome) => {
    const old = deferred<PublicGroupedEpisodesResponse>()
    const current = deferred<PublicGroupedEpisodesResponse>()
    groupedMock.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const { rerender, unmount } = render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[]} pagination={continued('old')} />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'Weitere Episoden und Versionen laden' }))
    const oldSignal = groupedMock.mock.calls[0][1]?.signal
    rerender(<FansubVersionBrowser animeID={23} fansubs={[]} episodes={[]} pagination={continued('new')} />)
    await act(async () => {})
    expect(oldSignal?.aborted).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Weitere Episoden und Versionen laden' }))
    await act(async () => {
      if (outcome === 'resolve') old.resolve(publicPage([{ episode_id: 99, episode_number: 9, episode_title: 'Alte Antwort', version_count: 0, versions: [] }]))
      else old.reject(new Error('old failure'))
    })
    expect(screen.queryByText('Alte Antwort')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('button', { name: 'Weitere Episoden und Versionen laden' }).hasAttribute('disabled')).toBe(true)
    unmount()
    expect(groupedMock.mock.calls[1][1]?.signal?.aborted).toBe(true)
    await act(async () => current.resolve(publicPage([])))
  })
})

it('deduplicates variants only inside the same canonical episode', async () => {
  const common = variant(100, 7)
  groupedMock.mockResolvedValueOnce(publicPage([
    { episode_id: 50, episode_number: 1, episode_title: 'Erste Identität', version_count: 1, versions: [common] },
    { episode_id: 60, episode_number: 1, episode_title: 'Zweite Identität', version_count: 1, versions: [common] },
  ]))
  render(<FansubVersionBrowser animeID={22} fansubs={[]} episodes={[
    { episode_id: 50, episode_number: 1, episode_title: 'Erste Identität', version_count: 1, versions: [common] },
  ]} pagination={continued('same-number')} />)
  await act(async () => {})
  fireEvent.click(screen.getByRole('button', { name: /Erste Identität/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Weitere Episoden und Versionen laden' }))
  await waitFor(() => expect(screen.getByRole('button', { name: /Zweite Identität/ })).toBeTruthy())
  fireEvent.click(screen.getByRole('button', { name: /Zweite Identität/ }))
  expect(screen.getAllByRole('link', { name: 'Version abspielen' })).toHaveLength(2)
})
