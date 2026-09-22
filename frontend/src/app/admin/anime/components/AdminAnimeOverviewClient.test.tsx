// @vitest-environment jsdom

import { createElement, type ImgHTMLAttributes } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AnimeListItem } from '@/types/anime'

import { AdminAnimeOverviewClient } from './AdminAnimeOverviewClient'

afterEach(() => {
  cleanup()
})

const deleteAdminAnime = vi.fn()
const deleteUploadedCoverFile = vi.fn()
const getAnimeList = vi.fn()

vi.mock('@/lib/api', () => ({
  AUTH_SESSION_CHANGED_EVENT: 'team4s:auth-session-changed',
  deleteAdminAnime: (...args: unknown[]) => deleteAdminAnime(...args),
  deleteUploadedCoverFile: (...args: unknown[]) => deleteUploadedCoverFile(...args),
  getAnimeList: (...args: unknown[]) => getAnimeList(...args),
  getAuthSessionSnapshot: vi.fn(() => ({
    hasAccessToken: true,
    hasRefreshToken: true,
    displayName: 'Test Admin',
    accountIdentity: 1,
  })),
  ApiError: class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('next/image', () => ({
  default: ({ alt = '', unoptimized, ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    void unoptimized
    return createElement('img', { alt, ...props })
  },
}))

function makeItem(overrides: Partial<AnimeListItem>): AnimeListItem {
  return {
    id: 42,
    title: 'Serial Experiments Lain',
    type: 'tv',
    status: 'ongoing',
    year: 1998,
    cover_image: 'lain.jpg',
    max_episodes: 13,
    ...overrides,
  }
}

describe('AdminAnimeOverviewClient', () => {
  it('shows "Film" for anime of type film (not FILM or TV)', () => {
    render(
      <AdminAnimeOverviewClient
        initialItems={[makeItem({ type: 'film' })]}
        initialError={null}
        createdID={null}
      />,
    )

    expect(screen.getByText(/\| Film(\s|$)/)).toBeTruthy()
    expect(screen.queryByText(/FILM/)).toBeNull()
  })

  it('shows singular "1 Episode" and plural "12 Episoden" correctly', () => {
    render(
      <AdminAnimeOverviewClient
        initialItems={[
          makeItem({ id: 1, title: 'Single Episode Anime', max_episodes: 1 }),
          makeItem({ id: 2, title: 'Multi Episode Anime', max_episodes: 12 }),
        ]}
        initialError={null}
        createdID={null}
      />,
    )

    expect(screen.getByText(/\| 1 Episode$/)).toBeTruthy()
    expect(screen.getByText(/\| 12 Episoden$/)).toBeTruthy()
  })

  it('cancels without calling deleteAdminAnime, then confirms and calls it with the correct ID', async () => {
    deleteAdminAnime.mockResolvedValue({ data: { title: 'Serial Experiments Lain', orphaned_local_cover_image: null } })

    render(
      <AdminAnimeOverviewClient
        initialItems={[makeItem({})]}
        initialError={null}
        createdID={null}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    const dialog = await screen.findByRole('dialog', { name: 'Anime "Serial Experiments Lain" wirklich löschen?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(deleteAdminAnime).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    const secondDialog = await screen.findByRole('dialog', { name: 'Anime "Serial Experiments Lain" wirklich löschen?' })
    fireEvent.click(within(secondDialog).getByRole('button', { name: 'Löschen' }))

    await waitFor(() => expect(deleteAdminAnime).toHaveBeenCalledWith(42))
  })
})
