'use client'

import { Check } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { Button, Modal } from '@/components/ui'
import { getAdminFansubAnime, getPublicFansubProfileBySlug } from '@/lib/api'
import { useFansubGroupSearch } from '@/hooks/useFansubGroupSearch'
import type { FansubGroup } from '@/types/fansub'
import type { MembershipEntry } from '@/types/contributions'

import { Step1GroupProject, Step2Role, Step3NoteRange } from './ProposalForm.steps'
import type { RoleDefinition } from './ProposalForm.steps'
import type { GroupScope } from './ProposalForm.toggles'
import { WIZARD_STEPS, useProposalFormSubmit } from './ProposalForm.useSubmit'
import type { ProposalAnimeOption, SubmittedSummary, WizardStep } from './ProposalForm.useSubmit'
import styles from './contributions.module.css'

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
}

interface ProposalFormProps {
  onSuccess: () => void
  onClose: () => void
  ownGroups: MembershipEntry[]
  /** anime_contribution-Kontext-Rollen (Step2Role) — unverändert. */
  roleDefinitions: RoleDefinition[]
  /**
   * D-12: wenn gesetzt, kennt der Wizard Zielgruppe und Projekt bereits aus dem
   * aufrufenden Seiten-Context und löst beides SYNCHRON aus dieser Prop auf -- Schritt 1
   * ("Gruppe & Projekt") wird dadurch komplett übersprungen, der Wizard startet direkt bei
   * Schritt 2 ("Rolle"). Bewusst wird dafür NICHT die Gruppensuche/Projekt-Lade-Maschinerie
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
  const [selectedAnimeId, setSelectedAnimeId] = useState<number | ''>(() => (prefill ? prefill.animeId : ''))
  const [groupAnime, setGroupAnime] = useState<ProposalAnimeOption[]>([])
  const [isLoadingGroupAnime, setIsLoadingGroupAnime] = useState(false)
  const [groupAnimeError, setGroupAnimeError] = useState<string | null>(null)
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
  // D-12: bei vorausgewähltem Einstieg ist die Zielgruppe bereits aus der Prop bekannt --
  // own/foreign-Herleitung über selectedOwnGroup/foreignGroup entfällt für diesen Pfad.
  const activeGroupId = prefill
    ? prefill.fansubGroupId
    : groupScope === 'own' ? selectedOwnGroup?.fansub_group_id : foreignGroup?.id
  const activeGroupName = prefill
    ? prefill.fansubGroupName
    : groupScope === 'own' ? selectedOwnGroup?.group_name ?? null : foreignGroup?.name ?? null
  const hasActiveGroup = activeGroupId != null

  const selectedAnime = useMemo(() => {
    if (prefill) return { id: prefill.animeId, title: prefill.animeTitle }
    return groupAnime.find((anime) => anime.id === selectedAnimeId) ?? null
  }, [prefill, groupAnime, selectedAnimeId])
  const selectedRole = useMemo(
    () => roleDefinitions.find((role) => role.code === selectedRoleCode) ?? null,
    [roleDefinitions, selectedRoleCode],
  )
  // D-12 (191-UI-SPEC.md Contract D4): bei vorausgewähltem Einstieg wird Schritt 1 nie
  // gemountet -- der Fortschrittsbalken zeigt deshalb nur die verbleibenden 2 Segmente
  // (Rolle, Hinweis & Zeitraum) statt 3, und "Schritt X von Y" zählt relativ zu dieser
  // verkürzten Liste (step 2 ⇒ Position 1, step 3 ⇒ Position 2).
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

  useEffect(() => {
    let cancelled = false

    async function loadGroupAnime() {
      // D-12: bei vorausgewähltem Einstieg ist das Projekt bereits über prefill.animeId
      // bekannt (siehe selectedAnime oben) -- hier darf keine Liste geladen und
      // selectedAnimeId darf NICHT zurückgesetzt werden, sonst würde die bereits korrekt
      // gesetzte Vorauswahl durch diesen Effekt wieder verworfen.
      if (prefill || !activeGroupId) {
        setGroupAnime([])
        if (!prefill) setSelectedAnimeId('')
        setGroupAnimeError(null)
        return
      }

      try {
        setIsLoadingGroupAnime(true)
        setGroupAnimeError(null)
        setSelectedAnimeId('')
        // D-10 (Live-UAT-Bugfix): bei "Andere Gruppe" hat der Absender keine Mitgliedschaft in
        // der Zielgruppe -- der admin-gescopte Endpunkt setzt genau diese Mitgliedschaft voraus
        // und lieferte deshalb immer 403 (live reproduziert). Die oeffentliche Profil-Quelle
        // (dieselbe, die /fansubs/<slug> fuer anonyme Besucher bedient) hat keinen
        // Mitgliedschafts-Check und zeigt exakt die oeffentlich sichtbaren Projekte der Gruppe.
        // Bei "Eigene Gruppe" bleibt der Admin-Endpunkt unveraendert, dort besteht die
        // Mitgliedschaft tatsaechlich und es gibt keinen Bug zu beheben.
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
  }, [activeGroupId, groupScope, foreignGroup, prefill])

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
        // D-12: bei vorausgewähltem Einstieg ist die Zielgruppe nur als schmales
        // PrefillTargetGroup ({id, name}) bekannt, nicht als volles FansubGroup mit Slug --
        // useProposalFormSubmit liest davon ohnehin nur .id/.name (siehe Typ-Kommentar dort).
        foreignGroup: groupScope === 'foreign'
          ? (prefill ? { id: prefill.fansubGroupId, name: prefill.fansubGroupName } : foreignGroup)
          : null,
        anime: selectedAnime,
        roleCode: selectedRoleCode,
        roleLabel: selectedRole?.label_de ?? null,
        note,
        startedYear,
        endedYear,
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
      {/* D-12: bei vorausgewähltem Einstieg ist Schritt 1 nie gemountet (step startet bei
          2) -- "Zurück" darf deshalb erst ab Schritt 3 erscheinen, nicht schon auf der
          ersten für diesen Flow sichtbaren Stufe (Schritt 2). */}
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
            // D-12 (Contract D4): gleicht die durch das Überspringen von Schritt 1
            // fehlende Orientierung aus -- nicht editierbar, reine Kontext-Angabe.
            <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>
              Du meldest einen Fehler zu {prefill.animeTitle} bei {prefill.fansubGroupName}.
            </p>
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
                showYearAndInfoPanel={true}
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
