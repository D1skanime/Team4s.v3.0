// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'

import type { AssetCardDescriptor } from './AnimeJellyfinMetadataSection.helpers'
import type { AdminAnimeJellyfinContext } from '@/types/admin'

// D-13: Beweist, dass AnimeJellyfinAssetUploadControls seine Upload-Steuerelemente
// selbst über is_platform_admin absichert (Defense-in-Depth), unabhängig vom
// umgebenden <PlatformAdminGate>-Wrapper der beiden Aufrufseiten.
const apiMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  resolveApiUrl: vi.fn((path?: string) => path ?? ''),
  uploadAdminAnimeMedia: vi.fn(),
  assignAdminAnimeCoverAsset: vi.fn(),
  assignAdminAnimeBannerAsset: vi.fn(),
  assignAdminAnimeLogoAsset: vi.fn(),
  assignAdminAnimeBackgroundVideoAsset: vi.fn(),
  addAdminAnimeBackgroundAsset: vi.fn(),
  deleteAdminAnimeCoverAsset: vi.fn(),
  deleteAdminAnimeBannerAsset: vi.fn(),
  deleteAdminAnimeLogoAsset: vi.fn(),
  deleteAdminAnimeBackgroundVideoAsset: vi.fn(),
  deleteAdminAnimeBackgroundAsset: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  getCurrentUser: (...args: unknown[]) => apiMocks.getCurrentUser(...args),
  resolveApiUrl: (...args: unknown[]) => apiMocks.resolveApiUrl(...(args as [string | undefined])),
  uploadAdminAnimeMedia: (...args: unknown[]) => apiMocks.uploadAdminAnimeMedia(...args),
  assignAdminAnimeCoverAsset: (...args: unknown[]) => apiMocks.assignAdminAnimeCoverAsset(...args),
  assignAdminAnimeBannerAsset: (...args: unknown[]) => apiMocks.assignAdminAnimeBannerAsset(...args),
  assignAdminAnimeLogoAsset: (...args: unknown[]) => apiMocks.assignAdminAnimeLogoAsset(...args),
  assignAdminAnimeBackgroundVideoAsset: (...args: unknown[]) =>
    apiMocks.assignAdminAnimeBackgroundVideoAsset(...args),
  addAdminAnimeBackgroundAsset: (...args: unknown[]) => apiMocks.addAdminAnimeBackgroundAsset(...args),
  deleteAdminAnimeCoverAsset: (...args: unknown[]) => apiMocks.deleteAdminAnimeCoverAsset(...args),
  deleteAdminAnimeBannerAsset: (...args: unknown[]) => apiMocks.deleteAdminAnimeBannerAsset(...args),
  deleteAdminAnimeLogoAsset: (...args: unknown[]) => apiMocks.deleteAdminAnimeLogoAsset(...args),
  deleteAdminAnimeBackgroundVideoAsset: (...args: unknown[]) =>
    apiMocks.deleteAdminAnimeBackgroundVideoAsset(...args),
  deleteAdminAnimeBackgroundAsset: (...args: unknown[]) => apiMocks.deleteAdminAnimeBackgroundAsset(...args),
}))

import { AnimeJellyfinAssetUploadControls } from './AnimeJellyfinAssetUploadControls'

const assetCards: AssetCardDescriptor[] = [
  { key: 'cover', title: 'Cover', kind: 'cover', hasIncoming: false },
  { key: 'banner', title: 'Banner', kind: 'banner', hasIncoming: false },
]

const persistedAssets: AdminAnimeJellyfinContext['persisted_assets'] = {
  backgrounds: [],
}

