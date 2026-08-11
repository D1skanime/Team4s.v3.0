// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ProjectMemberRelease } from '@/types/projectMember'
import type { CursorPage } from '@/types/releaseDetail'

const getProjectMemberReleases = vi.fn()
vi.mock('@/lib/api', () => ({
  getProjectMemberReleases: (...args: unknown[]) => getProjectMemberReleases(...args),
}))

import { ProjectMemberReleaseCard } from './ProjectMemberReleaseCard'
import { ProjectMemberReleasesSection } from './ProjectMemberReleasesSection'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const release = (overrides: Partial<ProjectMemberRelease> = {}): ProjectMemberRelease => ({
  release_version_id: 1,
  episode_label: '08',
  version_label: '1',
  confirmed_at: '2024-04-12T00:00:00Z',
  role_labels: ['Übersetzung', 'Timing'],
  ...overrides,
})

const page = (
  items: ProjectMemberRelease[],
  next: string | null,
  more: boolean,
): CursorPage<ProjectMemberRelease> => ({ items, next_cursor: next, has_more: more })

describe('ProjectMemberReleaseCard', () => {
  it('renders a compact row: episode, roles, confirmed date and release link (no images)', () => {
    const { container } = render(
      <ul>
        <ProjectMemberReleaseCard
          release={release()}
          projectPath="/fansubs/c-subs/fansubprojekt/vipers-creed"
        />
      </ul>,
    )
    expect(screen.getByText('Folge 08')).not.toBeNull()
    // Rollen sind jetzt einzelne farbcodierte Chips (data-role-code -> Team4s-Rollenfarbe).
    expect(screen.getByText('Übersetzung').getAttribute('data-role-code')).toBe('translator')
    expect(screen.getByText('Timing').getAttribute('data-role-code')).toBe('timer')
    expect(screen.getByText('bestätigt 12.04.2024')).not.toBeNull()
    const link = screen.getByRole('link', { name: 'Release ansehen →' })
    expect(link.getAttribute('href')).toBe('/fansubs/c-subs/fansubprojekt/vipers-creed/releases/1')
    expect(container.querySelector('img')).toBeNull()
  })
})

describe('ProjectMemberReleasesSection', () => {
  it('loads the initial page and appends more without duplicates', async () => {
    const first = Array.from({ length: 15 }, (_, i) => release({ release_version_id: i + 1 }))
    const second = Array.from({ length: 10 }, (_, i) => release({ release_version_id: i + 15 }))
    getProjectMemberReleases
      .mockResolvedValueOnce(page(first, 'c1', true))
      .mockResolvedValueOnce(page(second, null, false))

    render(
      <ProjectMemberReleasesSection
        animeID={10}
        groupID={20}
        memberSlug="csubs-leader"
        projectPath="/p"
        count={24}
      />,
    )
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(15))
    fireEvent.click(screen.getByText('Weitere laden'))
    // 15 + 10 - 1 Duplikat (id 15) = 24
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(24))
  })

  it('can show fewer again after loading more', async () => {
    const first = Array.from({ length: 15 }, (_, i) => release({ release_version_id: i + 1 }))
    const second = Array.from({ length: 10 }, (_, i) => release({ release_version_id: i + 100 }))
    getProjectMemberReleases
      .mockResolvedValueOnce(page(first, 'c1', true))
      .mockResolvedValueOnce(page(second, null, false))

    render(
      <ProjectMemberReleasesSection
        animeID={10}
        groupID={20}
        memberSlug="csubs-leader"
        projectPath="/p"
        count={25}
      />,
    )
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(15))
    fireEvent.click(screen.getByText('Weitere laden'))
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(25))
    // Jetzt wieder einklappen
    fireEvent.click(screen.getByText('Weniger anzeigen'))
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(15))
  })
})
