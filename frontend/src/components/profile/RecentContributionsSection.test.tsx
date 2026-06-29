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
    fansub_group_id: 7,
    fansub_group_name: 'Phase Fansubs',
    role_name: 'typesetter',
    role_label: 'Typesetter',
    fansub_group_names: ['Phase Fansubs'],
    role_names: ['typesetter'],
    role_labels: ['Typesetter'],
    release_version_count: 1,
    episode_count: 1,
    ...overrides,
  }
}

describe('RecentContributionsSection', () => {
  it('renders the project empty state when there are no visible items', () => {
    render(<RecentContributionsSection items={[]} canView={true} isPublicView={false} />)

    expect(screen.getByText('Noch keine Projekte sichtbar.')).not.toBeNull()
  })

  it('merges multiple release-version rows of the same anime into one project card', () => {
    render(
      <RecentContributionsSection
        canView={true}
        isPublicView={false}
        items={[
          makeContribution({ id: 101, release_version_count: undefined, episode_count: undefined }),
          makeContribution({
            id: 102,
            role_name: 'editor',
            role_label: 'Editing',
            role_names: undefined,
            role_labels: undefined,
            release_version_count: undefined,
            episode_count: undefined,
          }),
        ]}
      />,
    )

    const list = screen.getByRole('list', { name: 'Letzte Projekte' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Maboroshi no Fansub')).not.toBeNull()
    expect(screen.getByText('Typesetter')).not.toBeNull()
    expect(screen.getByText('Editing')).not.toBeNull()
    expect(screen.getByText('2 Release-Versionen / 2 Folgen')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Projekt öffnen' }).getAttribute('href')).toBe('/me/projects/11/group/7')
  })

  it('keeps anime projects separate per fansub group for own project links', () => {
    render(
      <RecentContributionsSection
        canView={true}
        isPublicView={false}
        items={[
          makeContribution({ id: 1, fansub_group_id: 7, fansub_group_name: 'Phase Fansubs' }),
          makeContribution({ id: 2, fansub_group_id: 8, fansub_group_name: 'Archiv Team' }),
        ]}
      />,
    )

    const list = screen.getByRole('list', { name: 'Letzte Projekte' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    const links = screen.getAllByRole('link', { name: 'Projekt öffnen' })
    expect(links[0].getAttribute('href')).toBe('/me/projects/11/group/7')
    expect(links[1].getAttribute('href')).toBe('/me/projects/11/group/8')
  })

  it('does not link public profile projects to the private me workspace', () => {
    render(
      <RecentContributionsSection
        canView={true}
        isPublicView={true}
        items={[makeContribution()]}
      />,
    )

    expect(screen.queryByRole('link', { name: 'Projekt öffnen' })).toBeNull()
  })

  it('deduplicates repeated roles and keeps distinct fansub groups', () => {
    render(
      <RecentContributionsSection
        canView={true}
        isPublicView={false}
        items={[
          makeContribution({
            id: 1,
            fansub_group_names: ['Phase Fansubs', 'Archiv Team'],
            role_labels: ['Typesetter', 'Typesetter', 'Quality Check'],
            release_version_count: 2,
            episode_count: 2,
          }),
        ]}
      />,
    )

    expect(screen.getAllByText('Typesetter')).toHaveLength(1)
    expect(screen.getByText('Quality Check')).not.toBeNull()
    expect(screen.getByText('Phase Fansubs')).not.toBeNull()
    expect(screen.getByText('Archiv Team')).not.toBeNull()
  })

  it('keeps separate anime projects visible', () => {
    render(
      <RecentContributionsSection
        canView={true}
        isPublicView={true}
        items={[
          makeContribution({ id: 1, anime_id: 11, anime_title: 'Maboroshi no Fansub' }),
          makeContribution({ id: 2, anime_id: 12, anime_title: 'QC Memories', fansub_group_name: 'Archiv Team' }),
        ]}
      />,
    )

    const list = screen.getByRole('list', { name: 'Letzte Projekte' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Maboroshi no Fansub')).not.toBeNull()
    expect(screen.getByText('QC Memories')).not.toBeNull()
  })
})
