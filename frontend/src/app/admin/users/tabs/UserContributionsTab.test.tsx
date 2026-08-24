// @vitest-environment jsdom
//
// Phase 139 Plan 08: vollständige Neufassung gegen die gruppierte Karten-Projektion
// (UI-SPEC-Vertrag). Die 2 vorher dokumentierten Phase-136-Hex-Farbwert-Normalisierungs-
// Fehlschläge (139-RESEARCH.md/139-CONTEXT.md) galten der ALTEN Flat-Table-Fixture (color_key
// als semantischer Name statt Hex-Wert, z.B. 'creative') und gelten für diese neu geschriebenen
// Fixtures nicht mehr — jede neue Rollen-Fixture in dieser Datei verwendet echte
// `ROLE_COLOR_KEYS`-Hex-Werte und `ICON_KEYS`-Icon-Codes aus `@/lib/roleCatalog.ts`. Taucht nach
// dieser Neufassung hier ein Fehlschlag auf, ist er eine echte Phase-139-Regression, keine
// geerbte Altlast.

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AdminContributionProjectBlock, AdminUserContributionsPage } from '@/types/admin-users'

const mockPush = vi.hoisted(() => vi.fn())
const mockReplace = vi.hoisted(() => vi.fn())
const mockUseSearchParams = vi.hoisted(() => vi.fn(() => new URLSearchParams()))
const mockUsePathname = vi.hoisted(() => vi.fn(() => '/admin/users/7'))
const mockUseRouter = vi.hoisted(() => vi.fn(() => ({ push: mockPush, replace: mockReplace })))

vi.mock('next/navigation', () => ({
  useRouter: mockUseRouter,
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
}))

const { catalogState, getAdminUserContributionsMock } = vi.hoisted(() => ({
  catalogState: {
    roles: [
      {
        code: 'karaoke_fx',
        label_de: 'Karaoke FX',
        contexts: ['anime_contribution'],
        sort_order: 10,
        color_key: '#0f766e',
        icon_key: 'image',
      },
      {
        code: 'typer',
        label_de: 'Typesetting',
        contexts: ['anime_contribution'],
        sort_order: 20,
        color_key: '#475569',
        icon_key: 'wrench',
      },
    ],
    error: null as string | null,
  },
  getAdminUserContributionsMock: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {},
  getAdminUserContributions: (...args: unknown[]) => getAdminUserContributionsMock(...args),
}))
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

function makePage(
  blocks: AdminContributionProjectBlock[],
  metaOverrides: Partial<AdminUserContributionsPage['meta']> = {},
): AdminUserContributionsPage {
  return {
    data: blocks,
    meta: { total: blocks.length, limit: 25, offset: 0, ...metaOverrides },
    filter_options: { animes: [], groups: [] },
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  catalogState.error = null
  mockUseSearchParams.mockReturnValue(new URLSearchParams())
})

