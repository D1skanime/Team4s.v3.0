// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EpisodeReleaseSummary } from '@/types/group'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

const getGroupReleaseListCursor = vi.fn()
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    getGroupReleaseListCursor: (...args: unknown[]) => getGroupReleaseListCursor(...args),
  }
})

import { OlderReleasesList } from './OlderReleasesList'

const olderReleasesStyles = () => readFileSync(
  join(process.cwd(), 'src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.module.css'),
  'utf8',
)

// jsdom has no IntersectionObserver — stub it so the auto-load effect (AO4-21)
// doesn't throw. The stub never fires, so these tests exercise only the manual
// "Weitere Releases laden" fallback (AO4-25), which is sufficient for this component's own
// unit coverage.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).IntersectionObserver = IntersectionObserverStub

const makeEpisode = (overrides: Partial<EpisodeReleaseSummary> = {}): EpisodeReleaseSummary => ({
  id: 1,
  episode_number: 1,
  episode_number_label: '1',
  title: 'Episode 1',
  has_op: false,
  has_ed: false,
  karaoke_count: 0,
  insert_count: 0,
  screenshot_count: 0,
  duration_seconds: 1425,
  timeline_segments: [],
  images_count: 2,
  notes_count: 1,
  ...overrides,
})

beforeEach(() => {
  // Mobile als Testdefault (analog ProjectStats.test.tsx) — die meisten
  // bestehenden Tests pruefen inhaltlich Mobile-Verhalten (Accordion,
  // Badges, Release-Link). Der Desktop-Zweig wird in einem eigenen Test
  // lokal auf matches: false umgestellt.
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: query === '(max-width: 768px)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
})

afterEach(() => {
  cleanup()
  getGroupReleaseListCursor.mockReset()
})

