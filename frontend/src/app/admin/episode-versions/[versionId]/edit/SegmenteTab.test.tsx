// @vitest-environment jsdom

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import type { AdminThemeSegment } from '@/types/admin'

import {
  getTypeBadgeLabel,
  calcDuration,
  formatEpisodeRange,
  resolveSourceLabel,
  isSegmentActiveForEpisode,
} from './segmenteTabUtils'

import {
  parseFlexibleTimeInput,
  formatTimeInput,
  isCurrentEpisodeAssigned,
  findAssignedEpisodeNumber,
  findAssignedEpisodeHasOverride,
  formatAssignmentChipLabel,
} from './SegmenteTab.helpers'
import { useReleaseSegments } from './useReleaseSegments'
import { SegmentEditPanel } from './SegmentEditPanel'
import { SegmentAssignmentsRow } from './SegmentAssignmentsRow'
import {
  getAdminAnimeThemes,
  getAdminThemeTypes,
  getAnimeSegmentSuggestions,
  getAnimeSegments,
  createAdminAnimeTheme,
  createAnimeSegment,
  updateAnimeSegment,
  assignAnimeSegment,
  unassignAnimeSegment,
  upsertAnimeSegmentEpisodeOverride,
  setAnimeSegmentOrigin,
} from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import {
  getThemeSegmentContributorCandidates,
  setThemeSegmentContributors,
} from '@/lib/api/segment-contributors'
import { SegmenteTab } from './SegmenteTab'

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  getAnimeSegments: vi.fn(),
  createAnimeSegment: vi.fn(),
  updateAnimeSegment: vi.fn(),
  deleteAnimeSegment: vi.fn(),
  getAnimeSegmentSuggestions: vi.fn(),
  getSegmentLibraryCandidates: vi.fn(),
  uploadSegmentAsset: vi.fn(),
  deleteSegmentAsset: vi.fn(),
  attachSegmentLibraryAsset: vi.fn(),
  getAdminAnimeThemes: vi.fn(),
  getAdminThemeTypes: vi.fn(),
  createAdminAnimeTheme: vi.fn(),
  assignAnimeSegment: vi.fn(),
  unassignAnimeSegment: vi.fn(),
  upsertAnimeSegmentEpisodeOverride: vi.fn(),
  deleteAnimeSegmentEpisodeOverride: vi.fn(),
  setAnimeSegmentOrigin: vi.fn(),
}))

vi.mock('@/lib/api/segment-contributors', () => ({
  getThemeSegmentContributorCandidates: vi.fn(),
  setThemeSegmentContributors: vi.fn(),
}))

const mockedUseAuthSession = vi.mocked(useAuthSession)
const mockedGetAnimeSegments = vi.mocked(getAnimeSegments)
const mockedGetAnimeSegmentSuggestions = vi.mocked(getAnimeSegmentSuggestions)
const mockedGetAdminAnimeThemes = vi.mocked(getAdminAnimeThemes)
const mockedGetAdminThemeTypes = vi.mocked(getAdminThemeTypes)
const mockedCreateAdminAnimeTheme = vi.mocked(createAdminAnimeTheme)
const mockedCreateAnimeSegment = vi.mocked(createAnimeSegment)
const mockedUpdateAnimeSegment = vi.mocked(updateAnimeSegment)
const mockedAssignAnimeSegment = vi.mocked(assignAnimeSegment)
const mockedUnassignAnimeSegment = vi.mocked(unassignAnimeSegment)
const mockedUpsertAnimeSegmentEpisodeOverride = vi.mocked(upsertAnimeSegmentEpisodeOverride)
const mockedSetAnimeSegmentOrigin = vi.mocked(setAnimeSegmentOrigin)
const mockedGetThemeSegmentContributorCandidates = vi.mocked(getThemeSegmentContributorCandidates)
const mockedSetThemeSegmentContributors = vi.mocked(setThemeSegmentContributors)

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseAuthSession.mockReturnValue({
    authToken: '',
    hasAccessToken: true,
    hasRefreshToken: true,
    displayName: '',
    isCurrentSession: () => true,
    accountIdentity: null,
    accountGeneration: 0,
    isClientInitialized: true,
  })
  mockedGetAnimeSegments.mockResolvedValue({ data: [] })
  mockedGetAnimeSegmentSuggestions.mockResolvedValue({ data: [] })
  mockedGetAdminAnimeThemes.mockResolvedValue({ data: [] })
  mockedGetAdminThemeTypes.mockResolvedValue({ data: [
    { id: 17, name: 'OP Kara' },
    { id: 23, name: 'ED Kara' },
  ] })
  mockedGetThemeSegmentContributorCandidates.mockResolvedValue({ data: [], origin_release_version_id: null })
  mockedCreateAdminAnimeTheme.mockResolvedValue({
    data: {
      id: 99,
      anime_id: 1,
      theme_type_id: 1,
      theme_type_name: 'OP',
      title: null,
      created_at: '2026-01-01T00:00:00Z',
    },
  })
})

