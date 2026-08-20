// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ProjectMemberRelease } from '@/types/projectMember'
import type { CursorPage } from '@/types/releaseDetail'

const getProjectMemberReleases = vi.fn()
const { catalogRoles } = vi.hoisted(() => ({
  catalogRoles: [
    { code: 'typesetter', label_de: 'Typesetting', contexts: ['anime_contribution'], sort_order: 10, color_key: 'technical', icon_key: 'wrench' },
    { code: 'karaoke_fx', label_de: 'Karaoke-FX', contexts: ['anime_contribution'], sort_order: 20, color_key: 'creative', icon_key: 'image' },
    { code: 'translator', label_de: 'Übersetzung', contexts: ['anime_contribution'], sort_order: 30, color_key: 'language', icon_key: 'languages' },
    { code: 'timer', label_de: 'Timing', contexts: ['anime_contribution'], sort_order: 40, color_key: 'production', icon_key: 'film' },
  ],
}))
vi.mock('@/lib/api', () => ({
  getProjectMemberReleases: (...args: unknown[]) => getProjectMemberReleases(...args),
}))
vi.mock('@/providers/RoleCatalogProvider', () => ({
  useRoleCatalog: () => ({ roles: catalogRoles, error: null }),
}))

import { ProjectMemberReleaseCard } from './ProjectMemberReleaseCard'
import { ProjectMemberHero } from './ProjectMemberHero'
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
  it('renders the project-member hero roles through the same catalog order', () => {
    render(
      <ProjectMemberHero
        summary={{
          member_id: 7,
          member_slug: 'sorata',
          member_display_name: 'Sorata',
          member_avatar_url: null,
          is_verified: true,
          role_labels: ['Karaoke-FX', 'future_role', 'Typesetting'],
          counts: { roles: 3, notes: 0, media: 0, releases: 1 },
        }}
        memberSlug="sorata"
        groupName="C-Subs"
        animeTitle="Viper’s Creed"
        projectPath="/fansubs/c-subs/fansubprojekt/vipers-creed"
      />,
    )

    expect(screen.getByText('Typesetting').getAttribute('data-role-code')).toBe('technical')
    expect(screen.getByText('Karaoke-FX').getAttribute('data-role-code')).toBe('creative')
    expect(screen.getByText('future_role').getAttribute('data-role-code')).toBe('other')
  })

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
    expect(screen.getByText('Übersetzung').getAttribute('data-role-code')).toBe('language')
    expect(screen.getByText('Timing').getAttribute('data-role-code')).toBe('production')
    expect(screen.getByText('bestätigt 12.04.2024')).not.toBeNull()
    const link = screen.getByRole('link', { name: 'Release ansehen →' })
    expect(link.getAttribute('href')).toBe('/fansubs/c-subs/fansubprojekt/vipers-creed/releases/1')
    expect(container.querySelector('img')).toBeNull()
  })

  it('keeps karaoke, typesetting and an unknown catalog value distinct and ordered', () => {
    render(
      <ul>
        <ProjectMemberReleaseCard
          release={release({ role_labels: ['Karaoke-FX', 'future_role', 'Typesetting'] })}
          projectPath="/fansubs/c-subs/fansubprojekt/vipers-creed"
        />
      </ul>,
    )

    const roleRow = screen.getByText('Folge 08').parentElement?.querySelector('[class*="rowRoles"]')
    expect(Array.from(roleRow?.children ?? []).map((role) => role.textContent)).toEqual([
      'Typesetting',
      'Karaoke-FX',
      'future_role',
    ])
    expect(screen.getByText('future_role').getAttribute('data-role-code')).toBe('other')
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
