'use client'

import { useEffect, useState } from 'react'

import { getAdminFansubAnime, getPublicFansubProfileBySlug } from '@/lib/api'
import type { FansubGroup } from '@/types/fansub'

import type { GroupScope } from './ProposalForm.toggles'
import type { ProposalAnimeOption } from './ProposalForm.useSubmit'

interface UseProposalFormGroupAnimeParams {
  activeGroupId: number | undefined
  groupScope: GroupScope
  foreignGroup: FansubGroup | null
  /** Bei einem vorausgewählten Einstieg (D-12) ist das Projekt bereits bekannt -- dieser Hook
   * laedt dann nichts und resettet selectedAnimeId nicht (siehe Verwendungsstelle). */
  hasPrefill: boolean
  initialAnimeId: number | ''
}

/**
 * Kapselt die Anime/Projekt-Auswahl des Hinweis-Wizards: welches Projekt gerade ausgewaehlt
 * ist (selectedAnimeId) UND die dazu passende, je nach groupScope aus zwei verschiedenen
 * Quellen stammende Projektliste (D-10 -- admin-gescopter Endpunkt bei "Eigene Gruppe",
 * oeffentliche Profil-Quelle ohne Mitgliedschafts-Check bei "Andere Gruppe"). Ausgelagert aus
 * ProposalForm.tsx, damit diese Datei beim Hinzufuegen der Release-Auswahl (D-29/D-34) nicht
 * das 450-Zeilen-Limit reisst -- reine Verschiebung, kein Verhaltensunterschied.
 */
export function useProposalFormGroupAnime({
  activeGroupId,
  groupScope,
  foreignGroup,
  hasPrefill,
  initialAnimeId,
}: UseProposalFormGroupAnimeParams) {
  const [selectedAnimeId, setSelectedAnimeId] = useState<number | ''>(initialAnimeId)
  const [groupAnime, setGroupAnime] = useState<ProposalAnimeOption[]>([])
  const [isLoadingGroupAnime, setIsLoadingGroupAnime] = useState(false)
  const [groupAnimeError, setGroupAnimeError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadGroupAnime() {
      // Bei vorausgewähltem Einstieg ist das Projekt bereits über initialAnimeId bekannt --
      // hier darf keine Liste geladen und selectedAnimeId darf NICHT zurückgesetzt werden,
      // sonst würde die bereits korrekt gesetzte Vorauswahl verworfen (D-12).
      if (hasPrefill || !activeGroupId) {
        setGroupAnime([])
        if (!hasPrefill) setSelectedAnimeId('')
        setGroupAnimeError(null)
        return
      }

      try {
        setIsLoadingGroupAnime(true)
        setGroupAnimeError(null)
        setSelectedAnimeId('')
        // Bei "Andere Gruppe" hat der Absender keine Mitgliedschaft in der Zielgruppe -- der
        // admin-gescopte Endpunkt setzt genau diese Mitgliedschaft voraus und liefert ohne sie
        // 403 (D-10). Die oeffentliche Profil-Quelle (dieselbe, die /fansubs/<slug> fuer anonyme
        // Besucher bedient) hat keinen Mitgliedschafts-Check. Bei "Eigene Gruppe" bleibt der
        // Admin-Endpunkt unveraendert, dort besteht die Mitgliedschaft tatsaechlich.
        if (groupScope === 'foreign') {
          if (!foreignGroup) {
            if (!cancelled) setGroupAnime([])
            return
          }
          const response = await getPublicFansubProfileBySlug(foreignGroup.slug)
          if (!cancelled) {
            setGroupAnime(response.data.projects.map((project) => ({ id: project.id, title: project.title })))
          }
        } else {
          const response = await getAdminFansubAnime(activeGroupId)
          if (!cancelled) setGroupAnime(response.data)
        }
      } catch (loadError) {
        if (!cancelled) {
          setGroupAnime([])
          setGroupAnimeError(loadError instanceof Error ? loadError.message : 'Anime/Projekte konnten nicht geladen werden.')
        }
      } finally {
        if (!cancelled) setIsLoadingGroupAnime(false)
      }
    }

    void loadGroupAnime()
    return () => {
      cancelled = true
    }
  }, [activeGroupId, groupScope, foreignGroup, hasPrefill])

  return { selectedAnimeId, setSelectedAnimeId, groupAnime, setGroupAnime, isLoadingGroupAnime, groupAnimeError }
}
