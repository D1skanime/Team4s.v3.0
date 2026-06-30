'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { Button, FormField, Textarea, YearPicker } from '@/components/ui'
import type { AdminFansubAnimeEntry } from '@/types/admin'
import type { MembershipEntry } from '@/types/contributions'

import styles from './contributions.module.css'

export interface RoleDefinition {
  code: string
  label_de: string
}

interface ChoiceOption<T extends number | string> {
  value: T
  label: string
  subtitle?: string
}

export interface ChoiceSelectProps<T extends number | string> {
  label: string
  value: T | ''
  options: ChoiceOption<T>[]
  placeholder: string
  disabled?: boolean
  loading?: boolean
  emptyLabel?: string
  onChange: (value: T | '') => void
}

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

export function ChoiceSelect<T extends number | string>({
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

// ---- Step 1: Gruppe & Projekt ----

interface Step1Props {
  ownGroups: MembershipEntry[]
  groupOptions: Array<{ value: number; label: string; subtitle?: string }>
  animeOptions: Array<{ value: number; label: string; subtitle?: string }>
  selectedGroupMemberId: number | ''
  selectedAnimeId: number | ''
  selectedGroup: MembershipEntry | null
  selectedAnime: AdminFansubAnimeEntry | null
  isLoadingGroupAnime: boolean
  groupAnime: AdminFansubAnimeEntry[]
  groupAnimeError: string | null
  onGroupChange: (value: number | '') => void
  onAnimeChange: (value: number | '') => void
}

export function Step1GroupProject({
  ownGroups,
  groupOptions,
  animeOptions,
  selectedGroupMemberId,
  selectedAnimeId,
  selectedGroup,
  selectedAnime,
  isLoadingGroupAnime,
  groupAnime,
  groupAnimeError,
  onGroupChange,
  onAnimeChange,
}: Step1Props) {
  return (
    <div className={styles.wizardStepPanel}>
      <FormField label="Welche Gruppe soll prüfen?" required>
        <ChoiceSelect
          label="Welche Gruppe soll prüfen?"
          value={selectedGroupMemberId}
          options={groupOptions}
          placeholder={ownGroups.length === 0 ? 'Keine verifizierte Gruppe verfügbar' : 'Gruppe auswählen'}
          disabled={ownGroups.length === 0}
          onChange={(value) => onGroupChange(value === '' ? '' : Number(value))}
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
          onChange={(value) => onAnimeChange(value === '' ? '' : Number(value))}
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
  )
}

// ---- Step 2: Rolle ----

interface Step2Props {
  roleDefinitions: RoleDefinition[]
  selectedRoleCode: string
  roleError: string | null
  ownGroups: MembershipEntry[]
  onSelectRole: (code: string) => void
}

export function Step2Role({
  roleDefinitions,
  selectedRoleCode,
  roleError,
  ownGroups,
  onSelectRole,
}: Step2Props) {
  return (
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
              onClick={() => onSelectRole(role.code)}
              disabled={ownGroups.length === 0}
            >
              {selected ? <Check size={15} aria-hidden="true" /> : null}
              <span>{role.label_de}</span>
            </button>
          )
        })}
      </div>
    </FormField>
  )
}

// ---- Step 3: Hinweis & Zeitraum ----

const MIN_YEAR = 1990
const MAX_NOTE_LENGTH = 280

interface Step3Props {
  note: string
  startedYear: string
  endedYear: string
  hasInvalidYearRange: boolean
  ownGroups: MembershipEntry[]
  onNoteChange: (value: string) => void
  onStartedYearChange: (value: string) => void
  onEndedYearChange: (value: string) => void
}

export function Step3NoteRange({
  note,
  startedYear,
  endedYear,
  hasInvalidYearRange,
  ownGroups,
  onNoteChange,
  onStartedYearChange,
  onEndedYearChange,
}: Step3Props) {
  const currentYear = new Date().getFullYear()

  return (
    <div className={styles.wizardStepPanel}>
      <FormField
        label="Hinweis für den Gruppenleader"
        htmlFor="proposal-note"
        hint="Dieser Hinweis ist für die Gruppe gedacht und wird nicht als öffentlicher Profiltext angezeigt."
      >
        <Textarea
          id="proposal-note"
          value={note}
          onChange={(event) => onNoteChange(event.target.value.slice(0, MAX_NOTE_LENGTH))}
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
            onChange={onStartedYearChange}
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
            onChange={onEndedYearChange}
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
  )
}

// Re-export Button for use in ProposalForm if needed
export { Button }