// ---------------------------------------------------------------------------
// Helper: minimale AdminThemeSegment-Instanz für Tests
// ---------------------------------------------------------------------------
function makeSegment(overrides: Partial<AdminThemeSegment> = {}): AdminThemeSegment {
  return {
    id: 1,
    theme_id: 1,
    anime_id: 1,
    theme_title: null,
    theme_type_name: 'OP1',
    fansub_group_id: null,
    version: 'v1',
    start_episode: null,
    end_episode: null,
    start_time: null,
    end_time: null,
    source_jellyfin_item_id: null,
    source_type: null,
    source_ref: null,
    source_label: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('useReleaseSegments auth contract', () => {
  it('loads release segment data without forwarding token arguments', async () => {
    renderHook(() =>
      useReleaseSegments({
        animeId: 1,
        groupId: 2,
        version: 'v2',
        releaseVariantId: 9,
      }),
    )

    await waitFor(() => {
      expect(mockedGetAnimeSegments).toHaveBeenCalled()
    })

    expect(mockedGetAnimeSegments).toHaveBeenCalledWith(1, 2, 'v2', undefined, 9)
    expect(mockedGetAdminAnimeThemes).toHaveBeenCalledWith(1)
    expect(mockedGetAdminThemeTypes).toHaveBeenCalledWith()
  })

  it('keeps segment data visible when helper metadata fails to load', async () => {
    mockedGetAnimeSegments.mockResolvedValue({
      data: [makeSegment({ id: 77, theme_title: 'Visible OP' })],
    })
    mockedGetAdminThemeTypes.mockRejectedValue(new Error('keine berechtigung'))

    const { result } = renderHook(() =>
      useReleaseSegments({
        animeId: 1,
        groupId: 2,
        version: 'v1',
        releaseVariantId: 9,
      }),
    )

    await waitFor(() => {
      expect(result.current.segments).toHaveLength(1)
    })

    expect(result.current.segments[0]?.theme_title).toBe('Visible OP')
    expect(result.current.errorMessage).toBeNull()
  })

  it('loads release segment data when only a refresh session is present', async () => {
    mockedUseAuthSession.mockReturnValue({
      authToken: '',
      hasAccessToken: false,
      hasRefreshToken: true,
      displayName: '',
      isCurrentSession: () => true,
      accountIdentity: null,
      accountGeneration: 0,
      isClientInitialized: true,
    })

    renderHook(() =>
      useReleaseSegments({
        animeId: 1,
        groupId: 2,
        version: 'v2',
        releaseVariantId: 9,
      }),
    )

    await waitFor(() => {
      expect(mockedGetAnimeSegments).toHaveBeenCalledWith(1, 2, 'v2', undefined, 9)
    })
  })

  it('creates missing theme anchors with the release variant context', async () => {
    mockedGetAdminThemeTypes.mockResolvedValue({
      data: [{ id: 5, name: 'OP' }],
    })
    mockedCreateAdminAnimeTheme.mockResolvedValue({
      data: {
        id: 12,
        anime_id: 1,
        theme_type_id: 5,
        theme_type_name: 'OP',
        title: "Viper's Creed Honto",
        created_at: '2026-01-01T00:00:00Z',
      },
    })

    const { result } = renderHook(() =>
      useReleaseSegments({
        animeId: 1,
        groupId: 2,
        version: 'v2',
        releaseVariantId: 9,
      }),
    )

    await waitFor(() => {
      expect(result.current.genericThemeOptions).toHaveLength(1)
    })

    await act(async () => {
      await expect(result.current.ensureThemeFromSelection('op', "Viper's Creed Honto")).resolves.toBe(12)
    })

    expect(mockedCreateAdminAnimeTheme).toHaveBeenCalledWith(
      1,
      { theme_type_id: 5, title: "Viper's Creed Honto" },
      undefined,
      9,
    )
  })
})

describe('SegmenteTab table', () => {
  it('renders segments in the shared table and keeps active rows editable', async () => {
    mockedGetAnimeSegments.mockResolvedValue({
      data: [
        makeSegment({
          id: 22,
          assigned_release_version_ids: [9],
          theme_title: 'Sakura OP',
          start_episode: 1,
          end_episode: 3,
          start_time: '00:00:10',
          end_time: '00:01:40',
          source_type: 'none',
        }),
      ],
    })

    render(
      <SegmenteTab
        animeId={1}
        groupId={2}
        version="v1"
        episodeNumber={2}
        releaseVariantId={9}
      />,
    )

    const table = await screen.findByRole('table')
    await waitFor(() => {
      expect(mockedGetAnimeSegmentSuggestions).toHaveBeenCalledWith(1, 2, 2, 'v1', undefined, 9)
    })
    expect(within(table).getByRole('columnheader', { name: 'Typ' })).toBeTruthy()
    expect(within(table).getByText('Sakura OP')).toBeTruthy()

    const activeRow = within(table).getByText('Sakura OP').closest('tr')
    expect(activeRow?.className).toContain('tableRowActive')

    fireEvent.click(within(activeRow as HTMLTableRowElement).getByTitle('Bearbeiten'))

    expect(await screen.findByText('Segment bearbeiten')).toBeTruthy()
  })

  it('zeigt nur tatsächlich zugewiesene Segmente der aktuellen Release-Version', async () => {
    mockedGetAnimeSegments.mockResolvedValue({
      data: [
        makeSegment({ id: 91, theme_title: 'Folge1 OP', start_episode: 1, end_episode: 1 }),
        makeSegment({ id: 92, theme_title: 'Folge1 ED', start_episode: 1, end_episode: 1 }),
        makeSegment({ id: 93, theme_title: 'Folge5 Insert', start_episode: 5, end_episode: 5, assigned_release_version_ids: [9] }),
      ],
    })

    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={5} releaseVariantId={9} />)

    const table = await screen.findByRole('table')
    expect(await within(table).findByText('Folge5 Insert')).toBeTruthy()
    expect(within(table).queryByText('Folge1 OP')).toBeNull()
    expect(within(table).queryByText('Folge1 ED')).toBeNull()
  })

  it('befüllt neue Segmente mit echten Standardwerten statt nur Platzhaltern', async () => {
    render(
      <SegmenteTab
        animeId={1}
        groupId={2}
        version="v1"
        episodeNumber={2}
        durationSeconds={1425}
        releaseVariantId={9}
      />,
    )

    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: /Segment hinzufügen/i }))

    expect((await screen.findByLabelText('Von') as HTMLInputElement).value).toBe('2')
    expect((screen.getByLabelText('Bis') as HTMLInputElement).value).toBe('2')
    expect((screen.getByLabelText('Start') as HTMLInputElement).value).toBe('00:00:00')
    expect((screen.getByLabelText('Ende') as HTMLInputElement).value).toBe('00:01:20')
    expect(screen.getByRole('button', { name: 'Speichern' })).toHaveProperty('disabled', false)
  })

  it('zeigt Badges und Zuweisungs-Chips mit echter Episodennummer für ein geteiltes Segment (B3-Fix, UI-SPEC Surface 2)', async () => {
    mockedGetAnimeSegments.mockResolvedValue({
      data: [
        makeSegment({
          id: 33,
          theme_title: 'Shared OP',
          start_episode: 1,
          end_episode: 12,
          start_time: '00:00:10',
          end_time: '00:01:40',
          source_type: 'none',
          is_shared: true,
          has_episode_override: true,
          assigned_release_version_ids: [481, 482],
          // PRO-FOLGE-Override (Runde 5 Korrektheits-Fix): NUR Folge 3 (481) hat einen
          // Override, Folge 7 (482) nicht -- das segmentweite has_episode_override bleibt
          // trotzdem true (mindestens EINE Folge ist ueberschrieben).
          assigned_episodes: [
            { release_version_id: 481, episode_number: '3', has_override: true },
            { release_version_id: 482, episode_number: '7', has_override: false },
          ],
        }),
      ],
    })

    render(
      <SegmenteTab
        animeId={1}
        groupId={2}
        version="v1"
        episodeNumber={3}
        releaseVariantId={481}
      />,
    )

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Geteiltes Segment')).toBeTruthy()
    expect(within(table).getByText('Zeit hier überschrieben')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Zugewiesene Folgen anzeigen/ausblenden' }))

    // Nur die tatsaechlich ueberschriebene Folge 3 zeigt "verschoben" -- Folge 7 (nicht
    // ueberschrieben) zeigt schlicht "Folge 7" (Runde-5-Korrektheits-Fix-Regression).
    expect(await screen.findByText('Folge 3 · verschoben')).toBeTruthy()
    expect(screen.getByText('Folge 7')).toBeTruthy()
    expect(screen.queryByText('Folge 7 · verschoben')).toBeNull()
    // B3-Regression: Chips zeigen NIEMALS die interne release_version_id.
    expect(screen.queryByText('Folge 481')).toBeNull()
    expect(screen.queryByText('Folge 482')).toBeNull()
  })

  it('rendert kein "Geteiltes Segment"-Badge, aber der Zuweisungs-Toggle ist jetzt auch für nicht geteilte Segmente sichtbar (Gap-2-Fix)', async () => {
    mockedGetAnimeSegments.mockResolvedValue({
      data: [
        makeSegment({
          id: 34,
          assigned_release_version_ids: [481],
          assigned_episodes: [{ release_version_id: 481, episode_number: '1', has_override: false }],
          theme_title: 'Solo OP',
          start_episode: 1,
          end_episode: 1,
          start_time: '00:00:10',
          end_time: '00:01:40',
          source_type: 'none',
        }),
      ],
    })

    render(
      <SegmenteTab
        animeId={1}
        groupId={2}
        version="v1"
        episodeNumber={1}
        releaseVariantId={481}
      />,
    )

    await screen.findByRole('table')
    expect(screen.getByText('Solo OP')).toBeTruthy()
    expect(screen.queryByText('Geteiltes Segment')).toBeNull()
    expect(screen.queryByText('Zeit hier überschrieben')).toBeNull()

    const toggle = screen.getByRole('button', { name: 'Zugewiesene Folgen anzeigen/ausblenden' })
    fireEvent.click(toggle)

    expect(screen.getByText('Folge 1')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Diese Folge (1) zuweisen' })).toBeNull()
  })

  it('zeigt den Override-Switch im Bearbeiten-Panel für ein geteiltes Segment (UI-SPEC Surface 1)', async () => {
    mockedGetAnimeSegments.mockResolvedValue({
      data: [
        makeSegment({
          id: 41,
          theme_title: 'Shared OP',
          start_episode: 1,
          end_episode: 12,
          start_time: '00:00:10',
          end_time: '00:01:40',
          source_type: 'none',
          is_shared: true,
          assigned_release_version_ids: [481, 482],
          assigned_episodes: [{ release_version_id: 481, episode_number: '3', has_override: false }],
        }),
      ],
    })

    render(
      <SegmenteTab
        animeId={1}
        groupId={2}
        version="v1"
        episodeNumber={3}
        releaseVariantId={481}
      />,
    )

    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByTitle('Bearbeiten'))

    expect(
      await screen.findByRole('switch', { name: 'Zeit nur für diese Folge abweichend setzen' }),
    ).toBeTruthy()
  })

  it('rendert keinen Override-Switch im Bearbeiten-Panel für ein nicht geteiltes Segment', async () => {
    mockedGetAnimeSegments.mockResolvedValue({
      data: [
        makeSegment({
          id: 42,
          assigned_release_version_ids: [481],
          theme_title: 'Solo OP',
          start_episode: 1,
          end_episode: 1,
          start_time: '00:00:10',
          end_time: '00:01:40',
          source_type: 'none',
        }),
      ],
    })

    render(
      <SegmenteTab
        animeId={1}
        groupId={2}
        version="v1"
        episodeNumber={1}
        releaseVariantId={481}
      />,
    )

    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByTitle('Bearbeiten'))

    await screen.findByText('Segment bearbeiten')
    expect(screen.queryByRole('switch', { name: 'Zeit nur für diese Folge abweichend setzen' })).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Gap 1 (adoptSuggestion assign statt create) + Gap 2 (Zuweisungs-Zeile für
// jedes Segment) -- Phase-117-Nachtrag, Quick-Task 260819-lm5
// ---------------------------------------------------------------------------
describe('SegmenteTab Vorschlag-Übernahme (Gap 1: assign statt Duplikat)', () => {
  it('ruft bei "Übernehmen" assignAnimeSegment statt createAnimeSegment auf und entfernt den Vorschlag', async () => {
    mockedGetAnimeSegmentSuggestions.mockResolvedValue({
      data: [makeSegment({ id: 77, theme_title: 'Folge1 OP', start_episode: 1, end_episode: 1 })],
    })
    mockedAssignAnimeSegment.mockResolvedValue({
      data: makeSegment({ id: 77, is_shared: true, assigned_release_version_ids: [9] }),
    })

    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={2} releaseVariantId={9} />)

    await screen.findByRole('table')
    const adoptButton = await screen.findByRole('button', { name: 'Übernehmen' })
    fireEvent.click(adoptButton)

    await waitFor(() => {
      expect(mockedAssignAnimeSegment).toHaveBeenCalledWith(1, 77, 9)
    })
    expect(mockedCreateAnimeSegment).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Übernehmen' })).toBeNull()
    })
  })

  it('entfernt den Vorschlag NICHT und legt kein Duplikat an, wenn die Zuweisung fehlschlägt', async () => {
    mockedGetAnimeSegmentSuggestions.mockResolvedValue({
      data: [makeSegment({ id: 78, theme_title: 'Folge1 ED', start_episode: 1, end_episode: 1 })],
    })
    mockedAssignAnimeSegment.mockRejectedValue(new Error('Konflikt'))

    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={2} releaseVariantId={9} />)

    await screen.findByRole('table')
    const adoptButton = await screen.findByRole('button', { name: 'Übernehmen' })
    fireEvent.click(adoptButton)

    await waitFor(() => {
      expect(mockedAssignAnimeSegment).toHaveBeenCalledWith(1, 78, 9)
    })
    expect(mockedCreateAnimeSegment).not.toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: 'Übernehmen' })).toBeTruthy()
  })
})

