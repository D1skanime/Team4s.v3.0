'use client'

// Trennt die reine Wizard-Zustandsmaschine (ProposalForm.tsx) von der Sende-Logik, weil die
// einzig verbleibende Hinweisart (Korrektur, D-09) je nach Gruppen-Zugehörigkeit auf ZWEI
// strukturell unterschiedliche Backend-Tabellen zielt, nicht auf einen gemeinsamen Endpunkt:
//
// 1. Ein Korrektur-Hinweis an die EIGENE Gruppe läuft unverändert über die bestehende
//    anime_contributions-Tabelle (createContributionProposal) — dieser Pfad braucht eine
//    verifizierte Mitgliedschaft (fansub_group_member_id), die die Tabelle als Pflichtfeld
//    fordert (Ist-Zustand 1, 191-CONTEXT.md). Zero Verhaltensänderung ist hier der
//    wichtigste Regressionsschutz dieses Plans.
// 2. Ein Korrektur-Hinweis an eine FREMDE Gruppe hat keine solche Mitgliedschaft und läuft
//    über die ownership-freie fansub_group_hints-Tabelle (createFansubGroupHint). Diese
//    Tabelle hat kein role_codes-Array und kein eigenes Rollenfeld — die im Rolle-Schritt
//    gewählte Rolle wird deshalb als Klartext-Kontext in die Hinweis-Notiz übernommen, statt
//    verworfen zu werden.
import { useState } from 'react'

import { ApiError, createContributionProposal, createFansubGroupHint } from '@/lib/api'
import type { MembershipEntry, ProposalFormData } from '@/types/contributions'
import type { FansubGroup } from '@/types/fansub'
import type { CreateFansubGroupHintRequest } from '@/types/fansub-group-hints'

export type GroupScope = 'own' | 'foreign'
export type WizardStep = 1 | 2 | 3

/**
 * Das Anime/Projekt-Feld des Hinweis-Formulars bezieht seine Optionen je nach `groupScope`
 * aus zwei strukturell verschiedenen Endpunkten -- dem admin-gescopten `getAdminFansubAnime`
 * (eigene Gruppe, Mitgliedschaft vorhanden) oder dem oeffentlichen `getPublicFansubProfileBySlug`
 * (fremde Gruppe, keine Mitgliedschaft, D-10). Beide Antworten liefern fachlich mehr Felder
 * (Typ, Cover etc.), das Formular braucht aber nur `id`/`title` -- dieser schmale,
 * quellen-neutrale Typ ersetzt die bisher admin-spezifische `AdminFansubAnimeEntry` als
 * gemeinsame Formular-interne Sicht, damit die UI nicht wissen muss, aus welcher Quelle eine
 * Option stammt.
 */
export type ProposalAnimeOption = { id: number; title: string }

/**
 * D-12 (Plan 191-18 Vorbereitung): die interaktive "Andere Gruppe"-Suche
 * (useFansubGroupSearch) liefert immer ein volles FansubGroup-Objekt (Slug, Status,
 * Zähler usw.), weil sie selbst aus der serverseitigen Gruppenliste stammt. Der neue
 * Vorauswahl-Einstiegspunkt (ProposalForm.tsx prefill-Prop) kennt die Zielgruppe dagegen
 * nur als schmales {id, name} aus dem aufrufenden Seiten-Context -- und lädt dafür NIE eine
 * Projektliste über das Netz, braucht also auch nie den Slug, den eine solche Suche liefern
 * würde. SubmitTarget.foreignGroup muss deshalb beide Formen annehmen können, ohne dass
 * useProposalFormSubmit mehr als .id/.name voraussetzt (sie liest nie .slug).
 */
export type PrefillTargetGroup = Pick<FansubGroup, 'id' | 'name'>

export interface SubmittedSummary {
  groupName: string
  animeTitle: string
  roleLabel: string | null
}

/** Die drei festen Wizard-Schritte (191-UI-SPEC.md Component Contract A2, D-09: keine Hinweisart-Wahl mehr). */
export const WIZARD_STEPS: Array<{ id: WizardStep; title: string }> = [
  { id: 1, title: 'Gruppe & Projekt' },
  { id: 2, title: 'Rolle' },
  { id: 3, title: 'Hinweis & Zeitraum' },
]

interface BuildHintPayloadParams {
  targetFansubGroupId: number
  relatedAnimeId: number
  /** Siehe Datei-Kommentar: fansub_group_hints hat kein eigenes Rollenfeld für Korrekturen. */
  roleLabelForNote: string | null
  note: string
  /**
   * D-20: fansub_group_hints hat ebenfalls keine Von/Bis-Jahr-Spalten (anders als
   * anime_contributions, siehe buildCorrectionOwnPayload unten) -- ein eingegebener
   * Zeitraum wird deshalb, analog zur Rolle, als "Zeitraum: ..."-Klartext in die Notiz
   * eingebettet statt ersatzlos verworfen zu werden.
   */
  startedYear?: string
  endedYear?: string
}

/** Baut aus Von-/Bis-Jahr das "Zeitraum: ..."-Notiz-Fragment (D-20) oder null, wenn beide leer sind. */
function buildYearContext(startedYear?: string, endedYear?: string): string | null {
  const from = startedYear?.trim() || ''
  const to = endedYear?.trim() || ''
  if (from && to) return `Zeitraum: ${from}–${to}`
  if (from) return `Zeitraum: ab ${from}`
  if (to) return `Zeitraum: bis ${to}`
  return null
}

