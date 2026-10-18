// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AnimeDetail } from '@/types/anime'

import { useJellyfinIntake } from '../../hooks/useJellyfinIntake'
import { AnimeEditSourceSection } from './AnimeEditSourceSection'

const linkMock = vi.fn()
const searchMock = vi.fn()

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    conflict: unknown
    constructor(status: number, message: string, _retryAfterSeconds: unknown, _code: unknown, _details: unknown, conflict: unknown = null) {
      super(message)
      this.status = status
      this.conflict = conflict
    }
  },
}))

vi.mock('@/lib/api/admin/anime-core', () => ({
  linkAdminAnimeAniSearchSource: (...args: unknown[]) => linkMock(...args),
}))

// Task 3's own search endpoint shares a module with the Jellyfin candidate search this
// component also renders (CreateJellyfinCard) -- stub both so these tests stay focused on the
// new AniSearch card without needing a live backend for either.
vi.mock('@/lib/api/admin-anime-intake', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/admin-anime-intake')>()
  return {
    ...actual,
    searchAdminAnimeCreateAniSearchCandidates: (...args: unknown[]) => searchMock(...args),
    searchAdminJellyfinIntakeCandidates: vi.fn().mockResolvedValue({ data: [] }),
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function baseAnime(): AnimeDetail {
  return {
    id: 13,
    title: 'Freezing',
    type: 'tv',
    content_type: 'anime',
    status: 'done',
    view_count: 0,
    episodes: [],
  }
}

function Harness({ anime = baseAnime() }: { anime?: AnimeDetail }) {
  const jellyfinIntake = useJellyfinIntake()
  return (
    <AnimeEditSourceSection
      anime={anime}
      effectiveAniSearchID=""
      aniSearchURL=""
      effectiveJellyfinSeriesID=""
      effectiveFolderPath=""
      hasJellyfinSource={false}
      jellyfinIntake={jellyfinIntake}
      hasAdoptedJellyfinSelection={false}
      isSubmitting={false}
      onJellyfinSearch={() => {}}
      onJellyfinSelect={() => {}}
      onJellyfinAdopt={() => {}}
      onDiscardJellyfinSelection={() => {}}
    />
  )
}

describe('AnimeEditSourceSection — AniSearch verknuepfen (Task 3)', () => {
  it('links a directly entered AniSearch ID and immediately updates the displayed ID/URL', async () => {
    linkMock.mockResolvedValue({ data: { mode: 'linked', anisearch_id: '6465', source: 'anisearch:6465' } })
    render(<Harness />)

    fireEvent.change(screen.getByLabelText('AniSearch-ID oder -URL'), { target: { value: '6465' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verknüpfen' }))

    await waitFor(() => expect(linkMock).toHaveBeenCalledWith(13, { anisearch_id: '6465' }))
    await waitFor(() => expect(screen.getByText('AniSearch-ID 6465 wurde verknüpft.')).not.toBeNull())
    expect(screen.getByText('6465')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'AniSearch öffnen' }).getAttribute('href')).toBe(
      'https://www.anisearch.de/anime/6465',
    )
  })

  it('extracts the numeric ID from a full AniSearch URL before linking', async () => {
    linkMock.mockResolvedValue({ data: { mode: 'linked', anisearch_id: '6465', source: 'anisearch:6465' } })
    render(<Harness />)

    fireEvent.change(screen.getByLabelText('AniSearch-ID oder -URL'), {
      target: { value: 'https://www.anisearch.de/anime/6465,freezing' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Verknüpfen' }))

    await waitFor(() => expect(linkMock).toHaveBeenCalledWith(13, { anisearch_id: '6465' }))
  })

  it('shows the German conflict message with the other anime name and a redirect link, without updating the local ID', async () => {
    const { ApiError } = await import('@/lib/api')
    linkMock.mockRejectedValue(
      new ApiError(409, 'conflict', null, null, null, {
        mode: 'conflict',
        anisearch_id: '9999',
        existing_anime_id: 12,
        existing_title: 'Angel Beats!',
        redirect_path: '/admin/anime/12/edit',
      }),
    )
    render(<Harness />)

    fireEvent.change(screen.getByLabelText('AniSearch-ID oder -URL'), { target: { value: '9999' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verknüpfen' }))

    await waitFor(() =>
      expect(screen.getByText('Diese AniSearch-ID ist bereits mit „Angel Beats!“ verknüpft.')).not.toBeNull(),
    )
    expect(screen.getByRole('link', { name: 'Zum anderen Anime wechseln' }).getAttribute('href')).toBe(
      '/admin/anime/12/edit',
    )
    // No local override -- the identity card still shows the placeholder, not 9999.
    expect(screen.queryByText('9999')).toBeNull()
  })

  it('disables the Verknüpfen button when the ID/URL field is empty', () => {
    render(<Harness />)

    const button = screen.getByRole('button', { name: 'Verknüpfen' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('searches by title and lets the admin take over a candidate result into the ID field', async () => {
    searchMock.mockResolvedValue({
      data: [{ anisearch_id: '6465', title: 'Freezing', type: 'tv', year: 2011 }],
    })
    render(<Harness />)

    fireEvent.change(screen.getByLabelText('AniSearch-Titel suchen'), { target: { value: 'Freezing' } })
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }))

    await waitFor(() => expect(searchMock).toHaveBeenCalledWith('Freezing', { limit: 8 }))
    await waitFor(() => expect(screen.getByText('Freezing')).not.toBeNull())
    expect(screen.getByText('2011 | tv | AniSearch-ID 6465')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }))

    expect((screen.getByLabelText('AniSearch-ID oder -URL') as HTMLInputElement).value).toBe('6465')
  })

  it('shows the takeover summary with German field labels split into "Übernommen" and "Behalten" after a successful link (Teil B)', async () => {
    linkMock.mockResolvedValue({
      data: {
        mode: 'linked',
        anisearch_id: '6465',
        source: 'anisearch:6465',
        takeover: {
          filled: ['title_de', 'year'],
          replaced: ['description'],
          kept: [
            { field: 'genre', action: 'keep', reason: 'Weicht von Jellyfin ab, gilt als manuell gepflegt' },
            { field: 'tags', action: 'keep', reason: 'Kein Jellyfin-Vergleichswert verfügbar, Feld bleibt geschützt' },
          ],
          jellyfin_unreachable: false,
        },
      },
    })
    render(<Harness />)

    fireEvent.change(screen.getByLabelText('AniSearch-ID oder -URL'), { target: { value: '6465' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verknüpfen' }))

    await waitFor(() =>
      expect(screen.getByText('Übernommen: Titel (DE), Jahr, Beschreibung')).not.toBeNull(),
    )
    expect(screen.getByText('Behalten (manuell geändert): Genres, Tags')).not.toBeNull()
    expect(screen.queryByText('Jellyfin nicht erreichbar – nur leere Felder gefüllt.')).toBeNull()
  })

  it('shows the Jellyfin-unreachable notice when the takeover could only fill empty fields', async () => {
    linkMock.mockResolvedValue({
      data: {
        mode: 'linked',
        anisearch_id: '6465',
        source: 'anisearch:6465',
        takeover: {
          filled: ['title_de'],
          replaced: [],
          kept: [],
          jellyfin_unreachable: true,
        },
      },
    })
    render(<Harness />)

    fireEvent.change(screen.getByLabelText('AniSearch-ID oder -URL'), { target: { value: '6465' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verknüpfen' }))

    await waitFor(() =>
      expect(screen.getByText('Jellyfin nicht erreichbar – nur leere Felder gefüllt.')).not.toBeNull(),
    )
    expect(screen.getByText('Übernommen: Titel (DE)')).not.toBeNull()
  })

  it('renders no takeover summary when the backend response has no takeover key at all', async () => {
    linkMock.mockResolvedValue({ data: { mode: 'linked', anisearch_id: '6465', source: 'anisearch:6465' } })
    render(<Harness />)

    fireEvent.change(screen.getByLabelText('AniSearch-ID oder -URL'), { target: { value: '6465' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verknüpfen' }))

    await waitFor(() => expect(screen.getByText('AniSearch-ID 6465 wurde verknüpft.')).not.toBeNull())
    expect(screen.queryByText(/Übernommen:/)).toBeNull()
    expect(screen.queryByText(/Behalten/)).toBeNull()
    expect(screen.queryByText(/Jellyfin nicht erreichbar/)).toBeNull()
  })
})
