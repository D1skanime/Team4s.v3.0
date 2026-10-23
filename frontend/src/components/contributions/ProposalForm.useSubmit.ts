'use client'

// Trennt die reine Wizard-Zustandsmaschine (ProposalForm.tsx) von der Sende-Logik, weil
// zwei Hinweisarten/Gruppen-Konstellationen auf ZWEI strukturell unterschiedliche
// Backend-Tabellen zielen, nicht auf einen gemeinsamen Endpunkt:
//
// 1. Korrektur-Hinweis an die EIGENE Gruppe läuft unverändert über die bestehende
//    anime_contributions-Tabelle (createContributionProposal) — dieser Pfad braucht eine
//    verifizierte Mitgliedschaft (fansub_group_member_id), die die Tabelle als Pflichtfeld
//    fordert (Ist-Zustand 1, 191-CONTEXT.md). Zero Verhaltensänderung ist hier der
//    wichtigste Regressionsschutz dieses Plans.
// 2. Jede andere Kombination — Korrektur-Hinweis an eine FREMDE Gruppe oder eine
//    Mitgliedschaftsanfrage an eine beliebige Gruppe — hat KEINE solche Mitgliedschaft und
//    läuft über die neue, ownership-freie fansub_group_hints-Tabelle
//    (createFansubGroupHint, Plan 191-01/191-03). Diese Tabelle hat strukturell weder eine
//    Mitgliedschafts-Spalte noch ein role_codes-Array, nur ein einzelnes optionales
//    requested_role_code-Feld für Mitgliedschaftsanfragen (D-07) — die DB-Constraint
//    chk_fansub_group_hints_role_scope lehnt eine gesetzte Rolle bei hint_type='correction'
//    sogar mit 422 ab. Die im Rolle-Schritt gewählte Rolle wird für diesen Fall deshalb als
//    Klartext-Kontext in die Hinweis-Notiz übernommen, statt verworfen zu werden.
import { useState } from 'react'

import { ApiError, createContributionProposal, createFansubGroupHint } from '@/lib/api'
import type { AdminFansubAnimeEntry } from '@/types/admin'
import type { MembershipEntry, ProposalFormData } from '@/types/contributions'
import type { FansubGroup } from '@/types/fansub'
import type { CreateFansubGroupHintRequest } from '@/types/fansub-group-hints'

export type HintType = 'correction' | 'membership_request'
export type GroupScope = 'own' | 'foreign'
export type WizardStep = 1 | 2 | 3 | 4

export interface SubmittedSummary {
  hintType: HintType
  groupName: string
  /** null nur bei Mitgliedschaftsanfrage — dort gibt es kein Projekt (D-06b). */
  animeTitle: string | null
  /** null bei Mitgliedschaftsanfrage ohne Rollenwunsch; Anzeige „Keine bestimmte Rolle" obliegt der UI. */
  roleLabel: string | null
}

/** Schritt-Titel je Hinweisart (191-UI-SPEC.md Component Contract A2). */
export function stepsForHintType(hintType: HintType | ''): Array<{ id: WizardStep; title: string }> {
  const isCorrection = hintType === 'correction'
  return [
    { id: 1, title: 'Hinweisart' },
    { id: 2, title: isCorrection ? 'Gruppe & Projekt' : 'Gruppe' },
    { id: 3, title: 'Rolle' },
    { id: 4, title: isCorrection ? 'Hinweis & Zeitraum' : 'Hinweis' },
  ]
}

interface BuildHintPayloadParams {
  hintType: HintType
  targetFansubGroupId: number
  relatedAnimeId?: number | null
  requestedRoleCode?: string | null
  /** Siehe Datei-Kommentar: bei Korrektur gibt es kein Rollenfeld im Ziel-Endpunkt. */
  roleLabelForNote?: string | null
  note: string
}

