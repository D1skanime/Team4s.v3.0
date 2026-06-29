// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MemberProfileRecentMedia } from '@/types/profile'

import { RecentMediaSection } from './RecentMediaSection'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    resolveApiUrl: (value: string) => (value ? `resolved:${value}` : ''),
  }
})

afterEach(() => {
  cleanup()
})

function makeMedia(overrides: Partial<MemberProfileRecentMedia> = {}): MemberProfileRecentMedia {
  return {
    id: 22,
    category: 'screenshot',
    caption: 'Typesetting war die Herausforderung',
    thumbnail_url: '/media/release-version/41/thumb.jpg',
    anime_title: 'Naruto',
    release_version_id: 41,
    release_version_label: 'v2',
    ...overrides,
  }
}

describe('RecentMediaSection', () => {
  it('renders public media as visitor-facing image cards with unique preview labels', () => {
    const { container } = render(<RecentMediaSection items={[makeMedia()]} canView={true} isPublicView={true} />)

    const list = screen.getByRole('list', { name: 'Letzte Medien' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('resolved:/media/release-version/41/thumb.jpg')
    expect(container.querySelector('[class*="recentMediaThumb"]')).not.toBeNull()
    expect(screen.getByAltText('Medienbild zu Naruto')).not.toBeNull()
    expect(screen.getAllByText('Vorschau 1')).toHaveLength(1)
    expect(screen.getByText('Typesetting war die Herausforderung')).not.toBeNull()
    expect(screen.getByText('Release-Version #41 (v2)')).not.toBeNull()
    expect(screen.getByText('Naruto')).not.toBeNull()
    expect(screen.queryByText('Bild aus Naruto')).toBeNull()
    expect(screen.queryByText('screenshot')).toBeNull()
  })

  it('falls back to the preview label when no media caption was written', () => {
    render(<RecentMediaSection items={[makeMedia({ caption: '   ' })]} canView={true} isPublicView={false} />)

    expect(screen.getAllByText('Vorschau 1')).toHaveLength(2)
  })
})
