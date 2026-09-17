// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { buildFansubStoryGroups } from '@/lib/fansub-summary'
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
beforeEach(() => { window.localStorage.clear(); groupedMock.mockReset() })
afterEach(async () => { await act(async () => {}); cleanup(); vi.restoreAllMocks() })

describe('authoritative anime project navigation', () => {
  it('links the primary and selected group via their stored slugs', () => {
    render(<FansubVersionBrowser animeID={22} animeSlug="stored-anime" fansubs={fansubs} episodes={[]} />)
    expect(screen.getByRole('link', { name: 'Zum Gruppenbereich' }).getAttribute('href')).toBe('/fansubs/saved-primary/fansubprojekt/stored-anime')
    fireEvent.click(screen.getByRole('button', { name: 'Zweite Gruppe' }))
    expect(screen.getByRole('link', { name: 'Zum Gruppenbereich' }).getAttribute('href')).toBe('/fansubs/saved-secondary/fansubprojekt/stored-anime')
  })

  it('uses the existing encoder and trims authoritative slugs', () => {
    render(<FansubVersionBrowser animeID={22} animeSlug=" stored/anime " fansubs={[{ ...fansubs[0], fansub_group: { id: 7, slug: ' saved group ', name: 'Kein Slug' } }]} episodes={[]} />)
    expect(screen.getByRole('link', { name: 'Zum Gruppenbereich' }).getAttribute('href')).toBe('/fansubs/saved%20group/fansubprojekt/stored%2Fanime')
  })

  it.each([undefined, '', '   '])('retains numeric compatibility when the anime slug is %j', (animeSlug) => {
    render(<FansubVersionBrowser animeID={22} animeSlug={animeSlug} fansubs={fansubs} episodes={[]} />)
    expect(screen.getByRole('link', { name: 'Zum Gruppenbereich' }).getAttribute('href')).toBe('/anime/22/group/7')
  })

  it('retains numeric compatibility when the selected group has no slug', () => {
    render(<FansubVersionBrowser animeID={22} animeSlug="stored-anime" fansubs={[{ ...fansubs[0], fansub_group: { id: 7, slug: ' ', name: 'Kein Slug' } }]} episodes={[]} />)
    expect(screen.getByRole('link', { name: 'Zum Gruppenbereich' }).getAttribute('href')).toBe('/anime/22/group/7')
  })

  it('renders no invented group link without a group', () => {
    render(<FansubVersionBrowser animeID={22} animeSlug="stored-anime" fansubs={[]} episodes={[]} />)
    expect(screen.queryByRole('link', { name: 'Zum Gruppenbereich' })).toBeNull()
  })

  it('keeps real episode titles and expansion behavior', async () => {
    render(<FansubVersionBrowser animeID={22} animeSlug="stored-anime" fansubs={fansubs} episodes={[{
      episode_id: 50, episode_number: 1, episode_title: 'Gespeicherter Episodentitel', version_count: 0, versions: [],
    }]} />)
    await act(async () => {})
    const toggle = screen.getByRole('button', { name: /Gespeicherter Episodentitel/ })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Keine Version dieser Gruppe verfügbar.')).toBeTruthy()
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
function stateBrowser(relations = fansubs, animeID = 22) {
  return <FansubVersionBrowser animeID={animeID} fansubs={relations} storyGroups={buildFansubStoryGroups(relations)} episodes={stateEpisodes} />
}
function assertGroup(id: 7 | 9) {
  const selected = fansubs[id === 7 ? 0 : 1].fansub_group!
  expect(screen.getByRole('button', { name: selected.name }).getAttribute('aria-pressed')).toBe('true')
  // D-13: the group-specific area renders the group name as a heading WITHOUT a link.
  const heading = within(screen.getByRole('article')).getByRole('heading', { name: selected.name })
  expect(heading).toBeTruthy()
  expect(within(screen.getByRole('article')).queryByRole('link', { name: selected.name })).toBeNull()
  expect(screen.getByText(`Variante ${id}`)).toBeTruthy()
  expect(screen.queryByText(`Variante ${id === 7 ? 9 : 7}`)).toBeNull()
}
function storage(value: string | null, key: string | null = 'anime:22:fansub-filter') {
  act(() => window.dispatchEvent(new StorageEvent('storage', { key, newValue: value })))
}
describe('one deterministic group owner', () => {
  it('changes story, pressed filter and variants together without polling or mount writes', async () => {
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    const intervals = vi.spyOn(window, 'setInterval')
    render(stateBrowser())
    fireEvent.click(screen.getByRole('button', { name: /Gruppenfolge/ }))
    assertGroup(7)
    fireEvent.click(screen.getByRole('button', { name: 'Zweite Gruppe' }))
    assertGroup(9)
    await act(async () => {})
    expect(writes).toHaveBeenCalledTimes(1)
    expect(intervals).not.toHaveBeenCalled()
  })
  it('hydrates deterministic primary HTML then restores secondary in StrictMode without overwriting it', async () => {
    window.localStorage.setItem('anime:22:fansub-filter', '{"activeFansubGroupId":9}')
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    const element = <StrictMode>{stateBrowser()}</StrictMode>
    const html = renderToString(element)
    expect(html).toMatch(/aria-pressed="true"[^>]*>Anderer Gruppenname/)
    const container = document.createElement('div')
    document.body.append(container)
    container.innerHTML = html
    const recoverable = vi.fn()
    const errors = vi.spyOn(console, 'error')
    let root: ReturnType<typeof hydrateRoot>
    await act(async () => { root = hydrateRoot(container, element, { onRecoverableError: recoverable }) })
    fireEvent.click(screen.getByRole('button', { name: /Gruppenfolge/ }))
    assertGroup(9)
    expect(recoverable).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    expect(writes).not.toHaveBeenCalled()
    await act(async () => root.unmount())
    container.remove()
  })
  it('uses last own-key event; ignores foreign keys and never writes back', async () => {
    render(stateBrowser())
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /Gruppenfolge/ }))
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    storage('{"activeFansubGroupId":9}')
    assertGroup(9)
    storage('{"activeFansubGroupId":7}', 'anime:23:fansub-filter')
    assertGroup(9)
    storage('{"activeFansubGroupId":7}')
    assertGroup(7)
    expect(writes).not.toHaveBeenCalled()
  })
  it.each([null, 'oops', 'null', '{}', '{"activeFansubGroupId":0}', '{"activeFansubGroupId":-1}', '{"activeFansubGroupId":1.5}', '{"activeFansubGroupId":9007199254740992}', '{"activeFansubGroupId":"9"}', '{"activeFansubGroupId":77}'])('falls back on removed/invalid selection %s', async (value) => {
    render(stateBrowser())
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /Gruppenfolge/ }))
    storage('{"activeFansubGroupId":9}')
    storage(value)
    assertGroup(7)
  })
  it('handles clear and validates removed groups/new anime props', async () => {
    const { rerender } = render(stateBrowser())
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /Gruppenfolge/ }))
    storage('{"activeFansubGroupId":9}')
    storage(null, null)
    assertGroup(7)
    storage('{"activeFansubGroupId":9}')
    rerender(stateBrowser([fansubs[0]]))
    assertGroup(7)
    rerender(stateBrowser(fansubs, 23))
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /Gruppenfolge/ }))
    storage('{"activeFansubGroupId":9}')
    assertGroup(7)
    storage('{"activeFansubGroupId":9}', 'anime:23:fansub-filter')
    assertGroup(9)
  })
  it.each(['access', 'read', 'write'])('keeps selection usable when storage %s is blocked', async (mode) => {
    if (mode === 'access') vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('blocked') })
    if (mode === 'read') vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    if (mode === 'write') vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    render(stateBrowser())
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /Gruppenfolge/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Zweite Gruppe' }))
    assertGroup(9)
  })
})

