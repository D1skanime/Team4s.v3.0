'use client'

import { Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { Button, Modal } from '@/components/ui'
import { useFansubGroupSearch } from '@/hooks/useFansubGroupSearch'
import type { FansubGroup } from '@/types/fansub'
import type { MembershipEntry } from '@/types/contributions'

import { ProposalReleaseSelect } from './ProposalReleaseSelect'
import { Step1GroupProject, Step2Role, Step3NoteRange } from './ProposalForm.steps'
import type { RoleDefinition } from './ProposalForm.steps'
import type { GroupScope } from './ProposalForm.toggles'
import { useProposalFormGroupAnime } from './ProposalForm.useGroupAnime'
import { useProposalFormReleaseSelection } from './ProposalForm.useReleaseSelection'
import { WIZARD_STEPS, useProposalFormSubmit } from './ProposalForm.useSubmit'
import type { SubmittedSummary, WizardStep } from './ProposalForm.useSubmit'
import styles from './ProposalForm.module.css'

export type { RoleDefinition }

/**
 * D-12 (Plan 191-18 Vorbereitung): Nutzlast des zweiten, kontextuellen Formular-Einstiegs
 * (z. B. "Fehler melden" auf einer öffentlichen Projekt-/Release-Seite). Die aufrufende Seite
 * kennt Zielgruppe und Projekt bereits aus bereits geladenen, bereits autorisierten
 * Seitendaten -- der eigentliche Submit bleibt trotzdem unverändert serverseitig
 * eigenständig validiert (siehe threat_model T-191-24 des Plans).
 */
export interface ProposalFormPrefill {
  fansubGroupId: number
  fansubGroupName: string
  animeId: number
  animeTitle: string
  /**
   * D-30 (Plan 191-35): optionale Release-Vorauswahl, wenn der Kontext-Einstieg von einer
   * konkreten Release-Seite kommt (siehe ReleaseDetailHero.tsx). Bleibt wie jede andere
   * Formular-Eingabe ueber ProposalReleaseSelect aenderbar -- keine feste Server-Vorgabe,
   * der Submit wird unabhaengig davon serverseitig re-validiert (threat_model T-191-45).
   */
  relatedReleaseVersionId?: number
  /**
   * Lesbares Label fuer genau diese Release-ID, synchron aus dem Seiten-Context bekannt --
   * erspart dem Kontext-Satz das Warten auf den Options-Request, nur um die aktuell
   * ausgewaehlte Release korrekt zu benennen.
   */
  relatedReleaseLabel?: string
}

interface ProposalFormProps {
  onSuccess: () => void
  onClose: () => void
  ownGroups: MembershipEntry[]
  /** anime_contribution-Kontext-Rollen (Step2Role) — unverändert. */
  roleDefinitions: RoleDefinition[]
  /**
   * Wenn gesetzt, kennt der Wizard Zielgruppe und Projekt bereits aus dem
   * aufrufenden Seiten-Context und löst beides SYNCHRON aus dieser Prop auf -- Schritt 1
   * ("Gruppe & Projekt") wird dadurch komplett übersprungen, der Wizard startet direkt bei
   * Schritt 2 ("Rolle") (D-12). Bewusst wird dafür NICHT die Gruppensuche/Projekt-Lade-Maschinerie
   * der interaktiven Auswahl (foreignSearch/loadGroupAnime) angestoßen: diese bräuchte bei
   * einer Fremdgruppe einen Slug (getPublicFansubProfileBySlug, D-10), den dieser
   * Einstiegspunkt nicht hat und auch nicht braucht, weil das Projekt bereits bekannt ist.
   */
  prefill?: ProposalFormPrefill
}

const FORM_ID = 'proposal-form'

export function ProposalForm({ onSuccess, onClose, ownGroups, roleDefinitions, prefill }: ProposalFormProps) {
  const [step, setStep] = useState<WizardStep>(() => (prefill ? 2 : 1))
  const [groupScope, setGroupScope] = useState<GroupScope>(() => {
    if (!prefill) return 'own'
    const matchesOwnGroup = ownGroups.some((group) => group.fansub_group_id === prefill.fansubGroupId)
    return matchesOwnGroup ? 'own' : 'foreign'
  })
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>(() => {
    if (!prefill) return ''
    const match = ownGroups.find((group) => group.fansub_group_id === prefill.fansubGroupId)
    return match ? match.fansub_group_id : ''
  })
  const [foreignGroup, setForeignGroup] = useState<FansubGroup | null>(null)
  const [selectedRoleCode, setSelectedRoleCode] = useState('')
  const [note, setNote] = useState('')
  const [startedYear, setStartedYear] = useState('')
  const [endedYear, setEndedYear] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)

  const { submit: submitHint, isSubmitting, error: submitError, resetError } = useProposalFormSubmit()
  const [submittedSummary, setSubmittedSummary] = useState<SubmittedSummary | null>(null)

  const displayError = error ?? submitError

  const selectedOwnGroup = useMemo(
    () => ownGroups.find((group) => group.fansub_group_id === selectedGroupId) ?? null,
    [ownGroups, selectedGroupId],
  )
  // Bei vorausgewähltem Einstieg ist die Zielgruppe bereits aus der Prop bekannt --
  // own/foreign-Herleitung über selectedOwnGroup/foreignGroup entfällt für diesen Pfad (D-12).
  const activeGroupId = prefill
    ? prefill.fansubGroupId
    : groupScope === 'own' ? selectedOwnGroup?.fansub_group_id : foreignGroup?.id
  const activeGroupName = prefill
    ? prefill.fansubGroupName
    : groupScope === 'own' ? selectedOwnGroup?.group_name ?? null : foreignGroup?.name ?? null
  const hasActiveGroup = activeGroupId != null

  const { selectedAnimeId, setSelectedAnimeId, groupAnime, setGroupAnime, isLoadingGroupAnime, groupAnimeError } =
    useProposalFormGroupAnime({
      activeGroupId,
      groupScope,
      foreignGroup,
      hasPrefill: Boolean(prefill),
      initialAnimeId: prefill ? prefill.animeId : '',
    })

  // D-29/D-34 + D-30 (Plan 191-35): optionale Release-Einschraenkung, fuer own/foreign UND fuer
  // den interaktiven Schritt 1 wie auch den vorausgefuellten Kontext-Einstieg identisch ueber
  // denselben geteilten Hook (Plan 191-33) bedient. Beim Kontext-Einstieg (prefill) sind Projekt
  // UND Gruppe schon aus der Prop bekannt -- die Releaseliste wird deshalb synchron aus
  // prefill.animeId/prefill.fansubGroupId geladen (statt wie in Schritt 1 erst nach einer
  // Nutzerwahl), inklusive einer moeglichen Vorauswahl ueber initialReleaseVersionId.
  const releaseSelection = useProposalFormReleaseSelection({
    animeId: prefill ? prefill.animeId : selectedAnimeId === '' ? null : selectedAnimeId,
    groupId: prefill ? prefill.fansubGroupId : activeGroupId ?? null,
    initialReleaseVersionId: prefill?.relatedReleaseVersionId ?? null,
  })

  const selectedAnime = useMemo(() => {
    if (prefill) return { id: prefill.animeId, title: prefill.animeTitle }
    return groupAnime.find((anime) => anime.id === selectedAnimeId) ?? null
  }, [prefill, groupAnime, selectedAnimeId])
  const selectedRole = useMemo(
    () => roleDefinitions.find((role) => role.code === selectedRoleCode) ?? null,
    [roleDefinitions, selectedRoleCode],
  )
  // Bei vorausgewähltem Einstieg wird Schritt 1 nie
  // gemountet -- der Fortschrittsbalken zeigt deshalb nur die verbleibenden 2 Segmente
  // (Rolle, Hinweis & Zeitraum) statt 3, und "Schritt X von Y" zählt relativ zu dieser
  // verkürzten Liste (step 2 ⇒ Position 1, step 3 ⇒ Position 2) (D-12, 191-UI-SPEC.md Contract D4).
  const visibleSteps = useMemo(() => (prefill ? WIZARD_STEPS.slice(1) : WIZARD_STEPS), [prefill])
  const progressPosition = prefill ? step - 1 : step
  const progressTotal = visibleSteps.length

  const hasInvalidYearRange = useMemo(() => {
    if (!startedYear || !endedYear) return false
    return parseInt(endedYear, 10) < parseInt(startedYear, 10)
  }, [endedYear, startedYear])

  const groupOptions = useMemo<Array<{ value: number; label: string; subtitle?: string }>>(
    () => ownGroups.map((group) => ({
      value: group.fansub_group_id,
      label: group.group_name,
      subtitle: 'Eigene Gruppe',
    })),
    [ownGroups],
  )
  const animeOptions = useMemo<Array<{ value: number; label: string; subtitle?: string }>>(
    () => groupAnime.map((anime) => ({
      value: anime.id,
      label: anime.title,
      subtitle: activeGroupName ?? undefined,
    })),
    [groupAnime, activeGroupName],
  )

  // excludeIds muss referenzstabil sein, sonst laeuft useFansubGroupSearch's Debounce bei
  // jedem Render neu an (siehe Hook-Doku) -- eigene Gruppen sind aus der Fremd-Suche
  // ausgeschlossen, weil dieser Pfad fuer "Eigene Gruppe" bereits existiert (191-UI-SPEC.md A3).
  const excludeOwnGroupIds = useMemo(() => ownGroups.map((group) => group.fansub_group_id), [ownGroups])
  const foreignSearch = useFansubGroupSearch({ excludeIds: excludeOwnGroupIds })

  function resetAndClose() {
    setStep(1)
    setGroupScope('own')
    setSelectedGroupId('')
    setForeignGroup(null)
    foreignSearch.setQuery('')
    setSelectedAnimeId('')
    setGroupAnime([])
    setSelectedRoleCode('')
    setNote('')
    setStartedYear('')
    setEndedYear('')
    setError(null)
    setRoleError(null)
    resetError()
    releaseSelection.reset()
    setSubmittedSummary(null)
    onClose()
  }

  function goNext() {
    setError(null)
    setRoleError(null)
    setStep((current) => (current < 3 ? (current + 1) as WizardStep : current))
  }

  function goBack() {
    setError(null)
    setRoleError(null)
    setStep((current) => (current > 1 ? (current - 1) as WizardStep : current))
  }

  function requestFinalSubmit() {
    void submitProposal()
  }

  function selectGroupScope(scope: GroupScope) {
    setGroupScope(scope)
    setSelectedGroupId('')
    setForeignGroup(null)
    foreignSearch.setQuery('')
  }

  function pickForeignGroup(group: FansubGroup) {
    setForeignGroup(group)
    foreignSearch.addGroup(group)
  }

  function selectRole(code: string) {
    setRoleError(null)
    setSelectedRoleCode(code)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await submitProposal()
  }

  async function submitProposal() {
    setError(null)
    setRoleError(null)
    resetError()

    if (!hasActiveGroup) {
      setStep(1)
      setError('Bitte wähle eine Gruppe aus.')
      return
    }
    if (!selectedAnimeId || !selectedAnime) {
      setStep(1)
      setError('Bitte wähle ein Anime/Projekt dieser Gruppe aus.')
      return
    }
    if (!selectedRoleCode || !selectedRole) {
      setStep(2)
      setRoleError('Bitte wähle eine Rolle aus.')
      return
    }
    if (hasInvalidYearRange) {
      setStep(3)
      return
    }

    try {
      const summary = await submitHint({
        groupScope,
        ownGroup: groupScope === 'own' ? selectedOwnGroup : null,
        // Bei vorausgewähltem Einstieg ist die Zielgruppe nur als schmales
        // PrefillTargetGroup ({id, name}) bekannt, nicht als volles FansubGroup mit Slug --
        // useProposalFormSubmit liest davon ohnehin nur .id/.name (siehe Typ-Kommentar dort) (D-12).
        foreignGroup: groupScope === 'foreign'
          ? (prefill ? { id: prefill.fansubGroupId, name: prefill.fansubGroupName } : foreignGroup)
          : null,
        anime: selectedAnime,
        roleCode: selectedRoleCode,
        roleLabel: selectedRole?.label_de ?? null,
        note,
        startedYear,
        endedYear,
        releaseVersionId: releaseSelection.selectedReleaseVersionId,
      })
      setSubmittedSummary(summary)
      onSuccess()
    } catch {
      // Fehlertext ist bereits im Hook gesetzt (409/429-Mapping, Konfliktfall oder
      // generischer Fallback) -- hier nichts weiter zu tun, displayError rendert ihn.
    }
  }

  const footer = submittedSummary ? (
    <div className={styles.wizardFooterActionsEnd}>
      <Button type="button" variant="primary" onClick={resetAndClose}>
        Fertig
      </Button>
    </div>
  ) : (
    <div className={styles.wizardFooterActions}>
      {/* Bei vorausgewähltem Einstieg ist Schritt 1 nie gemountet (step startet bei
          2) -- "Zurück" darf deshalb erst ab Schritt 3 erscheinen, nicht schon auf der
          ersten für diesen Flow sichtbaren Stufe (Schritt 2) (D-12). */}
      {(prefill ? step > 2 : step > 1) ? (
        <Button type="button" variant="secondary" onClick={goBack}>
          Zurück
        </Button>
      ) : null}
      <Button
        type="button"
        variant="primary"
        onClick={step === 3 ? requestFinalSubmit : goNext}
        disabled={isSubmitting}
      >
        {step === 3 ? (isSubmitting ? 'Wird gesendet...' : 'Hinweis senden') : 'Weiter'}
      </Button>
    </div>
  )

  return (
    <Modal
      open={true}
      onClose={resetAndClose}
      title="Hinweis an eine Fansub-Gruppe senden"
      description={undefined}
      footer={footer}
    >
      {submittedSummary ? (
        <div className={styles.proposalSuccessView} role="status">
          <span className={styles.successIcon} aria-hidden="true">
            <Check size={22} />
          </span>
          <div>
            <h4>Hinweis gesendet</h4>
            <p>Dein Hinweis wurde an die Gruppe zur Prüfung übermittelt.</p>
          </div>
          <dl className={styles.successSummary}>
            <div>
              <dt>Gruppe</dt>
              <dd>{submittedSummary.groupName}</dd>
            </div>
            <div>
              <dt>Projekt</dt>
              <dd>{submittedSummary.animeTitle}</dd>
            </div>
            <div>
              <dt>Rolle</dt>
              <dd>{submittedSummary.roleLabel}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <>
          {prefill ? (
            <>
              {/* Gleicht die durch das Überspringen von Schritt 1 fehlende Orientierung aus --
                  reiner Kontext-Satz, nennt zusätzlich die Release, falls der Einstieg von
                  einer konkreten Release-Seite kam (D-12/D-30, Contract D4). */}
              <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>
                {`Du meldest einen Fehler zu ${prefill.animeTitle} bei ${prefill.fansubGroupName}` +
                  (prefill.relatedReleaseLabel ? ` — Release: ${prefill.relatedReleaseLabel}` : '') + '.'}
              </p>
              {/* Anders als der reine Kontext-Satz BLEIBT die Release-Auswahl änderbar -- Schritt
                  1 (wo dieselbe Komponente im interaktiven Flow sitzt) ist hier nie gemountet,
                  das ist deshalb die einzige Stelle, an der dieser Kontrolltyp im
                  vorausgefüllten Flow leben kann (D-30, Plan 191-35). */}
              <ProposalReleaseSelect
                options={releaseSelection.options}
                selectedReleaseVersionId={releaseSelection.selectedReleaseVersionId}
                isLoading={releaseSelection.isLoading}
                error={releaseSelection.error}
                onChange={releaseSelection.setSelectedReleaseVersionId}
              />
            </>
          ) : null}

          <div className={styles.wizardProgress} aria-label={`Schritt ${progressPosition} von ${progressTotal}`}>
            <div
              className={styles.progressSegments}
              aria-hidden="true"
              style={{ gridTemplateColumns: `repeat(${visibleSteps.length}, minmax(0, 1fr))` }}
            >
              {visibleSteps.map((item) => (
                <span
                  key={item.id}
                  className={item.id <= step ? styles.progressSegmentActive : styles.progressSegment}
                />
              ))}
            </div>
            <div className={styles.progressMeta}>
              <span>Schritt {progressPosition} von {progressTotal}</span>
              <strong>{WIZARD_STEPS[step - 1].title}</strong>
            </div>
          </div>

          {displayError ? <div role="alert" className={styles.errorPanel}>{displayError}</div> : null}

          <form id={FORM_ID} onSubmit={(event) => void handleSubmit(event)} className={styles.proposalForm}>
            {step === 1 ? (
              <Step1GroupProject
                groupScope={groupScope}
                onGroupScopeChange={selectGroupScope}
                ownGroups={ownGroups}
                groupOptions={groupOptions}
                selectedGroupId={selectedGroupId}
                onGroupChange={setSelectedGroupId}
                foreignQuery={foreignSearch.query}
                onForeignQueryChange={foreignSearch.setQuery}
                foreignResults={foreignSearch.results}
                isSearchingForeign={foreignSearch.isSearching}
                foreignSearchMessage={foreignSearch.message}
                onForeignGroupPick={pickForeignGroup}
                activeGroupName={activeGroupName}
                hasActiveGroup={hasActiveGroup}
                animeOptions={animeOptions}
                selectedAnimeId={selectedAnimeId}
                selectedAnime={selectedAnime}
                isLoadingGroupAnime={isLoadingGroupAnime}
                groupAnime={groupAnime}
                groupAnimeError={groupAnimeError}
                onAnimeChange={setSelectedAnimeId}
                releaseOptions={releaseSelection.options}
                selectedReleaseVersionId={releaseSelection.selectedReleaseVersionId}
                isLoadingReleases={releaseSelection.isLoading}
                releaseError={releaseSelection.error}
                onReleaseChange={releaseSelection.setSelectedReleaseVersionId}
              />
            ) : null}

            {step === 2 ? (
              <Step2Role
                roleDefinitions={roleDefinitions}
                selectedRoleCode={selectedRoleCode}
                roleError={roleError}
                onSelectRole={selectRole}
              />
            ) : null}

            {step === 3 ? (
              <Step3NoteRange
                note={note}
                startedYear={startedYear}
                endedYear={endedYear}
                hasInvalidYearRange={hasInvalidYearRange}
                groupScope={groupScope}
                onNoteChange={setNote}
                onStartedYearChange={setStartedYear}
                onEndedYearChange={setEndedYear}
              />
            ) : null}
          </form>
        </>
      )}
    </Modal>
  )
}
