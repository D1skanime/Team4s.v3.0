// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import type { AnimeContributionGroup } from '@/types/contributions'

import { GroupContributionBlock } from './GroupContributionBlock'

afterEach(() => {
  cleanup()
})

function baseGroup(overrides: Partial<AnimeContributionGroup> = {}): AnimeContributionGroup {
  return {
    fansub_group_id: 1,
    fansub_group_name: 'Beispiel-Fansub',
    fansub_group_slug: 'beispiel-fansub',
    active_from_year: 2010,
    active_until_year: null,
    contributors: [
      {
        member_display_name: 'Anime-Weit Member',
        member_slug: 'anime-weit-member',
        roles: ['translation'],
        role_labels: ['Übersetzung'],
        started_year: 2010,
        ended_year: null,
        is_verified: true,
      },
    ],
    hidden_contributor_count: 0,
    ...overrides,
  }
}

describe('GroupContributionBlock', () => {
  it('zeigt ohne version_breakdown keinen Nach-Release-Version-Trigger und kein Allgemein-Label', () => {
    render(<GroupContributionBlock group={baseGroup()} expanded onToggle={() => {}} />)

    expect(screen.queryByText(/Nach Release-Version/)).toBeNull()
    expect(screen.queryByText('Allgemein an der Serie beteiligt:')).toBeNull()
    expect(screen.getByText('Anime-Weit Member')).toBeTruthy()
  })

  it('zeigt mit version_breakdown das Allgemein-Label und einen aufklappbaren Trigger, der Episode·Version + Contributor offenlegt', () => {
    const group = baseGroup({
      version_breakdown: [
        {
          release_version_id: 42,
          episode_number: '1',
          version: 'v1',
          contributors: [
            {
              member_display_name: 'Versions Member',
              member_slug: 'versions-member',
              roles: ['encode'],
              role_labels: ['Encode'],
              started_year: 2011,
              ended_year: null,
              is_verified: false,
            },
          ],
        },
      ],
    })

    render(<GroupContributionBlock group={group} expanded onToggle={() => {}} />)

    // Ebene-1-Label sichtbar, weil versions-spezifische Beiträge existieren.
    expect(screen.getByText('Allgemein an der Serie beteiligt:')).toBeTruthy()

    // Trigger vorhanden, Versions-Inhalt zunächst geschlossen.
    const trigger = screen.getByRole('button', { name: /Nach Release-Version/ })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Versions Member')).toBeNull()

    // Nach Klick: Episode·Version-Kopf + Contributor sichtbar.
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText(/Episode\s*1\s*·\s*v1/)).toBeTruthy()
    expect(screen.getByText('Versions Member')).toBeTruthy()
  })
})
