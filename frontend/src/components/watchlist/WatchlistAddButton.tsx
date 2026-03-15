'use client'

import { useEffect, useState } from 'react'
import { Plus, Check } from 'lucide-react'

import { addWatchlistEntry, ApiError, hasRuntimeAuthToken, removeWatchlistEntry } from '@/lib/api'

import styles from './WatchlistAddButton.module.css'

interface WatchlistAddButtonProps {
  animeID: number
  initiallyInWatchlist?: boolean
  /** Custom className for the button (overrides default styling) */
  className?: string
  /** Custom className when in watchlist */
  activeClassName?: string
}

export function WatchlistAddButton({
  animeID,
  initiallyInWatchlist = false,
  className,
  activeClassName,
}: WatchlistAddButtonProps) {
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

  // Determine button classes
  const useCustomStyle = Boolean(className)
  const buttonClasses = useCustomStyle
    ? `${className}${isAdded && activeClassName ? ` ${activeClassName}` : ''}`
    : styles.button

  const buttonContent = isSubmitting ? (
    'Speichern...'
  ) : isAdded ? (
    <>
      <Check size={18} />
      In Watchlist
    </>
  ) : hasAuthToken ? (
    <>
      <Plus size={18} />
      Zur Watchlist
    </>
  ) : (
    'Anmeldung erforderlich'
  )

  return (
    <div className={useCustomStyle ? undefined : styles.wrapper}>
      <button
        className={buttonClasses}
        type="button"
        onClick={handleToggle}
        disabled={isSubmitting || !hasAuthToken}
      >
        {buttonContent}
      </button>
      {message && !useCustomStyle ? <p className={styles.message}>{message}</p> : null}
    </div>
  )
}
