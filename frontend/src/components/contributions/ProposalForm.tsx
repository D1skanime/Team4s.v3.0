'use client'

import { Check } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { Button, Modal } from '@/components/ui'
import { getAdminFansubAnime } from '@/lib/api'
import { useFansubGroupSearch } from '@/hooks/useFansubGroupSearch'
import type { AdminFansubAnimeEntry } from '@/types/admin'
import type { FansubGroup } from '@/types/fansub'
import type { MembershipEntry } from '@/types/contributions'

import { Step1GroupProject, Step2Role, Step3NoteRange } from './ProposalForm.steps'
import type { RoleDefinition } from './ProposalForm.steps'
import type { GroupScope } from './ProposalForm.toggles'
import { WIZARD_STEPS, useProposalFormSubmit } from './ProposalForm.useSubmit'
import type { SubmittedSummary, WizardStep } from './ProposalForm.useSubmit'
import styles from './contributions.module.css'

export type { RoleDefinition }

interface ProposalFormProps {
  onSuccess: () => void
  onClose: () => void
  ownGroups: MembershipEntry[]
  /** anime_contribution-Kontext-Rollen (Step2Role) — unverändert. */
  roleDefinitions: RoleDefinition[]
}

const FORM_ID = 'proposal-form'

export function ProposalForm({ onSuccess, onClose, ownGroups, roleDefinitions }: ProposalFormProps) {
  const [step, setStep] = useState<WizardStep>(1)
  const [groupScope, setGroupScope] = useState<GroupScope>('own')
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('')
  const [foreignGroup, setForeignGroup] = useState<FansubGroup | null>(null)
  const [selectedAnimeId, setSelectedAnimeId] = useState<number | ''>('')
  const [groupAnime, setGroupAnime] = useState<AdminFansubAnimeEntry[]>([])
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
  const activeGroupId = groupScope === 'own' ? selectedOwnGroup?.fansub_group_id : foreignGroup?.id
  const activeGroupName = groupScope === 'own' ? selectedOwnGroup?.group_name ?? null : foreignGroup?.name ?? null
  const hasActiveGroup = activeGroupId != null

  const selectedAnime = useMemo(
    () => groupAnime.find((anime) => anime.id === selectedAnimeId) ?? null,
    [groupAnime, selectedAnimeId],
  )
  const selectedRole = useMemo(
    () => roleDefinitions.find((role) => role.code === selectedRoleCode) ?? null,
    [roleDefinitions, selectedRoleCode],
  )
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
      if (!activeGroupId) {
        setGroupAnime([])
        setSelectedAnimeId('')
        setGroupAnimeError(null)
        return
      }

      try {
        setIsLoadingGroupAnime(true)
        setGroupAnimeError(null)
        setSelectedAnimeId('')
        const response = await getAdminFansubAnime(activeGroupId)
        if (!cancelled) setGroupAnime(response.data)
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
  }, [activeGroupId])

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
        foreignGroup: groupScope === 'foreign' ? foreignGroup : null,
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
      {step > 1 ? (
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
          <div className={styles.wizardProgress} aria-label={`Schritt ${step} von ${WIZARD_STEPS.length}`}>
            <div className={styles.progressSegments} aria-hidden="true">
              {WIZARD_STEPS.map((item) => (
                <span
                  key={item.id}
                  className={item.id <= step ? styles.progressSegmentActive : styles.progressSegment}
                />
              ))}
            </div>
            <div className={styles.progressMeta}>
              <span>Schritt {step} von {WIZARD_STEPS.length}</span>
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
                foreignGroup={foreignGroup}
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
