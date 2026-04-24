import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ApiError } from '@/lib/api'

import { formatEditLoadError } from './page'

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

  it('keeps legacy relation and jellyfin sync sections out of the edit route', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(path.join(currentDir, 'page.tsx'), 'utf8')

    expect(source).not.toContain('AnimeRelationsSection')
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
