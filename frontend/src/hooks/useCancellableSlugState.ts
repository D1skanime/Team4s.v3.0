'use client'

import { useEffect, useRef, useState } from 'react'

export type CancellableSlugStateStatus = 'idle' | 'loading' | 'success' | 'error'

export interface CancellableSlugState<T> {
  key: string
  status: CancellableSlugStateStatus
  data: T | null
  error: unknown
}

export interface UseCancellableSlugStateOptions<T> {
  /** Sluggebundener Schlüssel dieser Anfrage (z. B. `${slug}:${offset}`). */
  requestKey: string
  /** Solange `false` bleibt der Zustand `idle` und es wird nicht gefetcht. */
  enabled: boolean
  /** Fetcher MUSS das übergebene `AbortSignal` an fetch/apiClientFetch weiterreichen. */
  fetcher: (signal: AbortSignal) => Promise<T>
}

export interface UseCancellableSlugStateResult<T> {
  state: CancellableSlugState<T>
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

const IDLE_STATE: CancellableSlugState<never> = { key: '', status: 'idle', data: null, error: null }

/**
 * D-03: gemeinsamer, sluggebundener, abbrechbarer Zustands-Hook (siehe useDebouncedSearch.ts
 * für die AbortController-Abbruchlogik und useProjectMemberCollection.ts für die reine
 * Dedup-Updater-Form, aus denen dieser Hook synthetisiert ist). Jeder Zustandsübergang ist
 * eine frische, reine Objektbildung aus requestKey + aufgelöstem Wert — NIEMALS eine
 * Ref-Mutation innerhalb eines setState-Updaters, da React 18 StrictMode Effekte doppelt
 * aufruft und Ref-Mutation den Dedup-/Race-Schutz lautlos korrumpieren würde, während Tests
 * ohne StrictMode grün bleiben (siehe Bugfix-Präzedenzfall in useProjectMemberCollection.ts).
 * Ein bei Auslösung bereits überholter/abgebrochener Request darf den Zustand nie mehr
 * verändern (last-write-wins über den `AbortController`, PMFE-03/PMFE-10).
 */
export function useCancellableSlugState<T>({
  requestKey,
  enabled,
  fetcher,
}: UseCancellableSlugStateOptions<T>): UseCancellableSlugStateResult<T> {
  const [state, setState] = useState<CancellableSlugState<T>>(IDLE_STATE)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Vorherigen (durch einen neuen requestKey/enabled-Wert überholten) Request abbrechen.
    controllerRef.current?.abort()

    if (!enabled) {
      controllerRef.current = null
      setState(IDLE_STATE)
      return
    }

    const controller = new AbortController()
    controllerRef.current = controller
    setState({ key: requestKey, status: 'loading', data: null, error: null })

    fetcher(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setState({ key: requestKey, status: 'success', data, error: null })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return
        setState({ key: requestKey, status: 'error', data: null, error })
      })

    return () => {
      controller.abort()
    }
  }, [requestKey, enabled, fetcher])

  return { state }
}
