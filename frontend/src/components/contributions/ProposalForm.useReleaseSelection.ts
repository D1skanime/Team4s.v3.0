'use client'

import { useEffect, useRef } from 'react'

import { useProposalFormReleaseOptions } from './ProposalForm.useReleaseOptions'

interface UseProposalFormReleaseSelectionParams {
  animeId: number | null
  groupId: number | null
  /**
   * Startwert fuer selectedReleaseVersionId beim allerersten Laden -- z. B. die per
   * Kontext-Einstieg vorausgewaehlte Release-ID (D-30, Plan 191-35). Default null =
   * "Ganzes Projekt", wie bisher fuer den interaktiven Schritt-1-Flow.
   */
  initialReleaseVersionId?: number | null
}

/**
 * D-29/D-34: duenner Wrapper um useProposalFormReleaseOptions (Plan 191-33) fuer
 * ProposalForm.tsx's Schritt-1-Verdrahtung UND (D-30, Plan 191-35) den vorausgefuellten
 * Kontext-Einstieg. Der Basis-Hook selbst setzt selectedReleaseVersionId bei einem
 * animeId-Wechsel NICHT automatisch zurueck (siehe dessen Doku) -- eine zuvor gewaehlte
 * Release-ID eines anderen Projekts darf aber NIE stillschweigend an ein neu gewaehltes
 * Projekt weitergereicht werden (Muss-Wahrheit aus 191-34-PLAN.md). Dieser Wrapper erzwingt
 * genau das, ohne ProposalForm.tsx selbst mit einem weiteren Effekt zu belasten.
 *
 * Wichtig: der Reset darf nur bei einer ECHTEN AENDERUNG von animeId greifen, nicht beim
 * allerersten Mount -- sonst wuerde eine ueber initialReleaseVersionId vorausgewaehlte
 * Release-ID (D-30) im selben Tick wieder auf null zurueckgesetzt, bevor sie je sichtbar
 * wird. Ein Ref merkt sich dafuer den zuletzt gesehenen animeId.
 */
export function useProposalFormReleaseSelection({
  animeId,
  groupId,
  initialReleaseVersionId = null,
}: UseProposalFormReleaseSelectionParams) {
  const releaseOptions = useProposalFormReleaseOptions({ animeId, groupId, initialReleaseVersionId })
  const previousAnimeIdRef = useRef(animeId)

  useEffect(() => {
    if (previousAnimeIdRef.current !== animeId) {
      releaseOptions.setSelectedReleaseVersionId(null)
    }
    previousAnimeIdRef.current = animeId
  }, [animeId, releaseOptions.setSelectedReleaseVersionId])

  return releaseOptions
}
