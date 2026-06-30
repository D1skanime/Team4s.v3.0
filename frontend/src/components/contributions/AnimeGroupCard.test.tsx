// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MeAnimeContribution } from '@/types/contributions'

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
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

describe('AnimeGroupCard', () => {
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

  it('zeigt animeweite Rollen als eigene Zeilen mit gemeinsamem Sichtbarkeits-Slider pro Eintrag', () => {
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
    expect(screen.getAllByRole('group', { name: 'Sichtbarkeit dieses Eintrags' })).toHaveLength(1)
    expect(screen.getByText('Rollen aus demselben Eintrag teilen sich eine Sichtbarkeit.')).not.toBeNull()
    expect(screen.getByText('wie oben')).not.toBeNull()
  })
})
