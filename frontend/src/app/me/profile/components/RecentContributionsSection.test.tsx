// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { MemberProfileRecentContribution } from '@/types/profile'

import { RecentContributionsSection } from './RecentContributionsSection'

afterEach(() => {
  cleanup()
})

function makeContribution(overrides: Partial<MemberProfileRecentContribution> = {}): MemberProfileRecentContribution {
  return {
    id: 1,
    anime_id: 11,
    anime_title: 'Maboroshi no Fansub',
    fansub_group_name: 'Phase Fansubs',
    role_name: 'typesetter',
    role_label: 'Typesetter',
    ...overrides,
  }
}

describe('RecentContributionsSection', () => {
  it('renders the exact empty state when there are no contributions', () => {
    render(<RecentContributionsSection items={[]} canView={true} isPublicView={false} />)

    expect(screen.getByText('Noch keine Projekte sichtbar.')).not.toBeNull()
  })

  it('renders contribution cards with anime title, group name, and role label', () => {
    render(
      <RecentContributionsSection
        canView={true}
        isPublicView={true}
        items={[
          makeContribution({ id: 1, anime_title: 'Maboroshi no Fansub', fansub_group_name: 'Phase Fansubs', role_label: 'Typesetter' }),
          makeContribution({ id: 2, anime_id: 12, anime_title: 'QC Memories', fansub_group_name: 'Archiv Team', role_label: 'Quality Check' }),
        ]}
      />,
    )

    const list = screen.getByRole('list', { name: 'Letzte Projekte' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Maboroshi no Fansub')).not.toBeNull()
    expect(screen.getByText('Phase Fansubs')).not.toBeNull()
    expect(screen.getByText('Typesetter')).not.toBeNull()
    expect(screen.getByText('QC Memories')).not.toBeNull()
    expect(screen.getByText('Archiv Team')).not.toBeNull()
    expect(screen.getByText('Quality Check')).not.toBeNull()
  })
})
