// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MeAnimeContribution } from '@/types/contributions'

const { catalogRoles } = vi.hoisted(() => ({
  catalogRoles: [
    { code: 'typer', label_de: 'Typesetting', contexts: ['anime_contribution'], sort_order: 10, color_key: 'technical', icon_key: 'wrench' },
    { code: 'karaoke_fx', label_de: 'Karaoke-FX', contexts: ['anime_contribution'], sort_order: 20, color_key: 'creative', icon_key: 'image' },
  ],
}))

vi.mock('@/providers/RoleCatalogProvider', () => ({
  useRoleCatalog: () => ({ roles: catalogRoles, error: null }),
}))

import { ContributionCard } from './ContributionCard'

function makeContribution(overrides: Partial<MeAnimeContribution> = {}): MeAnimeContribution {
  return {
    id: 1,
    anime_id: 10,
    anime_title: 'Naruto',
    fansub_group_id: 5,
    fansub_group_member_id: 7,
    status: 'confirmed',
    role_codes: ['timer'],
    role_labels: ['Timing'],
    started_year: null,
    ended_year: null,
    is_public_on_anime_page: true,
    is_public_on_member_profile: true,
    note: null,
    release_version_id: null,
    is_own_proposal: false,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

describe('ContributionCard', () => {
  it('renders catalog roles in order with distinct and neutral presentation', () => {
    const { container } = render(
      <ContributionCard
        contribution={makeContribution({
          role_codes: ['karaoke_fx', 'future_role', 'typer'],
          role_labels: [],
        })}
        mode="confirmed"
      />,
    )

    const badges = Array.from(container.querySelectorAll('[data-role-code]'))
    expect(badges.map((badge) => badge.textContent)).toEqual([
      'Typesetting',
      'Karaoke-FX',
      'Future Role',
    ])
    expect(badges.map((badge) => badge.getAttribute('data-role-code'))).toEqual([
      'technical',
      'creative',
      'other',
    ])
  })

  it('links confirmed release-version contributions to the member workspace', () => {
    render(
      <ContributionCard
        contribution={makeContribution({ release_version_id: 42 })}
        mode="confirmed"
        onVisibilityChange={() => undefined}
      />,
    )

    const link = screen.getByRole('link', { name: 'Arbeitsfläche öffnen' })
    expect(link.getAttribute('href')).toBe('/me/releases/42/workspace')
  })

  it('does not show a workspace link for anime-wide contributions', () => {
    render(
      <ContributionCard
        contribution={makeContribution({ release_version_id: null })}
        mode="confirmed"
        onVisibilityChange={() => undefined}
      />,
    )

    expect(screen.queryByRole('link', { name: 'Arbeitsfläche öffnen' })).toBeNull()
  })
})
