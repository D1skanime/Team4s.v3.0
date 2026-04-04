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

  it('mounts the relations section inside the edit route after the shared editor workspace', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(path.join(currentDir, 'page.tsx'), 'utf8')

    expect(source).toContain('AnimeRelationsSection')
    expect(source.indexOf('AnimeEditWorkspace')).toBeLessThan(source.indexOf('AnimeRelationsSection'))
  })

  it('documents the generic V2 upload seam instead of the legacy public covers path in the edit asset UI', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(path.join(currentDir, '../../components/AnimePatchForm/AnimeCoverField.tsx'), 'utf8')

    expect(source).toContain('verifizierte V2-Upload-Seam')
    expect(source).not.toContain('frontend/public/covers')
  })
})
