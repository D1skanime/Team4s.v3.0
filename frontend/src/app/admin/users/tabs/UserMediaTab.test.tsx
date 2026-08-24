// @vitest-environment jsdom
//
// Phase 139 Plan 09: vollständige Neufassung gegen die gruppierte Release-/Episoden-Block-
// Projektion (UI-SPEC-Vertrag). Es existierte zuvor keine Testdatei für UserMediaTab.tsx
// (139-RESEARCH.md's Wave-0-Lücke) -- diese Datei ist die erste. Jeder Fehlschlag hier ist eine
// echte Phase-139-Regression, keine geerbte Altlast.

import type { ImgHTMLAttributes } from 'react'

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AdminMediaReleaseBlock, AdminUserMediaPage } from '@/types/admin-users'

const mockPush = vi.hoisted(() => vi.fn())
const mockReplace = vi.hoisted(() => vi.fn())
const mockUseSearchParams = vi.hoisted(() => vi.fn(() => new URLSearchParams()))
const mockUsePathname = vi.hoisted(() => vi.fn(() => '/admin/users/7'))
const mockUseRouter = vi.hoisted(() => vi.fn(() => ({ push: mockPush, replace: mockReplace })))

vi.mock('next/navigation', () => ({
  useRouter: mockUseRouter,
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
}))

vi.mock('next/image', () => ({
  default: ({ alt, fill, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} data-fill={fill ? 'true' : 'false'} {...props} />
  },
}))

const { getAdminUserMediaMock } = vi.hoisted(() => ({
  getAdminUserMediaMock: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {},
  getAdminUserMedia: (...args: unknown[]) => getAdminUserMediaMock(...args),
}))

import { UserMediaTab } from './UserMediaTab'

function makeItem(overrides: Partial<AdminMediaReleaseBlock['items'][number]> = {}) {
  return {
    media_asset_id: 1,
    media_type: 'image',
    original_filename: 'cover.jpg',
    public_url: '/media/covers/cover.jpg',
    file_size_bytes: 12345,
    uploaded_at: '2026-01-15T10:30:00Z',
    ...overrides,
  }
}

function makeBlock(overrides: Partial<AdminMediaReleaseBlock> = {}): AdminMediaReleaseBlock {
  return {
    anime_id: 3,
    anime_title: 'Test Anime',
    fansub_group_id: 2,
    fansub_group_name: 'Example Subs',
    release_version_id: 99,
    release_version_label: '1',
    episode_number: '5',
    items: [makeItem({ media_asset_id: 1 }), makeItem({ media_asset_id: 2 })],
    ...overrides,
  }
}

function makePage(
  blocks: AdminMediaReleaseBlock[],
  metaOverrides: Partial<AdminUserMediaPage['meta']> = {},
): AdminUserMediaPage {
  return {
    data: blocks,
    meta: { total: blocks.length, limit: 25, offset: 0, ...metaOverrides },
    filter_options: { animes: [], groups: [], releases_or_episodes: [], media_types: [] },
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockUseSearchParams.mockReturnValue(new URLSearchParams())
})

