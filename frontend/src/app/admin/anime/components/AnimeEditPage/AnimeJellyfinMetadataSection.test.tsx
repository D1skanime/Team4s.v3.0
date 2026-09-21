// @vitest-environment jsdom
//
// 165-10 (D-18): dieser Test existierte vor Plan 165-10 nicht (Rule-3-Abweichung, siehe
// SUMMARY). Deckt sowohl das unveraenderte Einzel-Kontext-Rendering (AniSearch-ID/Jellyfin-
// Serie/Ordnerpfad/Quelle) als auch die neue AnimeJellyfinFolderList-Integration ab.

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAdminAnimeJellyfinContext } from '@/lib/api'
import type { AdminAnimeJellyfinContext } from '@/types/admin'

import { AnimeJellyfinMetadataSection } from './AnimeJellyfinMetadataSection'

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  getAdminAnimeJellyfinContext: vi.fn(),
  previewAdminAnimeMetadataFromJellyfin: vi.fn(),
  applyAdminAnimeMetadataFromJellyfin: vi.fn(),
  removeAdminAnimeJellyfinFolder: vi.fn(),
}))

const mockedGetContext = vi.mocked(getAdminAnimeJellyfinContext)

function buildContext(overrides: Partial<AdminAnimeJellyfinContext> = {}): AdminAnimeJellyfinContext {
  return {
    anime_id: 7,
    linked: true,
    source: 'jellyfin:abc',
    source_kind: 'jellyfin',
    jellyfin_series_id: 'abc',
    jellyfin_series_name: 'Naruto',
    jellyfin_series_path: 'D:/Anime/TV/Naruto',
    folder_name: 'Naruto',
    cover: {
      current_source: 'manual',
      incoming_available: false,
      can_apply: false,
      will_apply_by_default: false,
    },
    persisted_assets: { backgrounds: [] },
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

describe('AnimeJellyfinMetadataSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the existing single-context block unaffected (AniSearch-ID/Jellyfin-Serie/Ordnerpfad/Quelle)', async () => {
    mockedGetContext.mockResolvedValue({ data: buildContext() })

    render(
      <AnimeJellyfinMetadataSection
        animeID={7}
        onError={vi.fn()}
        onSuccess={vi.fn()}
        onAfterApply={vi.fn(async () => {})}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Mit Jellyfin verknüpft')).toBeTruthy()
    })

    expect(screen.getByText('Quelle: jellyfin:abc')).toBeTruthy()
    expect(screen.getAllByDisplayValue('Naruto')).toHaveLength(2)
  })

  it('renders AnimeJellyfinFolderList below the single-context block, passing context.folders', async () => {
    mockedGetContext.mockResolvedValue({
      data: buildContext({
        folders: [
          { jellyfin_item_id: 'abc', is_main: true },
          { jellyfin_item_id: 'def', is_main: false },
        ],
      }),
    })

    render(
      <AnimeJellyfinMetadataSection
        animeID={7}
        onError={vi.fn()}
        onSuccess={vi.fn()}
        onAfterApply={vi.fn(async () => {})}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Haupt-Ordner')).toBeTruthy()
    })
    expect(screen.getByText('Zusatz-Ordner')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ordner entfernen' })).toBeTruthy()
  })

  it('does not render the folder list when the context has no folders', async () => {
    mockedGetContext.mockResolvedValue({ data: buildContext({ folders: [] }) })

    render(
      <AnimeJellyfinMetadataSection
        animeID={7}
        onError={vi.fn()}
        onSuccess={vi.fn()}
        onAfterApply={vi.fn(async () => {})}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Mit Jellyfin verknüpft')).toBeTruthy()
    })
    expect(screen.queryByText('Verbundene Jellyfin-Ordner')).toBeNull()
  })
})
