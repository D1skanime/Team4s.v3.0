// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

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

// D-16/D-17: Beweist, dass die fünf Anime-Asset-Slots jetzt echtes Drag&Drop über
// UploadDropzone unterstützen, inklusive des D-16-Mehrdatei-Guards (nur die erste
// Datei pro Einzel-Slot) und der unveränderten isPlatformAdmin-Sichtbarkeits-Sperre.
function makeFile(name = 'bild.png'): File {
  return new File(['x'], name, { type: 'image/png' })
}

describe('AnimeJellyfinAssetUploadControls - D-16/D-17 Drag&Drop', () => {
  it('ruft bei Drop einer einzelnen Datei auf dem Cover-Slot den Upload-Mock genau einmal mit dieser Datei auf', async () => {
    apiMocks.getCurrentUser.mockResolvedValue({ data: { is_platform_admin: true } })
    apiMocks.uploadAdminAnimeMedia.mockResolvedValue({ id: 123 })
    apiMocks.assignAdminAnimeCoverAsset.mockResolvedValue(undefined)

    renderControls()

    const coverDropzone = await screen.findByRole('button', { name: 'Cover hochladen' })
    const file = makeFile('cover.png')

    await act(async () => {
      fireEvent.drop(coverDropzone, { dataTransfer: { files: [file] } })
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(apiMocks.uploadAdminAnimeMedia).toHaveBeenCalledTimes(1)
    })
    expect(apiMocks.uploadAdminAnimeMedia.mock.calls[0][0]).toMatchObject({ file, assetType: 'poster' })
  })

  it('übernimmt bei Drop von zwei Dateien auf dem Cover-Slot nur die erste und zeigt die D-16-Warnung', async () => {
    apiMocks.getCurrentUser.mockResolvedValue({ data: { is_platform_admin: true } })
    apiMocks.uploadAdminAnimeMedia.mockResolvedValue({ id: 123 })
    apiMocks.assignAdminAnimeCoverAsset.mockResolvedValue(undefined)

    renderControls()

    const coverDropzone = await screen.findByRole('button', { name: 'Cover hochladen' })
    const fileA = makeFile('a.png')
    const fileB = makeFile('b.png')

    await act(async () => {
      fireEvent.drop(coverDropzone, { dataTransfer: { files: [fileA, fileB] } })
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(apiMocks.uploadAdminAnimeMedia).toHaveBeenCalledTimes(1)
    })
    expect(apiMocks.uploadAdminAnimeMedia.mock.calls[0][0]).toMatchObject({ file: fileA, assetType: 'poster' })
    expect(screen.getByText(/Nur die erste Datei wurde übernommen/)).not.toBeNull()
  })

  it('zeigt für einen Nicht-Platform-Admin keine der fünf Dropzones', async () => {
    apiMocks.getCurrentUser.mockResolvedValue({ data: { is_platform_admin: false } })

    const allAssetCards: AssetCardDescriptor[] = [
      { key: 'cover', title: 'Cover', kind: 'cover', hasIncoming: false },
      { key: 'banner', title: 'Banner', kind: 'banner', hasIncoming: false },
      { key: 'logo', title: 'Logo', kind: 'logo', hasIncoming: false },
      { key: 'backgrounds', title: 'Backgrounds', kind: 'backgrounds', hasIncoming: false },
      { key: 'background_video', title: 'Background-Video', kind: 'background_video', hasIncoming: false },
    ]
    const allPersistedAssets: AdminAnimeJellyfinContext['persisted_assets'] = {
      backgrounds: [],
    }

    render(
      <AnimeJellyfinAssetUploadControls
        animeID={42}
        animeTitle="Testanime"
        assetCards={allAssetCards}
        coverCurrentSource="none"
        persistedAssets={allPersistedAssets}
        onSuccess={() => {}}
        onError={() => {}}
        onAfterMutation={async () => {}}
      />,
    )

    await waitFor(() => {
      expect(apiMocks.getCurrentUser).toHaveBeenCalledTimes(1)
    })
    await screen.findByText('Testanime', { exact: false }).catch(() => undefined)

    expect(screen.queryByRole('button', { name: 'Cover hochladen' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Banner hochladen' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Logo hochladen' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Background hochladen' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Background-Video hochladen' })).toBeNull()
  })
})