/** Baut den Request-Body für createFansubGroupHint (Korrektur-Hinweis an eine fremde Gruppe). */
export function buildHintSubmitPayload(params: BuildHintPayloadParams): CreateFansubGroupHintRequest {
  const trimmedNote = params.note.trim()
  const roleContext = params.roleLabelForNote ? `Rolle: ${params.roleLabelForNote}` : null
  const yearContext = buildYearContext(params.startedYear, params.endedYear)
  const combinedNote = [roleContext, yearContext, trimmedNote].filter(Boolean).join(' — ')
  return {
    target_fansub_group_id: params.targetFansubGroupId,
    related_anime_id: params.relatedAnimeId,
    note: combinedNote || null,
  }
}

/**
 * Mappt die beiden Fehlercodes des fansub_group_hints-Endpunkts auf die verbindlichen
 * deutschen Texte aus D-04 (191-UI-SPEC.md Copywriting Contract). Gibt null für jeden
 * anderen Status zurück — der Aufrufer fällt dann auf err.message/den generischen
 * Fallbacktext zurück.
 */
export function errorMessageForHintStatus(status: number): string | null {
  if (status === 409) return 'Du hast dazu bereits einen offenen Hinweis.'
  if (status === 429) return 'Du hast heute bereits zu viele Hinweise gesendet. Versuche es morgen wieder.'
  return null
}

const GENERIC_SEND_ERROR = 'Der Hinweis konnte nicht eingereicht werden. Bitte versuche es erneut.'
const CORRECTION_CONFLICT_FALLBACK = 'Für diese Rolle existiert in diesem Projekt bereits ein Hinweis oder Beitrag.'

export interface SubmitTarget {
  groupScope: GroupScope
  ownGroup: MembershipEntry | null
  foreignGroup: FansubGroup | PrefillTargetGroup | null
  anime: ProposalAnimeOption | null
  roleCode: string
  roleLabel: string | null
  note: string
  startedYear: string
  endedYear: string
}

/** Baut exakt das heutige ProposalFormData-Payload — byte-identisch zum Vor-191-Verhalten. */
function buildCorrectionOwnPayload(target: SubmitTarget, ownGroup: MembershipEntry, anime: ProposalAnimeOption): ProposalFormData {
  return {
    fansub_group_id: ownGroup.fansub_group_id,
    anime_id: anime.id,
    fansub_group_member_id: ownGroup.fansub_group_member_id,
    role_codes: [target.roleCode],
    note: target.note.trim() || null,
    started_year: target.startedYear ? parseInt(target.startedYear, 10) : null,
    ended_year: target.endedYear ? parseInt(target.endedYear, 10) : null,
  }
}

export function useProposalFormSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(target: SubmitTarget): Promise<SubmittedSummary> {
    setError(null)
    setIsSubmitting(true)
    try {
      if (target.groupScope === 'own') {
        if (!target.ownGroup || !target.anime) throw new Error('Formularzustand unvollständig.')
        await createContributionProposal(buildCorrectionOwnPayload(target, target.ownGroup, target.anime))
        return {
          groupName: target.ownGroup.group_name,
          animeTitle: target.anime.title,
          roleLabel: target.roleLabel,
        }
      }

      if (!target.foreignGroup || !target.anime) throw new Error('Bitte wähle eine Gruppe und ein Projekt aus.')

      const payload = buildHintSubmitPayload({
        targetFansubGroupId: target.foreignGroup.id,
        relatedAnimeId: target.anime.id,
        roleLabelForNote: target.roleLabel,
        note: target.note,
        startedYear: target.startedYear,
        endedYear: target.endedYear,
      })
      await createFansubGroupHint(payload)

      return {
        groupName: target.foreignGroup.name,
        animeTitle: target.anime.title,
        roleLabel: target.roleLabel,
      }
    } catch (err) {
      if (err instanceof ApiError) {
        // Reihenfolge ist entscheidend: der unveraendert gebliebene Eigene-Gruppe-Pfad
        // (createContributionProposal) hat eine ANDERE 409-Bedeutung (Rollen-/Projekt-
        // Konflikt in anime_contributions) als der fansub_group_hints-Endpunkt (D-04(1)
        // "bereits ein offener Hinweis") -- die generische Hint-Status-Zuordnung darf den
        // Bestandspfad deshalb nicht ueberschreiben und muss erst NACH dieser Fallunterscheidung
        // greifen. groupScope==='own' impliziert hier konstruktionsbedingt den
        // Korrektur-Pfad, da es keine zweite Hinweisart mehr gibt (D-09).
        if (target.groupScope === 'own' && err.status === 409) {
          setError(err.message || CORRECTION_CONFLICT_FALLBACK)
          throw err
        }
        const mapped = errorMessageForHintStatus(err.status)
        if (mapped) {
          setError(mapped)
          throw err
        }
      }
      setError(err instanceof Error ? err.message : GENERIC_SEND_ERROR)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetError() {
    setError(null)
  }

  return { submit, isSubmitting, error, resetError }
}
