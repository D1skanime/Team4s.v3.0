'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { addWatchlistEntry, ApiError, getWatchlistEntry, removeWatchlistEntry } from '@/lib/api'

export type WatchlistStatus = 'unknown' | 'loading' | 'present' | 'absent' | 'error'

export interface UseWatchlistActionParams {
  animeID: number
  /** True sobald mindestens ein Auth-Token vorliegt -- ohne Session wird nie gelesen/geschrieben. */
  hasAuthSession: boolean
  /** Erkennt eine inzwischen veraltete Komponenteninstanz (Konto-/Token-Wechsel waehrend eine
   * Anfrage noch laeuft) -- eine veraltete Antwort darf den Zustand nicht mehr anfassen. */
  isCurrentSession: () => boolean
}

/**
 * Eigenstaendiger Watchlist-Hinzufuegen/Entfernen-Zustandsautomat (vormals Teil von
 * WatchlistAction's Komponenten-Closure): haelt den Watchlist-Status, den Sende-/Fehlerzustand
 * und eine generationsbasierte Race-Sperre, und macht checkStatus/handleToggle direkt -- ohne
 * Rendering oder DOM-Klick-Simulation -- testbar. Jede Anfrage trägt eine fortlaufende
 * Generation; eine Antwort, die nicht mehr zur aktuellen Generation oder zur aktuellen Session
 * gehoert, darf keinen Zustand mehr setzen (verhindert veraltete Antworten nach Konto-/
 * Anime-Wechsel waehrend einer laufenden Anfrage).
 */
export function useWatchlistAction({ animeID, hasAuthSession, isCurrentSession }: UseWatchlistActionParams) {
  const [status, setStatus] = useState<WatchlistStatus>('unknown')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const requestGeneration = useRef(0)

  const checkStatus = useCallback(async () => {
    const generation = ++requestGeneration.current
    setStatus('loading')
    setMessage(null)
    setIsError(false)
    try {
      await getWatchlistEntry(animeID)
      if (generation === requestGeneration.current && isCurrentSession()) setStatus('present')
    } catch (error) {
      if (generation !== requestGeneration.current || !isCurrentSession()) return
      if (error instanceof ApiError && error.status === 404) {
        setStatus('absent')
      } else {
        setStatus('error')
        setIsError(true)
        setMessage('Watchliststatus konnte nicht geladen werden. Bitte erneut prüfen.')
      }
    }
  }, [animeID, isCurrentSession])

  useEffect(() => {
    if (hasAuthSession) void checkStatus()
    return () => { requestGeneration.current += 1 }
  }, [hasAuthSession, checkStatus])

  async function handleToggle() {
    if (!hasAuthSession || !isCurrentSession() || isSubmitting || (status !== 'present' && status !== 'absent')) return

    const generation = ++requestGeneration.current
    try {
      setIsSubmitting(true)
      setMessage(null)
      setIsError(false)
      if (status === 'present') {
        await removeWatchlistEntry(animeID)
        if (generation !== requestGeneration.current || !isCurrentSession()) return
        setStatus('absent')
        setMessage('Aus Watchlist entfernt.')
      } else {
        await addWatchlistEntry(animeID)
        if (generation !== requestGeneration.current || !isCurrentSession()) return
        setStatus('present')
        setMessage('Zur Watchlist hinzugefügt.')
      }
    } catch (error) {
      if (generation !== requestGeneration.current || !isCurrentSession()) return
      setIsError(true)
      setMessage(error instanceof ApiError ? error.message : 'Watchlist-Aktion fehlgeschlagen.')
    } finally {
      if (generation === requestGeneration.current && isCurrentSession()) setIsSubmitting(false)
    }
  }

  return { status, isSubmitting, message, isError, checkStatus, handleToggle }
}
