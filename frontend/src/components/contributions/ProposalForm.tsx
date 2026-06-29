'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { Button, FormField, Modal, Select, Textarea, YearPicker } from '@/components/ui'
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

type ContributionScope = 'project'

const FORM_ID = 'proposal-form'
const MIN_YEAR = 1990

export function ProposalForm({ onSuccess, onClose, ownGroups, roleDefinitions }: ProposalFormProps) {
  const currentYear = new Date().getFullYear()
  const [scope, setScope] = useState<ContributionScope | ''>('')
  const [selectedGroupMemberId, setSelectedGroupMemberId] = useState<number | ''>('')
  const [selectedAnimeId, setSelectedAnimeId] = useState<number | ''>('')
  const [groupAnime, setGroupAnime] = useState<AdminFansubAnimeEntry[]>([])
  const [isLoadingGroupAnime, setIsLoadingGroupAnime] = useState(false)
  const [groupAnimeError, setGroupAnimeError] = useState<string | null>(null)
  const [selectedRoleCodes, setSelectedRoleCodes] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [startedYear, setStartedYear] = useState('')
  const [endedYear, setEndedYear] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scopeError, setScopeError] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)

  const selectedGroup = useMemo(
    () => ownGroups.find((group) => group.fansub_group_member_id === selectedGroupMemberId) ?? null,
    [ownGroups, selectedGroupMemberId],
  )
  const selectedAnime = useMemo(
    () => groupAnime.find((anime) => anime.id === selectedAnimeId) ?? null,
    [groupAnime, selectedAnimeId],
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

  function toggleRole(code: string) {
    setRoleError(null)
    setSelectedRoleCodes((prev) => prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code])
  }

  function selectProjectScope() {
    setScope('project')
    setScopeError(null)
    setError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setScopeError(null)
    setRoleError(null)

    if (ownGroups.length === 0) {
      setError('Für einen Hinweis brauchst du zuerst eine verifizierte Gruppenmitgliedschaft.')
      return
    }
    if (!scope) {
      setScopeError('Bitte wähle zuerst, welchen Projektkontext der Hinweis hat.')
      return
    }
    if (selectedRoleCodes.length === 0) {
      setRoleError('Bitte wähle mindestens eine Rolle aus.')
      return
    }
    if (!selectedAnimeId) {
      setError('Bitte wähle ein Anime/Projekt dieser Gruppe aus.')
      return
    }
    if (!selectedGroupMemberId) {
      setError('Bitte wähle eine Gruppe aus.')
      return
    }
    if (!selectedGroup) {
      setError('Ungültige Gruppenauswahl.')
      return
    }

    const body: ProposalFormData = {
      fansub_group_id: selectedGroup.fansub_group_id,
      anime_id: selectedAnimeId,
      fansub_group_member_id: selectedGroup.fansub_group_member_id,
      role_codes: selectedRoleCodes,
      note: note.trim() || null,
      started_year: startedYear ? parseInt(startedYear, 10) : null,
      ended_year: endedYear ? parseInt(endedYear, 10) : null,
    }

    try {
      setIsSubmitting(true)
      await createContributionProposal(body)
      onSuccess()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Für diese Kombination aus Gruppe, Projekt und deiner Identität existiert bereits ein Hinweis.')
      } else {
        setError(err instanceof Error ? err.message : 'Der Vorschlag konnte nicht eingereicht werden. Bitte versuche es erneut.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const footer = (
    <div className={styles.modalFooterActionsBetween}>
      <Button type="button" variant="secondary" onClick={onClose}>
        Abbrechen
      </Button>
      <Button
        type="submit"
        form={FORM_ID}
        variant="primary"
        disabled={isSubmitting || ownGroups.length === 0}
      >
        {isSubmitting ? 'Wird gesendet...' : 'Hinweis senden'}
      </Button>
    </div>
  )

  return (
    <Modal open={true} onClose={onClose} title="Ich war in diesem Projekt dabei" footer={footer}>
      <div className={styles.infoPanel}>
        Der Hinweis geht zur Prüfung an die zuständige Gruppe.
      </div>
      {ownGroups.length === 0 ? (
        <div role="status" className={styles.warningPanel}>
          Du brauchst zuerst eine verifizierte Mitgliedschaft in einer Fansubgruppe. Prüfe dein Profil oder bitte deine Gruppe,
          deine Mitgliedschaft zu bestätigen.
        </div>
      ) : null}
      {error ? <div role="alert" className={styles.errorPanel}>{error}</div> : null}

      <form id={FORM_ID} onSubmit={(event) => void handleSubmit(event)} className={styles.proposalForm}>
        <FormField label="Worum geht es?" error={scopeError ?? undefined} required>
          <div role="group" aria-label="Art der Mitwirkung" className={styles.scopeGrid}>
            <Button
              type="button"
              variant={scope === 'project' ? 'primary' : 'secondary'}
              aria-pressed={scope === 'project'}
              onClick={selectProjectScope}
              className={styles.scopeOption}
              disabled={ownGroups.length === 0}
            >
              <strong>Projekt insgesamt</strong>
            </Button>
            <Button
              type="button"
              variant="secondary"
              className={`${styles.scopeOption} ${styles.scopeOptionSoon}`}
              disabled
              aria-disabled="true"
              title="Bald verfügbar"
            >
              <strong>Bestimmte Folge</strong>
              <span className={styles.soonTag}>Bald verfügbar</span>
            </Button>
          </div>
        </FormField>

        <FormField label="Welche Gruppe soll prüfen?" htmlFor="proposal-group" required>
          <Select
            id="proposal-group"
            value={selectedGroupMemberId}
            onChange={(event) => setSelectedGroupMemberId(event.target.value ? parseInt(event.target.value, 10) : '')}
            disabled={ownGroups.length === 0}
            required
          >
            <option value="">{ownGroups.length === 0 ? 'Keine verifizierte Gruppe verfügbar' : 'Gruppe auswählen'}</option>
            {ownGroups.map((group) => (
              <option key={group.fansub_group_member_id} value={group.fansub_group_member_id}>{group.group_name}</option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Bei welchem Anime/Projekt dieser Gruppe?"
          htmlFor="proposal-anime"
          error={groupAnimeError ?? undefined}
          required
        >
          <Select
            id="proposal-anime"
            value={selectedAnimeId}
            onChange={(event) => setSelectedAnimeId(event.target.value ? parseInt(event.target.value, 10) : '')}
            disabled={!selectedGroup || isLoadingGroupAnime || groupAnime.length === 0}
            required
          >
            <option value="">
              {!selectedGroup
                ? 'Erst Gruppe auswählen'
                : isLoadingGroupAnime
                  ? 'Anime/Projekte werden geladen'
                  : groupAnime.length === 0
                    ? 'Keine Anime/Projekte für diese Gruppe'
                    : 'Anime/Projekt auswählen'}
            </option>
            {groupAnime.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </Select>
        </FormField>

        {selectedGroup && selectedAnime ? (
          <div className={styles.selectionBreadcrumb} aria-label="Ausgewählter Kontext">
            <span>{selectedGroup.group_name}</span>
            <span className={styles.breadcrumbArrow} aria-hidden="true">→</span>
            <span>{selectedAnime.title}</span>
          </div>
        ) : null}

        <FormField label="Welche Rolle soll geprüft werden?" required>
          <div role="group" aria-label="Rollen auswählen" className={styles.rolePicker}>
            {roleDefinitions.map((role) => {
              const selected = selectedRoleCodes.includes(role.code)
              return (
                <Button
                  key={role.code}
                  type="button"
                  variant="subtle"
                  size="sm"
                  aria-pressed={selected}
                  onClick={() => toggleRole(role.code)}
                  disabled={ownGroups.length === 0}
                >
                  {role.label_de}
                </Button>
              )
            })}
          </div>
          {roleError ? <span className={styles.fieldError} role="alert">{roleError}</span> : null}
        </FormField>

        <FormField
          label="Hinweis für den Gruppenleader"
          htmlFor="proposal-note"
          hint="Dieser Hinweis ist für die Gruppe gedacht und wird nicht als öffentlicher Profiltext angezeigt."
        >
          <Textarea
            id="proposal-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Kurze Erläuterung, z. B. welche Folgen, Releases oder Zeitraum betroffen sind."
            disabled={ownGroups.length === 0}
          />
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

        <div className={styles.infoPanel}>
          Keine Reaktion nach 90 Tagen: Vorschlag kann selbst öffentlich geschaltet werden.
        </div>
      </form>
    </Modal>
  )
}
