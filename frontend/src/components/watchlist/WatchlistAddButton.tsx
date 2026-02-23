'use client'

import { useEffect, useState } from 'react'

import { addWatchlistEntry, ApiError, hasRuntimeAuthToken, removeWatchlistEntry } from '@/lib/api'

import styles from './WatchlistAddButton.module.css'

interface WatchlistAddButtonProps {
  animeID: number
  initiallyInWatchlist?: boolean
}

export function WatchlistAddButton({ animeID, initiallyInWatchlist = false }: WatchlistAddButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAdded, setIsAdded] = useState(initiallyInWatchlist)
  const [hasAuthToken, setHasAuthToken] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setHasAuthToken(hasRuntimeAuthToken())
  }, [])

  async function handleToggle() {
    if (isSubmitting) {
      return
    }
    if (!hasRuntimeAuthToken()) {
      setHasAuthToken(false)
      setMessage('Anmeldung erforderlich. Erstelle zuerst ein Token auf /auth.')
      return
    }
    setHasAuthToken(true)

    try {
      setIsSubmitting(true)
      setMessage(null)
      if (isAdded) {
        await removeWatchlistEntry(animeID)
        setIsAdded(false)
        setMessage('Aus Watchlist entfernt.')
      } else {
        await addWatchlistEntry(animeID)
        setIsAdded(true)
        setMessage('Zur Watchlist hinzugefuegt.')
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message)
      } else {
        setMessage('Watchlist-Aktion fehlgeschlagen.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.button}
        type="button"
        onClick={handleToggle}
        disabled={isSubmitting || !hasAuthToken}
      >
        {isSubmitting
          ? 'Speichern...'
          : isAdded
            ? 'Aus Watchlist'
            : hasAuthToken
              ? 'Zur Watchlist'
              : 'Anmeldung erforderlich'}
      </button>
      {message ? <p className={styles.message}>{message}</p> : null}
    </div>
  )
}
