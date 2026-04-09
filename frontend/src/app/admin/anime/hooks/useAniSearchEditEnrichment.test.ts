import { describe, expect, it } from 'vitest'

import { buildAniSearchEditRequest } from './useAniSearchEditEnrichment'

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
})