const ended: PublicGroupedEpisodesResponse['data']['pagination'] = { has_more: false, next_cursor: null, row_limit: 24 }
const continued = (cursor: string) => ({ ...ended, has_more: true, next_cursor: cursor })
function publicPage(episodes: PublicGroupedEpisode[], pagination = ended): PublicGroupedEpisodesResponse {
  return { data: { anime_id: 22, episodes, pagination } }
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
    for (let offset = 23; offset < 125; offset += 23) {
      const last = offset + 23 >= 125
      groupedMock.mockResolvedValueOnce(publicPage([
        episode(variants.slice(offset - 1, Math.min(offset + 23, 125))),
        ...(last ? [{ episode_id: 51, episode_number: 1, episode_title: 'Neutrale gleiche Nummer', version_count: 0, versions: [] }] : []),
      ], last ? ended : continued(`cursor-${offset + 23}`)))
    }
    render(<FansubVersionBrowser animeID={22} fansubs={fansubs} episodes={[episode(variants.slice(0, 23))]} pagination={continued('cursor-23')} />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /Große Folge/ }))
    expect(screen.getByText('+125 Versionen')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Zweite Gruppe' }))
    expect(screen.getByText(/geladenen Ausschnitt/)).toBeTruthy()
    expect(getGroupedEpisodes).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Anderer Gruppenname' }))
    for (let index = 0; index < 5; index++) {
      fireEvent.click(screen.getByRole('button', { name: 'Weitere Episoden und Versionen laden' }))
      await waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(index + 1))
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Weitere Episoden und Versionen laden' })?.hasAttribute('disabled')).not.toBe(true))
    }
    expect(screen.queryByRole('button', { name: 'Weitere Episoden und Versionen laden' })).toBeNull()
    expect(screen.getByRole('button', { name: /Große Folge/ }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: /Neutrale gleiche Nummer/ }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.getAllByRole('link', { name: 'Version abspielen' })).toHaveLength(124)
    expect(screen.getByText('+125 Versionen')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Zweite Gruppe' }))
    expect(screen.getByText('Geladene Variante 124')).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Version abspielen' })).toHaveLength(1)
    expect(getGroupedEpisodes).toHaveBeenCalledTimes(5)
    expect(getGroupedEpisodes).toHaveBeenNthCalledWith(1, 22, expect.objectContaining({ projection: 'public', limit: 24, cursor: 'cursor-23', signal: expect.any(AbortSignal) }))
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
