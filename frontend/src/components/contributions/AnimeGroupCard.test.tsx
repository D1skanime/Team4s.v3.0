// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MeAnimeContribution } from '@/types/contributions'

const { catalogRoles } = vi.hoisted(() => ({
  catalogRoles: [
    { code: 'typesetter', label_de: 'Typesetting', contexts: ['anime_contribution'], sort_order: 10, color_key: '#7B3C4E', icon_key: 'wrench' },
    { code: 'karaoke_fx', label_de: 'Karaoke-FX', contexts: ['anime_contribution'], sort_order: 20, color_key: '#A16207', icon_key: 'image' },
    { code: 'encoder', label_de: 'Encoding', contexts: ['anime_contribution'], sort_order: 30, color_key: '#506B91', icon_key: 'film' },
    { code: 'timer', label_de: 'Timing', contexts: ['anime_contribution'], sort_order: 40, color_key: '#506B91', icon_key: 'film' },
  ],
}))

vi.mock('@/providers/RoleCatalogProvider', () => ({
  useRoleCatalog: () => ({ roles: catalogRoles, error: null }),
}))

import { AnimeGroupCard } from './AnimeGroupCard'

function makeContribution(overrides: Partial<MeAnimeContribution> = {}): MeAnimeContribution {
  return {
    id: 1,
    anime_id: 10,
    anime_title: 'Naruto',
    fansub_group_id: 5,
    fansub_group_member_id: 7,
    status: 'confirmed',
    role_codes: ['encoder', 'timer'],
    role_labels: ['Encoding', 'Timing'],
    started_year: null,
    ended_year: null,
    is_public_on_anime_page: true,
    is_public_on_member_profile: true,
    note: null,
    release_version_id: null,
    is_own_proposal: false,
    fansub_group_name: 'AnimeOwnage',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

describe('AnimeGroupCard', () => {
  it('orders catalog roles while keeping karaoke, typesetting and unknown roles distinct', () => {
    const { container } = render(
      <AnimeGroupCard
        animeId={10}
        animeTitle="Naruto"
        contributions={[makeContribution({
          role_codes: ['karaoke_fx', 'future_role', 'typesetter'],
          role_labels: [],
        })]}
        onVisibilityChange={vi.fn()}
      />,
    )

    const badges = Array.from(container.querySelectorAll('[data-color-key]'))
    expect(badges.map((badge) => badge.textContent)).toEqual([
      'Typesetting',
      'Karaoke-FX',
      'Future Role',
    ])
    expect(badges.map((badge) => badge.getAttribute('data-color-key'))).toEqual([
      '#7b3c4e',
      '#a16207',
      'neutral',
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Projektrollen anzeigen' }))
    expect(screen.getAllByRole('listitem').map((row) => row.textContent)).toEqual([
      expect.stringContaining('Typesetting'),
      expect.stringContaining('Karaoke-FX'),
      expect.stringContaining('Future Role'),
    ])
  })

  it('öffnet Projektrollen über einen separaten Chevron ohne Projekt-Link zu verändern', () => {
    render(
      <AnimeGroupCard
        animeId={10}
        animeTitle="Naruto"
        contributions={[makeContribution()]}
        onVisibilityChange={vi.fn()}
      />,
    )

    const projectLink = screen.getByRole('link', { name: 'Projekt öffnen' })
    expect(projectLink.getAttribute('href')).toBe('/me/projects/10/group/5')
    expect(screen.queryByText('Für das gesamte Projekt')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Projektrollen anzeigen' }))

    expect(screen.getByRole('button', { name: 'Projektrollen ausblenden' })).not.toBeNull()
    expect(projectLink.getAttribute('href')).toBe('/me/projects/10/group/5')
  })

  it('zeigt animeweite Rollen als eigene Zeilen mit eigenem Sichtbarkeits-Slider', () => {
    render(
      <AnimeGroupCard
        animeId={10}
        animeTitle="Naruto"
        contributions={[makeContribution()]}
        onVisibilityChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Projektrollen anzeigen' }))

    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Encoding')).not.toBeNull()
    expect(within(rows[1]).getByText('Timing')).not.toBeNull()
    expect(screen.getAllByText('Für das gesamte Projekt')).toHaveLength(2)
    expect(screen.getAllByRole('group', { name: 'Sichtbarkeit dieses Eintrags' })).toHaveLength(2)
    expect(screen.queryByText('wie oben')).toBeNull()
  })
})

describe('AnimeGroupCard catalog mutation propagation', () => {
  it('changes treatment when only the catalog color_key changes', () => {
    const contribution = makeContribution({ role_codes: ['typesetter'], role_labels: [] })
    const { container, unmount } = render(
      <AnimeGroupCard animeId={10} animeTitle="Naruto" contributions={[contribution]} onVisibilityChange={vi.fn()} />,
    )
    expect(container.querySelector('[data-color-key]')?.getAttribute('data-color-key')).toBe('#7b3c4e')
    unmount()

    const typesetting = catalogRoles.find((row) => row.code === 'typesetter')!
    const original = typesetting.color_key
    typesetting.color_key = '#A16207'
    try {
      const mutated = render(
        <AnimeGroupCard animeId={10} animeTitle="Naruto" contributions={[contribution]} onVisibilityChange={vi.fn()} />,
      )
      expect(mutated.container.querySelector('[data-color-key]')?.getAttribute('data-color-key')).toBe('#a16207')
    } finally {
      typesetting.color_key = original
    }
  })
})
