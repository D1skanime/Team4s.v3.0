import { describe, expect, it } from 'vitest'

import { buildAniSearchEditRequest, formatAniSearchEditResultSummary } from './useAniSearchEditEnrichment'

describe('buildAniSearchEditRequest', () => {
  it('includes protected_fields and anisearch:{id} provenance for edit enrichment requests', () => {
    const payload = buildAniSearchEditRequest({
      anisearchID: '12345',
      draft: {
        title: 'Lookup Title',
        source: 'anisearch:12345',
        folder_name: 'serial-experiments-lain',
      },
      protectedFields: ['title', 'description'],
    })

    expect(payload).toMatchObject({
      anisearch_id: '12345',
      draft: {
        title: 'Lookup Title',
        source: 'anisearch:12345',
        folder_name: 'serial-experiments-lain',
      },
      protected_fields: ['title', 'description'],
    })
  })

  it('formats the edit result summary without unresolved relation details', () => {
    expect(
      formatAniSearchEditResultSummary({
        anisearch_id: '12345',
        updated_fields: ['title', 'description'],
        skipped_protected_fields: ['genre'],
        relations_applied: 2,
        relations_skipped_existing: 1,
      }),
    ).toMatchObject({
      anisearchID: '12345',
      updatedFieldCount: 2,
      protectedFieldCount: 1,
      relationCount: 3,
      message: 'AniSearch geladen. 2 Felder aktualisiert, 1 geschuetzt, 3 Relationen uebernommen.',
    })
  })
})