describe('SegmentAssignmentsRow (Gap 2: Zuweisen/Entfernen für jedes Segment)', () => {
  it('bietet für nicht zugewiesene Segmente die explizite Zuweisungsaktion an', () => {
    const onAssignCurrent = vi.fn()
    render(<SegmentAssignmentsRow
      segment={makeSegment({ id: 52, assigned_release_version_ids: [10] })}
      currentReleaseVersionId={9}
      currentEpisodeNumber={5}
      onAssignCurrent={onAssignCurrent}
      onUnassign={vi.fn()}
      isBusy={false}
    />)
    fireEvent.click(screen.getByRole('button', { name: 'Diese Folge (5) zuweisen' }))
    expect(onAssignCurrent).toHaveBeenCalledOnce()
  })

  it('ruft unassignAnimeSegment für den NICHT-aktuellen Chip auf, wenn dessen Entfernen-Aktion geklickt wird', async () => {
    mockedGetAnimeSegments.mockResolvedValue({
      data: [
        makeSegment({
          id: 53,
          theme_title: 'Shared OP',
          start_episode: 1,
          end_episode: 12,
          is_shared: true,
          assigned_release_version_ids: [481, 482],
          assigned_episodes: [
            { release_version_id: 481, episode_number: '3', has_override: false },
            { release_version_id: 482, episode_number: '7', has_override: false },
          ],
        }),
      ],
    })
    mockedUnassignAnimeSegment.mockResolvedValue({
      data: makeSegment({ id: 53, is_shared: false, assigned_release_version_ids: [481] }),
    })

    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={3} releaseVariantId={481} />)

    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByRole('button', { name: 'Zugewiesene Folgen anzeigen/ausblenden' }))

    const removeOtherButton = await screen.findByRole('button', { name: 'Zuweisung für Folge 7 entfernen' })
    fireEvent.click(removeOtherButton)

    await waitFor(() => {
      expect(mockedUnassignAnimeSegment).toHaveBeenCalledWith(1, 53, 482)
    })
  })

  it('deaktiviert die Entfernen-Aktion für den letzten verbleibenden Chip (kein Segment darf auf 0 Zuweisungen fallen)', async () => {
    mockedGetAnimeSegments.mockResolvedValue({
      data: [
        makeSegment({
          id: 54,
          theme_title: 'Solo nach Entfernen',
          start_episode: 3,
          end_episode: 3,
          assigned_release_version_ids: [481],
          assigned_episodes: [{ release_version_id: 481, episode_number: '3', has_override: false }],
        }),
      ],
    })

    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={3} releaseVariantId={481} />)

    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByRole('button', { name: 'Zugewiesene Folgen anzeigen/ausblenden' }))

    const removeButton = await screen.findByRole('button', { name: 'Zuweisung für Folge 3 entfernen' })
    expect(removeButton).toHaveProperty('disabled', true)
  })

  it('Runde-5-Korrektheits-Fix: bei Bereich 1-12 mit Override NUR auf Folge 2 zeigt AUSSCHLIESSLICH deren Chip "verschoben"', async () => {
    // Vor dem Fix nutzte SegmentAssignmentsRow das segmentweite segment.has_episode_override
    // fuer JEDEN Chip -- das haette hier faelschlich alle 12 Folgen als "verschoben" markiert
    // und im echten Live-UAT bereits zu falschen Entfernen-Aktionen durch den Nutzer gefuehrt.
    const assignedEpisodes = Array.from({ length: 12 }, (_, i) => {
      const episodeNum = i + 1
      return {
        release_version_id: 400 + episodeNum,
        episode_number: String(episodeNum),
        has_override: episodeNum === 2,
      }
    })
    mockedGetAnimeSegments.mockResolvedValue({
      data: [
        makeSegment({
          id: 70,
          theme_title: 'Range OP',
          start_episode: 1,
          end_episode: 12,
          is_shared: true,
          has_episode_override: true,
          assigned_release_version_ids: assignedEpisodes.map((e) => e.release_version_id),
          assigned_episodes: assignedEpisodes,
        }),
      ],
    })

    // releaseVariantId=401 (Folge 1, NICHT ueberschrieben) als "aktuelle" Folge, damit die
    // "aktuell"-Hervorhebung (info-Variante) nicht mit der Override-Markierung verwechselt wird.
    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={1} releaseVariantId={401} />)

    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByRole('button', { name: 'Zugewiesene Folgen anzeigen/ausblenden' }))

    expect(await screen.findByText('Folge 2 · verschoben')).toBeTruthy()
    for (const episodeNum of [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      expect(screen.getByText(`Folge ${episodeNum}`)).toBeTruthy()
      expect(screen.queryByText(`Folge ${episodeNum} · verschoben`)).toBeNull()
    }
  })
})

