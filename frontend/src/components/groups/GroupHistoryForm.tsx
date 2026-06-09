'use client'

import { Button, FormField, Input, Select, Textarea, YearPicker } from '@/components/ui'
import styles from './groups.module.css'

// ---------------------------------------------------------------------------
// Typen & Konstanten
// ---------------------------------------------------------------------------

export const EVENT_TYPE_OPTIONS = [
  { value: 'founding', label: 'Gründung' },
  { value: 'disbanding', label: 'Auflösung' },
  { value: 'hiatus', label: 'Pause' },
  { value: 'rebranding', label: 'Umbenennung' },
  { value: 'milestone', label: 'Meilenstein' },
  { value: 'other', label: 'Sonstiges' },
]

export interface HistoryFormState {
  title: string
  eventType: string
  year: string
  note: string
}

export const EMPTY_HISTORY_FORM: HistoryFormState = {
  title: '',
  eventType: 'milestone',
  year: '',
  note: '',
}

const HISTORY_YEAR_MIN = 1990
const HISTORY_YEAR_MAX = 2099

interface GroupHistoryFormProps {
  form: HistoryFormState
  onFormChange: (updater: (prev: HistoryFormState) => HistoryFormState) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  isSaving: boolean
  titleError: string | null
  saveError: string | null
  isEdit: boolean
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
}: GroupHistoryFormProps) {
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
          placeholder="z. B. Gegründet, Leaderwechsel, Aufgelöst …"
          value={form.title}
          onChange={(e) => onFormChange((f) => ({ ...f, title: e.target.value }))}
          invalid={!!titleError}
          required
        />
      </FormField>

      <FormField label="Ereignistyp" htmlFor="history-event-type">
        <Select
          id="history-event-type"
          value={form.eventType}
          onChange={(e) => onFormChange((f) => ({ ...f, eventType: e.target.value }))}
        >
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
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
            minYear={HISTORY_YEAR_MIN}
            maxYear={HISTORY_YEAR_MAX}
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
