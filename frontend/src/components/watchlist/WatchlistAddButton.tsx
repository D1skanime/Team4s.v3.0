'use client'

import { Plus, Check } from 'lucide-react'

import { useAuthSession } from '@/lib/useAuthSession'
import { Button, type ButtonVariant } from '@/components/ui/Button'
import { Stack } from '@/components/ui/Stack'
import { useWatchlistAction } from './useWatchlistAction'

import styles from './WatchlistAddButton.module.css'

interface WatchlistAddButtonProps {
  animeID: number
  /** Compatibility prop until the page stops supplying SSR viewer state. Client GET owns status. */
  initiallyInWatchlist?: boolean
}

export function WatchlistAddButton(props: WatchlistAddButtonProps) {
  const { hasAccessToken, hasRefreshToken, accountIdentity, accountGeneration, isCurrentSession } = useAuthSession()
  const hasAuthSession = hasAccessToken || hasRefreshToken
  // A different owner gets a fresh action lifecycle, including all pending callbacks.
  const owner = JSON.stringify([props.animeID, accountIdentity, accountGeneration, hasAuthSession])
  return <WatchlistAction key={owner} {...props} hasAuthSession={hasAuthSession} isCurrentSession={isCurrentSession} />
}

function WatchlistAction({
  animeID,
  hasAuthSession,
  isCurrentSession,
}: WatchlistAddButtonProps & { hasAuthSession: boolean; isCurrentSession: () => boolean }) {
  const { status, isSubmitting, message, isError, checkStatus, handleToggle } = useWatchlistAction({
    animeID, hasAuthSession, isCurrentSession,
  })

  const isAdded = status === 'present'
  const statusKnown = status === 'present' || status === 'absent'
  const variant: ButtonVariant = isAdded ? 'watchlistActive' : 'watchlist'
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
    // relatedContent (8px): deckt den gemessenen, vormals rohen 0.45rem (7,2px)-Abstand ab -- eng
    // zusammengehörige Inhalte (der Watchlist-Aktions-Knopf und seine Status-/Wiederholungs-
    // Meldung) dicht zusammen, exakt derselbe Zweck, den der Stack-Grundbaustein bereits für
    // diesen Fall dokumentiert (7,2px vs. 8px liegen unterhalb jeder sichtbaren
    // Pixel-Rundungs-Schwelle, kein eigenes Token für diesen Sub-Pixel-Unterschied nötig).
    <Stack gap="relatedContent">
      <Button
        variant={variant}
        responsiveFullWidth
        onClick={handleToggle}
        disabled={isSubmitting || !hasAuthSession || !statusKnown}
      >
        {buttonContent}
      </Button>
      {message ? <p className={styles.message} role={isError ? 'alert' : 'status'}>{message}</p> : null}
      {hasAuthSession && status === 'error' ? (
        <Button variant="secondary" size="sm" onClick={() => void checkStatus()}>
          Erneut prüfen
        </Button>
      ) : null}
    </Stack>
  )
}