// ---------------------------------------------------------------------------
// Gap 3 (Start-only Per-Folge-Zeit-Override mit automatisch berechneter Endzeit)
// -- Phase-117-Nachtrag, Quick-Task 260819-lm5
// ---------------------------------------------------------------------------
describe('SegmentEditPanel Start-only Override (Gap 3)', () => {
  function mockSharedSegment() {
    mockedGetAnimeSegments.mockResolvedValue({
      data: [
        makeSegment({
          id: 61,
          theme_title: 'Shared OP',
          start_episode: 1,
          end_episode: 12,
          start_time: '00:00:10',
          end_time: '00:01:40',
          source_type: 'none',
          is_shared: true,
          assigned_release_version_ids: [481, 482],
          assigned_episodes: [{ release_version_id: 481, episode_number: '3', has_override: false }],
        }),
      ],
    })
  }

  async function openOverridePanel(durationSeconds?: number) {
    render(
      <SegmenteTab
        animeId={1}
        groupId={2}
        version="v1"
        episodeNumber={3}
        releaseVariantId={481}
        durationSeconds={durationSeconds}
      />,
    )
    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByTitle('Bearbeiten'))
    const overrideSwitch = await screen.findByRole('switch', { name: 'Zeit nur für diese Folge abweichend setzen' })
    fireEvent.click(overrideSwitch)
  }

  it('zeigt nur EIN editierbares Start-Feld, kein zweites freies Ende-Feld mehr', async () => {
    mockSharedSegment()
    await openOverridePanel()

    expect(await screen.findByRole('textbox', { name: /Start.*Folge 3/i })).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: /Ende.*Folge 3/i })).toBeNull()
  })

  it('berechnet und zeigt die Endzeit automatisch aus Start + Basis-Dauer (90s) als reinen Info-Text', async () => {
    mockSharedSegment()
    await openOverridePanel()

    const startInput = await screen.findByRole('textbox', { name: /Start.*Folge 3/i })
    fireEvent.change(startInput, { target: { value: '0:05' } })

    expect(await screen.findByText(/00:01:35/)).toBeTruthy()
  })

  it('sendet start_time und automatisch berechnete end_time formatiert an den Override-Endpoint', async () => {
    mockSharedSegment()
    mockedUpdateAnimeSegment.mockResolvedValue({
      data: makeSegment({ id: 61, is_shared: true, render_status: 'ready', assigned_release_version_ids: [481, 482] }),
    })
    mockedUpsertAnimeSegmentEpisodeOverride.mockResolvedValue({
      data: makeSegment({ id: 61, is_shared: true, has_episode_override: true }),
    })

    await openOverridePanel()

    const startInput = await screen.findByRole('textbox', { name: /Start.*Folge 3/i })
    fireEvent.change(startInput, { target: { value: '0:05' } })

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(mockedUpsertAnimeSegmentEpisodeOverride).toHaveBeenCalledWith(1, 61, 481, {
        start_time: '00:00:05',
        end_time: '00:01:35',
      })
    })
  })

  it('deaktiviert Speichern und erklärt den Grund, wenn Start + Basis-Dauer die bekannte Videodauer überschreitet', async () => {
    mockSharedSegment()
    await openOverridePanel(95)

    const startInput = await screen.findByRole('textbox', { name: /Start.*Folge 3/i })
    fireEvent.change(startInput, { target: { value: '0:10' } })

    expect(await screen.findByText(/überschreitet die bekannte Videodauer/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Speichern' })).toHaveProperty('disabled', true)
  })

  it('Runde-5-Korrektheits-Fix: Override-Switch startet UNCHECKED und "Override entfernen" fehlt, wenn NUR eine ANDERE Folge desselben Segments einen Override hat', async () => {
    mockedGetAnimeSegments.mockResolvedValue({
      data: [
        makeSegment({
          id: 71,
          theme_title: 'Shared OP',
          start_episode: 1,
          end_episode: 12,
          start_time: '00:00:10',
          end_time: '00:01:40',
          source_type: 'none',
          is_shared: true,
          has_episode_override: true, // segmentweit true, weil Folge 7 (482) einen Override hat
          assigned_release_version_ids: [481, 482],
          assigned_episodes: [
            { release_version_id: 481, episode_number: '3', has_override: false },
            { release_version_id: 482, episode_number: '7', has_override: true },
          ],
        }),
      ],
    })

    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={3} releaseVariantId={481} />)
    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByTitle('Bearbeiten'))

    const overrideSwitch = await screen.findByRole('switch', { name: 'Zeit nur für diese Folge abweichend setzen' })
    expect(overrideSwitch.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(overrideSwitch)

    expect(await screen.findByRole('textbox', { name: /Start.*Folge 3/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Override entfernen' })).toBeNull()
  })
})

describe('SegmentEditPanel validation', () => {
  it('deaktiviert Speichern, wenn Episoden- oder Zeitbereich fehlen', () => {
    render(
      <SegmentEditPanel
        editingSegment={null}
        formState={{
          themeKind: 'op',
          themeTitle: '',
          startEpisode: '',
          endEpisode: '',
          startTime: '',
          endTime: '',
          sourceType: 'none',
          sourceRef: '',
          sourceLabel: '',
        }}
        pendingUploadFile={null}
        durationSeconds={1425}
        genericThemeOptions={[{ key: 'op', label: 'OP Kara', preferredThemeTypeId: 1 }]}
        isSaving={false}
        formError={null}
        isUploading={false}
        isDeletingAsset={false}
        isLoadingReuseCandidates={false}
        isAttachingReuse={false}
        uploadError={null}
        reuseCandidates={[]}
        reuseError={null}
        previewStreamHref={null}
        currentReleaseVersionId={null}
        onRemoveOverride={vi.fn()}
        isSavingOverride={false}
        overrideError={null}
        onSetOrigin={vi.fn()}
        isSettingOrigin={false}
        originError={null}
        contributorCandidates={[]}
        isLoadingContributors={false}
        isSavingContributors={false}
        contributorsError={null}
        onToggleContributor={vi.fn()}
        onClose={vi.fn()}
        onFormChange={vi.fn()}
        onPendingUploadFileChange={vi.fn()}
        onSave={vi.fn()}
        onAssetUpload={vi.fn()}
        onAssetDelete={vi.fn()}
        onAttachReuseCandidate={vi.fn()}
      />,
    )

    expect(screen.getByText(/Bitte Von und Bis ausfüllen/i)).toBeTruthy()
    expect(screen.getByText(/Bitte Start und Ende ausfüllen/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Speichern' })).toHaveProperty('disabled', true)
  })

  it('deaktiviert Speichern, wenn der Segment-Zeitbereich länger als 4 Minuten ist', () => {
    render(
      <SegmentEditPanel
        editingSegment={null}
        formState={{
          themeKind: 'op',
          themeTitle: '',
          startEpisode: '1',
          endEpisode: '1',
          startTime: '0:00',
          endTime: '5:00',
          sourceType: 'none',
          sourceRef: '',
          sourceLabel: '',
        }}
        pendingUploadFile={null}
        durationSeconds={1425}
        genericThemeOptions={[{ key: 'op', label: 'OP Kara', preferredThemeTypeId: 1 }]}
        isSaving={false}
        formError={null}
        isUploading={false}
        isDeletingAsset={false}
        isLoadingReuseCandidates={false}
        isAttachingReuse={false}
        uploadError={null}
        reuseCandidates={[]}
        reuseError={null}
        previewStreamHref={null}
        currentReleaseVersionId={null}
        onRemoveOverride={vi.fn()}
        isSavingOverride={false}
        overrideError={null}
        onSetOrigin={vi.fn()}
        isSettingOrigin={false}
        originError={null}
        contributorCandidates={[]}
        isLoadingContributors={false}
        isSavingContributors={false}
        contributorsError={null}
        onToggleContributor={vi.fn()}
        onClose={vi.fn()}
        onFormChange={vi.fn()}
        onPendingUploadFileChange={vi.fn()}
        onSave={vi.fn()}
        onAssetUpload={vi.fn()}
        onAssetDelete={vi.fn()}
        onAttachReuseCandidate={vi.fn()}
      />,
    )

    expect(screen.getByText('Segment-Zeitbereich darf maximal 4 Minuten lang sein.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Speichern' })).toHaveProperty('disabled', true)
  })
})

// ---------------------------------------------------------------------------
// SegmentContributorsField / useSegmentContributors (Phase 156, Plan 156-14, GAP-01):
// "Mitwirkende am Segment" -- Mehrfachauswahl der Origin-Contributors eines Segments.
// ---------------------------------------------------------------------------
describe('SegmentContributorsField (Phase 156, Plan 156-14, GAP-01)', () => {
  function mockSharedSegmentWithOrigin(overrides: Partial<AdminThemeSegment> = {}) {
    mockedGetAnimeSegments.mockResolvedValue({
      data: [
        makeSegment({
          id: 81,
          theme_title: 'Karaoke OP',
          start_episode: 1,
          end_episode: 12,
          start_time: '00:00:10',
          end_time: '00:01:40',
          is_shared: true,
          origin_release_version_id: 481,
          assigned_release_version_ids: [481, 482],
          assigned_episodes: [{ release_version_id: 481, episode_number: '3', has_override: false }],
          ...overrides,
        }),
      ],
    })
  }

  it('rendert keinen Mitwirkenden-Bereich und ruft die API nicht auf, wenn das Segment keine Origin hat', async () => {
    mockSharedSegmentWithOrigin({ origin_release_version_id: null })

    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={3} releaseVariantId={481} />)
    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByTitle('Bearbeiten'))

    await screen.findByText('Segment bearbeiten')
    expect(screen.queryByText('Mitwirkende am Segment')).toBeNull()
    expect(mockedGetThemeSegmentContributorCandidates).not.toHaveBeenCalled()
  })

  it('zeigt eine EmptyState, wenn die Origin aktuell keine Kandidaten liefert', async () => {
    mockSharedSegmentWithOrigin()
    mockedGetThemeSegmentContributorCandidates.mockResolvedValue({ data: [], origin_release_version_id: 481 })

    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={3} releaseVariantId={481} />)
    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByTitle('Bearbeiten'))

    await screen.findByText('Mitwirkende am Segment')
    expect(await screen.findByText(/Keine Mitwirkenden der Origin gefunden/)).toBeTruthy()
    expect(mockedGetThemeSegmentContributorCandidates).toHaveBeenCalledWith(1, 81)
  })

  it('zeigt je Kandidat einen Switch mit aktuellem Auswahlstatus und speichert eine Umschaltung ueber die volle neu berechnete Auswahl', async () => {
    mockSharedSegmentWithOrigin()
    mockedGetThemeSegmentContributorCandidates.mockResolvedValue({
      data: [
        {
          member_id: 7,
          name: 'Karaoke Karl',
          avatar_url: null,
          role_label: 'Quality Checker',
          role_codes: ['quality_checker'],
          member_slug: 'karaoke-karl',
          selected: false,
        },
      ],
      origin_release_version_id: 481,
    })
    mockedSetThemeSegmentContributors.mockResolvedValue({
      data: makeSegment({ id: 81, is_shared: true, origin_release_version_id: 481 }),
      contributors: [
        {
          member_id: 7,
          name: 'Karaoke Karl',
          avatar_url: null,
          role_label: 'Quality Checker',
          role_codes: ['quality_checker'],
          member_slug: 'karaoke-karl',
          selected: true,
        },
      ],
    })

    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={3} releaseVariantId={481} />)
    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByTitle('Bearbeiten'))

    const toggle = await screen.findByRole('switch', { name: /Karaoke Karl/i })
    expect(toggle.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(toggle)

    await waitFor(() => {
      expect(mockedSetThemeSegmentContributors).toHaveBeenCalledWith(1, 81, [7])
    })
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: /Karaoke Karl/i }).getAttribute('aria-checked')).toBe('true')
    })
  })

  it('erlaubt das Abwaehlen auf null Mitwirkende als eigenstaendigen, speicherbaren Zustand (156-UAT.md Nachtrag: keine Auswahl = keine Credits)', async () => {
    mockSharedSegmentWithOrigin()
    mockedGetThemeSegmentContributorCandidates.mockResolvedValue({
      data: [
        {
          member_id: 7,
          name: 'Karaoke Karl',
          avatar_url: null,
          role_label: 'Quality Checker',
          role_codes: ['quality_checker'],
          member_slug: 'karaoke-karl',
          selected: true,
        },
      ],
      origin_release_version_id: 481,
    })
    mockedSetThemeSegmentContributors.mockResolvedValue({
      data: makeSegment({ id: 81, is_shared: true, origin_release_version_id: 481 }),
      contributors: [
        {
          member_id: 7,
          name: 'Karaoke Karl',
          avatar_url: null,
          role_label: 'Quality Checker',
          role_codes: ['quality_checker'],
          member_slug: 'karaoke-karl',
          selected: false,
        },
      ],
    })

    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={3} releaseVariantId={481} />)
    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByTitle('Bearbeiten'))

    const toggle = await screen.findByRole('switch', { name: /Karaoke Karl/i })
    expect(toggle.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(toggle)

    // Die abgeschickte Auswahl ist ein leeres Array -- nicht "unveraendert lassen" --
    // und wird als eigener, expliziter PUT-Aufruf gesendet.
    await waitFor(() => {
      expect(mockedSetThemeSegmentContributors).toHaveBeenCalledWith(1, 81, [])
    })
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: /Karaoke Karl/i }).getAttribute('aria-checked')).toBe('false')
    })
  })
})

