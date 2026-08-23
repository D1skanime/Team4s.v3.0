// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminContributionItem, AdminUserContributionsResponse } from '@/types/admin-users'

const { catalogState, getAdminUserContributionsMock } = vi.hoisted(() => ({
  catalogState: { roles: [
    { code: 'karaoke_fx', label_de: 'Karaoke FX', contexts: ['anime_contribution'], sort_order: 10, color_key: 'creative', icon_key: 'image' },
    { code: 'typer', label_de: 'Typesetting', contexts: ['anime_contribution'], sort_order: 20, color_key: 'technical', icon_key: 'wrench' },
  ], error: null as string | null }, getAdminUserContributionsMock: vi.fn(),
}))
vi.mock('@/lib/api', () => ({ ApiError: class ApiError extends Error {}, getAdminUserContributions: (...args: unknown[]) => getAdminUserContributionsMock(...args) }))
vi.mock('@/providers/RoleCatalogProvider', () => ({ useRoleCatalog: () => catalogState }))
import { UserContributionsTab } from './UserContributionsTab'

const contribution = (roleCodes: string[]): AdminContributionItem => ({ contribution_id: 1, fansub_group_id: 2, fansub_group_name: 'Example Subs', anime_id: 3, anime_title: 'Test Anime', release_version_id: null, contribution_type: 'project_default', dispute_state: 'none', role_codes: roleCodes, release_version_label: null, episode_number: null })
const response = (roleCodes: string[]): AdminUserContributionsResponse => ({ project_defaults: [contribution(roleCodes)], release_overrides: [], open_disputes: [], legacy_historical: [] })
const releaseOverride = (overrides: Partial<AdminContributionItem>): AdminContributionItem => ({ contribution_id: 5, fansub_group_id: 2, fansub_group_name: 'Example Subs', anime_id: 3, anime_title: 'Test Anime', release_version_id: 42, contribution_type: 'release_override', dispute_state: 'none', role_codes: [], release_version_label: 'v2', episode_number: '5', ...overrides })
afterEach(() => { cleanup(); vi.clearAllMocks(); catalogState.error = null })

describe('UserContributionsTab', () => {
  it('zeigt Karaoke FX und Typesetting getrennt mit Katalogdarstellung', async () => {
    getAdminUserContributionsMock.mockResolvedValue(response(['typer', 'karaoke_fx']))
    const { container } = render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Karaoke FX')).not.toBeNull())
    expect(screen.getByText('Typesetting')).not.toBeNull()
    expect(Array.from(container.querySelectorAll('[data-role-code]')).map((node) => node.textContent)).toEqual(['Karaoke FX', 'Typesetting'])
    expect(container.querySelector('[data-role-code="creative"]')?.getAttribute('data-role-icon')).toBe('image')
    expect(container.querySelector('[data-role-code="technical"]')?.getAttribute('data-role-icon')).toBe('wrench')
  })
  it('hält unbekannte gespeicherte Codes neutral lesbar', async () => {
    getAdminUserContributionsMock.mockResolvedValue(response(['future_scene_role']))
    const { container } = render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Future Scene Role')).not.toBeNull())
    expect(container.querySelector('[data-role-code="other"]')?.getAttribute('data-role-icon')).toBe('user')
  })
  it('zeigt leere Beiträge ohne Rollen-Fallback', async () => {
    getAdminUserContributionsMock.mockResolvedValue({ project_defaults: [], release_overrides: [], open_disputes: [], legacy_historical: [] })
    render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Keine Beiträge vorhanden.')).not.toBeNull())
    expect(screen.queryByText('Karaoke FX')).toBeNull()
  })
  it('zeigt den Providerfehler ohne statische Rollenwahrheit', async () => {
    catalogState.error = 'catalog_unavailable'
    getAdminUserContributionsMock.mockResolvedValue(response(['karaoke_fx']))
    render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Rollen konnten nicht geladen werden' })).not.toBeNull())
    expect(screen.queryByText('Karaoke FX')).toBeNull()
  })
  it('zeigt bei Release-Overrides die echte Version statt der internen release_version_id (D-29)', async () => {
    getAdminUserContributionsMock.mockResolvedValue({
      project_defaults: [],
      release_overrides: [releaseOverride({})],
      open_disputes: [],
      legacy_historical: [],
    })
    render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Test Anime · Episode 5 · Version v2')).not.toBeNull())
    expect(screen.queryByText('Version 42')).toBeNull()
  })
  it('fällt bei unvollständigen Join-Daten auf die interne release_version_id zurück, statt "null" zu rendern', async () => {
    getAdminUserContributionsMock.mockResolvedValue({
      project_defaults: [],
      release_overrides: [releaseOverride({ episode_number: null, release_version_label: null })],
      open_disputes: [],
      legacy_historical: [],
    })
    render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Version 42')).not.toBeNull())
    expect(screen.queryByText(/null/)).toBeNull()
  })
})
