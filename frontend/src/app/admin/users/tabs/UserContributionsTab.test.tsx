// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminContributionProjectBlock, AdminUserContributionsPage } from '@/types/admin-users'

const { catalogState, getAdminUserContributionsMock } = vi.hoisted(() => ({
  catalogState: { roles: [
    { code: 'karaoke_fx', label_de: 'Karaoke FX', contexts: ['anime_contribution'], sort_order: 10, color_key: 'creative', icon_key: 'image' },
    { code: 'typer', label_de: 'Typesetting', contexts: ['anime_contribution'], sort_order: 20, color_key: 'technical', icon_key: 'wrench' },
  ], error: null as string | null }, getAdminUserContributionsMock: vi.fn(),
}))
vi.mock('@/lib/api', () => ({ ApiError: class ApiError extends Error {}, getAdminUserContributions: (...args: unknown[]) => getAdminUserContributionsMock(...args) }))
vi.mock('@/providers/RoleCatalogProvider', () => ({ useRoleCatalog: () => catalogState }))
import { UserContributionsTab } from './UserContributionsTab'

function makeBlock(overrides: Partial<AdminContributionProjectBlock> = {}): AdminContributionProjectBlock {
  return {
    anime_id: 3,
    anime_title: 'Test Anime',
    fansub_group_id: 2,
    fansub_group_name: 'Example Subs',
    project_standard: { role_codes: [], contributor_labels: [] },
    range_entries: [],
    ...overrides,
  }
}

function makePage(blocks: AdminContributionProjectBlock[]): AdminUserContributionsPage {
  return {
    data: blocks,
    meta: { total: blocks.length, limit: 25, offset: 0 },
    filter_options: { animes: [], groups: [] },
  }
}

afterEach(() => { cleanup(); vi.clearAllMocks(); catalogState.error = null })

describe('UserContributionsTab', () => {
  it('zeigt Karaoke FX und Typesetting getrennt mit Katalogdarstellung', async () => {
    getAdminUserContributionsMock.mockResolvedValue(
      makePage([makeBlock({ project_standard: { role_codes: ['typer', 'karaoke_fx'], contributor_labels: [] } })]),
    )
    const { container } = render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Karaoke FX')).not.toBeNull())
    expect(screen.getByText('Typesetting')).not.toBeNull()
    expect(Array.from(container.querySelectorAll('[data-role-code]')).map((node) => node.textContent)).toEqual(['Karaoke FX', 'Typesetting'])
    expect(container.querySelector('[data-role-code="creative"]')?.getAttribute('data-role-icon')).toBe('image')
    expect(container.querySelector('[data-role-code="technical"]')?.getAttribute('data-role-icon')).toBe('wrench')
  })

  it('hält unbekannte gespeicherte Codes neutral lesbar', async () => {
    getAdminUserContributionsMock.mockResolvedValue(
      makePage([makeBlock({ project_standard: { role_codes: ['future_scene_role'], contributor_labels: [] } })]),
    )
    const { container } = render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Future Scene Role')).not.toBeNull())
    expect(container.querySelector('[data-role-code="other"]')?.getAttribute('data-role-icon')).toBe('user')
  })

  it('zeigt leere Beiträge ohne Rollen-Fallback', async () => {
    getAdminUserContributionsMock.mockResolvedValue(makePage([]))
    render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Keine Beiträge vorhanden.')).not.toBeNull())
    expect(screen.queryByText('Karaoke FX')).toBeNull()
  })

  it('zeigt den Providerfehler ohne statische Rollenwahrheit', async () => {
    catalogState.error = 'catalog_unavailable'
    getAdminUserContributionsMock.mockResolvedValue(
      makePage([makeBlock({ project_standard: { role_codes: ['karaoke_fx'], contributor_labels: [] } })]),
    )
    render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Rollen konnten nicht geladen werden' })).not.toBeNull())
    expect(screen.queryByText('Karaoke FX')).toBeNull()
  })

  it('zeigt eine reale Abweichung als Hinweis-Badge, während der Projektstandard unmarkiert bleibt', async () => {
    getAdminUserContributionsMock.mockResolvedValue(
      makePage([
        makeBlock({
          project_standard: { role_codes: ['typer'], contributor_labels: ['Aki'] },
          range_entries: [
            {
              from_label: 'Episode 1',
              to_label: 'Episode 4',
              is_deviation: false,
              deviation_detail: null,
              role_codes: ['typer'],
            },
            {
              from_label: 'Episode 5',
              to_label: 'Episode 5',
              is_deviation: true,
              deviation_detail: 'Karaoke FX statt Typesetting',
              role_codes: ['karaoke_fx'],
            },
          ],
        }),
      ]),
    )
    render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Test Anime')).not.toBeNull())
    expect(screen.getByText('Episode 1 – Episode 4')).not.toBeNull()
    expect(screen.getByText('Episode 5')).not.toBeNull()
    expect(screen.getByText('Karaoke FX statt Typesetting')).not.toBeNull()
    expect(screen.getByText('Standard')).not.toBeNull()
  })
})