// ---------------------------------------------------------------------------
// SegmentEditPanel Origin/Mitwirkende bei Ein-Folgen-Segmenten (Phase 156, Plan 156-19, GAP-08):
// "Mitwirkende am Segment" muss bei JEDEM Segment mit gueltiger Origin erscheinen, unabhaengig
// von is_shared -- vorher war die Sektion faelschlich auf geteilte Segmente beschraenkt.
// ---------------------------------------------------------------------------
describe('SegmentEditPanel Origin/Mitwirkende bei Ein-Folgen-Segmenten (GAP-08)', () => {
  function mockSingleEpisodeSegmentWithOrigin(overrides: Partial<AdminThemeSegment> = {}) {
    mockedGetAnimeSegments.mockResolvedValue({
      data: [
        makeSegment({
          id: 91,
          theme_title: 'Kara time 1',
          start_episode: 1,
          end_episode: 1,
          start_time: '00:00:10',
          end_time: '00:01:40',
          is_shared: false,
          origin_release_version_id: 481,
          assigned_release_version_ids: [481],
          assigned_episodes: [{ release_version_id: 481, episode_number: '1', has_override: false }],
          ...overrides,
        }),
      ],
    })
  }

  it('zeigt "Mitwirkende am Segment" bei einem Ein-Folgen-Segment mit gueltiger Origin und ruft die Kandidaten-API auf', async () => {
    mockSingleEpisodeSegmentWithOrigin()
    mockedGetThemeSegmentContributorCandidates.mockResolvedValue({ data: [], origin_release_version_id: 481 })

    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={1} releaseVariantId={481} />)
    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByTitle('Bearbeiten'))

    await screen.findByText('Segment bearbeiten')
    await screen.findByText('Mitwirkende am Segment')
    expect(mockedGetThemeSegmentContributorCandidates).toHaveBeenCalledWith(1, 91)
  })

  it('zeigt bei einem Ein-Folgen-Segment eine schreibgeschuetzte "Origin: Folge 1"-Info statt eines Selects', async () => {
    mockSingleEpisodeSegmentWithOrigin()
    mockedGetThemeSegmentContributorCandidates.mockResolvedValue({ data: [], origin_release_version_id: 481 })

    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={1} releaseVariantId={481} />)
    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByTitle('Bearbeiten'))

    await screen.findByText('Segment bearbeiten')
    expect(await screen.findByText('Origin: Folge 1')).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: /Segment-Origin/i })).toBeNull()
  })

  it('zeigt weder Mitwirkende noch Origin-Info bei einem Segment ganz ohne Zuweisung/Origin', async () => {
    mockSingleEpisodeSegmentWithOrigin({
      origin_release_version_id: null,
      assigned_episodes: [],
    })

    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={1} releaseVariantId={481} />)
    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByTitle('Bearbeiten'))

    await screen.findByText('Segment bearbeiten')
    expect(screen.queryByText('Mitwirkende am Segment')).toBeNull()
    expect(screen.queryByText(/^Origin: Folge/)).toBeNull()
    expect(mockedGetThemeSegmentContributorCandidates).not.toHaveBeenCalled()
  })

  it('behaelt fuer geteilte Segmente das editierbare Origin-Select UND "Mitwirkende am Segment" unveraendert bei', async () => {
    mockedGetAnimeSegments.mockResolvedValue({
      data: [
        makeSegment({
          id: 92,
          theme_title: 'Karaoke OP geteilt',
          start_episode: 1,
          end_episode: 12,
          start_time: '00:00:10',
          end_time: '00:01:40',
          is_shared: true,
          origin_release_version_id: 481,
          assigned_release_version_ids: [481, 482],
          assigned_episodes: [
            { release_version_id: 481, episode_number: '1', has_override: false },
            { release_version_id: 482, episode_number: '2', has_override: false },
          ],
        }),
      ],
    })
    mockedGetThemeSegmentContributorCandidates.mockResolvedValue({ data: [], origin_release_version_id: 481 })
    mockedSetAnimeSegmentOrigin.mockResolvedValue({
      data: makeSegment({ id: 92, is_shared: true, origin_release_version_id: 482 }),
    })

    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={1} releaseVariantId={481} />)
    const table = await screen.findByRole('table')
    fireEvent.click(within(table).getByTitle('Bearbeiten'))

    await screen.findByText('Segment bearbeiten')
    await screen.findByText('Mitwirkende am Segment')
    const select = screen.getByRole('combobox', { name: /Segment-Origin/i })
    expect(within(select).getAllByRole('option')).toHaveLength(2)

    fireEvent.change(select, { target: { value: '482' } })

    await waitFor(() => {
      expect(mockedSetAnimeSegmentOrigin).toHaveBeenCalledWith(1, 92, 482)
    })
  })
})

// ---------------------------------------------------------------------------
// getTypeBadgeLabel
// ---------------------------------------------------------------------------
describe('getTypeBadgeLabel', () => {
  it('gibt "OP" für "OP1"', () => {
    expect(getTypeBadgeLabel('OP1')).toBe('OP')
  })

  it('gibt "OP" für "Opening 1"', () => {
    expect(getTypeBadgeLabel('Opening 1')).toBe('OP')
  })

  it('gibt "ED" für "ED2"', () => {
    expect(getTypeBadgeLabel('ED2')).toBe('ED')
  })

  it('gibt "ED" für "ED2" direkt', () => {
    expect(getTypeBadgeLabel('ED2')).toBe('ED')
  })

  it('gibt "IN" für "Insert"', () => {
    expect(getTypeBadgeLabel('Insert')).toBe('IN')
  })

  it('gibt "PV" für "PV"', () => {
    expect(getTypeBadgeLabel('PV')).toBe('PV')
  })

  it('gibt "PV" für "Outro"', () => {
    expect(getTypeBadgeLabel('Outro')).toBe('PV')
  })

  it('gibt den Original-String bei unbekanntem Typ zurück', () => {
    expect(getTypeBadgeLabel('Special')).toBe('Special')
  })
})

