// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getMyProjectDetailMock = vi.hoisted(() => vi.fn())
const useAuthSessionMock = vi.hoisted(() => vi.fn())
const useSearchParamsMock = vi.hoisted(() => vi.fn())

const catalogRoles = vi.hoisted(() => [
  { code: 'typer', label_de: 'Typesetting', contexts: ['anime_contribution'], sort_order: 10, color_key: 'technical', icon_key: 'wrench' },
  { code: 'karaoke_fx', label_de: 'Karaoke-FX', contexts: ['anime_contribution'], sort_order: 20, color_key: 'creative', icon_key: 'image' },
  { code: 'encoder', label_de: 'Encoding', contexts: ['anime_contribution'], sort_order: 30, color_key: 'production', icon_key: 'film' },
])

vi.mock('@/providers/RoleCatalogProvider', () => ({
  useRoleCatalog: () => ({ roles: catalogRoles, error: null }),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ animeId: '10', fansubGroupId: '5' }),
  useSearchParams: () => useSearchParamsMock(),
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

import MyProjectDetailPage from './page'
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
    has_own_rejected_notes: overrides.has_own_rejected_notes ?? false,
    has_own_rejected_media: overrides.has_own_rejected_media ?? false,
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
  useSearchParamsMock.mockReturnValue(new URLSearchParams())
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

describe('MyProjectDetailPage - rejected artifacts (UAT-05)', () => {
  it('shows a distinct "Überarbeitung nötig" badge and primary button for a rejected-media-only release', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({
          release_version_id: 41,
          episode_number: '01',
          has_own_contribution: true,
          has_own_notes: false,
          has_own_media: false,
          has_own_rejected_notes: false,
          has_own_rejected_media: true,
        }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Naruto', level: 1 })).toBeTruthy())
    const reworkBadges = screen.getAllByText('Überarbeitung nötig').filter((node) => node.tagName === 'SPAN')
    expect(reworkBadges).toHaveLength(1)
    const workspaceLink = screen.getByRole('link', { name: /Notizen & Medien/i })
    expect(workspaceLink.className).not.toContain('buttonSecondary')
  })

  it('shows exactly one "Überarbeitung nötig" badge when both a rejected note and rejected media exist', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({
          release_version_id: 41,
          episode_number: '01',
          has_own_contribution: true,
          has_own_notes: false,
          has_own_media: false,
          has_own_rejected_notes: true,
          has_own_rejected_media: true,
        }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Naruto', level: 1 })).toBeTruthy())
    const reworkBadges = screen.getAllByText('Überarbeitung nötig').filter((node) => node.tagName === 'SPAN')
    expect(reworkBadges).toHaveLength(1)
    const workspaceLink = screen.getByRole('link', { name: /Notizen & Medien/i })
    expect(workspaceLink.className).not.toContain('buttonSecondary')
  })

  it('shows "Erledigt" (not "Überarbeitung nötig") when has_own_media is true, even with rejected media also set', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({
          release_version_id: 41,
          episode_number: '01',
          has_own_contribution: true,
          has_own_notes: false,
          has_own_media: true,
          has_own_rejected_notes: false,
          has_own_rejected_media: true,
        }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Naruto', level: 1 })).toBeTruthy())
    const doneBadges = screen.getAllByText('Erledigt').filter((node) => node.tagName === 'SPAN')
    expect(doneBadges).toHaveLength(1)
    expect(screen.queryByText('Überarbeitung nötig')).toBeNull()
  })

  it('shows "Erledigt" for a release with only has_own_media true and no rejected flags (regression guard)', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({
          release_version_id: 41,
          episode_number: '01',
          has_own_contribution: true,
          has_own_notes: false,
          has_own_media: true,
          has_own_rejected_notes: false,
          has_own_rejected_media: false,
        }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Naruto', level: 1 })).toBeTruthy())
    const doneBadges = screen.getAllByText('Erledigt').filter((node) => node.tagName === 'SPAN')
    expect(doneBadges).toHaveLength(1)
    expect(screen.queryByText('Überarbeitung nötig')).toBeNull()
  })

  it('still counts and filters a rejected-media-only release as "offen"', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({
          release_version_id: 41,
          episode_number: '01',
          has_own_contribution: true,
          has_own_notes: false,
          has_own_media: false,
          has_own_rejected_notes: false,
          has_own_rejected_media: true,
        }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Naruto', level: 1 })).toBeTruthy())
    expect(screen.getByText('1 offen · 0 erledigt')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Offen' }))
    expect(screen.getByText('Folge 01 · AnimeOwnage · v1')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Erledigt' }))
    expect(screen.queryByText('Folge 01 · AnimeOwnage · v1')).toBeNull()
  })
})
