// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ProjectMemberMediaItem } from '@/types/projectMember'
import type { CursorPage } from '@/types/releaseDetail'

const getProjectMemberMedia = vi.fn()
vi.mock('@/lib/api', () => ({
  getProjectMemberMedia: (...args: unknown[]) => getProjectMemberMedia(...args),
}))

// eslint-disable-next-line import/first
import { ProjectMemberMediaGallery } from './ProjectMemberMediaGallery'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const media = (overrides: Partial<ProjectMemberMediaItem> = {}): ProjectMemberMediaItem => ({
  id: 1,
  media_asset_id: 1,
  category: 'screenshot',
  caption: null,
  episode_label: '08',
  release_version_label: 'v1',
  release_version_id: 41,
  created_at: '2024-04-12T00:00:00Z',
  thumbnail_url: '/media/t1.jpg',
  preview_url: '/media/p1.jpg',
  ...overrides,
})

const page = (
  items: ProjectMemberMediaItem[],
  next: string | null,
  more: boolean,
): CursorPage<ProjectMemberMediaItem> => ({ items, next_cursor: next, has_more: more })

const cards = () => screen.getAllByRole('button', { name: /öffnen$/ })

const renderGallery = () =>
  render(
    <ProjectMemberMediaGallery
      animeID={10}
      groupID={20}
      memberSlug="csubs-leader"
      projectPath="/fansubs/c-subs/fansubprojekt/vipers-creed"
      count={30}
    />,
  )

describe('ProjectMemberMediaGallery', () => {
  it('loads the initial page of media cards', async () => {
    const first = Array.from({ length: 24 }, (_, i) => media({ id: i + 1 }))
    getProjectMemberMedia.mockResolvedValueOnce(page(first, 'c1', true))
    renderGallery()
    await waitFor(() => expect(cards()).toHaveLength(24))
  })

  it('appends the next page without duplicates', async () => {
    // media_asset_id bleibt konstant (Factory-Default) -> beweist: Dedup per id, nicht per Asset.
    const first = Array.from({ length: 24 }, (_, i) => media({ id: i + 1 }))
    // id 24 overlappt -> deduped: 24 + 12 - 1 = 35
    const second = Array.from({ length: 12 }, (_, i) => media({ id: i + 24 }))
    getProjectMemberMedia
      .mockResolvedValueOnce(page(first, 'c1', true))
      .mockResolvedValueOnce(page(second, null, false))
    renderGallery()
    await waitFor(() => expect(cards()).toHaveLength(24))
    fireEvent.click(screen.getByText('Weitere Bilder laden'))
    await waitFor(() => expect(cards()).toHaveLength(35))
  })

  it('opens the media viewer on card click and closes on Escape', async () => {
    const first = Array.from({ length: 3 }, (_, i) => media({ id: i + 1 }))
    getProjectMemberMedia.mockResolvedValueOnce(page(first, null, false))
    renderGallery()
    await waitFor(() => expect(cards()).toHaveLength(3))
    fireEvent.click(cards()[0])
    const dialog = screen.getByRole('dialog', { name: 'Medienansicht' })
    expect(dialog).not.toBeNull()
    expect(screen.getByText('1 / 3')).not.toBeNull()
    expect(screen.getByText('Release öffnen →')).not.toBeNull()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Medienansicht' })).toBeNull())
  })
})
