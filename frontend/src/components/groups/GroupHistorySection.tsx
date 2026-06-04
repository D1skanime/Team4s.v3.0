'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  SectionHeader,
  Toolbar,
} from '@/components/ui'
import {
  listGroupHistory,
  createGroupHistory,
  updateGroupHistory,
  deleteGroupHistory,
  type GroupHistoryRow,
} from '@/lib/api'

import {
  GroupHistoryForm,
  EMPTY_HISTORY_FORM,
  type HistoryFormState,
} from './GroupHistoryForm'
import styles from './groups.module.css'

// ---------------------------------------------------------------------------
// Konstanten & Hilfsdaten
// ---------------------------------------------------------------------------

const COLLAPSE_THRESHOLD = 5

const EVENT_TYPE_LABELS: Record<string, string> = {
  founding: 'Gründung',
  disbanding: 'Auflösung',
  hiatus: 'Pause',
  rebranding: 'Umbenennung',
  milestone: 'Meilenstein',
  other: 'Sonstiges',
}

const EVENT_TYPE_BADGE_VARIANTS = {
  founding: 'success',
  disbanding: 'danger',
  hiatus: 'warning',
  rebranding: 'info',
  milestone: 'neutral',
  other: 'muted',
} as const

function eventTypeBadgeVariant(eventType: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted' {
  return EVENT_TYPE_BADGE_VARIANTS[eventType as keyof typeof EVENT_TYPE_BADGE_VARIANTS] ?? 'muted'
}

function sortEntries(entries: GroupHistoryRow[]): GroupHistoryRow[] {
  return [...entries].sort((a, b) => {
    if (a.year === null && b.year === null) return 0
    if (a.year === null) return 1
    if (b.year === null) return -1
    return a.year - b.year
  })
}