describe('UserMediaTab', () => {
  it('rendert genau einen Block mit Sub-line-Text und beiden Items, nie "release_version:"', async () => {
    getAdminUserMediaMock.mockResolvedValue(makePage([makeBlock()]))
    render(<UserMediaTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Test Anime · Example Subs')).not.toBeNull())
    expect(screen.getByText('Episode 5 · Version 1')).not.toBeNull()
    expect(document.body.textContent).not.toContain('release_version:')
  })

  it('zeigt beide Item-Thumbnails/Meta-Zeilen eines Blocks', async () => {
    getAdminUserMediaMock.mockResolvedValue(makePage([makeBlock()]))
    render(<UserMediaTab userId={7} />)
    await waitFor(() => expect(screen.getAllByText(/Hochgeladen:/).length).toBe(2))
    expect(screen.getAllByText('image').length).toBe(2)
  })

  it('zeigt den primären Aktions-Button "Release-Medien öffnen" mit korrektem Link, nicht die alte Kopie', async () => {
    getAdminUserMediaMock.mockResolvedValue(makePage([makeBlock({ release_version_id: 42 })]))
    render(<UserMediaTab userId={7} />)
    const link = await screen.findByRole('link', { name: 'Release-Medien öffnen' })
    expect(link).toHaveProperty('href', expect.stringContaining('/me/releases/42/workspace'))
    expect(screen.queryByText('Arbeitsfläche öffnen')).toBeNull()
  })

  it('rendert höchstens einen primären Aktions-Button pro Block, nicht pro Item', async () => {
    getAdminUserMediaMock.mockResolvedValue(makePage([makeBlock()]))
    render(<UserMediaTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Test Anime · Example Subs')).not.toBeNull())
    expect(screen.getAllByRole('link', { name: 'Release-Medien öffnen' }).length).toBe(1)
  })

  it('zeigt niemals die Berechtigungs-Badge (hasScopePermission ist ersatzlos entfernt)', async () => {
    getAdminUserMediaMock.mockResolvedValue(makePage([makeBlock()]))
    render(<UserMediaTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Test Anime · Example Subs')).not.toBeNull())
    expect(screen.queryByText(/Berechtigung aktiv/)).toBeNull()
    expect(screen.queryByText(/Berechtigung fehlt/)).toBeNull()
  })

  it('rendert keine physischen Pfade, Storage-IDs, Ableitungs-Inventare oder Format-Analysen (D18)', async () => {
    getAdminUserMediaMock.mockResolvedValue(makePage([makeBlock()]))
    render(<UserMediaTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Test Anime · Example Subs')).not.toBeNull())
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/storage[-_ ]?id/i)
    expect(text).not.toMatch(/media_assets\//)
    expect(text).not.toMatch(/derivative/i)
  })

  it('zeigt meta.total in Badge und Pagination, nicht die Länge der aktuellen Seite', async () => {
    const page = Array.from({ length: 5 }, (_, index) =>
      makeBlock({
        anime_id: index + 1,
        fansub_group_id: 1,
        release_version_id: index + 1,
        anime_title: `Anime ${index + 1}`,
      }),
    )
    getAdminUserMediaMock.mockResolvedValue(makePage(page, { total: 17, limit: 5, offset: 0 }))
    render(<UserMediaTab userId={7} />)
    await waitFor(() => expect(screen.getAllByText('17').length).toBeGreaterThan(0))
    // 17 Treffer / 5 pro Seite => 4 Seiten; Pagination zeigt Seite 1 von 4.
    expect(screen.getByText('Seite 1 von 4')).not.toBeNull()
  })

  it('löst beim Ändern des Medientyp-Filters einen Refetch mit media_type im Request aus', async () => {
    getAdminUserMediaMock.mockResolvedValue({
      ...makePage([makeBlock()]),
      filter_options: {
        animes: [],
        groups: [],
        releases_or_episodes: [],
        media_types: ['image', 'video'],
      },
    })
    render(<UserMediaTab userId={7} />)
    await waitFor(() => expect(getAdminUserMediaMock).toHaveBeenCalledTimes(1))
    getAdminUserMediaMock.mockClear()

    const select = await screen.findByLabelText('Medientyp')
    fireEvent.change(select, { target: { value: 'video' } })

    await waitFor(() => expect(mockReplace).toHaveBeenCalled())
    const calledUrl = mockReplace.mock.calls.map((call) => String(call[0])).join(' | ')
    expect(calledUrl).toContain('media_type=video')

    // Simuliert, dass die URL-Änderung tatsächlich in einem neuen Render ankommt (kein
    // clientseitiges Filtern -- der Refetch geht real über getAdminUserMedia).
    mockUseSearchParams.mockReturnValue(new URLSearchParams('media_type=video'))
    render(<UserMediaTab userId={7} />)

    await waitFor(() => expect(getAdminUserMediaMock).toHaveBeenCalled())
    const lastCall = getAdminUserMediaMock.mock.calls[getAdminUserMediaMock.mock.calls.length - 1]
    expect(lastCall[0]).toBe(7)
    expect(lastCall[1]).toMatchObject({ media_type: 'video' })
  })

  it('rendert Thumbnails über eine Komponente, deren <img> loading="lazy" trägt', async () => {
    getAdminUserMediaMock.mockResolvedValue(makePage([makeBlock()]))
    render(<UserMediaTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Test Anime · Example Subs')).not.toBeNull())
    const images = document.querySelectorAll('img')
    expect(images.length).toBeGreaterThan(0)
    images.forEach((img) => {
      expect(img.getAttribute('loading')).toBe('lazy')
    })
  })

  it('zeigt leere Medien ohne Rollen-Fallback (echter Leerzustand)', async () => {
    getAdminUserMediaMock.mockResolvedValue(makePage([]))
    render(<UserMediaTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Keine Medien vorhanden.')).not.toBeNull())
    expect(screen.queryByText('Keine Medien für diese Filter.')).toBeNull()
  })

  it('zeigt den gefilterten Leerzustand mit Reset-Aktion, wenn ein Filter aktiv ist', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('media_type=video'))
    getAdminUserMediaMock.mockResolvedValue(makePage([]))
    render(<UserMediaTab userId={7} />)
    await waitFor(() => expect(screen.getByText('Keine Medien für diese Filter.')).not.toBeNull())
    expect(
      screen.getByText('Filter anpassen oder zurücksetzen, um weitere Einträge zu sehen.'),
    ).not.toBeNull()
    expect(screen.getAllByRole('button', { name: 'Filter zurücksetzen' }).length).toBeGreaterThan(0)
  })

  it('ruft beim Klick auf "Erneut versuchen" die Ladefunktion erneut auf', async () => {
    getAdminUserMediaMock.mockRejectedValueOnce(new Error('Daten konnten nicht geladen werden. Erneut versuchen.'))
    render(<UserMediaTab userId={7} />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Fehler beim Laden' })).not.toBeNull())
    expect(getAdminUserMediaMock).toHaveBeenCalledTimes(1)

    getAdminUserMediaMock.mockResolvedValueOnce(makePage([makeBlock()]))
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))

    await waitFor(() => expect(getAdminUserMediaMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByText('Test Anime · Example Subs')).not.toBeNull())
  })
})
