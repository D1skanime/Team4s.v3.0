// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api'

import { formatEditLoadError } from './formatEditLoadError'

// --- Plan 165-12: DiscoveryReturnLink wiring on the edit page ---

vi.mock('@/components/auth/PlatformAdminGate', () => ({
  PlatformAdminGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => ({
    hasAccessToken: true,
    hasRefreshToken: true,
    isClientInitialized: true,
  }),
}))

const navigationMocks = vi.hoisted(() => ({
  search: '',
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '42' }),
  useSearchParams: () => new URLSearchParams(navigationMocks.search),
}))

const apiMocks = vi.hoisted(() => ({
  getAnimeByID: vi.fn(),
  getAnimeFansubs: vi.fn(),
  getFansubBySlug: vi.fn(),
}))

// Partial mock: the edit page pulls in a wide dependency tree (asset upload,
// patch mutations, relation editing, ...) that all resolve their own real
// named exports from '@/lib/api'. Only the three calls this page's own
// data-loading effects make are overridden here; everything else — including
// the real ApiError class used by formatAdminError's instanceof check below
// — passes through unchanged.
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    getAnimeByID: apiMocks.getAnimeByID,
    getAnimeFansubs: apiMocks.getAnimeFansubs,
    getFansubBySlug: apiMocks.getFansubBySlug,
  }
})

// Imported AFTER the mocks above so the page module resolves the mocked
// 'next/navigation' / '@/lib/api' modules.
import AdminAnimeEditPage from './page'

const baseAnime = {
  id: 42,
  title: 'Beispiel-Anime',
  type: 'tv',
  content_type: 'anime',
  status: 'ongoing',
  view_count: 0,
  episodes: [],
}

describe('AdminAnimeEditPage DiscoveryReturnLink wiring', () => {
  beforeEach(() => {
    navigationMocks.search = ''
    apiMocks.getAnimeByID.mockResolvedValue({ data: baseAnime })
    apiMocks.getAnimeFansubs.mockResolvedValue({ data: [] })
    apiMocks.getFansubBySlug.mockResolvedValue({ data: null })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders DiscoveryReturnLink with the decoded ?return= value near the page header', async () => {
    navigationMocks.search = '?return=%2Fadmin%2Fanime%2Fcreate%2Flibrary'

    render(<AdminAnimeEditPage />)

    const link = await screen.findByRole('link', { name: 'Zurück zur Bibliothek' })
    expect(link.getAttribute('href')).toBe('/admin/anime/create/library')
  })

  it('renders no return link when ?return= is absent', async () => {
    render(<AdminAnimeEditPage />)

    await screen.findByText('Anime bearbeiten')
    expect(screen.queryByRole('link', { name: 'Zurück zur Bibliothek' })).toBeNull()
  })

  it("still mounts and renders the page's pre-existing core content", async () => {
    render(<AdminAnimeEditPage />)

    expect(await screen.findByText('Anime bearbeiten')).not.toBeNull()
  })
})

describe('AdminAnimeEditPage load error formatting', () => {
  it('surfaces backend details for pre-form load failures', () => {
    const error = new ApiError(
      500,
      'Interner Serverfehler',
      null,
      'db_schema_mismatch',
      'Fehlende Spalte: anime.max_episodes',
    )

    expect(formatEditLoadError(error)).toBe('(500) Interner Serverfehler\nFehlende Spalte: anime.max_episodes')
  })

  it('keeps Jellyfin context ownership inside the provenance section instead of duplicating a notice block', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(path.join(currentDir, 'page.tsx'), 'utf8')

    expect(source).not.toContain('<strong>Jellyfin-Kontext</strong>')
  })

  it('keeps the current relation section and legacy jellyfin sync section boundaries explicit', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(path.join(currentDir, 'page.tsx'), 'utf8')

    expect(source).toContain('AnimeRelationsSection')
    expect(source).not.toContain('JellyfinSyncPanel')
  })

  it('keeps AniSearch reload controls out of the edit workspace', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(path.join(currentDir, '../../components/AnimeEditPage/AnimeEditSharedSections.tsx'), 'utf8')

    expect(source).not.toContain('AniSearchEnrichmentSection')
    expect(source).toContain('AniSearch-Nachladen ist bewusst nicht Teil des')
  })

  it('documents the generic V2 upload seam instead of the legacy public covers path in the edit asset UI', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(path.join(currentDir, '../../components/AnimePatchForm/AnimeCoverField.tsx'), 'utf8')

    expect(source).toContain('verifizierte V2-Upload-Seam')
    expect(source).not.toContain('frontend/public/covers')
  })

  it('exposes create-like asset actions in the reachable edit asset UI', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url))
    const assetSource = readFileSync(path.join(currentDir, '../../components/AnimeEditPage/AnimeEditAssetSection.tsx'), 'utf8')

    expect(assetSource).toContain('Online suchen')
    expect(assetSource).toContain('Background-Videos')
    expect(assetSource).toContain('Hintergründe')
  })

  it('drops the old jellyfin metadata shell from the reachable edit route', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url))
    const routeSource = readFileSync(path.join(currentDir, 'page.tsx'), 'utf8')

    expect(routeSource).not.toContain('AnimeJellyfinMetadataSection')
  })
})
