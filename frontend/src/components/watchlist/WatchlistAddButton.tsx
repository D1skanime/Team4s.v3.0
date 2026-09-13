'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Check } from 'lucide-react'

import { addWatchlistEntry, ApiError, getWatchlistEntry, removeWatchlistEntry } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import { Button } from '@/components/ui/Button'

import styles from './WatchlistAddButton.module.css'

interface WatchlistAddButtonProps {
  animeID: number
  /** Compatibility prop until the page stops supplying SSR viewer state. Client GET owns status. */
  initiallyInWatchlist?: boolean
  /** Custom className for the button (overrides default styling) */
  className?: string
  /** Custom className when in watchlist */
  activeClassName?: string
}

type WatchlistStatus = 'unknown' | 'loading' | 'present' | 'absent' | 'error'

export function WatchlistAddButton(props: WatchlistAddButtonProps) {
  const { hasAccessToken, hasRefreshToken, accountIdentity, accountGeneration, isCurrentSession } = useAuthSession()
  const hasAuthSession = hasAccessToken || hasRefreshToken
  // A different owner gets a fresh action lifecycle, including all pending callbacks.
  const owner = JSON.stringify([props.animeID, accountIdentity, accountGeneration, hasAuthSession])
  return <WatchlistAction key={owner} {...props} hasAuthSession={hasAuthSession} isCurrentSession={isCurrentSession} />
}

function WatchlistAction({
  animeID,
  className,
  activeClassName,
  hasAuthSession,
  isCurrentSession,
}: WatchlistAddButtonProps & { hasAuthSession: boolean; isCurrentSession: () => boolean }) {
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

  const isAdded = status === 'present'
  const buttonClasses = className
    ? `${className}${isAdded && activeClassName ? ` ${activeClassName}` : ''}`
    : styles.button
  const statusKnown = status === 'present' || status === 'absent'
  const buttonContent = !hasAuthSession ? (
    'Anmeldung erforderlich'
  ) : isSubmitting ? (
    'Speichern...'
  ) : status === 'error' ? (
    'Watchliststatus unbekannt'
  ) : !statusKnown ? (
    'Watchlist wird geprüft…'
  ) : isAdded ? (
    <><Check size={18} aria-hidden="true" />In Watchlist</>
  ) : (
    <><Plus size={18} aria-hidden="true" />Zur Watchlist</>
  )

  return (
    <div className={styles.wrapper}>
      <button
        className={buttonClasses}
        type="button"
        onClick={handleToggle}
        disabled={isSubmitting || !hasAuthSession || !statusKnown}
      >
        {buttonContent}
      </button>
      {message ? <p className={styles.message} role={isError ? 'alert' : 'status'}>{message}</p> : null}
      {hasAuthSession && status === 'error' ? (
        <Button variant="secondary" size="sm" onClick={() => void checkStatus()}>
          Erneut prüfen
        </Button>
      ) : null}
    </div>
  )
}
