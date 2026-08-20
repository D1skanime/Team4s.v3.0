// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { AnimeContribution, UnifiedGroupMember } from '@/types/fansub'

const { catalogState, deleteAnimeContributionMock, upsertAnimeContributionMock } = vi.hoisted(() => ({
  catalogState: {
    roles: [
      { code: 'translator', label_de: 'Übersetzung', contexts: ['anime_contribution'], sort_order: 10 },
      { code: 'timer', label_de: 'Timing', contexts: ['anime_contribution'], sort_order: 20 },
      { code: 'project_lead', label_de: 'Projektleitung', contexts: ['anime_contribution'], sort_order: 30 },
      { code: 'karaoke_fx', label_de: 'Karaoke FX', contexts: ['anime_contribution'], sort_order: 40 },
      { code: 'typer', label_de: 'Typesetting', contexts: ['anime_contribution'], sort_order: 50 },
    ],
    error: null as string | null,
  },
  deleteAnimeContributionMock: vi.fn(),
  upsertAnimeContributionMock: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  deleteAnimeContribution: (...args: unknown[]) => deleteAnimeContributionMock(...args),
  upsertAnimeContribution: (...args: unknown[]) => upsertAnimeContributionMock(...args),
}))

vi.mock('@/providers/RoleCatalogProvider', () => ({
  useRoleCatalog: () => catalogState,
}))

import AnimeContributionModal from './AnimeContributionModal'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  catalogState.error = null
})

const TEST_MEMBERS: UnifiedGroupMember[] = [
  {
    member_id: 12,
    display_name: 'Naru-Fan',
    source: 'app',
    has_app_account: true,
    group_roles: ['translator'],
  },
  {
    member_id: 13,
    display_name: 'Sakura',
    source: 'app',
    has_app_account: true,
    group_roles: ['timer'],
  },
]

const EXISTING_TRANSLATOR_CONTRIBUTION: AnimeContribution = {
  id: 77,
  member_id: 12,
  member_display_name: 'Naru-Fan',
  anime_id: 13,
  role_codes: ['translator'],
  started_year: null,
  ended_year: null,
  note: null,
  is_public_on_anime_page: false,
  is_public_on_member_profile: false,
  status: 'confirmed',
  release_version_id: null,
  created_at: '2026-06-11T00:00:00Z',
}

describe('AnimeContributionModal', () => {
  it('hält Karaoke FX und Typesetting als getrennte, servergeordnete Rollen', () => {
    render(<AnimeContributionModal fansubId={1} animeId={13} animeTitle="Naruto" members={TEST_MEMBERS} existingContributions={[]} onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Person hinzufügen' }))
    const buttons = screen.getByLabelText('Rollen für neue Person').querySelectorAll('button')
    expect(Array.from(buttons).map((button) => button.textContent)).toEqual(['Übersetzung', 'Timing', 'Projektleitung', 'Karaoke FX', 'Typesetting'])
  })

  it('zeigt einen Katalogfehler kompakt und bietet keine statischen Rollen an', () => {
    catalogState.error = 'catalog_unavailable'
    render(<AnimeContributionModal fansubId={1} animeId={13} animeTitle="Naruto" members={TEST_MEMBERS} existingContributions={[]} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByRole('alert').textContent).toContain('Rollen konnten nicht geladen werden')
    fireEvent.click(screen.getByRole('button', { name: 'Person hinzufügen' }))
    expect(screen.getByLabelText('Rollen für neue Person').querySelectorAll('button')).toHaveLength(0)
  })

  it('fügt bestehende Fansub-Member erst lokal hinzu und speichert projektweit', async () => {
    upsertAnimeContributionMock.mockResolvedValue({ data: {} })

    render(
      <AnimeContributionModal
        fansubId={1}
        animeId={13}
        animeTitle="Naruto"
        members={TEST_MEMBERS}
        existingContributions={[]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Mitwirkende: Naruto' })).not.toBeNull()
    expect(screen.queryByText('Sichtbarkeit')).toBeNull()
    expect(screen.queryByText('Status')).toBeNull()
    expect(screen.queryByText(/Release-Version/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Person hinzufügen' }))
    fireEvent.change(screen.getByLabelText('Person'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Timing' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }))

    expect(screen.getByText('Naru-Fan')).not.toBeNull()
    expect(upsertAnimeContributionMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(upsertAnimeContributionMock).toHaveBeenCalledWith(1, 13, expect.objectContaining({
        member_id: 12,
        role_codes: ['timer'],
        status: 'confirmed',
        is_public_on_anime_page: true,
        is_public_on_member_profile: true,
        release_version_id: null,
      }))
    })
  })

  it('speichert eine aktuell ausgewählte neue Person auch ohne separaten Hinzufügen-Klick', async () => {
    upsertAnimeContributionMock.mockResolvedValue({ data: {} })

    render(
      <AnimeContributionModal
        fansubId={1}
        animeId={13}
        animeTitle="Naruto"
        members={TEST_MEMBERS}
        existingContributions={[]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Person hinzufügen' }))
    fireEvent.change(screen.getByLabelText('Person'), { target: { value: '13' } })
    fireEvent.click(screen.getByRole('button', { name: 'Projektleitung' }))
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(upsertAnimeContributionMock).toHaveBeenCalledWith(1, 13, expect.objectContaining({
        member_id: 13,
        role_codes: ['project_lead'],
        status: 'confirmed',
        is_public_on_anime_page: true,
        is_public_on_member_profile: true,
        release_version_id: null,
      }))
    })
  })

  it('ändert Rollen bestehender Projekt-Mitwirkender ohne Release-Zuordnung', async () => {
    upsertAnimeContributionMock.mockResolvedValue({ data: {} })

    render(
      <AnimeContributionModal
        fansubId={1}
        animeId={13}
        animeTitle="Naruto"
        members={TEST_MEMBERS}
        existingContributions={[EXISTING_TRANSLATOR_CONTRIBUTION]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Rollen für Naru-Fan ändern' }))
    fireEvent.click(screen.getByRole('button', { name: 'Timing' }))
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(upsertAnimeContributionMock).toHaveBeenCalledWith(1, 13, expect.objectContaining({
        member_id: 12,
        role_codes: ['translator', 'timer'],
        release_version_id: null,
        status: 'confirmed',
        is_public_on_anime_page: true,
        is_public_on_member_profile: true,
      }))
    })
  })

  it('veröffentlicht bestehende versteckte Projekt-Mitwirkende beim Speichern', async () => {
    upsertAnimeContributionMock.mockResolvedValue({ data: {} })

    render(
      <AnimeContributionModal
        fansubId={1}
        animeId={13}
        animeTitle="Naruto"
        members={TEST_MEMBERS}
        existingContributions={[EXISTING_TRANSLATOR_CONTRIBUTION]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(upsertAnimeContributionMock).toHaveBeenCalledWith(1, 13, expect.objectContaining({
        member_id: 12,
        role_codes: ['translator'],
        release_version_id: null,
        status: 'confirmed',
        is_public_on_anime_page: true,
        is_public_on_member_profile: true,
      }))
    })
  })

  it('archiviert entfernte Projekt-Mitwirkende beim Speichern', async () => {
    deleteAnimeContributionMock.mockResolvedValue({ data: {} })

    render(
      <AnimeContributionModal
        fansubId={1}
        animeId={13}
        animeTitle="Naruto"
        members={TEST_MEMBERS}
        existingContributions={[EXISTING_TRANSLATOR_CONTRIBUTION]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Naru-Fan entfernen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(deleteAnimeContributionMock).toHaveBeenCalledWith(1, 13, 77)
    })
  })
})
