'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { Badge, Button, FormField, Input, Textarea, YearPicker } from '@/components/ui'
import type { AdminFansubAnimeEntry } from '@/types/admin'
import type { MembershipEntry } from '@/types/contributions'
import type { FansubGroup } from '@/types/fansub'

import type { GroupScope } from './ProposalForm.toggles'
import { GroupScopeToggle } from './ProposalForm.toggles'
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
  groupScope: GroupScope
  onGroupScopeChange: (scope: GroupScope) => void
  ownGroups: MembershipEntry[]
  groupOptions: Array<{ value: number; label: string; subtitle?: string }>
  selectedGroupId: number | ''
  onGroupChange: (value: number | '') => void
  // Fremd-Gruppen-Suche (D-02, geteilter useFansubGroupSearch-Hook aus Plan 191-02)
  foreignQuery: string
  onForeignQueryChange: (value: string) => void
  foreignResults: FansubGroup[]
  isSearchingForeign: boolean
  foreignSearchMessage: string | null
  foreignGroup: FansubGroup | null
  onForeignGroupPick: (group: FansubGroup) => void
  activeGroupName: string | null
  hasActiveGroup: boolean
  // Anime/Projekt — nur fuer Korrektur relevant (D-06b)
  animeOptions: Array<{ value: number; label: string; subtitle?: string }>
  selectedAnimeId: number | ''
  selectedAnime: AdminFansubAnimeEntry | null
  isLoadingGroupAnime: boolean
  groupAnime: AdminFansubAnimeEntry[]
  groupAnimeError: string | null
  onAnimeChange: (value: number | '') => void
}

export function Step1GroupProject({
  groupScope,
  onGroupScopeChange,
  ownGroups,
  groupOptions,
  selectedGroupId,
  onGroupChange,
  foreignQuery,
  onForeignQueryChange,
  foreignResults,
  isSearchingForeign,
  foreignSearchMessage,
  foreignGroup,
  onForeignGroupPick,
  activeGroupName,
  hasActiveGroup,
  animeOptions,
  selectedAnimeId,
  selectedAnime,
  isLoadingGroupAnime,
  groupAnime,
  groupAnimeError,
  onAnimeChange,
}: Step1Props) {
  return (
    <div className={styles.wizardStepPanel}>
      <FormField label="Welche Gruppe?" required>
        <GroupScopeToggle value={groupScope} onSelect={onGroupScopeChange} />
      </FormField>

      {groupScope === 'own' ? (
        <ChoiceSelect
          label="Welche Gruppe soll prüfen?"
          value={selectedGroupId}
          options={groupOptions}
          placeholder={ownGroups.length === 0 ? 'Keine verifizierte Gruppe verfügbar' : 'Gruppe auswählen'}
          disabled={ownGroups.length === 0}
          onChange={(value) => onGroupChange(value === '' ? '' : Number(value))}
        />
      ) : (
        <div className={styles.foreignGroupSearch}>
          <Input
            value={foreignQuery}
            onChange={(event) => onForeignQueryChange(event.target.value)}
            placeholder="Name oder Alias..."
            aria-label="Andere Gruppe suchen"
          />
          {isSearchingForeign ? <p className={styles.metaText}>Suche läuft...</p> : null}
          {foreignSearchMessage ? <p className={styles.metaText}>{foreignSearchMessage}</p> : null}
          {foreignResults.length > 0 ? (
            <div className={styles.groupSearchList}>
              {foreignResults.map((group) => (
                <Button
                  key={group.id}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className={styles.groupSearchItem}
                  onClick={() => onForeignGroupPick(group)}
                >
                  <strong>{group.name}</strong>
                  <span>{group.slug}</span>
                </Button>
              ))}
            </div>
          ) : null}
          {foreignGroup ? <span className={styles.metaText}>Ausgewählt: {foreignGroup.name}</span> : null}
        </div>
      )}

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
            !hasActiveGroup
              ? 'Erst Gruppe auswählen'
              : isLoadingGroupAnime
                ? 'Anime/Projekte werden geladen'
                : groupAnime.length === 0
                  ? 'Keine Anime/Projekte für diese Gruppe'
                  : 'Anime/Projekt auswählen'
          }
          disabled={!hasActiveGroup || groupAnime.length === 0}
          loading={isLoadingGroupAnime}
          emptyLabel="Keine Anime/Projekte für diese Gruppe"
          onChange={(value) => onAnimeChange(value === '' ? '' : Number(value))}
        />
      </FormField>

      {hasActiveGroup && activeGroupName ? (
        <div className={styles.selectionBreadcrumb} aria-label="Ausgewählter Kontext">
          <span>{activeGroupName}</span>
          <Badge variant={groupScope === 'own' ? 'muted' : 'info'}>
            {groupScope === 'own' ? 'Eigene Gruppe' : 'Andere Gruppe'}
          </Badge>
          {selectedAnime ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{selectedAnime.title}</span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

// ---- Step 2: Rolle (Korrektur: Pflichtrolle aus anime_contribution-Kontext) ----

interface Step2Props {
  roleDefinitions: RoleDefinition[]
  selectedRoleCode: string
  roleError: string | null
  onSelectRole: (code: string) => void
}

export function Step2Role({ roleDefinitions, selectedRoleCode, roleError, onSelectRole }: Step2Props) {
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

// ---- Step 3: Hinweis (+ Zeitraum/90-Tage-Hinweis nur bei Korrektur) ----

const MIN_YEAR = 1990
const MAX_NOTE_LENGTH = 280

interface Step3Props {
  note: string
  startedYear: string
  endedYear: string
  hasInvalidYearRange: boolean
  /**
   * Von/Bis-Jahr und das 90-Tage-Infopanel sind eine anime_contributions-spezifische
   * Mechanik (Selbst-Veroeffentlichung nach Inaktivitaet) — fuer fansub_group_hints
   * existiert dieser Automatismus nicht (191-UI-SPEC.md Component Contract A2), deshalb
   * steuert der Aufrufer die Sichtbarkeit explizit statt sie an ownGroups zu koppeln.
   */
  showYearAndInfoPanel: boolean
  onNoteChange: (value: string) => void
  onStartedYearChange: (value: string) => void
  onEndedYearChange: (value: string) => void
}

export function Step3NoteRange({
  note,
  startedYear,
  endedYear,
  hasInvalidYearRange,
  showYearAndInfoPanel,
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
        />
        <span className={styles.characterCounter} aria-live="polite">
          {note.length}/{MAX_NOTE_LENGTH}
        </span>
      </FormField>

      {showYearAndInfoPanel ? (
        <>
          <div className={styles.yearFields}>
            <FormField label="Von Jahr" htmlFor="proposal-started">
              <YearPicker
                id="proposal-started"
                label="Von Jahr auswählen"
                value={startedYear}
                minYear={MIN_YEAR}
                maxYear={currentYear}
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
        </>
      ) : null}
    </div>
  )
}

// Re-export Button for use in ProposalForm if needed
export { Button }
