'use client'

import { useEffect, useState } from 'react'

import { ApiError, getGroupReleaseListCursor } from '@/lib/api'
import type { EpisodeReleaseSummary } from '@/types/group'

/**
 * D-29/D-31 (Plan 191-33): Beide Verbrauchsstellen der Release-Auswahl -- der Wizard-Schritt
 * "Gruppe & Projekt" (Plan 191-34/191-35) UND der vorausgefuellte Kontext-Einstiegspunkt
 * (ReportHintEntryPoint) -- brauchen dieselbe Datenquelle fuer "welche Releases hat dieses
 * Projekt bei dieser Gruppe": `GET /api/v1/anime/:id/group/:groupId/release-list`
 * (`getGroupReleaseListCursor`). Dieser Endpunkt ist fuer BEIDE Szenarien (eigene UND fremde
 * Gruppe) vollstaendig oeffentlich und mitgliedschaftsfrei (anders als D-10s Projektliste,
 * die je nach Mitgliedschaft zwischen Admin- und oeffentlicher Quelle wechseln muss) -- es gibt
 * hier also keinen zweiten Pfad, auf den zu verzweigen waere. Der Hook kapselt genau diesen
 * einen Aufruf samt Lade-/Fehlerzustand und der aktuell ausgewaehlten Release-Version, damit
 * keiner der beiden Konsumenten die Debounce-/Cancel-Mechanik aus `ProposalForm.tsx`s
 * `loadGroupAnime`-Effekt (dessen Stil dieser Hook uebernimmt) ein zweites Mal erfinden muss.
 */
export interface ProposalReleaseOption {
  id: number
  label: string
}

/**
 * Baut das lesbare Label fuer eine Release-Auswahl-Option -- NIE die nackte ID (D-29s
 * "lesbares Label"-Vorgabe). Format: "Episode {label} — {title} · {version}", wobei ein
 * fehlender Titel komplett entfaellt (kein "Episode 12 — null") und eine fehlende
 * Versionsangabe die " · "-Trennung mit entfernt (kein leerer Anhang).
 */
export function buildReleaseOptionLabel(release: EpisodeReleaseSummary): string {
  const hasTitle = Boolean(release.title && release.title.trim().length > 0)
  const titlePart = hasTitle
    ? `Episode ${release.episode_number_label} — ${release.title}`
    : `Episode ${release.episode_number_label}`
  const hasVersion = Boolean(release.version_label && release.version_label.trim().length > 0)
  return hasVersion ? `${titlePart} · ${release.version_label}` : titlePart
}

interface UseProposalFormReleaseOptionsParams {
  animeId: number | null
  groupId: number | null
  /** Startwert fuer selectedReleaseVersionId, Default null = "Ganzes Projekt". */
  initialReleaseVersionId?: number | null
}

interface UseProposalFormReleaseOptionsResult {
  options: ProposalReleaseOption[]
  isLoading: boolean
  error: string | null
  selectedReleaseVersionId: number | null
  setSelectedReleaseVersionId: (id: number | null) => void
  reset: () => void
}

export function useProposalFormReleaseOptions({
  animeId,
  groupId,
  initialReleaseVersionId = null,
}: UseProposalFormReleaseOptionsParams): UseProposalFormReleaseOptionsResult {
  const [options, setOptions] = useState<ProposalReleaseOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedReleaseVersionId, setSelectedReleaseVersionId] = useState<number | null>(
    initialReleaseVersionId,
  )

  useEffect(() => {
    let cancelled = false

    async function loadReleaseOptions() {
      // Ohne vollstaendiges (anime, group)-Paar gibt es keine sinnvolle Release-Liste --
      // derselbe Guard-Stil wie ProposalForm.tsx's loadGroupAnime bei fehlender activeGroupId.
      if (animeId == null || groupId == null) {
        setOptions([])
        setError(null)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        // Ein einziger Aufruf mit limit=100 deckt jedes realistische Fansub-Projekt ab --
        // keine Cursor-Folgelogik fuer eine Dropdown-Liste (siehe PLAN.md <interfaces>).
        const response = await getGroupReleaseListCursor(animeId, groupId, {
          limit: 100,
          sort: 'release_date',
        })
        if (cancelled) return
        setOptions(
          response.items.map((release) => ({
            id: release.id,
            label: buildReleaseOptionLabel(release),
          })),
        )
      } catch (loadError) {
        if (!cancelled) {
          setOptions([])
          setError(
            loadError instanceof ApiError
              ? `(${loadError.status}) ${loadError.message}`
              : 'Releases konnten nicht geladen werden.',
          )
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadReleaseOptions()
    return () => {
      cancelled = true
    }
  }, [animeId, groupId])

  function reset() {
    setSelectedReleaseVersionId(null)
    setOptions([])
    setError(null)
  }

  return {
    options,
    isLoading,
    error,
    selectedReleaseVersionId,
    setSelectedReleaseVersionId,
    reset,
  }
}
