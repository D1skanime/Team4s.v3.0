import { describe, expect, it } from 'vitest'
import type { AdminJellyfinIntakeSearchItem } from '@/types/admin'

import {
  completeJellyfinCandidateTakeover,
  deriveJellyfinIntakeSearchState,
  openJellyfinCandidateReview,
} from './useJellyfinIntake'

describe('useJellyfinIntake helpers', () => {
  it('keeps Jellyfin search unavailable until the title input is meaningful', () => {
    expect(deriveJellyfinIntakeSearchState('')).toMatchObject({ canSearch: false })
    expect(deriveJellyfinIntakeSearchState(' . ')).toMatchObject({ canSearch: false })
    expect(deriveJellyfinIntakeSearchState('Naruto')).toMatchObject({ canSearch: true })
  })

  it('opens candidate review instead of jumping directly to draft hydration', () => {
    const candidates: AdminJellyfinIntakeSearchItem[] = [
      {
        jellyfin_series_id: 'series-1',
        name: 'Naruto',
        confidence: 'high',
        already_imported: false,
        type_hint: {
          confidence: 'high',
          suggested_type: 'tv',
          reasons: ['Serienordner erkannt.'],
        },
      },
      {
        jellyfin_series_id: 'series-2',
        name: 'Naruto Shippuden',
        confidence: 'medium',
        already_imported: false,
        type_hint: {
          confidence: 'medium',
          suggested_type: 'tv',
          reasons: ['Titelteil erkannt.'],
        },
      },
    ]

    const reviewState = openJellyfinCandidateReview(candidates, 'series-1')

    expect(reviewState.mode).toBe('review')
    expect(reviewState.selectedCandidate?.jellyfin_series_id).toBe('series-1')
    expect(reviewState.shouldHydrateDraft).toBe(false)
  })

  it('marks a selected candidate as takeover-only after preview hydration', () => {
    const candidates: AdminJellyfinIntakeSearchItem[] = [
      {
        jellyfin_series_id: 'series-1',
        name: 'Naruto',
        confidence: 'high',
        already_imported: false,
        type_hint: {
          confidence: 'high',
          suggested_type: 'tv',
          reasons: ['Serienordner erkannt.'],
        },
      },
      {
        jellyfin_series_id: 'series-2',
        name: 'Naruto Shippuden',
        confidence: 'medium',
        already_imported: false,
        type_hint: {
          confidence: 'medium',
          suggested_type: 'tv',
          reasons: ['Titelteil erkannt.'],
        },
      },
    ]

    const reviewState = completeJellyfinCandidateTakeover(candidates, 'series-1')

    expect(reviewState.mode).toBe('hydrated')
    expect(reviewState.selectedCandidate?.jellyfin_series_id).toBe('series-1')
    expect(reviewState.shouldHydrateDraft).toBe(true)
  })
})
