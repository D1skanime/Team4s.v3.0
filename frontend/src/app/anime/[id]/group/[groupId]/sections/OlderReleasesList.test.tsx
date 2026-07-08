// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
// "Mehr laden" fallback (AO4-25), which is sufficient for this component's own
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
  title: 'Episode 1',
  has_op: false,
  has_ed: false,
  karaoke_count: 0,
  insert_count: 0,
  screenshot_count: 0,
  images_count: 2,
  notes_count: 1,
  ...overrides,
})

afterEach(() => {
  cleanup()
  getGroupReleaseListCursor.mockReset()
})

describe('OlderReleasesList (AO4-12/AO4-21/AO4-25)', () => {
  it('Test 1: renders the initial cursor page and shows "Mehr laden" when has_more is true', async () => {
    getGroupReleaseListCursor.mockResolvedValueOnce({
      items: [makeEpisode({ id: 10, episode_number: 1, title: 'Episode 1' })],
      next_cursor: 'cursor-1',
      has_more: true,
    })

    render(<OlderReleasesList animeID={1} groupID={2} excludeReleaseVersionId={999} />)

    await waitFor(() => expect(screen.getByText('Episode 1')).not.toBeNull())
    expect(screen.getByRole('button', { name: 'Mehr laden' })).not.toBeNull()
    expect(screen.getByText('2 Bilder')).not.toBeNull()
    expect(screen.getByText('1 Texte')).not.toBeNull()
  })

  it('Test 2: clicking "Mehr laden" fetches the next cursor page and appends items', async () => {
    getGroupReleaseListCursor
      .mockResolvedValueOnce({
        items: [makeEpisode({ id: 10, episode_number: 1, title: 'Episode 1' })],
        next_cursor: 'cursor-1',
        has_more: true,
      })
      .mockResolvedValueOnce({
        items: [makeEpisode({ id: 11, episode_number: 2, title: 'Episode 2' })],
        next_cursor: null,
        has_more: false,
      })

    render(<OlderReleasesList animeID={1} groupID={2} excludeReleaseVersionId={999} />)

    await waitFor(() => expect(screen.getByText('Episode 1')).not.toBeNull())

    fireEvent.click(screen.getByRole('button', { name: 'Mehr laden' }))

    await waitFor(() => expect(screen.getByText('Episode 2')).not.toBeNull())
    expect(getGroupReleaseListCursor).toHaveBeenLastCalledWith(1, 2, { cursor: 'cursor-1', limit: 10 })
    // has_more is now false — the fallback button disappears.
    expect(screen.queryByRole('button', { name: 'Mehr laden' })).toBeNull()
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

    await waitFor(() => expect(screen.getByText('Episode 1')).not.toBeNull())
    expect(screen.queryByText('Neuestes Release')).toBeNull()
  })
})
