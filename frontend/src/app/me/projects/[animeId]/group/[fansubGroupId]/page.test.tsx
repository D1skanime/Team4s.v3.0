// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getMyProjectDetailMock = vi.hoisted(() => vi.fn())
const useAuthSessionMock = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useParams: () => ({ animeId: '10', fansubGroupId: '5' }),
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => useAuthSessionMock(),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  getMyProjectDetail: (...args: unknown[]) => getMyProjectDetailMock(...args),
}))

import { MyProjectDetailPage } from './page'
import type { MeProjectDetail, MeProjectReleaseVersion } from '@/types/contributions'

function makeRelease(overrides: Partial<MeProjectReleaseVersion> = {}): MeProjectReleaseVersion {
  const id = overrides.release_version_id ?? 41
  return {
    release_version_id: id,
    episode_number: String(overrides.episode_number ?? '01'),
    episode_title: null,
    episode_sort_index: Number(overrides.episode_sort_index ?? 1),
    version: overrides.version ?? 'v1',
    title: null,
    role_codes: overrides.role_codes ?? ['encoder'],
    role_labels: overrides.role_labels ?? ['Encoding'],
    has_own_contribution: overrides.has_own_contribution ?? true,
    has_own_notes: overrides.has_own_notes ?? false,
    has_own_media: overrides.has_own_media ?? false,
    ...overrides,
  }
}

function makeProject(releases: MeProjectReleaseVersion[] = []): MeProjectDetail {
  return {
    anime_id: 10,
    anime_title: 'Naruto',
    fansub_group_id: 5,
    fansub_group_name: 'AnimeOwnage',
    backdrop_url: '/media/naruto-backdrop.jpg',
    role_codes: ['encoder', 'timer'],
    role_labels: ['Encoding', 'Timing'],
    release_versions: releases,
  }
}

beforeEach(() => {
  useAuthSessionMock.mockReturnValue({
    hasAccessToken: false,
    hasRefreshToken: true,
    isClientInitialized: true,
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('MyProjectDetailPage', () => {
  it('loads the own project through the refresh-session gate', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({ release_version_id: 41, episode_number: '01', has_own_notes: true }),
        makeRelease({ release_version_id: 42, episode_number: '02', has_own_contribution: false, role_codes: [], role_labels: [] }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Naruto', level: 1 })).toBeTruthy())
    expect(getMyProjectDetailMock).toHaveBeenCalledWith(10, 5)
    expect(screen.getByText('MEIN PROJEKT')).toBeTruthy()
    expect(screen.getByText('Deine Rollen insgesamt')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Notizen & Medien/i }).getAttribute('href')).toBe(
      '/me/releases/41/workspace?return_to=%2Fme%2Fprojects%2F10%2Fgroup%2F5',
    )
    expect(screen.queryByText('Keine eigene Mitwirkung')).toBeNull()
  })

  it('shows all release versions with search only in all mode', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({ release_version_id: 41, episode_number: '01' }),
        makeRelease({ release_version_id: 43, episode_number: '03', has_own_contribution: false, role_codes: [], role_labels: [] }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Alle' }))
    fireEvent.change(screen.getByLabelText('Folgen-Nummer suchen'), { target: { value: '03' } })

    expect(screen.getByText('Folge 03 · v1')).toBeTruthy()
    expect(screen.getByText('Keine eigene Mitwirkung')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Notizen & Medien/i })).toBeNull()
  })

  it('loads all release versions in 20 item steps', async () => {
    const releases = Array.from({ length: 25 }, (_, index) => makeRelease({
      release_version_id: 100 + index,
      episode_number: String(index + 1).padStart(2, '0'),
    }))
    getMyProjectDetailMock.mockResolvedValue({ data: makeProject(releases) })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    expect(screen.queryByText('Folge 25 · v1')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Weitere laden' }))

    expect(screen.getByText('Folge 25 · v1')).toBeTruthy()
  })
})
