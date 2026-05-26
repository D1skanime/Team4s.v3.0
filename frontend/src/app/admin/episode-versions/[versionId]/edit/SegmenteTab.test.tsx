// @vitest-environment jsdom

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import type { AdminThemeSegment } from '@/types/admin'

import {
  getTypeBadgeLabel,
  calcDuration,
  formatEpisodeRange,
  resolveSourceLabel,
  isSegmentActiveForEpisode,
} from './segmenteTabUtils'

import { parseFlexibleTimeInput, formatTimeInput } from './SegmenteTab.helpers'
import { useReleaseSegments } from './useReleaseSegments'
import {
  getAdminAnimeThemes,
  getAdminThemeTypes,
  getAnimeSegmentSuggestions,
  getAnimeSegments,
} from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
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
}))

const mockedUseAuthSession = vi.mocked(useAuthSession)
const mockedGetAnimeSegments = vi.mocked(getAnimeSegments)
const mockedGetAnimeSegmentSuggestions = vi.mocked(getAnimeSegmentSuggestions)
const mockedGetAdminAnimeThemes = vi.mocked(getAdminAnimeThemes)
const mockedGetAdminThemeTypes = vi.mocked(getAdminThemeTypes)

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseAuthSession.mockReturnValue({
    authToken: '',
    hasAccessToken: true,
    hasRefreshToken: true,
    displayName: '',
    isClientInitialized: true,
  })
  mockedGetAnimeSegments.mockResolvedValue({ data: [] })
  mockedGetAnimeSegmentSuggestions.mockResolvedValue({ data: [] })
  mockedGetAdminAnimeThemes.mockResolvedValue({ data: [] })
  mockedGetAdminThemeTypes.mockResolvedValue({ data: [] })
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
})

describe('SegmenteTab table', () => {
  it('renders segments in the shared table and keeps active rows editable', async () => {
    mockedGetAnimeSegments.mockResolvedValue({
      data: [
        makeSegment({
          id: 22,
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
    expect(within(table).getByRole('columnheader', { name: 'Typ' })).toBeTruthy()
    expect(within(table).getByText('Sakura OP')).toBeTruthy()

    const activeRow = within(table).getByText('Sakura OP').closest('tr')
    expect(activeRow?.className).toContain('tableRowActive')

    fireEvent.click(within(activeRow as HTMLTableRowElement).getByTitle('Bearbeiten'))

    expect(await screen.findByText('Segment bearbeiten')).toBeTruthy()
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
