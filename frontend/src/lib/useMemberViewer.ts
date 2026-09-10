'use client'

import { useCallback } from 'react'

import { useCancellableSlugState, type CancellableSlugState } from '@/hooks/useCancellableSlugState'
import { ApiError, getMemberProfile, getMemberViewerAccess } from '@/lib/api'
import type { PublicMemberProfileResponse, PublicMemberViewer } from '@/types/profile'

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

export interface UseMemberViewerAccessResult {
  status: MemberViewerStatus
  viewer: PublicMemberViewer | null
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
 * PMFE-10 (fail-closed), EINE geteilte Implementierung für beide Hooks unten: solange der
 * Request deaktiviert, noch offen (`loading`/`idle`) oder durch einen neueren requestKey
 * überholt ist, darf der Status NIEMALS `'resolved'` melden. Owner-only UI (Edit-Link, Privat-
 * Vorschau-Banner) darf sich ausschließlich auf ein positives, schlüsselgleiches `'resolved'`
 * verlassen — ein hängender oder veralteter Request muss als "noch nicht bekannt" (also
 * faktisch: nicht Owner) behandelt werden. Phase 154 (P154-08..10) extrahiert diesen Guard aus
 * `useMemberViewer`, damit `useMemberViewerAccess` ihn NICHT dupliziert.
 */
function deriveViewerStatus<T>(
  canFetch: boolean,
  state: CancellableSlugState<T>,
  requestKey: string,
): MemberViewerStatus {
  if (!canFetch || state.key !== requestKey || state.status === 'loading' || state.status === 'idle') {
    return 'loading'
  }
  if (state.status === 'error') {
    return isNotFoundError(state.error) ? 'unavailable' : 'error'
  }
  return 'resolved'
}

/**
 * PMFE-02: der EINE zentrale, geteilte Owner-/Viewer-Resolver für die
 * members/[slug]-Oberfläche (siehe OwnHiddenProfilePreview.tsx als alleiniger Konsument seit
 * Phase 154, Phase 132 Plan 03). Baut auf useCancellableSlugState auf (echte
 * AbortController-Stornierung + requestKey-Gate) statt eigene Zustandsverwaltung zu
 * duplizieren. Liefert bei Erfolg die VOLLSTÄNDIGE PublicMemberProfileResponse (data + viewer),
 * damit auch der Aufrufer mit vollem Profilbedarf (Owner-Vorschau) keinen zweiten Request
 * braucht. Der signierte Edit-Link-Konsument, der nur `is_owner` braucht, nutzt stattdessen die
 * schlanke `useMemberViewerAccess` unten (RCA-08 / P154-08..10).
 */
export function useMemberViewer(
  slug: string | null,
  { enabled, retryKey = 0 }: UseMemberViewerOptions,
): UseMemberViewerResult {
  const requestKey = [slug ?? '', enabled, retryKey].join(':')
  const canFetch = enabled && slug !== null

  // Memoized on `slug` alone: useCancellableSlugState's effect depends on this reference, so
  // a fresh function identity on every render would re-trigger (and immediately self-abort)
  // the fetch forever instead of settling once per requestKey. Do NOT add `signal` to the deps
  // — it is provided by useCancellableSlugState at call time, not captured here.
  const fetcher = useCallback(
    (signal: AbortSignal) => getMemberProfile(slug as string, signal),
    [slug],
  )

  const { state } = useCancellableSlugState<PublicMemberProfileResponse>({
    requestKey,
    enabled: canFetch,
    fetcher,
  })

  const status = deriveViewerStatus(canFetch, state, requestKey)
  if (status !== 'resolved') {
    return { status, response: null, requestKey }
  }
  return { status: 'resolved', response: state.data, requestKey }
}

/**
 * Schlanke Variante von useMemberViewer (RCA-08 / P154-08..10): fetcht ausschließlich
 * `{ viewer: { is_owner, is_private_preview } }` über `getMemberViewerAccess`, ohne das volle
 * öffentliche Profil zu laden. Teilt den PMFE-10-Fail-Closed-Guard über `deriveViewerStatus`
 * mit `useMemberViewer` -- KEINE zweite Guard-Implementierung.
 */
export function useMemberViewerAccess(
  slug: string | null,
  { enabled, retryKey = 0 }: UseMemberViewerOptions,
): UseMemberViewerAccessResult {
  const requestKey = [slug ?? '', enabled, retryKey].join(':')
  const canFetch = enabled && slug !== null

  const fetcher = useCallback(
    (signal: AbortSignal) => getMemberViewerAccess(slug as string, signal),
    [slug],
  )

  const { state } = useCancellableSlugState<{ viewer: PublicMemberViewer }>({
    requestKey,
    enabled: canFetch,
    fetcher,
  })

  const status = deriveViewerStatus(canFetch, state, requestKey)
  if (status !== 'resolved') {
    return { status, viewer: null, requestKey }
  }
  return { status: 'resolved', viewer: state.data?.viewer ?? null, requestKey }
}
