// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AdminThemeSegment } from '@/types/admin'
import { useAuthSession } from '@/lib/useAuthSession'
import {
  createAnimeSegment,
  assignAnimeSegment,
  getAnimeSegments,
  updateAnimeSegment,
  upsertAnimeSegmentEpisodeOverride,
  uploadSegmentAsset,
} from '@/lib/api'
import { SegmenteTab } from './SegmenteTab'

vi.mock('@/lib/useAuthSession', () => ({ useAuthSession: vi.fn() }))
vi.mock('@/lib/api', () => ({
  getAnimeSegments: vi.fn(),
  getAnimeSegmentSuggestions: vi.fn().mockResolvedValue({ data: [] }),
  getAdminAnimeThemes: vi.fn().mockResolvedValue({ data: [
    { id: 71, anime_id: 1, theme_type_id: 17, theme_type_name: 'OP Kara', title: '', created_at: '' },
  ] }),
  getAdminThemeTypes: vi.fn().mockResolvedValue({ data: [
    { id: 17, name: 'OP Kara' },
    { id: 23, name: 'ED Kara' },
  ] }),
  createAdminAnimeTheme: vi.fn().mockResolvedValue({ data: { id: 72 } }),
  createAnimeSegment: vi.fn(),
  updateAnimeSegment: vi.fn(),
  deleteAnimeSegment: vi.fn(),
  assignAnimeSegment: vi.fn(),
  unassignAnimeSegment: vi.fn(),
  upsertAnimeSegmentEpisodeOverride: vi.fn(),
  deleteAnimeSegmentEpisodeOverride: vi.fn(),
  setAnimeSegmentOrigin: vi.fn(),
  getSegmentLibraryCandidates: vi.fn().mockResolvedValue({ data: [] }),
  uploadSegmentAsset: vi.fn(),
  deleteSegmentAsset: vi.fn(),
  attachSegmentLibraryAsset: vi.fn(),
}))
vi.mock('@/lib/api/segment-contributors', () => ({
  getThemeSegmentContributorCandidates: vi.fn().mockResolvedValue({ data: [], origin_release_version_id: null }),
  setThemeSegmentContributors: vi.fn(),
}))

function segment(overrides: Partial<AdminThemeSegment> = {}): AdminThemeSegment {
  return {
    id: 81,
    anime_id: 1,
    theme_id: 71,
    theme_title: 'Opening B',
    theme_type_name: 'OP Kara',
    fansub_group_id: 2,
    version: 'v1',
    start_episode: 1,
    end_episode: 4,
    start_time: '00:00:00',
    end_time: '00:01:20',
    source_type: 'none',
    source_jellyfin_item_id: null,
    assigned_release_version_ids: [901, 903],
    assigned_episodes: [
      { release_version_id: 901, episode_number: '1', has_override: false },
      { release_version_id: 903, episode_number: '3', has_override: false },
    ],
    is_shared: true,
    created_at: '2026-09-14T00:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAuthSession).mockReturnValue({
    authToken: '',
    hasAccessToken: true,
    hasRefreshToken: true,
    displayName: '',
    isCurrentSession: () => true,
    accountIdentity: null,
    accountGeneration: 0,
    isClientInitialized: true,
  })
  vi.mocked(getAnimeSegments).mockResolvedValue({ data: [] })
})

function renderEditor(releaseVersionId = 901, episodeNumber = 1) {
  return render(<SegmenteTab animeId={1} groupId={2} version="v1"
    releaseVariantId={releaseVersionId} episodeNumber={episodeNumber} durationSeconds={1425} />)
}

async function openCreate() {
  renderEditor()
  await screen.findByRole('table')
  fireEvent.click(screen.getByRole('button', { name: 'Segment hinzufügen' }))
  await screen.findByLabelText('Von')
}

async function openEditWithOverride() {
  vi.mocked(getAnimeSegments).mockResolvedValue({ data: [segment()] })
  renderEditor()
  const table = await screen.findByRole('table')
  fireEvent.click(within(table).getByTitle('Bearbeiten'))
  fireEvent.click(await screen.findByRole('switch', { name: 'Zeit nur für diese Folge abweichend setzen' }))
  fireEvent.change(screen.getByRole('textbox', { name: /Start.*Folge 1/i }), { target: { value: '0:05' } })
}

const conflictMessage = 'Folge 4 hat bereits ein OP-Segment. Wähle eine freie Folge oder bearbeite das bestehende Segment.'

function slotConflict() {
  return Object.assign(new Error(conflictMessage), { status: 409, code: 'segment_assignment_conflict' })
}

