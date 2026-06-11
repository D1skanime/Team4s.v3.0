// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { MeAnimeContribution } from '@/types/contributions'

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
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

describe('ContributionCard', () => {
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
