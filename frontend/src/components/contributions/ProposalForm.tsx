'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { Button, Drawer, FormField, Textarea, YearPicker } from '@/components/ui'
import { ApiError, createContributionProposal, getAdminFansubAnime } from '@/lib/api'
import type { AdminFansubAnimeEntry } from '@/types/admin'
import type { MembershipEntry, ProposalFormData } from '@/types/contributions'

import styles from './contributions.module.css'

export interface RoleDefinition {
  code: string
  label_de: string
}

interface ProposalFormProps {
  onSuccess: () => void
  onClose: () => void
  ownGroups: MembershipEntry[]
  roleDefinitions: RoleDefinition[]
}

interface ChoiceOption<T extends number | string> {
  value: T
  label: string
  subtitle?: string
}

interface ChoiceSelectProps<T extends number | string> {
  label: string
  value: T | ''
  options: ChoiceOption<T>[]
  placeholder: string
  disabled?: boolean
  loading?: boolean
  emptyLabel?: string
  onChange: (value: T | '') => void
}

interface SubmittedSummary {
  groupName: string
  animeTitle: string
  roleLabel: string
}

type WizardStep = 1 | 2 | 3

const FORM_ID = 'proposal-form'
const MIN_YEAR = 1990
const MAX_NOTE_LENGTH = 280

const STEPS: Array<{ id: WizardStep; title: string }> = [
  { id: 1, title: 'Gruppe & Projekt' },
  { id: 2, title: 'Rolle' },
  { id: 3, title: 'Hinweis & Zeitraum' },
]

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

