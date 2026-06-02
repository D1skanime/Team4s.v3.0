'use client'

import { Button, Input, Select, Textarea } from '@/components/ui'
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
      <div className={styles.historyFormField}>
        <label className={styles.historyFormLabel} htmlFor="history-title">
          Titel *
        </label>
        <Input
          id="history-title"
          type="text"
          placeholder="z. B. Gegründet, Leaderwechsel, Aufgelöst …"
          value={form.title}
          onChange={(e) => onFormChange((f) => ({ ...f, title: e.target.value }))}
          invalid={!!titleError}
          required
        />
        {titleError ? (
          <span className={styles.historyFormError} role="alert">
            {titleError}
          </span>
        ) : null}
      </div>

      <div className={styles.historyFormField}>
        <label className={styles.historyFormLabel} htmlFor="history-event-type">
          Ereignistyp
        </label>
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
      </div>

      <div className={styles.historyFormRow}>
        <div className={styles.historyFormField}>
          <label className={styles.historyFormLabel} htmlFor="history-year">
            Jahr (optional)
          </label>
          <Input
            id="history-year"
            type="number"
            min={1990}
            max={2099}
            placeholder="z. B. 2008"
            value={form.year}
            onChange={(e) => onFormChange((f) => ({ ...f, year: e.target.value }))}
          />
        </div>
        <div />
      </div>

      <div className={styles.historyFormField}>
        <label className={styles.historyFormLabel} htmlFor="history-note">
          Notiz (optional)
        </label>
        <Textarea
          id="history-note"
          rows={2}
          placeholder="Zusätzliche Informationen zum Eintrag …"
          value={form.note}
          onChange={(e) => onFormChange((f) => ({ ...f, note: e.target.value }))}
        />
      </div>

      {saveError ? (
        <p className={styles.historyFormError} role="alert">
          {saveError}
        </p>
      ) : null}

      <div className={styles.historyFormActions}>
        <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
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