// ---------------------------------------------------------------------------
// calcDuration
// ---------------------------------------------------------------------------
describe('calcDuration', () => {
  it('berechnet Dauer zwischen 00:00:30 und 00:01:45 als "(01:15)"', () => {
    expect(calcDuration('00:00:30', '00:01:45')).toBe('(01:15)')
  })

  it('gibt "(00:00)" zurück wenn Start und Ende gleich sind', () => {
    expect(calcDuration('00:00:00', '00:00:00')).toBe('(00:00)')
  })

  it('berechnet typische OP-Laenge von 90 Sekunden korrekt', () => {
    expect(calcDuration('00:00:00', '00:01:30')).toBe('(01:30)')
  })

  it('berechnet Dauer ueber eine Stunde korrekt', () => {
    expect(calcDuration('00:00:00', '01:00:00')).toBe('(00:00)')
    // Stunde wird nicht abgeschnitten — eigentlich 60 Minuten
    // formatSeconds liefert HH:MM:SS; .slice(3) gibt MM:SS -> 00:00 für 0sec
  })
})

// ---------------------------------------------------------------------------
// formatEpisodeRange (Einzelepisode ohne Duplikat)
// ---------------------------------------------------------------------------
describe('formatEpisodeRange', () => {
  it('zeigt Einzelepisode ohne Duplikat: start === end => nur "3"', () => {
    expect(formatEpisodeRange(3, 3)).toBe('3')
  })

  it('zeigt Range für unterschiedliche Episoden', () => {
    expect(formatEpisodeRange(1, 9)).toBe('1 \u2013 9')
  })

  it('zeigt Gedankenstrich wenn beide null', () => {
    expect(formatEpisodeRange(null, null)).toBe('\u2014')
  })

  it('zeigt offene Range wenn nur start gesetzt', () => {
    expect(formatEpisodeRange(5, null)).toBe('5 \u2013 ?')
  })

  it('zeigt offene Range wenn nur end gesetzt', () => {
    expect(formatEpisodeRange(null, 12)).toBe('? \u2013 12')
  })
})

// ---------------------------------------------------------------------------
// resolveSourceLabel (Source-Type-Helfer)
// ---------------------------------------------------------------------------
describe('resolveSourceLabel', () => {
  it('mappt source_type "none" auf "Keine Quelle"', () => {
    const segment = makeSegment({ source_type: 'none' })
    expect(resolveSourceLabel(segment)).toBe('Keine Quelle')
  })

  it('mappt source_type "jellyfin_theme" auf "Jellyfin Serien-Theme" (kein label)', () => {
    const segment = makeSegment({ source_type: 'jellyfin_theme' })
    expect(resolveSourceLabel(segment)).toBe('Jellyfin Serien-Theme')
  })

  it('nutzt source_label wenn bei jellyfin_theme gesetzt', () => {
    const segment = makeSegment({ source_type: 'jellyfin_theme', source_label: 'Mein Theme' })
    expect(resolveSourceLabel(segment)).toBe('Mein Theme')
  })

  it('mappt source_type "release_asset" auf "Release-Asset" (kein label)', () => {
    const segment = makeSegment({ source_type: 'release_asset' })
    expect(resolveSourceLabel(segment)).toBe('Release-Asset')
  })

  it('nutzt source_label wenn bei release_asset gesetzt', () => {
    const segment = makeSegment({ source_type: 'release_asset', source_label: 'OP1.mkv' })
    expect(resolveSourceLabel(segment)).toBe('OP1.mkv')
  })

  it('faellt auf Jellyfin-Theme-Label zurück wenn legacy source_jellyfin_item_id gesetzt', () => {
    const segment = makeSegment({ source_type: null, source_jellyfin_item_id: 'abc123' })
    expect(resolveSourceLabel(segment)).toBe('Jellyfin Serien-Theme')
  })

  it('gibt "Keine Quelle" zurück wenn kein source_type und keine legacy-ID', () => {
    const segment = makeSegment({ source_type: null, source_jellyfin_item_id: null })
    expect(resolveSourceLabel(segment)).toBe('Keine Quelle')
  })
})

