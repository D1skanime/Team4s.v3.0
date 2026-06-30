'use client'

import { Check } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { Button, FormField, Modal } from '@/components/ui'
import { ApiError, createContributionProposal, getAdminFansubAnime } from '@/lib/api'
import type { AdminFansubAnimeEntry } from '@/types/admin'
import type { MembershipEntry, ProposalFormData } from '@/types/contributions'

import { Step1GroupProject, Step2Role, Step3NoteRange } from './ProposalForm.steps'
import type { RoleDefinition } from './ProposalForm.steps'
import styles from './contributions.module.css'

export type { RoleDefinition }

interface ProposalFormProps {
  onSuccess: () => void
  onClose: () => void
  ownGroups: MembershipEntry[]
  roleDefinitions: RoleDefinition[]
}

interface SubmittedSummary {
  groupName: string
  animeTitle: string
  roleLabel: string
}

type WizardStep = 1 | 2 | 3

const FORM_ID = 'proposal-form'

const STEPS: Array<{ id: WizardStep; title: string }> = [
  { id: 1, title: 'Gruppe & Projekt' },
  { id: 2, title: 'Rolle' },
  { id: 3, title: 'Hinweis & Zeitraum' },
]

export function ProposalForm({ onSuccess, onClose, ownGroups, roleDefinitions }: ProposalFormProps) {
  const [step, setStep] = useState<WizardStep>(1)
  const [selectedGroupMemberId, setSelectedGroupMemberId] = useState<number | ''>('')
  const [selectedAnimeId, setSelectedAnimeId] = useState<number | ''>('')
  const [groupAnime, setGroupAnime] = useState<AdminFansubAnimeEntry[]>([])
  const [isLoadingGroupAnime, setIsLoadingGroupAnime] = useState(false)
  const [groupAnimeError, setGroupAnimeError] = useState<string | null>(null)
  const [selectedRoleCode, setSelectedRoleCode] = useState('')
  const [note, setNote] = useState('')
  const [startedYear, setStartedYear] = useState('')
  const [endedYear, setEndedYear] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [submittedSummary, setSubmittedSummary] = useState<SubmittedSummary | null>(null)

  const selectedGroup = useMemo(
    () => ownGroups.find((group) => group.fansub_group_member_id === selectedGroupMemberId) ?? null,
    [ownGroups, selectedGroupMemberId],
  )
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
      value: group.fansub_group_member_id,
      label: group.group_name,
      subtitle: 'Eigene Gruppe',
    })),
    [ownGroups],
  )
  const animeOptions = useMemo<Array<{ value: number; label: string; subtitle?: string }>>(
    () => groupAnime.map((anime) => ({
      value: anime.id,
      label: anime.title,
      subtitle: selectedGroup?.group_name,
    })),
    [groupAnime, selectedGroup?.group_name],
  )

  useEffect(() => {
    let cancelled = false

    async function loadGroupAnime() {
      if (!selectedGroup) {
        setGroupAnime([])
        setSelectedAnimeId('')
        setGroupAnimeError(null)
        return
      }

      try {
        setIsLoadingGroupAnime(true)
        setGroupAnimeError(null)
        setSelectedAnimeId('')
        const response = await getAdminFansubAnime(selectedGroup.fansub_group_id)
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
  }, [selectedGroup])

  function resetAndClose() {
    setStep(1)
    setSelectedGroupMemberId('')
    setSelectedAnimeId('')
    setGroupAnime([])
    setSelectedRoleCode('')
    setNote('')
    setStartedYear('')
    setEndedYear('')
    setError(null)
    setRoleError(null)
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

    if (ownGroups.length === 0) {
      setStep(1)
      setError('Für einen Hinweis brauchst du zuerst eine verifizierte Gruppenmitgliedschaft.')
      return
    }
    if (!selectedGroupMemberId || !selectedGroup) {
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

    const body: ProposalFormData = {
      fansub_group_id: selectedGroup.fansub_group_id,
      anime_id: selectedAnimeId,
      fansub_group_member_id: selectedGroup.fansub_group_member_id,
      role_codes: [selectedRoleCode],
      note: note.trim() || null,
      started_year: startedYear ? parseInt(startedYear, 10) : null,
      ended_year: endedYear ? parseInt(endedYear, 10) : null,
    }

    try {
      setIsSubmitting(true)
      await createContributionProposal(body)
      setSubmittedSummary({
        groupName: selectedGroup.group_name,
        animeTitle: selectedAnime.title,
        roleLabel: selectedRole.label_de,
      })
      onSuccess()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(err.message || 'Für diese Rolle existiert in diesem Projekt bereits ein Hinweis oder Beitrag.')
      } else {
        setError(err instanceof Error ? err.message : 'Der Vorschlag konnte nicht eingereicht werden. Bitte versuche es erneut.')
      }
    } finally {
      setIsSubmitting(false)
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
        disabled={isSubmitting || ownGroups.length === 0}
      >
        {step === 3 ? (isSubmitting ? 'Wird gesendet...' : 'Hinweis senden') : 'Weiter'}
      </Button>
    </div>
  )

  return (
    <Modal
      open={true}
      onClose={resetAndClose}
      title="Ich war in diesem Projekt dabei"
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
          <div className={styles.wizardProgress} aria-label={`Schritt ${step} von 3`}>
            <div className={styles.progressSegments} aria-hidden="true">
              {STEPS.map((item) => (
                <span
                  key={item.id}
                  className={item.id <= step ? styles.progressSegmentActive : styles.progressSegment}
                />
              ))}
            </div>
            <div className={styles.progressMeta}>
              <span>Schritt {step} von 3</span>
              <strong>{STEPS[step - 1].title}</strong>
            </div>
          </div>

          {ownGroups.length === 0 ? (
            <div role="status" className={styles.warningPanel}>
              Du brauchst zuerst eine verifizierte Mitgliedschaft in einer Fansubgruppe. Prüfe dein Profil oder bitte deine Gruppe,
              deine Mitgliedschaft zu bestätigen.
            </div>
          ) : null}
          {error ? <div role="alert" className={styles.errorPanel}>{error}</div> : null}

          <form id={FORM_ID} onSubmit={(event) => void handleSubmit(event)} className={styles.proposalForm}>
            {step === 1 ? (
              <Step1GroupProject
                ownGroups={ownGroups}
                groupOptions={groupOptions}
                animeOptions={animeOptions}
                selectedGroupMemberId={selectedGroupMemberId}
                selectedAnimeId={selectedAnimeId}
                selectedGroup={selectedGroup}
                selectedAnime={selectedAnime}
                isLoadingGroupAnime={isLoadingGroupAnime}
                groupAnime={groupAnime}
                groupAnimeError={groupAnimeError}
                onGroupChange={setSelectedGroupMemberId}
                onAnimeChange={setSelectedAnimeId}
              />
            ) : null}

            {step === 2 ? (
              <Step2Role
                roleDefinitions={roleDefinitions}
                selectedRoleCode={selectedRoleCode}
                roleError={roleError}
                ownGroups={ownGroups}
                onSelectRole={selectRole}
              />
            ) : null}

            {step === 3 ? (
              <Step3NoteRange
                note={note}
                startedYear={startedYear}
                endedYear={endedYear}
                hasInvalidYearRange={hasInvalidYearRange}
                ownGroups={ownGroups}
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