describe('Segment assignment conflict feedback', () => {
  it('uses actual release-version assignments, including protected assignments outside the entered range', async () => {
    vi.mocked(getAnimeSegments).mockResolvedValue({ data: [
      segment({ theme_title: 'Range-only opening' }),
      segment({ id: 82, theme_title: 'Actually assigned ending', theme_type_name: 'ED Kara',
        start_episode: 8, end_episode: 9, assigned_release_version_ids: [902],
        assigned_episodes: [{ release_version_id: 902, episode_number: '2', has_override: true }] }),
    ] })
    renderEditor(902, 2)
    const table = await screen.findByRole('table')
    expect(await within(table).findByText('Actually assigned ending')).toBeTruthy()
    expect(within(table).queryByText('Range-only opening')).toBeNull()
    expect(within(table).getByText('Actually assigned ending').closest('tr')?.className).toContain('tableRowActive')
  })

  it('retains same-group unassigned candidates as suggestions instead of active segments', async () => {
    vi.mocked(getAnimeSegments).mockResolvedValueOnce({ data: [segment()] })
      .mockResolvedValue({ data: [segment({ assigned_release_version_ids: [901, 902, 903] })] })
    vi.mocked(assignAnimeSegment).mockResolvedValue({ data: segment({ assigned_release_version_ids: [901, 902, 903] }) })
    renderEditor(902, 2)
    const table = await screen.findByRole('table')
    expect(within(table).queryByText('Opening B')).toBeNull()
    expect(screen.getByText('Weitere Segmente für Episode 2 zuweisen:')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }))
    await waitFor(() => expect(assignAnimeSegment).toHaveBeenCalledWith(1, 81, 902))
    await waitFor(() => expect(within(screen.getByRole('table')).getByText('Opening B')).toBeTruthy())
    expect(createAnimeSegment).not.toHaveBeenCalled()
  })

  it('renders noncontiguous assigned episode numbers without claiming the complete range', async () => {
    vi.mocked(getAnimeSegments).mockResolvedValue({ data: [segment()] })
    renderEditor()
    const table = await screen.findByRole('table')
    expect(await within(table).findByText('1, 3')).toBeTruthy()
    expect(within(table).queryByText('1 – 4')).toBeNull()
  })

  it('keeps the create panel open and shows the authoritative conflict message', async () => {
    vi.mocked(createAnimeSegment).mockRejectedValue(slotConflict())
    await openCreate()
    fireEvent.change(screen.getByLabelText('Von'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Bis'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    expect(await screen.findByText(conflictMessage)).toBeTruthy()
    expect(screen.getByText('Neues Segment hinzufügen')).toBeTruthy()
    expect(createAnimeSegment).toHaveBeenCalledOnce()
    expect(upsertAnimeSegmentEpisodeOverride).not.toHaveBeenCalled()
    expect(uploadSegmentAsset).not.toHaveBeenCalled()
  })

  it.each([
    ['start_time muss vor end_time liegen', 'Start'],
    ['end_time überschreitet die bekannte Laufzeit der Release-Variante', 'Ende'],
    ['Start-Zeit ist ungültig. Erlaubt sind z. B. 1:20 oder 00:01:20.', 'Start'],
  ])('keeps the explicit time validation beside its field: %s', async (message, field) => {
    vi.mocked(createAnimeSegment).mockRejectedValue(new Error(message))
    await openCreate()
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    const input = screen.getByLabelText(field)
    expect(await within(input.parentElement!).findByText(message)).toBeTruthy()
  })

  it('does not start an override mutation when the base save is rejected', async () => {
    vi.mocked(updateAnimeSegment).mockRejectedValue(slotConflict())
    await openEditWithOverride()
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    expect(await screen.findByText(conflictMessage)).toBeTruthy()
    expect(screen.getByText('Segment bearbeiten')).toBeTruthy()
    expect(upsertAnimeSegmentEpisodeOverride).not.toHaveBeenCalled()
  })

  it('shows backend skipped episodes after a range save with only a refresh session', async () => {
    vi.mocked(useAuthSession).mockReturnValue({
      ...vi.mocked(useAuthSession)(), hasAccessToken: false, hasRefreshToken: true,
    })
    vi.mocked(createAnimeSegment).mockResolvedValue({
      data: segment(),
      range_sync: { added: [901, 903], removed: [], protected_by_override: [], skipped_conflicts: [
        { release_version_id: 902, episode_number: '2', existing_segment_id: 80 },
        { release_version_id: 904, episode_number: '4', existing_segment_id: 79 },
      ] },
    })
    await openCreate()
    fireEvent.change(screen.getByLabelText('Bis'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    const notice = await screen.findByRole('status')
    expect(notice.textContent).toContain('übersprungen: 2, 4')
    expect(notice.textContent).toContain('bestehenden Segmente bleiben zugewiesen')
    await waitFor(() => expect(screen.queryByText('Neues Segment hinzufügen')).toBeNull())
    expect(createAnimeSegment).toHaveBeenCalledWith(1, expect.objectContaining({ start_episode: 1, end_episode: 4 }), undefined, 901)
    expect(getAnimeSegments).toHaveBeenCalledOnce()
  })

  it('waits for a successful base save before saving the optional time override', async () => {
    let finishSave!: (value: { data: AdminThemeSegment }) => void
    vi.mocked(updateAnimeSegment).mockReturnValue(new Promise((resolve) => { finishSave = resolve }))
    vi.mocked(upsertAnimeSegmentEpisodeOverride).mockResolvedValue({ data: segment({ has_episode_override: true }) })
    await openEditWithOverride()
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    await waitFor(() => expect(updateAnimeSegment).toHaveBeenCalledOnce())
    expect(upsertAnimeSegmentEpisodeOverride).not.toHaveBeenCalled()
    finishSave({ data: segment() })
    await waitFor(() => expect(upsertAnimeSegmentEpisodeOverride).toHaveBeenCalledWith(1, 81, 901, {
      start_time: '00:00:05', end_time: '00:01:25',
    }))
  })

  it('does not write an override to a release excluded from the saved assignments', async () => {
    vi.mocked(updateAnimeSegment).mockResolvedValue({ data: segment({ assigned_release_version_ids: [903] }) })
    await openEditWithOverride()
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    expect(await screen.findByText(/Segment gespeichert.*aktuelle Folge.*nicht zugewiesen/)).toBeTruthy()
    expect(upsertAnimeSegmentEpisodeOverride).not.toHaveBeenCalled()
    expect(screen.getByText('Segment bearbeiten')).toBeTruthy()
  })
})
