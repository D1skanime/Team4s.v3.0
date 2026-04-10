import { describe, expect, it } from 'vitest'

import { buildCreateAniSearchDraftSummary } from './createAniSearchSummary'

describe('buildCreateAniSearchDraftSummary', () => {
  it('describes updated fields, relation notes, and the unsaved draft warning', () => {
    const summary = buildCreateAniSearchDraftSummary({
      result: {
        anisearch_id: '12345',
        source: 'anisearch:12345',
        filled_fields: ['title', 'description', 'relations'],
        manual_fields_kept: [],
        provider: {
          anisearch_id: '12345',
          jellysync_applied: false,
          relation_candidates: 3,
          relation_matches: 1,
        },
      },
      overwrittenJellyfinFields: ['description'],
      preservedManualFields: [],
    })

    expect(summary.message).toContain('AniSearch ID 12345 hat den Entwurf aktualisiert')
    expect(summary.notes).toContain('Aktualisiert: title, description, relations.')
    expect(summary.notes).toContain('Relationen: 1 von 3 AniSearch-Relationen konnten lokal zugeordnet werden.')
    expect(summary.notes).toContain('Jellyfin ersetzt: description.')
    expect(summary.notes).toContain('Noch nichts gespeichert: nothing is saved yet.')
  })

  it('mentions preserved manual values when AniSearch leaves them untouched', () => {
    const summary = buildCreateAniSearchDraftSummary({
      result: {
        anisearch_id: '12345',
        source: 'anisearch:12345',
        filled_fields: ['title'],
        manual_fields_kept: ['title_de', 'description'],
        provider: {
          anisearch_id: '12345',
          jellysync_applied: true,
          relation_candidates: 0,
          relation_matches: 0,
        },
      },
      overwrittenJellyfinFields: [],
      preservedManualFields: ['title_de', 'description'],
    })

    expect(summary.notes).toContain('Manuell behalten: title_de, description.')
    expect(summary.notes).not.toContain('Jellyfin ersetzt:')
  })
})