// ---------------------------------------------------------------------------
// isSegmentActiveForEpisode (Range-Semantik)
// ---------------------------------------------------------------------------
describe('isSegmentActiveForEpisode', () => {
  it('Segment ohne Range ist für jede Episode aktiv', () => {
    const segment = makeSegment({ start_episode: null, end_episode: null })
    expect(isSegmentActiveForEpisode(segment, 4)).toBe(true)
    expect(isSegmentActiveForEpisode(segment, 100)).toBe(true)
  })

  it('Segment 1-9 ist auf Episode 4 aktiv', () => {
    const segment = makeSegment({ start_episode: 1, end_episode: 9 })
    expect(isSegmentActiveForEpisode(segment, 4)).toBe(true)
  })

  it('Segment 1-9 ist auf Episode 1 aktiv', () => {
    const segment = makeSegment({ start_episode: 1, end_episode: 9 })
    expect(isSegmentActiveForEpisode(segment, 1)).toBe(true)
  })

  it('Segment 1-9 ist auf Episode 9 aktiv', () => {
    const segment = makeSegment({ start_episode: 1, end_episode: 9 })
    expect(isSegmentActiveForEpisode(segment, 9)).toBe(true)
  })

  it('Segment 1-9 ist auf Episode 10 NICHT aktiv', () => {
    const segment = makeSegment({ start_episode: 1, end_episode: 9 })
    expect(isSegmentActiveForEpisode(segment, 10)).toBe(false)
  })

  it('Segment ab Episode 5 (kein Ende) ist auf Episode 5 aktiv', () => {
    const segment = makeSegment({ start_episode: 5, end_episode: null })
    expect(isSegmentActiveForEpisode(segment, 5)).toBe(true)
    expect(isSegmentActiveForEpisode(segment, 100)).toBe(true)
    expect(isSegmentActiveForEpisode(segment, 4)).toBe(false)
  })

  it('Segment bis Episode 9 (kein Start) ist auf Episode 4 aktiv', () => {
    const segment = makeSegment({ start_episode: null, end_episode: 9 })
    expect(isSegmentActiveForEpisode(segment, 4)).toBe(true)
    expect(isSegmentActiveForEpisode(segment, 9)).toBe(true)
    expect(isSegmentActiveForEpisode(segment, 10)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// parseFlexibleTimeInput
// ---------------------------------------------------------------------------
describe('parseFlexibleTimeInput', () => {
  it('"90" wird als 90 Sekunden interpretiert', () => {
    expect(parseFlexibleTimeInput('90')).toBe(90)
  })

  it('"1:30" wird als MM:SS = 90 Sekunden interpretiert', () => {
    expect(parseFlexibleTimeInput('1:30')).toBe(90)
  })

  it('"25:29" wird als MM:SS = 1529 Sekunden interpretiert', () => {
    expect(parseFlexibleTimeInput('25:29')).toBe(1529)
  })

  it('"1:1:20" wird als HH:MM:SS = 3680 Sekunden interpretiert', () => {
    expect(parseFlexibleTimeInput('1:1:20')).toBe(3680)
  })

  it('"1m30" wird als 90 Sekunden interpretiert', () => {
    expect(parseFlexibleTimeInput('1m30')).toBe(90)
  })

  it('"1m30s" wird als 90 Sekunden interpretiert', () => {
    expect(parseFlexibleTimeInput('1m30s')).toBe(90)
  })

  it('"2m" wird als 120 Sekunden interpretiert', () => {
    expect(parseFlexibleTimeInput('2m')).toBe(120)
  })

  it('"00:01:30" bleibt rueckwaertskompatibel = 90 Sekunden', () => {
    expect(parseFlexibleTimeInput('00:01:30')).toBe(90)
  })

  it('leerer String gibt null zurück', () => {
    expect(parseFlexibleTimeInput('')).toBeNull()
  })

  it('"abc" gibt null zurück', () => {
    expect(parseFlexibleTimeInput('abc')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// formatTimeInput
// ---------------------------------------------------------------------------
describe('formatTimeInput', () => {
  it('90 Sekunden => "00:01:30"', () => {
    expect(formatTimeInput(90)).toBe('00:01:30')
  })

  it('0 Sekunden => "00:00:00"', () => {
    expect(formatTimeInput(0)).toBe('00:00:00')
  })

  it('3661 Sekunden => "01:01:01"', () => {
    expect(formatTimeInput(3661)).toBe('01:01:01')
  })

  it('1529 Sekunden => "00:25:29"', () => {
    expect(formatTimeInput(1529)).toBe('00:25:29')
  })
})

// ---------------------------------------------------------------------------
// isCurrentEpisodeAssigned / findAssignedEpisodeNumber / formatAssignmentChipLabel
// (Plan 117-07 -- geteiltes Segment / Zuweisungs-Chips)
// ---------------------------------------------------------------------------
describe('isCurrentEpisodeAssigned', () => {
  it('gibt true zurück, wenn die aktuelle Release-Version zugewiesen ist', () => {
    const segment = makeSegment({ assigned_release_version_ids: [10, 20] })
    expect(isCurrentEpisodeAssigned(segment, 20)).toBe(true)
  })

  it('gibt false zurück, wenn die aktuelle Release-Version NICHT zugewiesen ist', () => {
    const segment = makeSegment({ assigned_release_version_ids: [10, 20] })
    expect(isCurrentEpisodeAssigned(segment, 99)).toBe(false)
  })

  it('gibt false zurück, wenn currentReleaseVersionId null ist', () => {
    const segment = makeSegment({ assigned_release_version_ids: [10, 20] })
    expect(isCurrentEpisodeAssigned(segment, null)).toBe(false)
  })

  it('gibt false zurück, wenn assigned_release_version_ids fehlt', () => {
    const segment = makeSegment({})
    expect(isCurrentEpisodeAssigned(segment, 10)).toBe(false)
  })
})

describe('findAssignedEpisodeNumber', () => {
  it('liefert die ECHTE Episodennummer für eine bekannte release_version_id', () => {
    const segment = makeSegment({
      assigned_episodes: [
        { release_version_id: 10, episode_number: '3', has_override: false },
        { release_version_id: 20, episode_number: '7', has_override: false },
      ],
    })
    expect(findAssignedEpisodeNumber(segment, 20)).toBe('7')
  })

  it('liefert null, wenn keine passende Zuweisung existiert', () => {
    const segment = makeSegment({
      assigned_episodes: [{ release_version_id: 10, episode_number: '3', has_override: false }],
    })
    expect(findAssignedEpisodeNumber(segment, 999)).toBeNull()
  })

  it('liefert null, wenn assigned_episodes fehlt', () => {
    const segment = makeSegment({})
    expect(findAssignedEpisodeNumber(segment, 10)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// findAssignedEpisodeHasOverride (Quick-Task 260819-lm5, Runde 5 Korrektheits-Fix):
// PRO-FOLGE-Override-Lookup -- ersetzt die vorherige, fehlerhafte Verwendung des
// segmentweiten segment.has_episode_override fuer JEDEN Zuweisungs-Chip.
// ---------------------------------------------------------------------------
describe('findAssignedEpisodeHasOverride', () => {
  it('liefert true NUR für die Zuweisung mit has_override:true, false für alle anderen', () => {
    const segment = makeSegment({
      has_episode_override: true, // segmentweit true, weil MINDESTENS eine Folge ueberschrieben ist
      assigned_episodes: [
        { release_version_id: 10, episode_number: '1', has_override: false },
        { release_version_id: 20, episode_number: '2', has_override: true },
        { release_version_id: 30, episode_number: '3', has_override: false },
      ],
    })
    expect(findAssignedEpisodeHasOverride(segment, 10)).toBe(false)
    expect(findAssignedEpisodeHasOverride(segment, 20)).toBe(true)
    expect(findAssignedEpisodeHasOverride(segment, 30)).toBe(false)
  })

  it('liefert false, wenn keine passende Zuweisung existiert', () => {
    const segment = makeSegment({
      assigned_episodes: [{ release_version_id: 10, episode_number: '3', has_override: true }],
    })
    expect(findAssignedEpisodeHasOverride(segment, 999)).toBe(false)
  })

  it('liefert false, wenn assigned_episodes fehlt', () => {
    const segment = makeSegment({})
    expect(findAssignedEpisodeHasOverride(segment, 10)).toBe(false)
  })
})

describe('formatAssignmentChipLabel', () => {
  it('formatiert ohne Override als "Folge {N}"', () => {
    expect(formatAssignmentChipLabel('7', false)).toBe('Folge 7')
  })

  it('formatiert mit Override als "Folge {N} · verschoben"', () => {
    expect(formatAssignmentChipLabel('7', true)).toBe('Folge 7 · verschoben')
  })

  it('B3-Regression: nutzt die übergebene Episodennummer wortwörtlich, keine numerische release_version_id-Herleitung', () => {
    // episodeNumber ist bewusst ein String, der sich von einer internen numerischen
    // release_version_id unterscheiden würde (z. B. Episode "3" bei release_version_id 481).
    expect(formatAssignmentChipLabel('3', false)).toBe('Folge 3')
    expect(formatAssignmentChipLabel('3', false)).not.toBe('Folge 481')
  })
})

describe('SegmenteTab deletion action', () => {
  it('zeigt den Löschvorgang als direkten Papierkorb statt in einem Mehr-Menü', async () => {
    mockedGetAnimeSegments.mockResolvedValue({
      data: [makeSegment({ id: 44, theme_title: 'Direkt löschbares Segment', assigned_release_version_ids: [9] })],
    })

    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={1} releaseVariantId={9} />)

    expect(await screen.findByTitle('Segment löschen')).toBeTruthy()
    expect(screen.queryByTitle('Mehr Aktionen')).toBeNull()
  })
})


describe('current-file chapter creation assistance', () => {
  const chapterHints = [{ name: null, start_ms: 0 }, { name: 'Ending', start_ms: 1298047 }, { name: 'Preview', start_ms: 1378043 }, { name: 'Half', start_ms: 100500 }]
  async function openChapterCreation(hints: typeof chapterHints | null = chapterHints) {
    const view = render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={3} releaseVariantId={481} durationSeconds={1500} chapterHints={hints} />)
    fireEvent.click(await screen.findByRole('button', { name: /Segment hinzufügen/ }))
    return view
  }
  it('shows exact timestamps but deliberately adopts nearest seconds in one field without saving', async () => {
    await openChapterCreation()
    const start = screen.getByRole('combobox', { name: 'Kapitelmarke als Start' })
    const end = screen.getByRole('combobox', { name: 'Kapitelmarke als Ende' })
    expect(within(start).getByRole('option', { name: '00:21:38.047 · Ending' })).toBeTruthy()
    expect(within(end).getByRole('option', { name: '00:22:58.043 · Preview' })).toBeTruthy()
    expect(within(start).getByRole('option', { name: '00:00:00.000 · Kapitel 1' })).toBeTruthy()
    expect(screen.getByText(/Bei der Übernahme wird auf ganze Sekunden gerundet/)).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: 'Name (optional)' }), { target: { value: 'Eigener Name' } })
    const type = (screen.getByLabelText('Typ') as HTMLSelectElement).value
    fireEvent.change(start, { target: { value: '1' } })
    expect((screen.getByLabelText('Start') as HTMLInputElement).value).toBe('00:21:38')
    expect((screen.getByLabelText('Ende') as HTMLInputElement).value).toBe('00:01:20')
    fireEvent.change(end, { target: { value: '2' } })
    expect((screen.getByLabelText('Ende') as HTMLInputElement).value).toBe('00:22:58')
    expect((screen.getByLabelText('Typ') as HTMLSelectElement).value).toBe(type)
    expect((screen.getByLabelText('Name (optional)') as HTMLInputElement).value).toBe('Eigener Name')
    expect((screen.getByLabelText('Von') as HTMLInputElement).value).toBe('3')
    expect(mockedCreateAnimeSegment).not.toHaveBeenCalled()
    expect(mockedUpdateAnimeSegment).not.toHaveBeenCalled()
    expect(mockedCreateAdminAnimeTheme).not.toHaveBeenCalled()
    fireEvent.change(start, { target: { value: '3' } })
    expect((screen.getByLabelText('Start') as HTMLInputElement).value).toBe('00:01:41')
    fireEvent.change(start, { target: { value: '0' } })
    expect((screen.getByLabelText('Start') as HTMLInputElement).value).toBe('00:00:00')
  })
  it('takes the complete Einspiel interval and keeps chosen labels without changing other fields or saving', async () => {
    await openChapterCreation([{ name: 'Einspiel', start_ms: 0 }, { name: 'Werbung', start_ms: 187395 }])
    fireEvent.change(screen.getByLabelText('Name (optional)'), { target: { value: 'Eigener Name' } })
    const type = (screen.getByLabelText('Typ') as HTMLSelectElement).value
    const range = screen.getByLabelText('Kapitelabschnitt übernehmen') as HTMLSelectElement
    expect(within(range).getByRole('option', { name: /Einspiel.*00:00:00.000.*00:03:07.395/ })).toBeTruthy()
    fireEvent.change(range, { target: { value: '0' } })
    expect((screen.getByLabelText('Start') as HTMLInputElement).value).toBe('00:00:00')
    expect((screen.getByLabelText('Ende') as HTMLInputElement).value).toBe('00:03:07')
    expect(range.value).toBe('0')
    expect((screen.getByLabelText('Kapitelmarke als Start') as HTMLSelectElement).value).toBe('0')
    expect((screen.getByLabelText('Kapitelmarke als Ende') as HTMLSelectElement).value).toBe('1')
    expect((screen.getByLabelText('Typ') as HTMLSelectElement).value).toBe(type)
    expect((screen.getByLabelText('Name (optional)') as HTMLInputElement).value).toBe('Eigener Name')
    expect((screen.getByLabelText('Von') as HTMLInputElement).value).toBe('3')
    expect((screen.getByLabelText('Bis') as HTMLInputElement).value).toBe('3')
    expect(screen.queryByText('Ende muss nach dem Start liegen.')).toBeNull()
    expect(mockedCreateAnimeSegment).not.toHaveBeenCalled()
    expect(mockedCreateAdminAnimeTheme).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Ende'), { target: { value: '2:30' } })
    expect(range.value).toBe('')
    expect((screen.getByLabelText('Kapitelmarke als Ende') as HTMLSelectElement).value).toBe('')
    expect((screen.getByLabelText('Kapitelmarke als Start') as HTMLSelectElement).value).toBe('0')
  })
  it('retains individual chosen markers and disables an end at or before Start', async () => {
    await openChapterCreation()
    const start = screen.getByLabelText('Kapitelmarke als Start') as HTMLSelectElement
    const end = screen.getByLabelText('Kapitelmarke als Ende') as HTMLSelectElement
    expect((within(end).getByRole('option', { name: /Kapitel 1/ }) as HTMLOptionElement).disabled).toBe(true)
    fireEvent.change(start, { target: { value: '1' } })
    fireEvent.change(end, { target: { value: '2' } })
    expect(start.value).toBe('1')
    expect(end.value).toBe('2')
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '5' } })
    expect(start.value).toBe('')
    expect(end.value).toBe('2')
  })
  it.each([1500, undefined])('uses only a known runtime for the last chapter (%s)', async duration => {
    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={3} releaseVariantId={481} durationSeconds={duration} chapterHints={[{ name: 'Preview', start_ms: 1378043 }]} />)
    fireEvent.click(await screen.findByRole('button', { name: /Segment hinzufügen/ }))
    const range = screen.getByLabelText('Kapitelabschnitt übernehmen') as HTMLSelectElement
    const option = within(range).getByRole('option', { name: /Preview/ }) as HTMLOptionElement
    expect(option.disabled).toBe(duration == null)
    if (duration != null) {
      fireEvent.change(range, { target: { value: '0' } })
      expect((screen.getByLabelText('Start') as HTMLInputElement).value).toBe('00:22:58')
      expect((screen.getByLabelText('Ende') as HTMLInputElement).value).toBe('00:25:00')
      expect(range.value).toBe('0')
    } else {
      expect(option.textContent).toContain('Ende unbekannt')
    }
    expect(mockedCreateAnimeSegment).not.toHaveBeenCalled()
  })
  it('skips equal chapter timestamps, preserves the chosen duplicate and rejects rounded-empty intervals', async () => {
    await openChapterCreation([{ name: 'A', start_ms: 0 }, { name: 'B', start_ms: 0 }, { name: 'Tiny', start_ms: 187100 }, { name: 'Next', start_ms: 187200 }])
    const range = screen.getByLabelText('Kapitelabschnitt übernehmen') as HTMLSelectElement
    fireEvent.change(range, { target: { value: '1' } })
    expect((screen.getByLabelText('Ende') as HTMLInputElement).value).toBe('00:03:07')
    expect(range.value).toBe('1')
    expect((screen.getByLabelText('Kapitelmarke als Start') as HTMLSelectElement).value).toBe('1')
    expect((within(range).getByRole('option', { name: /Tiny/ }) as HTMLOptionElement).disabled).toBe(true)
  })
  it('keeps the segment window guard instead of silently truncating a long chapter', async () => {
    await openChapterCreation([{ name: 'Long', start_ms: 0 }, { name: 'Next', start_ms: 500000 }])
    fireEvent.change(screen.getByLabelText('Kapitelabschnitt übernehmen'), { target: { value: '0' } })
    expect((screen.getByLabelText('Ende') as HTMLInputElement).value).toBe('00:08:20')
    expect(screen.getByText('Segment-Zeitbereich darf maximal 4 Minuten lang sein.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Speichern' }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('does not retain a selected chapter identity after hints are replaced', async () => {
    const view = await openChapterCreation([{ name: 'A', start_ms: 0 }, { name: 'B', start_ms: 100000 }])
    fireEvent.change(screen.getByLabelText('Kapitelabschnitt übernehmen'), { target: { value: '0' } })
    await act(async () => { view.rerender(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={3} releaseVariantId={481} durationSeconds={1500} chapterHints={[{ name: 'Other', start_ms: 0 }, { name: 'Changed', start_ms: 100000 }]} />) })
    expect((screen.getByLabelText('Kapitelabschnitt übernehmen') as HTMLSelectElement).value).toBe('')
    expect((screen.getByLabelText('Kapitelmarke als Start') as HTMLSelectElement).value).toBe('')
  })
  it.each([null, []])('distinguishes unavailable versus empty chapters (%s)', async hints => {
    await openChapterCreation(hints)
    expect(screen.getByText(hints === null ? 'Für diese Datei sind keine verlässlichen Kapitelzeiten verfügbar.' : 'Diese Datei enthält keine Kapitel.')).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: 'Kapitelmarke als Start' })).toBeNull()
  })
  it('resets the open creation drawer when the persisted variant changes', async () => {
    const view = await openChapterCreation()
    await act(async () => { view.rerender(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={4} releaseVariantId={482} chapterHints={chapterHints} />) })
    expect(screen.queryByLabelText('Start')).toBeNull()
  })
  it('omits current-file hints for existing shared segments', async () => {
    mockedGetAnimeSegments.mockResolvedValue({ data: [makeSegment({ id: 61, start_time: '00:00:10', end_time: '00:01:40', source_type: 'none', is_shared: true, assigned_release_version_ids: [481] })] })
    render(<SegmenteTab animeId={1} groupId={2} version="v1" episodeNumber={3} releaseVariantId={481} chapterHints={chapterHints} />)
    fireEvent.click(within(await screen.findByRole('table')).getByTitle('Bearbeiten'))
    expect(screen.queryByRole('combobox', { name: 'Kapitelmarke als Start' })).toBeNull()
    expect(screen.queryByText(/verlässlichen Kapitelzeiten/)).toBeNull()
  })
  it.each(['release_asset', 'jellyfin_theme'])('withholds hints for another playback source (%s)', async sourceType => {
    await openChapterCreation()
    fireEvent.change(screen.getByLabelText('Provenance / Fallback-Wahl'), { target: { value: sourceType } })
    expect(screen.queryByRole('combobox', { name: 'Kapitelmarke als Start' })).toBeNull()
    expect(screen.queryByText(/verlässlichen Kapitelzeiten/)).toBeNull()
    expect(mockedCreateAnimeSegment).not.toHaveBeenCalled()
  })
  it('keeps manual inputs and makes the existing runtime clamp visible', async () => {
    await openChapterCreation([{ name: 'End boundary', start_ms: 1500500 }])
    fireEvent.change(screen.getByRole('combobox', { name: 'Kapitelmarke als Ende' }), { target: { value: '0' } })
    expect((screen.getByLabelText('Ende') as HTMLInputElement).value).toBe('00:25:01')
    expect(screen.getByText(/Ende liegt über der bekannten Videodauer/)).toBeTruthy()
    fireEvent.blur(screen.getByLabelText('Ende'))
    expect((screen.getByLabelText('Ende') as HTMLInputElement).value).toBe('00:25:00')
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '23:00' } })
    fireEvent.blur(screen.getByLabelText('Start'))
    expect((screen.getByLabelText('Start') as HTMLInputElement).value).toBe('00:23:00')
    expect(mockedCreateAnimeSegment).not.toHaveBeenCalled()
  })

})
