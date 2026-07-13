'use client'

import { Button, FormField, Input, Textarea, YearPicker } from '@/components/ui'
import {
  GROUP_HISTORY_EVENT_OPTIONS,
  type GroupHistoryEventCategory,
} from '@/lib/group-history-events'
import styles from './groups.module.css'

// ---------------------------------------------------------------------------
// Typen & Konstanten
// ---------------------------------------------------------------------------

export interface HistoryFormState {
  title: string
  eventType: string
  year: string
  note: string
}

export interface HistoryEventOptionState {
  value: string
  label: string
  category?: GroupHistoryEventCategory
  imageSrc: string
  tone?: 'gold' | 'accent' | 'green' | 'pink' | 'muted' | 'blue' | 'violet' | 'red' | 'legendary'
  disabled?: boolean
  disabledReason?: string
  suggestedYear?: number | null
  progressCurrent?: number
  progressTarget?: number
}

export const EMPTY_HISTORY_FORM: HistoryFormState = {
  title: '',
  eventType: 'milestone',
  year: '',
  note: '',
}

const HISTORY_YEAR_MIN = 1990
const HISTORY_YEAR_FALLBACK_MAX = new Date().getFullYear()
const HISTORY_EVENT_CATEGORY_ORDER: GroupHistoryEventCategory[] = ['history', 'project_count', 'release_count']
const HISTORY_EVENT_CATEGORY_LABELS: Record<GroupHistoryEventCategory, string> = {
  history: 'Meilensteine',
  project_count: 'Projekt-Erfolge',
  release_count: 'Release-Erfolge',
}

interface GroupHistoryFormProps {
  form: HistoryFormState
  onFormChange: (updater: (prev: HistoryFormState) => HistoryFormState) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  isSaving: boolean
  titleError: string | null
  saveError: string | null
  isEdit: boolean
  eventOptions?: HistoryEventOptionState[]
  minYear?: number
  maxYear?: number
}

// ---------------------------------------------------------------------------
// Komponente
// ---------------------------------------------------------------------------

