// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
  episode_number_label: 'Folge 1',
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

afterEach(() => {
  cleanup()
  getGroupReleaseListCursor.mockReset()
})

describe('OlderReleasesList (AO4-12/AO4-21/AO4-25)', () => {
  it('rendert initial fünf geschlossene Zeilen und den manuellen Nachladeweg', async () => {
    getGroupReleaseListCursor.mockResolvedValueOnce({
      items: [makeEpisode({ id: 10, episode_number: 1, title: 'Episode 1' })],
      next_cursor: 'cursor-1',
      has_more: true,
    })

    render(<OlderReleasesList animeID={1} groupID={2} excludeReleaseVersionId={999} />)

    await waitFor(() => expect(screen.getByRole('button', { name: /Folge 1/i })).not.toBeNull())
    expect(screen.getByRole('button', { name: 'Weitere Releases laden' })).not.toBeNull()
    expect(screen.getAllByText('2 Bilder').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1 Texte').length).toBeGreaterThan(0)
    expect(screen.queryByText('Hauptinhalt')).toBeNull()
    expect(screen.getByRole('button', { name: /Folge 1/i }).getAttribute('aria-expanded')).toBe('false')
    expect(getGroupReleaseListCursor).toHaveBeenCalledWith(1, 2, {
      cursor: undefined,
      limit: 5,
      exclude_release_version_id: 999,
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

    render(<OlderReleasesList animeID={1} groupID={2} excludeReleaseVersionId={999} />)

    await waitFor(() => expect(screen.getByRole('button', { name: /Folge 1/i })).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: /Folge 1/i }))
    const region = screen.getByRole('region', { name: /Folge 1/i })
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
        items: [makeEpisode({ id: 11, episode_number: 2, episode_number_label: 'Folge 2', title: 'Episode 2' })],
        next_cursor: null,
        has_more: false,
      })

    render(<OlderReleasesList animeID={1} groupID={2} excludeReleaseVersionId={999} />)

    await waitFor(() => expect(screen.getByRole('button', { name: /Folge 1/i })).not.toBeNull())

    fireEvent.click(screen.getByRole('button', { name: 'Weitere Releases laden' }))

    await waitFor(() => expect(screen.getByRole('button', { name: /Folge 2/i })).not.toBeNull())
    expect(getGroupReleaseListCursor).toHaveBeenLastCalledWith(1, 2, {
      cursor: 'cursor-1',
      limit: 10,
      exclude_release_version_id: 999,
    })
    // has_more is now false — the fallback button disappears.
    expect(screen.queryByRole('button', { name: 'Weitere Releases laden' })).toBeNull()
  })

  it('Test 3: the embedded latest release (excludeReleaseVersionId) is filtered out of the list', async () => {
    getGroupReleaseListCursor.mockResolvedValueOnce({
      items: [
        makeEpisode({ id: 10, episode_number: 1, title: 'Episode 1' }),
        makeEpisode({ id: 20, episode_number: 2, title: 'Neuestes Release' }),
      ],
      next_cursor: null,
      has_more: false,
    })

    render(<OlderReleasesList animeID={1} groupID={2} excludeReleaseVersionId={20} />)

    await waitFor(() => expect(screen.getByRole('button', { name: /Folge 1/i })).not.toBeNull())
    expect(screen.queryByText('Neuestes Release')).toBeNull()
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
    await waitFor(() => expect(screen.getByRole('button', { name: /Folge 1/i })).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: /Folge 1/i }))
    const region = screen.getByRole('region', { name: /Folge 1/i })
    expect(within(region).queryByText('Opening 4')).toBeNull()
    fireEvent.click(within(region).getByRole('button', { name: '1 weitere anzeigen' }))
    expect(within(region).getByText('Opening 4')).not.toBeNull()
    expect(within(region).getByText('Alternative Version')).not.toBeNull()
  })
})
