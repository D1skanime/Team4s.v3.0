'use client'

import { useState } from 'react'

import type { AnimeFansubRelation } from '@/types/fansub'
import type { ResetForFilterResult } from './useWindowedEpisodePages'

/**
 * Ermittelt die fachlich aktive Fansub-Gruppen-ID zu einem gewünschten Slug (D-02). Bei genau
 * einer verknüpften Gruppe ist diese immer aktiv -- es gibt keinen "Alle"-Chip und keinen
 * Klickpfad, über den eine andere Gruppe gewählt werden könnte. Bei 0 Gruppen oder einem
 * Slug, der zu keiner Gruppe passt, gilt "Alle" (null), nie ein erfundener Treffer.
 */
export function resolveActiveFansubGroupID(
  fansubOptions: AnimeFansubRelation[],
  desiredSlug: string | null,
): number | null {
  if (fansubOptions.length === 0) return null
  if (fansubOptions.length === 1) return fansubOptions[0].fansub_group!.id
  return fansubOptions.find((relation) => relation.fansub_group?.slug === desiredSlug)?.fansub_group?.id ?? null
}

/**
 * Validiert einen aus der Browser-URL gelesenen Rohwert gegen die tatsächlich verknüpften
 * Fansub-Gruppen (genutzt bei Browser Zurück/Vor, D-01/D-09). Unter 2 Gruppen gibt es keinen
 * Gruppenwechsel-Zustand, und ein unbekannter Slug darf nie zu einem erfundenen Treffer führen
 * -- beides fällt bewusst auf "Alle" (null) zurück.
 */
export function resolveGroupSlugForFetch(
  fansubOptions: AnimeFansubRelation[],
  rawSlug: string | null,
): string | null {
  if (fansubOptions.length < 2 || !rawSlug) return null
  const match = fansubOptions.find((relation) => relation.fansub_group?.slug === rawSlug)
  return match ? rawSlug : null
}

/**
 * Reine Ausklapp-Umschaltung für eine Episodenkarte: ein Set-artiger Record wird um den
 * Episodenschlüssel ergänzt oder davon befreit, ohne das übergebene Objekt zu mutieren --
 * damit bleibt der React-Zustandsvergleich (Referenzgleichheit) bei unveränderten Episoden
 * stabil.
 */
export function toggleEpisodeExpansion(
  current: Record<number, true>,
  episodeNumber: number,
): Record<number, true> {
  if (current[episodeNumber]) {
    const next = { ...current }
    delete next[episodeNumber]
    return next
  }
  return { ...current, [episodeNumber]: true }
}

export interface UseFansubGroupSwitchParams {
  fansubOptions: AnimeFansubRelation[]
  /** Slug aus der SSR-Query (`searchParams.fansub`) -- nur der allererste Render liest ihn (D-04). */
  initialActiveSlug?: string | null
  resetForFilter: (targetSlug: string | null) => Promise<ResetForFilterResult>
}

/**
 * Eigenständiger Gruppenwechsel-Zustandsautomat für die Fansub-Gruppenauswahl auf der
 * Anime-Detailseite (D-01 bis D-10): hält die ausgewählte Gruppen-Slug URL-rückgekoppelt und
 * den Lade-/Fehlerzustand EINES Wechsels getrennt vom Infinite-Scroll-Zustand, und macht
 * switchTo/updateFansubSelection direkt -- ohne Rendering oder DOM-Klick-Simulation -- testbar.
 * `resetForFilter` bleibt bewusst von außen injiziert (aus `useWindowedEpisodePages`), damit
 * dieser Hook keine eigene Kopie der Fetch-/Abbruchlogik führt.
 */
export function useFansubGroupSwitch({ fansubOptions, initialActiveSlug, resetForFilter }: UseFansubGroupSwitchParams) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    () => (fansubOptions.length === 1 ? null : (initialActiveSlug ?? null)),
  )
  const activeFansubGroupID = resolveActiveFansubGroupID(fansubOptions, selectedSlug)

  // D-08/D-10: ein Gruppenwechsel hat einen eigenen Lade-/Fehlerzustand (volle Listendimmung),
  // getrennt vom kompakten vorwärts/rückwärts-Ladezustand des Infinite Scroll.
  const [switchState, setSwitchState] = useState<{ loading: boolean; error: string | null }>({
    loading: false, error: null,
  })

  async function switchTo(targetSlug: string | null) {
    // D-09: der Wechsel bricht IMMER eine laufende Anfrage ab (vorwärts, rückwärts oder ein
    // vorheriger Wechsel) -- resetForFilter teilt sich den einzigen requestRef der
    // windowing-Hook-Instanz, nur die letzte Auswahl darf Daten setzen.
    setSwitchState({ loading: true, error: null })
    const outcome = await resetForFilter(targetSlug)
    if (outcome.ok) {
      setSwitchState({ loading: false, error: null })
    } else if (!outcome.aborted) {
      setSwitchState({ loading: false, error: 'Episoden konnten nicht geladen werden.' })
    }
    // outcome.aborted: eine neuere switchTo-Anfrage läuft bereits oder hat bereits committet --
    // diese veraltete Antwort darf switchState nicht mehr anfassen.
  }

  function updateFansubSelection(groupID: number | null) {
    // Bei genau einer Gruppe gibt es keinen Klickpfad (kein "Alle"-Chip, kein Wechsel-Chip).
    if (fansubOptions.length < 2) return
    const slug = groupID === null
      ? null
      : fansubOptions.find((relation) => relation.fansub_group?.id === groupID)?.fansub_group?.slug ?? null
    const params = new URLSearchParams(window.location.search)
    if (slug) params.set('fansub', slug)
    else params.delete('fansub')
    const query = params.toString()
    // D-03: window.history.pushState statt der next/navigation-Router-Helfer -- diese Route
    // ist bereits dynamisch (liest searchParams.grid_query/from) und würde damit einen
    // RSC-Refetch der Seite auslösen.
    window.history.pushState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
    setSelectedSlug(slug)
    void switchTo(slug)
  }

  return { selectedSlug, setSelectedSlug, switchState, activeFansubGroupID, updateFansubSelection, switchTo }
}