describe('UserContributionsTab', () => {
  it('zeigt Karaoke FX und Typesetting getrennt mit Katalogdarstellung', async () => {
    getAdminUserContributionsMock.mockResolvedValue(
      makePage([makeBlock({ project_standard: { role_codes: ['typer', 'karaoke_fx'], contributor_labels: [] } })]),
    )
    const { container } = render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(container.querySelector('[data-color-key="#0f766e"]')).not.toBeNull())
    expect(container.querySelector('[data-color-key="#0f766e"]')?.textContent).toBe('Karaoke FX')
    expect(container.querySelector('[data-color-key="#475569"]')?.textContent).toBe('Typesetting')
  })

  it('hält unbekannte gespeicherte Codes neutral lesbar', async () => {
    getAdminUserContributionsMock.mockResolvedValue(
      makePage([makeBlock({ project_standard: { role_codes: ['future_scene_role'], contributor_labels: [] } })]),
    )
    const { container } = render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(container.querySelector('[data-color-key="neutral"]')).not.toBeNull())
    expect(container.querySelector('[data-color-key="neutral"]')?.textContent).toBe('Future Scene Role')
  })

  it('zeigt leere Beiträge ohne Rollen-Fallback (echter Leerzustand)', async () => {
    getAdminUserContributionsMock.mockResolvedValue(makePage([]))
    const { container } = render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Keine Beiträge vorhanden.')).not.toBeNull())
    expect(container.querySelectorAll('.role-catalog-chip').length).toBe(0)
    expect(screen.queryByText('Keine Beiträge für diese Filter.')).toBeNull()
  })

  it('zeigt den gefilterten Leerzustand mit Reset-Aktion, wenn ein Filter aktiv ist', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('only_deviations=1'))
    getAdminUserContributionsMock.mockResolvedValue(makePage([]))
    render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Keine Beiträge für diese Filter.')).not.toBeNull())
    expect(
      screen.getByText('Filter anpassen oder zurücksetzen, um weitere Einträge zu sehen.'),
    ).not.toBeNull()
    expect(screen.getAllByRole('button', { name: 'Filter zurücksetzen' }).length).toBeGreaterThan(0)
  })

  it('zeigt den Providerfehler ohne statische Rollenwahrheit', async () => {
    catalogState.error = 'catalog_unavailable'
    getAdminUserContributionsMock.mockResolvedValue(
      makePage([makeBlock({ project_standard: { role_codes: ['karaoke_fx'], contributor_labels: [] } })]),
    )
    const { container } = render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Rollen konnten nicht geladen werden' })).not.toBeNull())
    expect(container.querySelectorAll('.role-catalog-chip').length).toBe(0)
  })

  it('zeigt Projektstandard, eine standardkonforme Spanne und eine reale Abweichung stets sichtbar, ohne Klick', async () => {
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
    expect(screen.getByText('Example Subs')).not.toBeNull()
    expect(screen.getByText('Episode 1 – Episode 4')).not.toBeNull()
    expect(screen.getByText('Episode 5')).not.toBeNull()
    // Beide Zeilen sind ohne jede weitere Interaktion sichtbar -- keine
    // Disclosure/Accordion/useState-Toggle steuert die Sichtbarkeit des Abweichungstextes.
    expect(screen.getByText('Karaoke FX statt Typesetting')).not.toBeNull()
    expect(screen.getByText('Entspricht Projektstandard')).not.toBeNull()
    expect(screen.getByText('Abweichung vom Projektstandard')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Projekt öffnen' })).toHaveProperty(
      'href',
      expect.stringContaining('/me/projects/3/group/2'),
    )
  })

  it('zeigt meta.total in Badge und Pagination, nicht die Länge der aktuellen Seite', async () => {
    const page = Array.from({ length: 25 }, (_, index) =>
      makeBlock({ anime_id: index + 1, fansub_group_id: 1, anime_title: `Anime ${index + 1}` }),
    )
    getAdminUserContributionsMock.mockResolvedValue(makePage(page, { total: 42, limit: 25, offset: 0 }))
    render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(screen.getAllByText('42').length).toBeGreaterThan(0))
    // 42 Treffer / 25 pro Seite => 2 Seiten; Pagination zeigt Seite 1 von 2.
    expect(screen.getByText('Seite 1 von 2')).not.toBeNull()
  })

  it('löst beim Umschalten von "Nur Abweichungen" einen Refetch mit only_deviations=true aus', async () => {
    getAdminUserContributionsMock.mockResolvedValue(makePage([makeBlock()]))
    const { rerender } = render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(getAdminUserContributionsMock).toHaveBeenCalledTimes(1))
    getAdminUserContributionsMock.mockClear()

    const toggle = screen.getByRole('switch', { name: 'Nur Abweichungen' })
    fireEvent.click(toggle)

    await waitFor(() => expect(mockReplace).toHaveBeenCalled())
    const calledUrl = mockReplace.mock.calls.map((call) => String(call[0])).join(' | ')
    expect(calledUrl).toContain('only_deviations=1')

    // Simuliert, dass die URL-Änderung tatsächlich in einem neuen Render ankommt (kein
    // clientseitiges Filtern -- der refetch geht real über getAdminUserContributions).
    mockUseSearchParams.mockReturnValue(new URLSearchParams('only_deviations=1'))
    rerender(<UserContributionsTab userId={7} />)

    await waitFor(() => expect(getAdminUserContributionsMock).toHaveBeenCalled())
    const lastCall = getAdminUserContributionsMock.mock.calls[getAdminUserContributionsMock.mock.calls.length - 1]
    expect(lastCall[0]).toBe(7)
    expect(lastCall[1]).toMatchObject({ only_deviations: true })
  })

  it('ruft beim Klick auf "Erneut versuchen" die Ladefunktion erneut auf', async () => {
    getAdminUserContributionsMock.mockRejectedValueOnce(new Error('Daten konnten nicht geladen werden. Erneut versuchen.'))
    render(<UserContributionsTab userId={7} />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Fehler beim Laden' })).not.toBeNull())
    expect(getAdminUserContributionsMock).toHaveBeenCalledTimes(1)

    getAdminUserContributionsMock.mockResolvedValueOnce(makePage([makeBlock()]))
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))

    await waitFor(() => expect(getAdminUserContributionsMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByText('Test Anime')).not.toBeNull())
  })
})