function entryToFormState(entry: GroupHistoryRow): HistoryFormState {
  return {
    title: entry.title ?? '',
    eventType: entry.event_type,
    year: entry.year !== null ? String(entry.year) : '',
    note: entry.note ?? '',
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GroupHistorySectionProps {
  fansubGroupId: number
  authToken?: string
  /**
   * Nur-Anzeige-Modus: blendet alle Bearbeiten-Steuerelemente aus (kein
   * Hinzufügen/Bearbeiten/Löschen). Für künftig-öffentliche Flächen wie
   * /admin/my-groups, wo die Timeline nur gelesen werden darf.
   */
  readOnly?: boolean
}

// ---------------------------------------------------------------------------
// Komponente
// ---------------------------------------------------------------------------

export function GroupHistorySection({ fansubGroupId, authToken, readOnly = false }: GroupHistorySectionProps) {
  const [entries, setEntries] = useState<GroupHistoryRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  // Formular-State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<GroupHistoryRow | null>(null)
  const [form, setForm] = useState<HistoryFormState>(EMPTY_HISTORY_FORM)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Löschen-State
  const [deleteTarget, setDeleteTarget] = useState<GroupHistoryRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Inline-Erfolgs-Toast (3 Sekunden)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---------------------------------------------------------------------------
  // Daten laden
  // ---------------------------------------------------------------------------

  const loadEntries = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await listGroupHistory(fansubGroupId, authToken)
      setEntries(sortEntries(data))
    } catch {
      setLoadError('Meilensteine konnten nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }, [fansubGroupId, authToken])

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])

  // ---------------------------------------------------------------------------
  // Erfolgs-Toast
  // ---------------------------------------------------------------------------

  const showSuccess = useCallback((text: string) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    setSuccessMessage(text)
    successTimerRef.current = setTimeout(() => setSuccessMessage(null), 3000)
  }, [])

  // ---------------------------------------------------------------------------
  // Formular
  // ---------------------------------------------------------------------------

  const openAddForm = useCallback(() => {
    setEditTarget(null)
    setForm(EMPTY_HISTORY_FORM)
    setTitleError(null)
    setSaveError(null)
    setIsFormOpen(true)
  }, [])

  const openEditForm = useCallback((entry: GroupHistoryRow) => {
    setEditTarget(entry)
    setForm(entryToFormState(entry))
    setTitleError(null)
    setSaveError(null)
    setIsFormOpen(true)
  }, [])

  const closeForm = useCallback(() => {
    setIsFormOpen(false)
    setEditTarget(null)
    setForm(EMPTY_HISTORY_FORM)
    setTitleError(null)
    setSaveError(null)
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!form.title.trim()) {
        setTitleError('Titel ist ein Pflichtfeld.')
        return
      }
      setTitleError(null)
      setSaveError(null)
      setIsSaving(true)
      try {
        const yearValue = form.year.trim() !== '' ? Number(form.year) : null
        if (editTarget) {
          const updated = await updateGroupHistory(
            fansubGroupId,
            editTarget.id,
            { title: form.title.trim(), event_type: form.eventType, year: yearValue, note: form.note.trim() || null },
            authToken,
          )
          setEntries((prev) => sortEntries(prev.map((e) => (e.id === updated.id ? updated : e))))
          showSuccess('Meilenstein aktualisiert.')
        } else {
          const created = await createGroupHistory(
            fansubGroupId,
            { title: form.title.trim(), event_type: form.eventType, year: yearValue, note: form.note.trim() || null },
            authToken,
          )
          setEntries((prev) => sortEntries([...prev, created]))
          showSuccess('Meilenstein hinzugefügt.')
        }
        closeForm()
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : 'Meilenstein konnte nicht gespeichert werden. Bitte versuche es erneut.')
      } finally {
        setIsSaving(false)
      }
    },
    [form, editTarget, fansubGroupId, authToken, closeForm, showSuccess],
  )

  // ---------------------------------------------------------------------------
  // Löschen
  // ---------------------------------------------------------------------------

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteGroupHistory(fansubGroupId, deleteTarget.id, authToken)
      setEntries((prev) => prev.filter((e) => e.id !== deleteTarget.id))
      setDeleteTarget(null)
      showSuccess('Meilenstein gelöscht.')
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Meilenstein konnte nicht gelöscht werden. Bitte versuche es erneut.')
    } finally {
      setIsDeleting(false)
    }
  }, [deleteTarget, fansubGroupId, authToken, showSuccess])

  const visibleEntries = isExpanded ? entries : entries.slice(0, COLLAPSE_THRESHOLD)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Card variant="section">
      <SectionHeader
        eyebrow="Gruppen-Historie"
        title="Meilensteine"
        description="Wichtige Ereignisse der Gruppe chronologisch festhalten."
      />

      {!readOnly ? (
        <Toolbar
          leading={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={openAddForm}
              disabled={isFormOpen}
            >
              Meilenstein hinzufügen
            </Button>
          }
        />
      ) : null}

      {successMessage ? (
        <div className={styles.historySuccessMessage} role="status">
          <Badge variant="success">{successMessage}</Badge>
        </div>
      ) : null}

      {isFormOpen && !readOnly ? (
        <GroupHistoryForm
          form={form}
          onFormChange={setForm}
          onSubmit={(e) => void handleSubmit(e)}
          onCancel={closeForm}
          isSaving={isSaving}
          titleError={titleError}
          saveError={saveError}
          isEdit={editTarget !== null}
        />
      ) : null}

      {isLoading ? (
        <LoadingState
          title="Meilensteine werden geladen"
          description="Team4s lädt die Gruppen-Historie."
        />
      ) : null}

      {!isLoading && loadError ? (
        <ErrorState
          title="Meilensteine konnten nicht geladen werden"
          description={loadError}
          action={<Button variant="secondary" size="sm" onClick={() => void loadEntries()}>Erneut laden</Button>}
        />
      ) : null}

      {!isLoading && !loadError && entries.length === 0 ? (
        <EmptyState
          title="Noch keine Meilensteine"
          description="Füge wichtige Ereignisse wie Gründung, Leaderwechsel oder Auflösung hinzu."
        />
      ) : null}

      {!isLoading && !loadError && entries.length > 0 ? (
        <>
          <ul className={styles.historyList}>
            {visibleEntries.map((entry) => (
              <li key={entry.id} className={styles.historyRow}>
                <span className={styles.historyYear}>{entry.year ?? '—'}</span>
                <div className={styles.historyContent}>
                  <div className={styles.historyMetaRow}>
                    <Badge variant={eventTypeBadgeVariant(entry.event_type)}>
                      {EVENT_TYPE_LABELS[entry.event_type] ?? entry.event_type}
                    </Badge>
                  </div>
                  <strong className={styles.historyTitle}>{entry.title}</strong>
                  {entry.note ? <p className={styles.historyNote}>{entry.note}</p> : null}
                </div>
                {!readOnly ? (
                  <div className={styles.historyRowActions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label="Eintrag bearbeiten"
                      onClick={() => openEditForm(entry)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      iconOnly
                      aria-label="Eintrag löschen"
                      onClick={() => setDeleteTarget(entry)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {entries.length > COLLAPSE_THRESHOLD ? (
            <div className={styles.historyExpanderRow}>
              <Button variant="ghost" size="sm" onClick={() => setIsExpanded((v) => !v)}>
                {isExpanded ? 'Weniger anzeigen' : `Alle ${entries.length} Einträge anzeigen`}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      <Modal
        open={deleteTarget !== null}
        onClose={() => { setDeleteTarget(null); setDeleteError(null) }}
        title="Eintrag löschen"
        description="Eintrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        footer={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {deleteError ? <span className={styles.historyFormError} role="alert">{deleteError}</span> : null}
            <Button variant="danger" size="sm" onClick={() => void handleDeleteConfirm()} disabled={isDeleting}>
              {isDeleting ? 'Wird gelöscht …' : 'Endgültig löschen'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { setDeleteTarget(null); setDeleteError(null) }} disabled={isDeleting}>
              Nicht löschen
            </Button>
          </div>
        }
      >
        {deleteTarget ? (
          <p><strong>{deleteTarget.title}</strong>{deleteTarget.year ? ` (${deleteTarget.year})` : ''}</p>
        ) : null}
      </Modal>
    </Card>
  )
}
