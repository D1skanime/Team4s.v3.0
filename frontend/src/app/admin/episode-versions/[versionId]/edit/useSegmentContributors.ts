'use client'

import { useEffect, useState } from 'react'

import { getThemeSegmentContributorCandidates, setThemeSegmentContributors } from '@/lib/api/segment-contributors'
import type { AdminThemeSegment, AdminThemeSegmentContributorCandidate } from '@/types/admin'

interface UseSegmentContributorsOptions {
  animeId: number | null
  editingSegment: AdminThemeSegment | null
}

/**
 * Fetch-/Save-State fuer die "Mitwirkende am Segment"-Auswahl (Phase 156, Plan 156-14,
 * GAP-01), mirroring useSegmentOverrideHandlers's Form. Laedt Kandidaten neu, sobald sich
 * Segment oder Origin aendern; ohne Origin wird kein Request ausgeloest (deckt sich mit dem
 * Backend-Vertrag "keine Origin = keine Kandidaten"). `toggleMember` schreibt die volle,
 * neu berechnete Auswahl und uebernimmt danach IMMER die Server-Antwort als neue Wahrheit --
 * keine optimistische Annahme (T-156-30).
 */
export function useSegmentContributors({ animeId, editingSegment }: UseSegmentContributorsOptions) {
  const [candidates, setCandidates] = useState<AdminThemeSegmentContributorCandidate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const segmentId = editingSegment?.id ?? null
  const originReleaseVersionId = editingSegment?.origin_release_version_id ?? null

  useEffect(() => {
    if (!animeId || segmentId == null || originReleaseVersionId == null) {
      setCandidates([])
      setError(null)
      return
    }

    let active = true
    setIsLoading(true)
    setError(null)
    getThemeSegmentContributorCandidates(animeId, segmentId)
      .then((res) => {
        if (active) setCandidates(res.data)
      })
      .catch((err) => {
        if (!active) return
        setCandidates([])
        setError(err instanceof Error ? err.message : 'Mitwirkende konnten nicht geladen werden.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [animeId, segmentId, originReleaseVersionId])

  async function toggleMember(memberId: number, next: boolean) {
    if (!animeId || segmentId == null) return
    const newMemberIds = candidates
      .filter((candidate) => (candidate.member_id === memberId ? next : candidate.selected))
      .map((candidate) => candidate.member_id)

    setIsSaving(true)
    setError(null)
    try {
      const res = await setThemeSegmentContributors(animeId, segmentId, newMemberIds)
      setCandidates(res.contributors)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auswahl konnte nicht gespeichert werden.')
    } finally {
      setIsSaving(false)
    }
  }

  return { candidates, isLoading, isSaving, error, toggleMember }
}
