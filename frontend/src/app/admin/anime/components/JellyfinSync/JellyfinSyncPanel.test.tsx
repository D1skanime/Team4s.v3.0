// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AnimeDetail } from '@/types/anime'

import { JellyfinSyncPanel } from './JellyfinSyncPanel'

/**
 * Regressionsnachweis für die Modul-Aufteilung von JellyfinSyncPanel (CLAUDE.md
 * "Übergroße Dateien beim Anfassen aufteilen"): dieser Test existierte vor dem Split nicht und
 * dient als Sicherheitsnetz, dass das Herauslösen der vier Assistent-Schritte in eigene
 * Komponenten das sichtbare Verhalten (Schritt-Titel, Lade-Zustände, Button-Verdrahtung)
 * unverändert lässt.
 */

afterEach(() => {
  cleanup()
})

const BASE_ANIME: AnimeDetail = {
  id: 7,
  title: 'Testanime',
  type: 'tv',
  content_type: 'anime',
  status: 'ongoing',
  view_count: 0,
  episodes: [],
}

function buildModel(overrides: Partial<Parameters<typeof JellyfinSyncPanel>[0]['model']> = {}) {
  return {
    searchQuery: '',
    seriesOptions: [],
    selectedSeriesID: '',
    seasonInput: '1',
    episodeStatus: 'private' as const,
    cleanupVersions: false,
    allowMismatch: false,
    previewResult: null,
    lastSyncResult: null,
    isSearching: false,
    isLoadingPreview: false,
    isSyncing: false,
    isBulkSyncing: false,
    searchFeedback: null,
    previewFeedback: null,
    syncFeedback: null,
    setSearchQuery: vi.fn(),
    selectSeries: vi.fn(),
    setSeasonInput: vi.fn(),
    setEpisodeStatus: vi.fn(),
    setCleanupVersions: vi.fn(),
    setAllowMismatch: vi.fn(),
    search: vi.fn().mockResolvedValue(undefined),
    preview: vi.fn().mockResolvedValue(undefined),
    sync: vi.fn().mockResolvedValue(true),
    reset: vi.fn(),
    ...overrides,
  }
}

describe('JellyfinSyncPanel', () => {
  it('zeigt alle vier Assistent-Schritte mit ihren Titeln', () => {
    render(
      <JellyfinSyncPanel
        anime={BASE_ANIME}
        model={buildModel()}
        onBeforeAction={vi.fn()}
        onSynced={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Serie suchen' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Treffer wählen' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Preview prüfen' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Sync anwenden' })).toBeTruthy()
  })

  it('löst beim Klick auf "Suchen" onBeforeAction und model.search aus', () => {
    const model = buildModel()
    const onBeforeAction = vi.fn()
    render(
      <JellyfinSyncPanel anime={BASE_ANIME} model={model} onBeforeAction={onBeforeAction} onSynced={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }))

    expect(onBeforeAction).toHaveBeenCalledTimes(1)
    expect(model.search).toHaveBeenCalledTimes(1)
  })

  it('zeigt den Lade-Spinner-Text, während die Suche läuft', () => {
    render(
      <JellyfinSyncPanel
        anime={BASE_ANIME}
        model={buildModel({ isSearching: true })}
        onBeforeAction={vi.fn()}
        onSynced={vi.fn()}
      />,
    )

    expect(screen.getByText('Suche läuft...')).toBeTruthy()
  })

  it('deaktiviert "Vorschau laden" ohne gewählten Treffer und aktiviert ihn danach', () => {
    const model = buildModel()
    const { rerender } = render(
      <JellyfinSyncPanel anime={BASE_ANIME} model={model} onBeforeAction={vi.fn()} onSynced={vi.fn()} />,
    )
    expect((screen.getByRole('button', { name: 'Vorschau laden' }) as HTMLButtonElement).disabled).toBe(true)

    const withSelection = buildModel({ selectedSeriesID: 'series-1' })
    rerender(
      <JellyfinSyncPanel anime={BASE_ANIME} model={withSelection} onBeforeAction={vi.fn()} onSynced={vi.fn()} />,
    )
    expect((screen.getByRole('button', { name: 'Vorschau laden' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('öffnet die Sync-Bestätigung und ruft model.sync beim Bestätigen auf', async () => {
    const model = buildModel({
      selectedSeriesID: 'series-1',
      previewResult: {
        anime_id: BASE_ANIME.id,
        jellyfin_series_id: 'series-1',
        jellyfin_series_name: 'Testserie',
        jellyfin_series_path: '/pfad',
        season_number: 1,
        matched_episodes: 3,
        scanned_episodes: 3,
        accepted_unique_episodes: 3,
        path_filtered_episodes: 0,
        skipped_episodes: 0,
        existing_jellyfin_versions: 0,
        existing_episodes: 0,
        mismatch_detected: false,
        applied_episode_status: 'private',
        overwrite_episode_titles: false,
        overwrite_version_titles: false,
        episodes: [],
      },
    })
    const onSynced = vi.fn().mockResolvedValue(undefined)
    render(
      <JellyfinSyncPanel anime={BASE_ANIME} model={model} onBeforeAction={vi.fn()} onSynced={onSynced} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Verknüpfen & synchronisieren' }))
    expect(screen.getByRole('dialog', { name: 'Sync wirklich anwenden?' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Staffel jetzt synchronisieren' }))
    expect(model.sync).toHaveBeenCalledWith(BASE_ANIME.id)
  })
})
