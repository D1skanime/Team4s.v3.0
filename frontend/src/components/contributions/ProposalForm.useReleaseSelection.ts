'use client'

import { useEffect } from 'react'

import { useProposalFormReleaseOptions } from './ProposalForm.useReleaseOptions'

interface UseProposalFormReleaseSelectionParams {
  animeId: number | null
  groupId: number | null
}

/**
 * D-29/D-34: duenner Wrapper um useProposalFormReleaseOptions (Plan 191-33) fuer
 * ProposalForm.tsx's Schritt-1-Verdrahtung. Der Basis-Hook selbst setzt
 * selectedReleaseVersionId bei einem animeId-Wechsel NICHT automatisch zurueck (siehe dessen
 * Doku) -- eine zuvor gewaehlte Release-ID eines anderen Projekts darf aber NIE
 * stillschweigend an ein neu gewaehltes Projekt weitergereicht werden (Muss-Wahrheit aus
 * 191-34-PLAN.md). Dieser Wrapper erzwingt genau das, ohne ProposalForm.tsx selbst mit einem
 * weiteren Effekt zu belasten.
 */
export function useProposalFormReleaseSelection({ animeId, groupId }: UseProposalFormReleaseSelectionParams) {
  const releaseOptions = useProposalFormReleaseOptions({ animeId, groupId })

  useEffect(() => {
    releaseOptions.setSelectedReleaseVersionId(null)
  }, [animeId, releaseOptions.setSelectedReleaseVersionId])

  return releaseOptions
}
