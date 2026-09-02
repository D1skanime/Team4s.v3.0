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
    expect(screen.getByText('Deine Projektrollen')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Deine Projektrollen in diesem Projekt' })).toBeTruthy()
    expect(screen.getAllByText('Für das gesamte Projekt')).toHaveLength(2)
    expect(screen.getByRole('link', { name: /Notizen & Medien/i }).getAttribute('href')).toBe(
      '/me/releases/41/workspace?return_to=%2Fme%2Fprojects%2F10%2Fgroup%2F5',
    )
    expect(screen.queryByRole('link', { name: 'Zurück zum Profil' })).toBeNull()
    expect(screen.queryByText('Keine eigene Mitwirkung')).toBeNull()
  })

  it('renders canonical project roles in catalog order with semantic presentation', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: {
        ...makeProject(),
        role_codes: ['encoder', 'future_role', 'karaoke_fx', 'typer'],
        role_labels: ['Wrong Encoding', 'Future Role', 'Typesetting / FX', 'Wrong Typesetting'],
      },
    })

    const { container } = render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    const roleRows = Array.from(container.querySelectorAll('[data-role-code]'))
    expect(roleRows.map((row) => row.querySelector('strong')?.textContent)).toEqual([
      'Typesetting',
      'Karaoke-FX',
      'Encoding',
      'Future Role',
    ])
    expect(roleRows.map((row) => row.getAttribute('data-role-code'))).toEqual([
      'technical',
      'creative',
      'production',
      'other',
    ])
    expect(screen.queryByText('Typesetting / FX')).toBeNull()
  })

  it('shows a profile return button when opened from the profile hub', async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('return_to=/me/profile'))
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([makeRelease({ release_version_id: 41 })]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    expect(screen.getByRole('link', { name: 'Zurück zum Profil' }).getAttribute('href')).toBe('/me/profile')
  })

  it('matches episode numbers exactly while accepting leading zeros', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({ release_version_id: 41, episode_number: '03' }),
        makeRelease({ release_version_id: 43, episode_number: '13' }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    fireEvent.change(screen.getByLabelText('Folgen-Nummer suchen'), { target: { value: '3' } })

    expect(screen.getByText('Folge 03 · AnimeOwnage · v1')).toBeTruthy()
    expect(screen.queryByText('Folge 13 · AnimeOwnage · v1')).toBeNull()
  })

  it('uses the episode title before group and version in release labels', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({ release_version_id: 41, episode_number: '01', episode_title: 'Der Anfang' }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    expect(screen.getByText('Folge 01 · Der Anfang · AnimeOwnage · v1')).toBeTruthy()
    expect(screen.queryByText('Der Anfang')).toBeNull()
  })

  it('excludes releases without has_own_contribution in every mode (all/open/done)', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({ release_version_id: 41, episode_number: '01', has_own_contribution: true, has_own_notes: true }),
        makeRelease({ release_version_id: 42, episode_number: '02', has_own_contribution: false, role_codes: [], role_labels: [] }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    expect(screen.queryByText('Folge 02 · AnimeOwnage · v1')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Offen' }))
    expect(screen.queryByText('Folge 02 · AnimeOwnage · v1')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Erledigt' }))
    expect(screen.queryByText('Folge 02 · AnimeOwnage · v1')).toBeNull()
  })

  it('shows only open (not-done) assigned releases in open mode', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({ release_version_id: 41, episode_number: '01', has_own_contribution: true, has_own_notes: false, has_own_media: false }),
        makeRelease({ release_version_id: 44, episode_number: '04', has_own_contribution: true, has_own_notes: true, has_own_media: false }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Offen' }))

    expect(screen.getByText('Folge 01 · AnimeOwnage · v1')).toBeTruthy()
    expect(screen.queryByText('Folge 04 · AnimeOwnage · v1')).toBeNull()
  })

  it('shows only done assigned releases in done mode', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({ release_version_id: 41, episode_number: '01', has_own_contribution: true, has_own_notes: false, has_own_media: false }),
        makeRelease({ release_version_id: 44, episode_number: '04', has_own_contribution: true, has_own_notes: false, has_own_media: true }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Erledigt' }))

    expect(screen.getByText('Folge 04 · AnimeOwnage · v1')).toBeTruthy()
    expect(screen.queryByText('Folge 01 · AnimeOwnage · v1')).toBeNull()
  })

  it('shows open releases before done releases in all mode, preserving order within each group', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({ release_version_id: 41, episode_number: '01', has_own_contribution: true, has_own_notes: true, has_own_media: false }),
        makeRelease({ release_version_id: 42, episode_number: '02', has_own_contribution: true, has_own_notes: false, has_own_media: false }),
        makeRelease({ release_version_id: 43, episode_number: '03', has_own_contribution: true, has_own_notes: false, has_own_media: true }),
        makeRelease({ release_version_id: 44, episode_number: '04', has_own_contribution: true, has_own_notes: false, has_own_media: false }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    const labels = screen.getAllByText(/^Folge \d{2} · AnimeOwnage · v1$/).map((node) => node.textContent)
    expect(labels).toEqual([
      'Folge 02 · AnimeOwnage · v1',
      'Folge 04 · AnimeOwnage · v1',
      'Folge 01 · AnimeOwnage · v1',
      'Folge 03 · AnimeOwnage · v1',
    ])
  })

  it('filters by episode number search in open and done modes too', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({ release_version_id: 41, episode_number: '01', has_own_contribution: true, has_own_notes: false, has_own_media: false }),
        makeRelease({ release_version_id: 42, episode_number: '02', has_own_contribution: true, has_own_notes: false, has_own_media: false }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Offen' }))
    fireEvent.change(screen.getByLabelText('Folgen-Nummer suchen'), { target: { value: '02' } })

    expect(screen.queryByText('Folge 01 · AnimeOwnage · v1')).toBeNull()
    expect(screen.getByText('Folge 02 · AnimeOwnage · v1')).toBeTruthy()
  })

  it('loads all release versions in 20 item steps', async () => {
    const releases = Array.from({ length: 25 }, (_, index) => makeRelease({
      release_version_id: 100 + index,
      episode_number: String(index + 1).padStart(2, '0'),
      has_own_notes: true,
    }))
    getMyProjectDetailMock.mockResolvedValue({ data: makeProject(releases) })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    expect(screen.queryByText('Folge 25 · AnimeOwnage · v1')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Weitere laden' }))

    expect(screen.getByText('Folge 25 · AnimeOwnage · v1')).toBeTruthy()
  })

  it('shows a status badge (Offen/Erledigt) per visible release row', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({ release_version_id: 41, episode_number: '01', has_own_contribution: true, has_own_notes: false, has_own_media: false }),
        makeRelease({ release_version_id: 42, episode_number: '02', has_own_contribution: true, has_own_notes: true, has_own_media: false }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    const openBadges = screen.getAllByText('Offen').filter((node) => node.tagName === 'SPAN')
    const doneBadges = screen.getAllByText('Erledigt').filter((node) => node.tagName === 'SPAN')
    expect(openBadges).toHaveLength(1)
    expect(doneBadges).toHaveLength(1)
  })

  it('shows the assigned-count SectionHeader description instead of total versions', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({ release_version_id: 41, episode_number: '01', has_own_contribution: true, has_own_notes: false, has_own_media: false }),
        makeRelease({ release_version_id: 42, episode_number: '02', has_own_contribution: true, has_own_notes: true, has_own_media: false }),
        makeRelease({ release_version_id: 43, episode_number: '03', has_own_contribution: false, role_codes: [], role_labels: [] }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    expect(screen.getByText('1 offen · 1 erledigt')).toBeTruthy()
    expect(screen.queryByText(/Versionen sichtbar/)).toBeNull()
  })

  it('treats a release whose only note was rejected as open, not done (Kriterium 5)', async () => {
    // has_own_notes: false / has_own_media: false is exactly the corrected backend
    // projection for a release whose only release_version_note has review_state
    // 'rejected' (anime_contributions_member_project_repository.go's has_own_notes
    // EXISTS subquery now excludes it). isDone() needs no source change -- it
    // already trusts has_own_notes as an opaque boolean -- so this test proves the
    // frontend consequence end to end: such a release must count as "offen", both
    // in the counter and in the Offen/Erledigt filters.
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({ release_version_id: 41, episode_number: '01', has_own_contribution: true, has_own_notes: false, has_own_media: false }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    expect(screen.getByText('1 offen · 0 erledigt')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Erledigt' }))
    expect(screen.queryByText('Folge 01 · AnimeOwnage · v1')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Offen' }))
    expect(screen.getByText('Folge 01 · AnimeOwnage · v1')).toBeTruthy()
  })

  it('shows a distinct "Überarbeitung nötig" badge for a rejected-only release', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({
          release_version_id: 41,
          episode_number: '01',
          has_own_contribution: true,
          has_own_notes: false,
          has_own_media: false,
          has_own_rejected_notes: true,
        }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    const reworkBadges = screen.getAllByText('Überarbeitung nötig').filter((node) => node.tagName === 'SPAN')
    expect(reworkBadges).toHaveLength(1)
    const openBadges = screen.queryAllByText('Offen').filter((node) => node.tagName === 'SPAN')
    const doneBadges = screen.queryAllByText('Erledigt').filter((node) => node.tagName === 'SPAN')
    expect(openBadges).toHaveLength(0)
    expect(doneBadges).toHaveLength(0)
  })

  it('renders a primary, non-downgraded button for a rejected-only release', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({
          release_version_id: 41,
          episode_number: '01',
          has_own_contribution: true,
          has_own_notes: false,
          has_own_media: false,
          has_own_rejected_notes: true,
        }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    const workspaceLink = screen.getByRole('link', { name: /Notizen & Medien/i })
    expect(workspaceLink.className).not.toContain('buttonSecondary')
  })

  it('still counts and filters a rejected-only release as "offen"', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({
          release_version_id: 41,
          episode_number: '01',
          has_own_contribution: true,
          has_own_notes: false,
          has_own_media: false,
          has_own_rejected_notes: true,
        }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    expect(screen.getByText('1 offen · 0 erledigt')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Offen' }))
    expect(screen.getByText('Folge 01 · AnimeOwnage · v1')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Erledigt' }))
    expect(screen.queryByText('Folge 01 · AnimeOwnage · v1')).toBeNull()
  })

  it('shows plain "Offen" for a never-touched release (regression guard)', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({
          release_version_id: 41,
          episode_number: '01',
          has_own_contribution: true,
          has_own_notes: false,
          has_own_media: false,
          has_own_rejected_notes: false,
        }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    const openBadges = screen.getAllByText('Offen').filter((node) => node.tagName === 'SPAN')
    expect(openBadges).toHaveLength(1)
    expect(screen.queryByText('Überarbeitung nötig')).toBeNull()
    const workspaceLink = screen.getByRole('link', { name: /Notizen & Medien/i })
    expect(workspaceLink.className).toContain('buttonSecondary')
  })

  it('shows a motivating empty state when the user has no assigned releases at all', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({ release_version_id: 41, episode_number: '01', has_own_contribution: false, role_codes: [], role_labels: [] }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    expect(screen.getByText('Du bist noch keiner Folge in diesem Projekt zugeordnet.')).toBeTruthy()
  })

  it('shows an empty state when open mode has no open releases left', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({ release_version_id: 41, episode_number: '01', has_own_contribution: true, has_own_notes: true, has_own_media: false }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Offen' }))

    expect(screen.getByText('Alle deine Folgen sind erledigt.')).toBeTruthy()
  })

  it('shows an empty state when done mode has no done releases yet', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({ release_version_id: 41, episode_number: '01', has_own_contribution: true, has_own_notes: false, has_own_media: false }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Erledigt' }))

    expect(screen.getByText('Noch keine Folge erledigt.')).toBeTruthy()
  })

  it('keeps the episode search field visible and usable in open and done modes', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: makeProject([
        makeRelease({ release_version_id: 41, episode_number: '01', has_own_contribution: true, has_own_notes: false, has_own_media: false }),
      ]),
    })

    render(<MyProjectDetailPage />)

    await screen.findByRole('heading', { name: 'Naruto', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Offen' }))
    expect(screen.getByLabelText('Folgen-Nummer suchen')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Erledigt' }))
    expect(screen.getByLabelText('Folgen-Nummer suchen')).toBeTruthy()
  })
})
