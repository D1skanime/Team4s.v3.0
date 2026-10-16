'use client'

import { useEffect, useState } from 'react'

/**
 * Returns `value`, updated at most once per `delayMs` of inactivity. The initial render
 * returns `value` immediately (unchanged, undelayed) — only subsequent changes are debounced,
 * matching the existing inline setTimeout/clearTimeout debounce pattern this hook replaces.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timeoutId)
  }, [value, delayMs])

  return debounced
}