export function GroupHistoryForm({
  form,
  onFormChange,
  onSubmit,
  onCancel,
  isSaving,
  titleError,
  saveError,
  isEdit,
  eventOptions = GROUP_HISTORY_EVENT_OPTIONS,
  minYear,
  maxYear,
}: GroupHistoryFormProps) {
  const historyMinYear = minYear ?? HISTORY_YEAR_MIN
  const historyMaxYear = maxYear ?? HISTORY_YEAR_FALLBACK_MAX
  const optionGroups = HISTORY_EVENT_CATEGORY_ORDER
    .map((category) => ({
      category,
      label: HISTORY_EVENT_CATEGORY_LABELS[category],
      options: eventOptions.filter((option) => (option.category ?? 'history') === category),
    }))
    .filter((group) => group.options.length > 0)

  const selectEvent = (option: HistoryEventOptionState) => {
    if (option.disabled) return
    onFormChange((f) => ({
      ...f,
      eventType: option.value,
      year: option.suggestedYear ? String(option.suggestedYear) : f.year,
    }))
  }

  return (
    <form
      className={styles.historyForm}
      onSubmit={onSubmit}
      noValidate
    >
      <FormField label="Titel" htmlFor="history-title" required error={titleError ?? undefined}>
        <Input
          id="history-title"
          type="text"
          placeholder="z. B. Gegründet, Leitungswechsel, Aufgelöst …"
          value={form.title}
          onChange={(e) => onFormChange((f) => ({ ...f, title: e.target.value }))}
          invalid={!!titleError}
          required
        />
      </FormField>

      <FormField label="Erfolgstyp">
        <div className={styles.historyAchievementPicker} role="radiogroup" aria-label="Erfolgstyp">
          {optionGroups.map((group) => (
            <div key={group.category} className={styles.historyAchievementSection}>
              <p className={styles.historyAchievementSectionTitle}>{group.label}</p>
              <div className={styles.historyAchievementGrid}>
                {group.options.map((option) => {
                  const isSelected = form.eventType === option.value
                  const progressTarget = option.progressTarget ?? 0
                  const progressCurrent = option.progressCurrent ?? 0
                  const progressPercent = progressTarget > 0
                    ? Math.min(100, Math.max(0, Math.round((progressCurrent / progressTarget) * 100)))
                    : 0
                  const isNearlyUnlocked = option.disabled && progressTarget > 0 && progressPercent >= 80
                  const tileClassName = [
                    styles.historyAchievementTile,
                    styles[`historyAchievementTone_${option.tone ?? 'muted'}`],
                    isSelected ? styles.historyAchievementTileSelected : '',
                    option.disabled ? styles.historyAchievementTileDisabled : '',
                    isNearlyUnlocked ? styles.historyAchievementTileAlmost : '',
                  ].filter(Boolean).join(' ')

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={tileClassName}
                      disabled={option.disabled}
                      onClick={() => selectEvent(option)}
                      title={option.disabledReason}
                    >
                      {progressTarget > 0 ? (
                        <span
                          className={styles.historyAchievementProgress}
                          aria-label={`${progressCurrent} von ${progressTarget}`}
                        >
                          <svg viewBox="0 0 40 40" aria-hidden="true">
                            <circle className={styles.historyAchievementProgressTrack} cx="20" cy="20" r="16" pathLength="100" />
                            <circle
                              className={styles.historyAchievementProgressValue}
                              cx="20"
                              cy="20"
                              r="16"
                              pathLength="100"
                              strokeDasharray={`${progressPercent} 100`}
                            />
                          </svg>
                          <span>{formatCompactCount(progressTarget)}</span>
                        </span>
                      ) : null}
                      <span className={styles.historyAchievementImageFrame}>
                        <img src={option.imageSrc} alt="" className={styles.historyAchievementImage} />
                      </span>
                      <span className={styles.historyAchievementLabel}>{option.label}</span>
                      {progressTarget > 0 ? (
                        <span className={styles.historyAchievementProgressText}>
                          {Math.min(progressCurrent, progressTarget)}/{progressTarget}
                        </span>
                      ) : null}
                      {isNearlyUnlocked ? (
                        <span className={styles.historyAchievementAlmostBadge}>fast geschafft</span>
                      ) : null}
                      {option.disabledReason ? (
                        <span className="sr-only">Nicht auswählbar: {option.disabledReason}</span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <div className="sr-only" aria-live="polite">
            Ausgewählt: {eventOptions.find((option) => option.value === form.eventType)?.label ?? form.eventType}
          </div>
        </div>
      </FormField>

      <div className={styles.historyFormRow}>
        <FormField
          label="Jahr"
          htmlFor="history-year"
          hint="Optionaler Zeitpunkt für die Timeline."
        >
          <YearPicker
            id="history-year"
            label="Jahr"
            value={form.year}
            minYear={historyMinYear}
            maxYear={historyMaxYear}
            onChange={(value) => onFormChange((f) => ({ ...f, year: value }))}
          />
        </FormField>
        <div />
      </div>

      <FormField label="Notiz" htmlFor="history-note" hint="Optionaler Kontext zum Ereignis.">
        <Textarea
          id="history-note"
          rows={2}
          placeholder="Zusätzliche Informationen zum Eintrag …"
          value={form.note}
          onChange={(e) => onFormChange((f) => ({ ...f, note: e.target.value }))}
        />
      </FormField>

      {saveError ? (
        <p className={styles.historyFormError} role="alert">
          {saveError}
        </p>
      ) : null}

      <div className={styles.historyFormActions}>
        <Button type="submit" variant="success" size="sm" disabled={isSaving}>
          {isSaving ? 'Wird gespeichert …' : 'Meilenstein speichern'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
          Bearbeitung abbrechen
        </Button>
      </div>

      {/* Screenreader-only Hinweis für den Modus */}
      <span className="sr-only">
        {isEdit ? 'Meilenstein bearbeiten' : 'Neuen Meilenstein hinzufügen'}
      </span>
    </form>
  )
}

function formatCompactCount(value: number): string {
  if (value >= 1000) {
    return `${Math.round(value / 1000)}K`
  }
  return String(value)
}