describe('OlderReleasesList (AO4-12/AO4-21/AO4-25)', () => {
  it('hält einzelne Release-Zeilen transparent und zieht die Wine-Linie näher an die Timeline', () => {
    const css = olderReleasesStyles()
    const rowBlock = css.match(/\.row\s*\{[\s\S]*?\}/)?.[0] ?? ''
    const rowTitleLineBlock = css.match(/\.rowTitleLine\s*\{[\s\S]*?\}/)?.[0] ?? ''
    const timelineActionRowBlock = css.match(/\.timelineActionRow\s*\{[\s\S]*?\}/)?.[0] ?? ''
    const timelineTrackBlock = css.match(/\.timelineTrack\s*\{[\s\S]*?\}/)?.[0] ?? ''
    const segmentPillBlock = css.match(/\.segmentPill\s*\{[\s\S]*?\}/)?.[0] ?? ''
    const segmentTypeBlock = css.match(/\.segmentType\s*\{[\s\S]*?\}/)?.[0] ?? ''

    expect(rowBlock).toContain('padding: 12px 16px 4px')
    expect(rowBlock).toContain('background: transparent')
    expect(rowBlock).toContain('box-shadow: none')
    expect(rowTitleLineBlock.match(/max-content/g)).toHaveLength(2)
    expect(timelineActionRowBlock).toContain('grid-template-columns: minmax(0, 1fr) auto')
    expect(timelineTrackBlock).toContain('height: 32px')
    expect(segmentPillBlock).toContain('height: 24px')
    expect(segmentTypeBlock).toContain('top: 50%')
    expect(segmentTypeBlock).not.toContain('bottom:')
  })

  it('rendert ein Release ohne Karas direkt mit Release öffnen statt als leeres Accordion', async () => {
    getGroupReleaseListCursor.mockResolvedValueOnce({
      items: [makeEpisode({ id: 10, episode_number: 1, title: 'Episode 1' })],
      next_cursor: 'cursor-1',
      has_more: true,
    })

    render(<OlderReleasesList animeID={1} groupID={2} />)

    await waitFor(() => expect(screen.getAllByText('Folge 1').length).toBeGreaterThan(0))
    expect(screen.getByRole('heading', { name: 'Alle Releases' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Weitere Releases laden' })).not.toBeNull()
    expect(screen.getAllByText('2 Bilder').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1 Texte').length).toBeGreaterThan(0)
    expect(screen.queryByText('Hauptinhalt')).toBeNull()
    expect(screen.queryByRole('button', { name: /Folge 1/i })).toBeNull()
    expect(screen.getAllByRole('link', { name: 'Release öffnen' }).length).toBeGreaterThan(0)
    expect(screen.queryByText('Für dieses Release sind keine Karas hinterlegt.')).toBeNull()
    expect(screen.queryByText('0 Karas')).toBeNull()
    expect(getGroupReleaseListCursor).toHaveBeenCalledWith(1, 2, {
      cursor: undefined,
      limit: 5,
    })
  })

  it('Test 1b: rendert OP/ED-Segmente als Timeline-Kaesten', async () => {
    getGroupReleaseListCursor.mockResolvedValueOnce({
      items: [
        makeEpisode({
          id: 10,
          episode_number: 1,
          title: 'Episode 1',
          timeline_segments: [
            {
              id: 1,
              type: 'OP',
              title: 'Viper OP',
              start_time: '00:00:00',
              end_time: '00:00:45',
            },
            {
              id: 2,
              type: 'ED',
              title: 'Viper ED',
              start_time: '00:21:45',
              end_time: '00:23:12',
            },
          ],
        }),
      ],
      next_cursor: null,
      has_more: false,
    })

    render(<OlderReleasesList animeID={1} groupID={2} />)

    await waitFor(() => expect(screen.getAllByText('Folge 1').length).toBeGreaterThan(0))
    const disclosure = screen.getByRole('button', { name: '2 Karas anzeigen' })
    const directAction = screen.getByRole('link', { name: 'Release öffnen' })
    expect(directAction.compareDocumentPosition(disclosure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText('2 Karas', { exact: true })).toBeNull()
    fireEvent.click(disclosure)
    const region = screen.getByRole('region', { name: '2 Karas anzeigen' })
    expect(within(region).getByText('Viper OP')).not.toBeNull()
    expect(within(region).getByText('Viper ED')).not.toBeNull()
    expect(within(region).getByRole('link', { name: 'Viper OP' }).getAttribute('href'))
      .toBe('/anime/1/group/2/releases/10?kara=1&autoplay=1#op-ed-middle')
    expect(screen.queryByText('00:00:00 - 00:00:45')).toBeNull()
    expect(screen.queryByText('00:21:45 - 00:23:12')).toBeNull()
  })

  it('lädt nach dem Initiallimit weitere zehn Releases nach', async () => {
    getGroupReleaseListCursor
      .mockResolvedValueOnce({
        items: [makeEpisode({ id: 10, episode_number: 1, title: 'Episode 1' })],
        next_cursor: 'cursor-1',
        has_more: true,
      })
      .mockResolvedValueOnce({
        items: [makeEpisode({ id: 11, episode_number: 2, episode_number_label: '2', title: 'Episode 2' })],
        next_cursor: null,
        has_more: false,
      })

    render(<OlderReleasesList animeID={1} groupID={2} />)

    await waitFor(() => expect(screen.getAllByText('Folge 1').length).toBeGreaterThan(0))

    fireEvent.click(screen.getByRole('button', { name: 'Weitere Releases laden' }))

    await waitFor(() => expect(screen.getAllByText('Folge 2').length).toBeGreaterThan(0))
    expect(getGroupReleaseListCursor).toHaveBeenLastCalledWith(1, 2, {
      cursor: 'cursor-1',
      limit: 10,
    })
    // has_more is now false — the fallback button disappears.
    expect(screen.queryByRole('button', { name: 'Weitere Releases laden' })).toBeNull()
  })

  it('sortiert die Liste strikt aufsteigend nach episode_number, unabhaengig von der API-Reihenfolge', async () => {
    getGroupReleaseListCursor.mockResolvedValueOnce({
      items: [
        makeEpisode({ id: 30, episode_number: 3, episode_number_label: '3', title: 'Episode 3' }),
        makeEpisode({ id: 10, episode_number: 1, episode_number_label: '1', title: 'Episode 1' }),
        makeEpisode({ id: 20, episode_number: 2, episode_number_label: '2', title: 'Episode 2' }),
      ],
      next_cursor: null,
      has_more: false,
    })

    render(<OlderReleasesList animeID={1} groupID={2} />)

    await waitFor(() => expect(screen.getAllByText('Folge 1').length).toBeGreaterThan(0))
    const titles = screen.getAllByText(/^Folge \d+$/)
    expect(titles.map((el) => el.textContent)).toEqual(['Folge 1', 'Folge 2', 'Folge 3'])
  })

  it('zeigt pro Kara-Gruppe zunächst drei Einträge und klappt weitere auf', async () => {
    getGroupReleaseListCursor.mockResolvedValueOnce({
      items: [makeEpisode({
        id: 10,
        timeline_segments: [1, 2, 3, 4].map((id) => ({
          id,
          type: 'OP',
          title: `Opening ${id}`,
          version: id === 4 ? 'Alternative Version' : null,
        })),
      })],
      next_cursor: null,
      has_more: false,
    })

    render(<OlderReleasesList animeID={1} groupID={2} />)
    await waitFor(() => expect(screen.getByRole('button', { name: '4 Karas anzeigen' })).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: '4 Karas anzeigen' }))
    const region = screen.getByRole('region', { name: '4 Karas anzeigen' })
    expect(within(region).queryByText('Opening 4')).toBeNull()
    fireEvent.click(within(region).getByRole('button', { name: '1 weitere anzeigen' }))
    expect(within(region).getByText('Opening 4')).not.toBeNull()
    expect(within(region).getByText('Alternative Version')).not.toBeNull()
  })

  it('zeigt "Release öffnen" bei Kara-Folgen sofort, ohne das Accordion aufzuklappen', async () => {
    getGroupReleaseListCursor.mockResolvedValueOnce({
      items: [makeEpisode({
        id: 10,
        episode_number: 1,
        timeline_segments: [
          { id: 1, type: 'OP', title: 'Viper OP', start_time: '00:00:00', end_time: '00:00:45' },
        ],
      })],
      next_cursor: null,
      has_more: false,
    })

    render(<OlderReleasesList animeID={1} groupID={2} />)

    await waitFor(() => expect(screen.getAllByText('Folge 1').length).toBeGreaterThan(0))
    // Release-Link und Accordion-Header sind sofort da — ohne jeden Klick.
    expect(screen.getByRole('link', { name: 'Release öffnen' })).not.toBeNull()
    expect(screen.getByRole('button', { name: '1 Kara anzeigen' })).not.toBeNull()
    expect(screen.queryByText('1 Karas', { exact: true })).toBeNull()
    // Die einzelnen Kara-Segmenttitel sind erst nach dem Aufklappen sichtbar.
    expect(screen.queryByText('Viper OP')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '1 Kara anzeigen' }))
    expect(screen.getByRole('link', { name: 'Viper OP' })).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Release öffnen' })).not.toBeNull()
  })

  it('rendert auf Desktop (matches:false) DesktopReleaseRow statt der Mobile-Struktur', async () => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))

    getGroupReleaseListCursor.mockResolvedValueOnce({
      items: [makeEpisode({
        id: 10,
        episode_number: 1,
        timeline_segments: [
          { id: 1, type: 'OP', title: 'Viper OP', start_time: '00:00:00', end_time: '00:00:45' },
        ],
      })],
      next_cursor: null,
      has_more: false,
    })

    render(<OlderReleasesList animeID={1} groupID={2} />)

    await waitFor(() => expect(screen.getAllByText('Folge 1').length).toBeGreaterThan(0))
    // Desktop-Zweig: Titel ist ein Link, Timeline-Segment direkt sichtbar, kein Accordion-Toggle.
    expect(screen.getByRole('link', { name: 'Folge 1' })).not.toBeNull()
    const karaLink = screen.getByRole('link', { name: 'Viper OP' })
    expect(within(karaLink).getByText('Viper OP')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Release öffnen' })).not.toBeNull()
    expect(screen.queryByRole('button', { name: /Karas? anzeigen/ })).toBeNull()
    expect(screen.getByTestId('release-list-glass-card').className).toContain('heroCard')
    expect(screen.getByTestId('release-list-glass-card').className).toContain('releaseGlassCard')
  })
})
