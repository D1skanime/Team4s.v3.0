// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { buildFansubStoryGroups } from '@/lib/fansub-summary'
import type { EpisodeVersion } from '@/types/episodeVersion'
import type { AnimeFansubRelation } from '@/types/fansub'
import { FansubVersionBrowser } from './FansubVersionBrowser'

const fansubs: AnimeFansubRelation[] = [
  { anime_id: 22, fansub_group_id: 7, is_primary: true, created_at: '', fansub_group: { id: 7, slug: 'saved-primary', name: 'Anderer Gruppenname' } },
  { anime_id: 22, fansub_group_id: 9, is_primary: false, created_at: '', fansub_group: { id: 9, slug: 'saved-secondary', name: 'Zweite Gruppe' } },
]
beforeEach(() => { window.localStorage.clear() })
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

  it('keeps real episode titles and expansion behavior', () => {
    render(<FansubVersionBrowser animeID={22} animeSlug="stored-anime" fansubs={fansubs} episodes={[{
      episode_number: 1, episode_title: 'Gespeicherter Episodentitel', version_count: 0, versions: [],
    }]} />)
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

const variant = (id: number, group: number): EpisodeVersion => ({
  id, variant_id: id, release_version_id: id + 100, anime_id: 22, episode_number: 1,
  title: `Variante ${group}`, fansub_groups: [fansubs[group === 7 ? 0 : 1].fansub_group!],
  media_provider: 'test', media_item_id: '', segment_count: 0, has_segment_asset: false,
  created_at: '', updated_at: '',
})
const stateEpisodes = [{ episode_number: 1, episode_title: 'Gruppenfolge', version_count: 2, versions: [variant(10, 7), variant(20, 9)] }]
function stateBrowser(relations = fansubs, animeID = 22) {
  return <FansubVersionBrowser animeID={animeID} fansubs={relations} storyGroups={buildFansubStoryGroups(relations)} episodes={stateEpisodes} />
}
function assertGroup(id: 7 | 9) {
  const selected = fansubs[id === 7 ? 0 : 1].fansub_group!
  expect(screen.getByRole('button', { name: selected.name }).getAttribute('aria-pressed')).toBe('true')
  expect(within(screen.getByRole('article')).getByRole('link', { name: selected.name })).toBeTruthy()
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
