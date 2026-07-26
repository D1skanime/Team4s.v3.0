// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EffectiveContributionRow, UnifiedGroupMember } from '@/types/fansub'

const mockListEffectiveContributionsForVersion = vi.fn()
const mockListUnifiedGroupMembers = vi.fn()
const mockReplaceReleaseCrew = vi.fn()
const mockUpsertAnimeContribution = vi.fn()
const mockDeleteAnimeContribution = vi.fn()

vi.mock('@/lib/api', () => ({
  listEffectiveContributionsForVersion: (...args: unknown[]) =>
    mockListEffectiveContributionsForVersion(...args),
  listUnifiedGroupMembers: (...args: unknown[]) => mockListUnifiedGroupMembers(...args),
  replaceReleaseCrew: (...args: unknown[]) => mockReplaceReleaseCrew(...args),
  upsertAnimeContribution: (...args: unknown[]) => mockUpsertAnimeContribution(...args),
  deleteAnimeContribution: (...args: unknown[]) => mockDeleteAnimeContribution(...args),
}))

const sampleMembers: UnifiedGroupMember[] = [
  { member_id: 1, display_name: 'Gon Müller', source: 'hist', has_app_account: false, group_roles: [] },
  { member_id: 2, display_name: 'Mia Schmidt', source: 'app', has_app_account: true, group_roles: [] },
  { member_id: 3, display_name: 'Anton Weber', source: 'hist', has_app_account: false, group_roles: [] },
]

const sampleContributions: EffectiveContributionRow[] = [
  { contribution_id: 10, member_id: 1, member_display_name: 'Gon Müller', member_avatar_url: null, role_codes: ['translator'] },
  { contribution_id: 11, member_id: 2, member_display_name: 'Mia Schmidt', member_avatar_url: null, role_codes: ['qc'] },
  { contribution_id: 12, member_id: 3, member_display_name: 'Anton Weber', member_avatar_url: null, role_codes: ['editor'] },
]

async function importDrawer() {
  const mod = await import('./ReleaseContributionDrawer')
  return mod.ReleaseContributionDrawer
}

async function renderDrawer() {
  const ReleaseContributionDrawer = await importDrawer()
  const onClose = vi.fn()
  const onSaved = vi.fn()
  render(
    <ReleaseContributionDrawer
      open
      fansubId={9}
      animeId={22}
      releaseVersionId={176}
      releaseTitle="Folge 176"
      onClose={onClose}
      onSaved={onSaved}
    />,
  )
  await waitFor(() => expect(screen.getByText('Gon Müller')).toBeDefined())
  return { onClose, onSaved }
}

