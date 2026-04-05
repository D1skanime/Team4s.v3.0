import { useCallback, useMemo, useState } from 'react'

import {
  previewAdminAnimeFromJellyfinIntake,
  searchAdminJellyfinIntakeCandidates,
} from '@/lib/api/admin-anime-intake'
import type {
  AdminAnimeJellyfinIntakePreviewResult,
  AdminJellyfinIntakeSearchItem,
} from '@/types/admin'

export interface JellyfinIntakeReviewState {
  mode: 'idle' | 'review' | 'hydrated'
  selectedCandidate: AdminJellyfinIntakeSearchItem | null
  shouldHydrateDraft: boolean
}

export interface JellyfinIntakeSearchState {
  canSearch: boolean
  disabledReason: string | null
}

export interface JellyfinIntakeModel {
  query: string
  candidates: AdminJellyfinIntakeSearchItem[]
  reviewState: JellyfinIntakeReviewState
  previewResult: AdminAnimeJellyfinIntakePreviewResult | null
  isSearching: boolean
  isLoadingPreview: boolean
  setQuery: (value: string) => void
  search: () => Promise<number>
  reviewCandidate: (candidateID: string) => void
  loadPreview: (candidateID: string) => Promise<AdminAnimeJellyfinIntakePreviewResult | null>
  restartReview: () => void
  resetReview: () => void
}

export function deriveJellyfinIntakeSearchState(query: string): JellyfinIntakeSearchState {
  const trimmed = query.trim()
  const onlyPunctuation = trimmed.replace(/[\p{L}\p{N}]+/gu, '').length === trimmed.length
  const canSearch = trimmed.length >= 2 && !onlyPunctuation

  return {
    canSearch,
    disabledReason: canSearch ? null : 'Gib zuerst einen aussagekraeftigen Anime-Titel ein.',
  }
}

export function openJellyfinCandidateReview(
  candidates: AdminJellyfinIntakeSearchItem[],
  candidateID: string,
): JellyfinIntakeReviewState {
  const selectedCandidate = candidates.find((candidate) => candidate.jellyfin_series_id === candidateID) ?? null

  return {
    mode: selectedCandidate ? 'review' : 'idle',
    selectedCandidate,
    shouldHydrateDraft: false,
  }
}

export function completeJellyfinCandidateTakeover(
  candidates: AdminJellyfinIntakeSearchItem[],
  candidateID: string,
): JellyfinIntakeReviewState {
  const selectedCandidate = candidates.find((candidate) => candidate.jellyfin_series_id === candidateID) ?? null

  return {
    mode: selectedCandidate ? 'hydrated' : 'idle',
    selectedCandidate,
    shouldHydrateDraft: Boolean(selectedCandidate),
  }
}

export function useJellyfinIntake(authToken?: string): JellyfinIntakeModel {
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<AdminJellyfinIntakeSearchItem[]>([])
  const [reviewState, setReviewState] = useState<JellyfinIntakeReviewState>({
    mode: 'idle',
    selectedCandidate: null,
    shouldHydrateDraft: false,
  })
  const [previewResult, setPreviewResult] = useState<AdminAnimeJellyfinIntakePreviewResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const searchState = useMemo(() => deriveJellyfinIntakeSearchState(query), [query])

  const search = useCallback(async () => {
    if (!searchState.canSearch) {
      setCandidates([])
      setReviewState({ mode: 'idle', selectedCandidate: null, shouldHydrateDraft: false })
      return 0
    }

    setIsSearching(true)
    setPreviewResult(null)
    try {
      const response = await searchAdminJellyfinIntakeCandidates(query.trim(), { limit: 12 }, authToken)
      setCandidates(response.data)
      setReviewState({ mode: 'idle', selectedCandidate: null, shouldHydrateDraft: false })
      return response.data.length
    } finally {
      setIsSearching(false)
    }
  }, [authToken, query, searchState.canSearch])

  const reviewCandidate = useCallback((candidateID: string) => {
    setReviewState(openJellyfinCandidateReview(candidates, candidateID))
  }, [candidates])

  const loadPreview = useCallback(async (candidateID: string) => {
    const target = candidates.find((candidate) => candidate.jellyfin_series_id === candidateID)
    if (!target) return null

    setIsLoadingPreview(true)
    try {
      const response = await previewAdminAnimeFromJellyfinIntake(
        {
          jellyfin_series_id: target.jellyfin_series_id,
        },
        authToken,
      )
      setPreviewResult(response.data)
      setReviewState(completeJellyfinCandidateTakeover(candidates, candidateID))
      return response.data
    } finally {
      setIsLoadingPreview(false)
    }
  }, [authToken, candidates])

  const restartReview = useCallback(() => {
    setReviewState((current) => {
      if (!current.selectedCandidate) {
        return { mode: 'idle', selectedCandidate: null, shouldHydrateDraft: false }
      }

      return {
        mode: 'review',
        selectedCandidate: current.selectedCandidate,
        shouldHydrateDraft: false,
      }
    })
  }, [])

  const resetReview = useCallback(() => {
    setReviewState({ mode: 'idle', selectedCandidate: null, shouldHydrateDraft: false })
    setPreviewResult(null)
  }, [])

  return {
    query,
    candidates,
    reviewState,
    previewResult,
    isSearching,
    isLoadingPreview,
    setQuery,
    search,
    reviewCandidate,
    loadPreview,
    restartReview,
    resetReview,
  }
}
