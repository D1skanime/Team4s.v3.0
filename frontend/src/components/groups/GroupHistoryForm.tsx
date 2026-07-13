'use client'

import { Button, FormField, Input, Select, Textarea, YearPicker } from '@/components/ui'
import {
  GROUP_HISTORY_EVENT_OPTIONS,
  getGroupHistoryEventPresentation,
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
  imageSrc: string
  disabled?: boolean
  disabledReason?: string
  suggestedYear?: number | null
}

export const EMPTY_HISTORY_FORM: HistoryFormState = {
  title: '',
  eventType: 'milestone',
  year: '',
  note: '',
}

const HISTORY_YEAR_MIN = 1990
const HISTORY_YEAR_FALLBACK_MAX = new Date().getFullYear()

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
  const selectedEvent = getGroupHistoryEventPresentation(form.eventType)
  const lockedOptions = eventOptions.filter((opt) => opt.disabled && opt.disabledReason)
  const historyMinYear = minYear ?? HISTORY_YEAR_MIN
  const historyMaxYear = maxYear ?? HISTORY_YEAR_FALLBACK_MAX

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

      <FormField label="Erfolgstyp" htmlFor="history-event-type">
        <div className={styles.historyEventPicker}>
          <Select
            id="history-event-type"
            value={form.eventType}
            onChange={(e) => {
              const nextEventType = e.target.value
              const nextOption = eventOptions.find((opt) => opt.value === nextEventType)
              onFormChange((f) => ({
                ...f,
                eventType: nextEventType,
                year: nextOption?.suggestedYear ? String(nextOption.suggestedYear) : f.year,
              }))
            }}
          >
            {eventOptions.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.disabledReason ? `${opt.label} (${opt.disabledReason})` : opt.label}
              </option>
            ))}
          </Select>
          {lockedOptions.length > 0 ? (
            <p className={styles.historyEventHint}>
              Gesperrt: {lockedOptions.map((opt) => `${opt.label} - ${opt.disabledReason}`).join(', ')}
            </p>
          ) : null}
          <div className={styles.historyEventPreview} aria-hidden="true">
            <img src={selectedEvent.imageSrc} alt="" className={styles.historyEventPreviewImage} />
            <span>{selectedEvent.label}</span>
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
