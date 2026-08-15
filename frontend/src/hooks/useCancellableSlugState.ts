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
  // `settled` holds only TERMINAL outcomes (success/error), written exclusively from inside
  // the fetch promise's .then/.catch — never synchronously in the effect body itself (React
  // Compiler/eslint-plugin-react-hooks flags synchronous setState-in-effect as a cascading-
  // render smell; see useDebouncedSearch.ts / useProjectMemberCollection.ts for the same
  // async-callback-only setState convention this hook follows).
  const [settled, setSettled] = useState<CancellableSlugState<T>>(IDLE_STATE)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Vorherigen (durch einen neuen requestKey/enabled-Wert überholten) Request abbrechen.
    controllerRef.current?.abort()

    if (!enabled) {
      controllerRef.current = null
      return
    }

    const controller = new AbortController()
    controllerRef.current = controller

    fetcher(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setSettled({ key: requestKey, status: 'success', data, error: null })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return
        setSettled({ key: requestKey, status: 'error', data: null, error })
      })

    return () => {
      controller.abort()
    }
  }, [requestKey, enabled, fetcher])

  // Bis `settled` mit dem aktuellen requestKey übereinstimmt, ist ein aktivierter Request
  // per Definition noch offen -> als 'loading' abgeleitet (reine Berechnung, kein Effekt).
  const state: CancellableSlugState<T> = !enabled
    ? IDLE_STATE
    : settled.key === requestKey
      ? settled
      : { key: requestKey, status: 'loading', data: null, error: null }

  return { state }
}
