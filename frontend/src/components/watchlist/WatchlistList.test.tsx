// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WatchlistList } from './WatchlistList'
import type { WatchlistItem } from '@/types/watchlist'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} alt={props.alt as string} />,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    status = 500
  }
  return { ApiError, removeWatchlistEntry: vi.fn() }
})

vi.mock('@/lib/utils', () => ({
  getCoverUrl: (cover?: string) => cover ?? '/covers/placeholder.jpg',
  shouldUseUnoptimizedImage: () => false,
}))

function makeItem(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    anime_id: 1,
    title: 'Naruto',
    type: 'tv',
    status: 'ongoing',
    added_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('WatchlistList — Pagination', () => {
  it('rendert die Seitennavigation über die gemeinsame ui/Pagination mit echten Links statt eigener Vor-/Zurück-Spans', () => {
    render(
      <WatchlistList
        items={[makeItem()]}
        meta={{ total: 60, page: 2, per_page: 1, total_pages: 3 }}
        page={2}
        perPage={1}
      />,
    )

    expect(screen.getByText('Seite 2 von 3')).not.toBeNull()
    expect(screen.getByRole('link', { name: /Zurück/ }).getAttribute('href')).toBe('/watchlist?page=1&per_page=1')
    expect(screen.getByRole('link', { name: /Weiter/ }).getAttribute('href')).toBe('/watchlist?page=3&per_page=1')
  })

  it('rendert keine Seitennavigation bei nur einer Seite', () => {
    render(
      <WatchlistList
        items={[makeItem()]}
        meta={{ total: 1, page: 1, per_page: 24, total_pages: 1 }}
        page={1}
        perPage={24}
      />,
    )

    expect(screen.queryByRole('navigation', { name: 'Seitennavigation' })).toBeNull()
  })
})
