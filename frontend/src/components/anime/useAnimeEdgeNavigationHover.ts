'use client'

import { useState } from 'react'

import type { AnimeNeighbors } from '@/lib/animeGridContext'
import { getCoverUrl } from '@/lib/utils'

export type EdgeNavigationDirection = 'prev' | 'next'

/** Die fünf DOM-Ereignis-Handler, die eine Randnavigations-Richtung mit der Hover-/Fokus-
 *  Vorschaukarte verknüpfen (Maus, Tastaturfokus, Touch). */
export interface EdgeNavigationHoverHandlers {
  onMouseEnter: () => void
  onMouseLeave: () => void
  onFocus: () => void
  onBlur: () => void
  onTouchStart: () => void
}

/**
 * Eigenständiger Hover-/Fokus-Vorschauzustandsautomat für die Randnavigation
 * (`AnimeEdgeNavigation`): hält, welche Richtung ("prev"/"next") aktuell gehovert oder
 * fokussiert ist, und leitet daraus das anzuzeigende Vorschau-Anime samt Cover-URL ab. Vormals
 * Teil von `AnimeEdgeNavigationContext`s Komponenten-Closure -- jetzt ein eigener Hook, der
 * `handlersFor(direction)`/`hoverDirection`/`previewAnime`/`previewCoverUrl` direkt -- ohne
 * Rendering oder DOM-Event-Simulation -- testbar macht (gleiche Auslagerungstechnik wie
 * `useFansubGroupSwitch`/`useWatchlistAction`).
 */
export function useAnimeEdgeNavigationHover(neighbors: AnimeNeighbors | null) {
  const [hoverDirection, setHoverDirection] = useState<EdgeNavigationDirection | null>(null)
  const previousAnime = neighbors?.prev?.anime ?? null
  const nextAnime = neighbors?.next?.anime ?? null
  const previewAnime = hoverDirection === 'prev' ? previousAnime : hoverDirection === 'next' ? nextAnime : null
  const previewCoverUrl = previewAnime ? getCoverUrl(previewAnime.cover_image) : ''

  /** Liefert die fünf Hover-/Fokus-Handler für eine Richtung -- Betreten setzt die Richtung,
   *  Verlassen räumt sie NUR auf, wenn sie noch zur selben Richtung gehört (verhindert, dass ein
   *  spätes "leave" der alten Richtung eine inzwischen bereits gewechselte Vorschau löscht). */
  function handlersFor(direction: EdgeNavigationDirection): EdgeNavigationHoverHandlers {
    return {
      onMouseEnter: () => setHoverDirection(direction),
      onMouseLeave: () => setHoverDirection((current) => (current === direction ? null : current)),
      onFocus: () => setHoverDirection(direction),
      onBlur: () => setHoverDirection((current) => (current === direction ? null : current)),
      onTouchStart: () => setHoverDirection(direction),
    }
  }

  return { hoverDirection, previewAnime, previewCoverUrl, handlersFor }
}