function renderControls() {
  return render(
    <AnimeJellyfinAssetUploadControls
      animeID={42}
      animeTitle="Testanime"
      assetCards={assetCards}
      coverCurrentSource="none"
      persistedAssets={persistedAssets}
      onSuccess={() => {}}
      onError={() => {}}
      onAfterMutation={async () => {}}
    />,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AnimeJellyfinAssetUploadControls - D-13 Anzeige-Berechtigung', () => {
  it('zeigt die Upload-Steuerelemente, wenn getCurrentUser() is_platform_admin=true liefert', async () => {
    apiMocks.getCurrentUser.mockResolvedValue({
      data: { is_platform_admin: true },
    })

    renderControls()

    expect(await screen.findByRole('button', { name: 'Cover hochladen' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Banner hochladen' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Cover entfernen' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Banner entfernen' })).not.toBeNull()
  })

  it('verbirgt die Upload-Steuerelemente vollständig, wenn getCurrentUser() is_platform_admin=false liefert', async () => {
    apiMocks.getCurrentUser.mockResolvedValue({
      data: { is_platform_admin: false },
    })

    renderControls()

    // Warten, bis die Berechtigungsprüfung abgeschlossen ist (ein stabiles, immer
    // vorhandenes Element dient als Signal statt eines festen Timeouts).
    await waitFor(() => {
      expect(apiMocks.getCurrentUser).toHaveBeenCalledTimes(1)
    })
    await screen.findByText('Testanime', { exact: false }).catch(() => undefined)

    expect(screen.queryByRole('button', { name: 'Cover hochladen' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Banner hochladen' })).toBeNull()

    // D-13 muss auch die "entfernen"-Steuerelemente der gleichen,
    // platform-admin-only-Ressourcen verbergen, nicht nur die Upload-Seite —
    // das Backend gated Assign UND Delete identisch über requirePlatformAdminIdentity.
    expect(screen.queryByRole('button', { name: 'Cover entfernen' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Banner entfernen' })).toBeNull()

    // Die Komponente darf nicht abstürzen und muss weiterhin einen sichtbaren,
    // nicht-leeren Zustand rendern (z.B. die Asset-Karten-Überschriften).
    expect(screen.getByText('Cover')).not.toBeNull()
    expect(screen.getByText('Banner')).not.toBeNull()
  })

  it('zeigt vor Auflösung von getCurrentUser() keine Upload-Steuerelemente (kein Default-Allow-Flash)', async () => {
    let releaseGetCurrentUser: (() => void) | undefined
    apiMocks.getCurrentUser.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseGetCurrentUser = () => resolve({ data: { is_platform_admin: true } })
        }),
    )

    renderControls()

    // Während die Promise noch offen ist, dürfen die Upload-Steuerelemente nicht
    // bereits sichtbar sein.
    expect(screen.queryByRole('button', { name: 'Cover hochladen' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Banner hochladen' })).toBeNull()

    // Aufräumen: offene Promise innerhalb von act() abschließen, damit die
    // resultierende State-Aktualisierung vor Testende beobachtet wird.
    await act(async () => {
      releaseGetCurrentUser?.()
      await Promise.resolve()
    })
  })

  it('zeigt den "Entfernen"-Knopf einer persistierten Background-Galerie nur für Platform-Admins', async () => {
    const backgroundAssetCards: AssetCardDescriptor[] = [
      { key: 'backgrounds', title: 'Backgrounds', kind: 'backgrounds', hasIncoming: false },
    ]
    const backgroundPersistedAssets: AdminAnimeJellyfinContext['persisted_assets'] = {
      backgrounds: [{ id: 1, url: '/media/background-1.jpg', ownership: 'manual', sort_order: 0 }],
    }

    function renderBackgroundControls() {
      return render(
        <AnimeJellyfinAssetUploadControls
          animeID={42}
          animeTitle="Testanime"
          assetCards={backgroundAssetCards}
          coverCurrentSource="none"
          persistedAssets={backgroundPersistedAssets}
          onSuccess={() => {}}
          onError={() => {}}
          onAfterMutation={async () => {}}
        />,
      )
    }

    apiMocks.getCurrentUser.mockResolvedValue({
      data: { is_platform_admin: true },
    })
    renderBackgroundControls()
    expect(await screen.findByRole('button', { name: 'Entfernen' })).not.toBeNull()
    cleanup()

    apiMocks.getCurrentUser.mockResolvedValue({
      data: { is_platform_admin: false },
    })
    renderBackgroundControls()
    await waitFor(() => {
      expect(apiMocks.getCurrentUser).toHaveBeenCalledTimes(2)
    })
    expect(screen.queryByRole('button', { name: 'Entfernen' })).toBeNull()
  })
})