function ChoiceSelect<T extends number | string>({
  label,
  value,
  options,
  placeholder,
  disabled = false,
  loading = false,
  emptyLabel = 'Keine Optionen verfügbar',
  onChange,
}: ChoiceSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value) ?? null
  const isDisabled = disabled || loading

  function toggleOpen() {
    if (isDisabled) return
    setOpen((current) => !current)
  }

  function selectOption(nextValue: T) {
    onChange(nextValue)
    setOpen(false)
  }

  return (
    <div className={styles.choiceSelect}>
      <button
        type="button"
        className={styles.choiceSelectTrigger}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={isDisabled}
        onClick={toggleOpen}
      >
        <span className={styles.choiceAvatar} aria-hidden="true">
          {selected ? initials(selected.label) : '?'}
        </span>
        <span className={styles.choiceSelectText}>
          <span>{loading ? 'Wird geladen' : selected?.label ?? placeholder}</span>
          {selected?.subtitle ? <small>{selected.subtitle}</small> : null}
        </span>
        <ChevronDown size={17} aria-hidden="true" />
      </button>

      {open ? (
        <div className={styles.choiceOptions} role="listbox" aria-label={label}>
          {options.length > 0 ? (
            options.map((option) => (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={styles.choiceOption}
                onClick={() => selectOption(option.value)}
              >
                <span className={styles.choiceAvatar} aria-hidden="true">
                  {initials(option.label)}
                </span>
                <span className={styles.choiceSelectText}>
                  <span>{option.label}</span>
                  {option.subtitle ? <small>{option.subtitle}</small> : null}
                </span>
              </button>
            ))
          ) : (
            <div className={styles.choiceEmpty}>{emptyLabel}</div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function ProposalForm({ onSuccess, onClose, ownGroups, roleDefinitions }: ProposalFormProps) {
  const currentYear = new Date().getFullYear()
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

  const groupOptions = useMemo<ChoiceOption<number>[]>(
    () => ownGroups.map((group) => ({
      value: group.fansub_group_member_id,
      label: group.group_name,
      subtitle: 'Eigene Gruppe',
    })),
    [ownGroups],
  )
  const animeOptions = useMemo<ChoiceOption<number>[]>(
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

  function selectRole(code: string) {
    setRoleError(null)
    setSelectedRoleCode(code)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
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
        type={step === 3 ? 'submit' : 'button'}
        form={step === 3 ? FORM_ID : undefined}
        variant="primary"
        onClick={step === 3 ? undefined : goNext}
        disabled={isSubmitting || ownGroups.length === 0}
      >
        {step === 3 ? (isSubmitting ? 'Wird gesendet...' : 'Hinweis senden') : 'Weiter'}
      </Button>
    </div>
  )

  return (
    <Drawer
      open={true}
      onClose={resetAndClose}
      title="Ich war in diesem Projekt dabei"
      description={undefined}
      variant="responsiveSheet"
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
              <div className={styles.wizardStepPanel}>
                <FormField label="Welche Gruppe soll prüfen?" required>
                  <ChoiceSelect
                    label="Welche Gruppe soll prüfen?"
                    value={selectedGroupMemberId}
                    options={groupOptions}
                    placeholder={ownGroups.length === 0 ? 'Keine verifizierte Gruppe verfügbar' : 'Gruppe auswählen'}
                    disabled={ownGroups.length === 0}
                    onChange={(value) => setSelectedGroupMemberId(value === '' ? '' : Number(value))}
                  />
                </FormField>

                <FormField
                  label="Bei welchem Anime/Projekt dieser Gruppe?"
                  error={groupAnimeError ?? undefined}
                  required
                >
                  <ChoiceSelect
                    label="Bei welchem Anime/Projekt dieser Gruppe?"
                    value={selectedAnimeId}
                    options={animeOptions}
                    placeholder={
                      !selectedGroup
                        ? 'Erst Gruppe auswählen'
                        : isLoadingGroupAnime
                          ? 'Anime/Projekte werden geladen'
                          : groupAnime.length === 0
                            ? 'Keine Anime/Projekte für diese Gruppe'
                            : 'Anime/Projekt auswählen'
                    }
                    disabled={!selectedGroup || groupAnime.length === 0}
                    loading={isLoadingGroupAnime}
                    emptyLabel="Keine Anime/Projekte für diese Gruppe"
                    onChange={(value) => setSelectedAnimeId(value === '' ? '' : Number(value))}
                  />
                </FormField>

                {selectedGroup && selectedAnime ? (
                  <div className={styles.selectionBreadcrumb} aria-label="Ausgewählter Kontext">
                    <span>{selectedGroup.group_name}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedAnime.title}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <FormField label="Welche Rolle soll geprüft werden?" error={roleError ?? undefined} required>
                <div role="radiogroup" aria-label="Rolle auswählen" className={styles.rolePicker}>
                  {roleDefinitions.map((role) => {
                    const selected = selectedRoleCode === role.code
                    return (
                      <button
                        key={role.code}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={selected ? styles.roleChoiceActive : styles.roleChoice}
                        onClick={() => selectRole(role.code)}
                        disabled={ownGroups.length === 0}
                      >
                        {selected ? <Check size={15} aria-hidden="true" /> : null}
                        <span>{role.label_de}</span>
                      </button>
                    )
                  })}
                </div>
              </FormField>
            ) : null}

            {step === 3 ? (
              <div className={styles.wizardStepPanel}>
                <FormField
                  label="Hinweis für den Gruppenleader"
                  htmlFor="proposal-note"
                  hint="Dieser Hinweis ist für die Gruppe gedacht und wird nicht als öffentlicher Profiltext angezeigt."
                >
                  <Textarea
                    id="proposal-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value.slice(0, MAX_NOTE_LENGTH))}
                    rows={4}
                    maxLength={MAX_NOTE_LENGTH}
                    placeholder="Kurze Erläuterung, z. B. welche Folgen, Releases oder Zeitraum betroffen sind."
                    disabled={ownGroups.length === 0}
                  />
                  <span className={styles.characterCounter} aria-live="polite">
                    {note.length}/{MAX_NOTE_LENGTH}
                  </span>
                </FormField>

                <div className={styles.yearFields}>
                  <FormField label="Von Jahr" htmlFor="proposal-started">
                    <YearPicker
                      id="proposal-started"
                      label="Von Jahr auswählen"
                      value={startedYear}
                      minYear={MIN_YEAR}
                      maxYear={currentYear}
                      disabled={ownGroups.length === 0}
                      onChange={setStartedYear}
                    />
                  </FormField>
                  <FormField label="Bis Jahr" htmlFor="proposal-ended">
                    <YearPicker
                      id="proposal-ended"
                      label="Bis Jahr auswählen"
                      value={endedYear}
                      minYear={MIN_YEAR}
                      maxYear={currentYear}
                      disabled={ownGroups.length === 0}
                      onChange={setEndedYear}
                    />
                  </FormField>
                </div>
                {hasInvalidYearRange ? (
                  <p className={styles.rangeHint} role="status">
                    Das Bis-Jahr darf nicht vor dem Von-Jahr liegen.
                  </p>
                ) : null}

                <div className={styles.infoPanel}>
                  Keine Reaktion nach 90 Tagen: Vorschlag kann selbst öffentlich geschaltet werden.
                </div>
              </div>
            ) : null}
          </form>
        </>
      )}
    </Drawer>
  )
}
