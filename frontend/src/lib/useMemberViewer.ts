'use client'

import { useCallback } from 'react'

import { useCancellableSlugState } from '@/hooks/useCancellableSlugState'
import { ApiError, getMemberProfile } from '@/lib/api'
import type { PublicMemberProfileResponse } from '@/types/profile'

export type MemberViewerStatus = 'loading' | 'unavailable' | 'error' | 'resolved'

export interface UseMemberViewerOptions {
  /** Solange `false` (oder `slug` `null`) bleibt der Status `loading` und es wird nicht gefetcht. */
  enabled: boolean
  /** Erhöhen erzwingt einen frischen Fetch (z. B. über den "Erneut versuchen"-Button). */
  retryKey?: number
}

export interface UseMemberViewerResult {
  status: MemberViewerStatus
  response: PublicMemberProfileResponse | null
  requestKey: string
}

function isNotFoundError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 404
  return (
    typeof error === 'object'
    && error !== null
    && 'status' in error
    && (error as { status?: unknown }).status === 404
  )
}

/**
 * PMFE-02: der EINE zentrale, geteilte Owner-/Viewer-Resolver für die
 * members/[slug]-Oberfläche (siehe OwnHiddenProfilePreview.tsx und OwnProfileEditLink.tsx
 * als alleinige Konsumenten, Phase 132 Plan 03). Baut auf useCancellableSlugState auf (echte
 * AbortController-Stornierung + requestKey-Gate) statt eigene Zustandsverwaltung zu
 * duplizieren. Liefert bei Erfolg die VOLLSTÄNDIGE PublicMemberProfileResponse (data + viewer),
 * damit auch der Aufrufer mit vollem Profilbedarf (Owner-Vorschau) keinen zweiten Request
 * braucht.
 */
export function useMemberViewer(
  slug: string | null,
  { enabled, retryKey = 0 }: UseMemberViewerOptions,
): UseMemberViewerResult {
  const requestKey = [slug ?? '', enabled, retryKey].join(':')
  const canFetch = enabled && slug !== null

  // Memoized on `slug` alone: useCancellableSlugState's effect depends on this reference, so
  // a fresh function identity on every render would re-trigger (and immediately self-abort)
  // the fetch forever instead of settling once per requestKey.
  const fetcher = useCallback(
    () => getMemberProfile(slug as string),
    [slug],
  )

  const { state } = useCancellableSlugState<PublicMemberProfileResponse>({
    requestKey,
    enabled: canFetch,
    fetcher,
  })

  // PMFE-10 (fail-closed): solange der Request deaktiviert, noch offen (`loading`/`idle`) oder
  // durch einen neueren requestKey überholt ist, darf der Status NIEMALS `'resolved'` melden.
  // Owner-only UI (Edit-Link, Privat-Vorschau-Banner) darf sich ausschließlich auf ein
  // positives, schlüsselgleiches `'resolved'` verlassen — ein hängender oder veralteter
  // Request muss als "noch nicht bekannt" (also faktisch: nicht Owner) behandelt werden.
  if (!canFetch || state.key !== requestKey || state.status === 'loading' || state.status === 'idle') {
    return { status: 'loading', response: null, requestKey }
  }

  if (state.status === 'error') {
    return {
      status: isNotFoundError(state.error) ? 'unavailable' : 'error',
      response: null,
      requestKey,
    }
  }

  return { status: 'resolved', response: state.data, requestKey }
}