describe('ReleaseContributionDrawer complete-set editor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListUnifiedGroupMembers.mockResolvedValue(sampleMembers)
    mockListEffectiveContributionsForVersion.mockResolvedValue({
      data: sampleContributions,
      meta: { snapshot_mode: 'inherited' },
    })
    mockReplaceReleaseCrew.mockResolvedValue({
      data: sampleContributions,
      meta: { snapshot_mode: 'independent' },
    })
  })

  afterEach(cleanup)

  it('shows inherited status and no reset-to-project action', async () => {
    await renderDrawer()
    expect(screen.getByText('Projektbesetzung geerbt')).toBeDefined()
    expect(screen.queryByText('Projektbesetzung neu übernehmen')).toBeNull()
  })

  it('sends exactly one normalized complete set and never uses row-level mutations', async () => {
    const { onClose, onSaved } = await renderDrawer()

    fireEvent.click(screen.getByRole('button', { name: 'Rollen für Gon Müller ändern' }))
    fireEvent.click(
      within(screen.getByLabelText('Rollen für Gon Müller')).getByRole('button', { name: 'Qualitätsprüfung' }),
    )
    fireEvent.click(screen.getByLabelText('Mia Schmidt entfernen'))
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(mockReplaceReleaseCrew).toHaveBeenCalledWith(176, 9, {
        rows: [
          { member_id: 1, role_codes: ['translator', 'quality_checker'] },
          { member_id: 3, role_codes: ['editor'] },
        ],
      })
    })
    expect(mockReplaceReleaseCrew).toHaveBeenCalledTimes(1)
    expect(mockUpsertAnimeContribution).not.toHaveBeenCalled()
    expect(mockDeleteAnimeContribution).not.toHaveBeenCalled()
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('preserves Anton while moving QC from Mia to Gon', async () => {
    await renderDrawer()
    fireEvent.click(screen.getByRole('button', { name: 'Rollen für Gon Müller ändern' }))
    fireEvent.click(
      within(screen.getByLabelText('Rollen für Gon Müller')).getByRole('button', { name: 'Qualitätsprüfung' }),
    )
    fireEvent.click(screen.getByLabelText('Mia Schmidt entfernen'))

    expect(screen.getByText('Anton Weber')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    await waitFor(() => expect(mockReplaceReleaseCrew).toHaveBeenCalledTimes(1))
    expect(mockReplaceReleaseCrew.mock.calls[0]?.[2].rows).toContainEqual({
      member_id: 3,
      role_codes: ['editor'],
    })
  })

  it('accepts and reloads an empty independent crew without fallback', async () => {
    mockListEffectiveContributionsForVersion.mockResolvedValue({
      data: [],
      meta: { snapshot_mode: 'independent' },
    })
    const ReleaseContributionDrawer = await importDrawer()
    render(
      <ReleaseContributionDrawer
        open
        fansubId={9}
        animeId={22}
        releaseVersionId={176}
        releaseTitle="Folge 176"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await waitFor(() => expect(screen.getByText('Eigene Release-Besetzung')).toBeDefined())
    expect(screen.getByText('Noch keine Rollen vergeben')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    await waitFor(() => expect(mockReplaceReleaseCrew).toHaveBeenCalledWith(176, 9, { rows: [] }))
  })

  it('shows an uninitialized legacy release without falling back to the project crew', async () => {
    mockListEffectiveContributionsForVersion.mockResolvedValue({
      data: [],
      meta: { snapshot_mode: 'uninitialized' },
    })
    const ReleaseContributionDrawer = await importDrawer()
    render(
      <ReleaseContributionDrawer
        open
        fansubId={9}
        animeId={22}
        releaseVersionId={176}
        releaseTitle="Folge 176"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    await waitFor(() =>
      expect(screen.getAllByText('Besetzung noch nicht initialisiert')).toHaveLength(2),
    )
    expect(screen.getByText(/besitzt noch keine gespeicherte Besetzung/)).toBeDefined()
    expect(screen.queryByText('Projektbesetzung geerbt')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    await waitFor(() => expect(mockReplaceReleaseCrew).toHaveBeenCalledWith(176, 9, { rows: [] }))
  })

  it('keeps the drawer open and shows a scoped error when replacement fails', async () => {
    mockReplaceReleaseCrew.mockRejectedValue(new Error('Speichern nicht möglich.'))
    const { onClose, onSaved } = await renderDrawer()

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(screen.getByText('Speichern nicht möglich.')).toBeDefined())
    expect(onSaved).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('Besetzung: Folge 176')).toBeDefined()
  })

  it('keeps request cancellation guards when closing during load', async () => {
    let resolveCrew!: (value: unknown) => void
    mockListEffectiveContributionsForVersion.mockReturnValue(
      new Promise((resolve) => {
        resolveCrew = resolve
      }),
    )
    const ReleaseContributionDrawer = await importDrawer()
    const view = render(
      <ReleaseContributionDrawer
        open
        fansubId={9}
        animeId={22}
        releaseVersionId={176}
        releaseTitle="Folge 176"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    view.rerender(
      <ReleaseContributionDrawer
        open={false}
        fansubId={9}
        animeId={22}
        releaseVersionId={176}
        releaseTitle="Folge 176"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    resolveCrew({ data: sampleContributions, meta: { snapshot_mode: 'inherited' } })
    await Promise.resolve()
    expect(screen.queryByText('Gon Müller')).toBeNull()
  })
})
