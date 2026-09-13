// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { AnimeFansubRelation } from '@/types/fansub'
import { FansubVersionBrowser } from './FansubVersionBrowser'

const fansubs: AnimeFansubRelation[] = [
  { anime_id: 22, fansub_group_id: 7, is_primary: true, created_at: '', fansub_group: { id: 7, slug: 'saved-primary', name: 'Anderer Gruppenname' } },
  { anime_id: 22, fansub_group_id: 9, is_primary: false, created_at: '', fansub_group: { id: 9, slug: 'saved-secondary', name: 'Zweite Gruppe' } },
]
beforeEach(() => { window.localStorage.clear() })
afterEach(cleanup)

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