/** Baut den Request-Body für createFansubGroupHint (Korrektur/fremde Gruppe ODER Mitgliedschaftsanfrage). */
export function buildHintSubmitPayload(params: BuildHintPayloadParams): CreateFansubGroupHintRequest {
  const trimmedNote = params.note.trim()

  if (params.hintType === 'correction') {
    const roleContext = params.roleLabelForNote ? `Rolle: ${params.roleLabelForNote}` : null
    const combinedNote = [roleContext, trimmedNote].filter(Boolean).join(' — ')
    return {
      hint_type: 'correction',
      target_fansub_group_id: params.targetFansubGroupId,
      related_anime_id: params.relatedAnimeId ?? null,
      note: combinedNote || null,
    }
  }

  return {
    hint_type: 'membership_request',
    target_fansub_group_id: params.targetFansubGroupId,
    requested_role_code: params.requestedRoleCode || null,
    note: trimmedNote || null,
  }
}

/**
 * Mappt die beiden neuen Fehlercodes des fansub_group_hints-Endpunkts auf die verbindlichen
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
  hintType: HintType
  groupScope: GroupScope
  ownGroup: MembershipEntry | null
  foreignGroup: FansubGroup | null
  /** Nur für Korrektur relevant — Mitgliedschaftsanfrage hat keinen Anime/Projekt-Schritt. */
  anime: AdminFansubAnimeEntry | null
  /** Korrektur-Rolle (anime_contribution-Kontext, Step2Role). */
  roleCode: string
  roleLabel: string | null
  /** Mitgliedschaftsanfrage-Rolle (fansub_group-Kontext, optional, D-07). */
  requestedRoleCode: string
  requestedRoleLabel: string | null
  note: string
  startedYear: string
  endedYear: string
}

/** Baut exakt das heutige ProposalFormData-Payload — byte-identisch zum Vor-191-Verhalten. */
function buildCorrectionOwnPayload(target: SubmitTarget, ownGroup: MembershipEntry, anime: AdminFansubAnimeEntry): ProposalFormData {
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
      if (target.hintType === 'correction' && target.groupScope === 'own') {
        if (!target.ownGroup || !target.anime) throw new Error('Formularzustand unvollständig.')
        await createContributionProposal(buildCorrectionOwnPayload(target, target.ownGroup, target.anime))
        return {
          hintType: 'correction',
          groupName: target.ownGroup.group_name,
          animeTitle: target.anime.title,
          roleLabel: target.roleLabel,
        }
      }

      const targetGroupId = target.groupScope === 'own' ? target.ownGroup?.fansub_group_id : target.foreignGroup?.id
      const targetGroupName = target.groupScope === 'own' ? target.ownGroup?.group_name : target.foreignGroup?.name
      if (!targetGroupId || !targetGroupName) throw new Error('Bitte wähle eine Gruppe aus.')

      const payload = buildHintSubmitPayload({
        hintType: target.hintType,
        targetFansubGroupId: targetGroupId,
        relatedAnimeId: target.anime?.id ?? null,
        requestedRoleCode: target.requestedRoleCode,
        roleLabelForNote: target.roleLabel,
        note: target.note,
      })
      await createFansubGroupHint(payload)

      return {
        hintType: target.hintType,
        groupName: targetGroupName,
        animeTitle: target.hintType === 'correction' ? target.anime?.title ?? null : null,
        roleLabel: target.hintType === 'membership_request' ? target.requestedRoleLabel : target.roleLabel,
      }
    } catch (err) {
      if (err instanceof ApiError) {
        // Reihenfolge ist entscheidend: der unveraendert gebliebene Korrektur/Eigene-Gruppe-
        // Pfad (createContributionProposal) hat eine ANDERE 409-Bedeutung (Rollen-/Projekt-
        // Konflikt in anime_contributions) als der neue fansub_group_hints-Endpunkt (D-04(1)
        // "bereits ein offener Hinweis") -- die generische Hint-Status-Zuordnung darf den
        // Bestandspfad deshalb nicht ueberschreiben und muss erst NACH dieser Fallunterscheidung
        // greifen.
        if (target.hintType === 'correction' && target.groupScope === 'own' && err.status === 409) {
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
