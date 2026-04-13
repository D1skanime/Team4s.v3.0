import { describe, expect, it } from 'vitest'

import { ApiError } from '@/lib/api'

import {
  buildAniSearchEditRequest,
  createAniSearchEditFailureState,
  createAniSearchEditSuccessState,
  formatAniSearchEditResultSummary,
} from './useAniSearchEditEnrichment'

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

  it('falls back to empty field lists when the edit result omits optional arrays', () => {
    expect(
      formatAniSearchEditResultSummary({
        anisearch_id: '12345',
        relations_applied: 1,
        relations_skipped_existing: 0,
      }),
    ).toMatchObject({
      anisearchID: '12345',
      updatedFieldCount: 0,
      protectedFieldCount: 0,
      relationCount: 1,
      message: 'AniSearch geladen. 0 Felder aktualisiert, 0 geschuetzt, 1 Relationen uebernommen.',
    })
  })

  it('stores conflict metadata separately from the generic error text', () => {
    const state = createAniSearchEditFailureState(
      new ApiError(
        409,
        'AniSearch Quelle ist bereits verknuepft.',
        null,
        'anisearch_source_conflict',
        null,
        {
          mode: 'conflict',
          anisearch_id: '12345',
          existing_anime_id: 84,
          existing_title: 'Serial Experiments Lain',
          redirect_path: '/admin/anime/84/edit',
        },
      ),
    )

    expect(state).toEqual({
      result: null,
      conflict: {
        mode: 'conflict',
        anisearch_id: '12345',
        existing_anime_id: 84,
        existing_title: 'Serial Experiments Lain',
        redirect_path: '/admin/anime/84/edit',
      },
      errorMessage: 'AniSearch Quelle ist bereits verknuepft.',
    })
  })

  it('clears stale conflict state after a successful retry', () => {
    const failureState = createAniSearchEditFailureState(
      new ApiError(
        409,
        'AniSearch Quelle ist bereits verknuepft.',
        null,
        'anisearch_source_conflict',
        null,
        {
          mode: 'conflict',
          anisearch_id: '12345',
          existing_anime_id: 84,
          existing_title: 'Serial Experiments Lain',
          redirect_path: '/admin/anime/84/edit',
        },
      ),
    )

    const successState = createAniSearchEditSuccessState({
      mode: 'draft',
      anisearch_id: '12345',
      source: 'anisearch:12345',
      draft: {
        title: 'Serial Experiments Lain',
        source: 'anisearch:12345',
      },
      updated_fields: ['title'],
      relations_applied: 1,
      relations_skipped_existing: 0,
      skipped_protected_fields: [],
    })

    expect(failureState.conflict?.existing_anime_id).toBe(84)
    expect(successState.conflict).toBeNull()
    expect(successState.errorMessage).toBeNull()
    expect(successState.result?.source).toBe('anisearch:12345')
  })
})
