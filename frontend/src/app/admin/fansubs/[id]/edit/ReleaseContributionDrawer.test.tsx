// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EffectiveContributionRow, UnifiedGroupMember } from '@/types/fansub'

const mockListEffectiveContributionsForVersion = vi.fn()
const mockListUnifiedGroupMembers = vi.fn()
const mockUpsertAnimeContribution = vi.fn()
const mockDeleteAnimeContribution = vi.fn()

vi.mock('@/lib/api', () => ({
  listEffectiveContributionsForVersion: (...args: unknown[]) =>
    mockListEffectiveContributionsForVersion(...args),
  listUnifiedGroupMembers: (...args: unknown[]) =>
    mockListUnifiedGroupMembers(...args),
  upsertAnimeContribution: (...args: unknown[]) =>
    mockUpsertAnimeContribution(...args),
  deleteAnimeContribution: (...args: unknown[]) =>
    mockDeleteAnimeContribution(...args),
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

const sampleMembers: UnifiedGroupMember[] = [
  { member_id: 1, display_name: 'Alice Müller', source: 'hist', has_app_account: false, group_roles: [] },
  { member_id: 2, display_name: 'Bob Schmidt', source: 'app', has_app_account: true, group_roles: [] },
]

const sampleContributions: EffectiveContributionRow[] = [
  { contribution_id: 10, member_id: 1, member_display_name: 'Alice Müller', member_avatar_url: null, role_codes: ['translator'] },
  { contribution_id: 11, member_id: 2, member_display_name: 'Bob Schmidt', member_avatar_url: null, role_codes: ['editor'] },
]

// Lazy import so mocks are in place before module loads
async function importDrawer() {
  const mod = await import('./ReleaseContributionDrawer')
  return mod.ReleaseContributionDrawer
}

describe('ReleaseContributionDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListUnifiedGroupMembers.mockResolvedValue(sampleMembers)
    mockListEffectiveContributionsForVersion.mockResolvedValue({
      data: sampleContributions,
      meta: { is_override: false, source: 'anime_default' },
    })
    mockUpsertAnimeContribution.mockResolvedValue({ data: {} })
    mockDeleteAnimeContribution.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
  })

  it('rendert nichts wenn open=false', async () => {
    const ReleaseContributionDrawer = await importDrawer()
    render(
      <ReleaseContributionDrawer
        open={false}
        fansubId={1}
        animeId={2}
        releaseVersionId={3}
        releaseTitle="Naruto Staffel 1"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    expect(screen.queryByText('Besetzung: Naruto Staffel 1')).toBeNull()
    expect(mockListEffectiveContributionsForVersion).not.toHaveBeenCalled()
  })

  it('rendert Sheet-Titel wenn open=true', async () => {
    const ReleaseContributionDrawer = await importDrawer()
    render(
      <ReleaseContributionDrawer
        open={true}
        fansubId={1}
        animeId={2}
        releaseVersionId={3}
        releaseTitle="Naruto Staffel 1"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Besetzung: Naruto Staffel 1')).toBeDefined()
      expect(screen.getByText(/gilt nur für diese Version/)).toBeDefined()
    })
  })

  it('zeigt EmptyState wenn keine Rollen vergeben sind', async () => {
    mockListEffectiveContributionsForVersion.mockResolvedValue({
      data: [],
      meta: { is_override: false, source: 'anime_default' },
    })
    const ReleaseContributionDrawer = await importDrawer()
    render(
      <ReleaseContributionDrawer
        open={true}
        fansubId={1}
        animeId={2}
        releaseVersionId={3}
        releaseTitle="Naruto Staffel 1"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Noch keine Rollen vergeben')).toBeDefined()
    })
  })

  it('rendert Member-Namen aus Contributions-Liste', async () => {
    const ReleaseContributionDrawer = await importDrawer()
    render(
      <ReleaseContributionDrawer
        open={true}
        fansubId={1}
        animeId={2}
        releaseVersionId={3}
        releaseTitle="Naruto Staffel 1"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Alice Müller')).toBeDefined()
      expect(screen.getByText('Bob Schmidt')).toBeDefined()
    })
    expect(screen.getByText('Übersetzer')).toBeDefined()
    expect(screen.getByText('Editor')).toBeDefined()
    expect(screen.queryByLabelText('Rollen für Alice Müller')).toBeNull()
  })

  it('zeigt Rollenauswahl erst nach Klick auf Rollen ändern', async () => {
    const ReleaseContributionDrawer = await importDrawer()
    render(
      <ReleaseContributionDrawer
        open={true}
        fansubId={1}
        animeId={2}
        releaseVersionId={3}
        releaseTitle="Naruto Staffel 1"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Alice Müller')).toBeDefined()
    })

    expect(screen.queryByLabelText('Rollen für Alice Müller')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Rollen für Alice Müller ändern' }))
    expect(screen.getByLabelText('Rollen für Alice Müller')).toBeDefined()
  })

  it('Entfernen-Button entfernt Zeile aus staged-Liste ohne API-Call', async () => {
    const ReleaseContributionDrawer = await importDrawer()
    render(
      <ReleaseContributionDrawer
        open={true}
        fansubId={1}
        animeId={2}
        releaseVersionId={3}
        releaseTitle="Naruto Staffel 1"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    // Warte bis die Liste geladen ist
    await waitFor(() => {
      expect(screen.getByText('Alice Müller')).toBeDefined()
    })

    // Klicke den Entfernen-Button der ersten Zeile
    const removeButtons = screen.getAllByLabelText('Alice Müller entfernen')
    expect(removeButtons.length).toBeGreaterThan(0)
    fireEvent.click(removeButtons[0])

    // Alice sollte nicht mehr sichtbar sein (staged, kein API-Call)
    await waitFor(() => {
      expect(screen.queryByText('Alice Müller')).toBeNull()
    })
    // Kein API-Call durch Entfernen
    expect(mockDeleteAnimeContribution).not.toHaveBeenCalled()
  })

  it('speichert geerbtes Projektteam als Release-Besetzung ohne globale Löschung', async () => {
    const ReleaseContributionDrawer = await importDrawer()
    render(
      <ReleaseContributionDrawer
        open={true}
        fansubId={1}
        animeId={2}
        releaseVersionId={3}
        releaseTitle="Naruto Staffel 1"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Alice Müller')).toBeDefined()
      expect(screen.getByText('Bob Schmidt')).toBeDefined()
    })

    fireEvent.click(screen.getByLabelText('Alice Müller entfernen'))
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(mockUpsertAnimeContribution).toHaveBeenCalledWith(
        1,
        2,
        expect.objectContaining({
          member_id: 2,
          release_version_id: 3,
          role_codes: ['editor'],
        }),
      )
    })
    expect(mockDeleteAnimeContribution).not.toHaveBeenCalled()
  })

  it('blockiert komplett leere Release-Besetzung bei geerbtem Projektteam', async () => {
    mockListEffectiveContributionsForVersion.mockResolvedValue({
      data: [sampleContributions[0]],
      meta: { is_override: false, source: 'anime_default' },
    })

    const ReleaseContributionDrawer = await importDrawer()
    render(
      <ReleaseContributionDrawer
        open={true}
        fansubId={1}
        animeId={2}
        releaseVersionId={3}
        releaseTitle="Naruto Staffel 1"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Alice Müller')).toBeDefined()
    })

    fireEvent.click(screen.getByLabelText('Alice Müller entfernen'))
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(
        screen.getByText('Eine komplett leere Release-Besetzung kann aktuell nicht gespeichert werden.'),
      ).toBeDefined()
    })
    expect(mockUpsertAnimeContribution).not.toHaveBeenCalled()
    expect(mockDeleteAnimeContribution).not.toHaveBeenCalled()
  })

  it('fügt Personen staged hinzu und persistiert erst beim Speichern', async () => {
    mockListEffectiveContributionsForVersion.mockResolvedValue({
      data: [sampleContributions[0]],
      meta: { is_override: false, source: 'anime_default' },
    })

    const ReleaseContributionDrawer = await importDrawer()
    render(
      <ReleaseContributionDrawer
        open={true}
        fansubId={1}
        animeId={2}
        releaseVersionId={3}
        releaseTitle="Naruto Staffel 1"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Alice Müller')).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Person hinzufügen' }))
    fireEvent.change(screen.getByLabelText('Person'), { target: { value: '2' } })
    fireEvent.click(
      within(screen.getByLabelText('Rollen für neue Person')).getByRole('button', {
        name: 'Timer',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }))

    expect(screen.getByText('Bob Schmidt')).toBeDefined()
    expect(mockUpsertAnimeContribution).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(mockUpsertAnimeContribution).toHaveBeenCalledWith(
        1,
        2,
        expect.objectContaining({
          member_id: 2,
          release_version_id: 3,
          role_codes: ['timer'],
        }),
      )
    })
  })

  it('Abbrechen-Button ruft onClose auf', async () => {
    const onClose = vi.fn()
    const ReleaseContributionDrawer = await importDrawer()
    render(
      <ReleaseContributionDrawer
        open={true}
        fansubId={1}
        animeId={2}
        releaseVersionId={3}
        releaseTitle="Naruto Staffel 1"
        onClose={onClose}
        onSaved={vi.fn()}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Besetzung: Naruto Staffel 1')).toBeDefined()
    })
    const cancelButton = screen.getByText('Abbrechen')
    fireEvent.click(cancelButton)
    expect(onClose).toHaveBeenCalled()
  })
})
