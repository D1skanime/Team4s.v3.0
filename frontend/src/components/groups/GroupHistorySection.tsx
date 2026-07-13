'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  GROUP_HISTORY_EVENT_OPTIONS,
  getGroupHistoryEventPresentation,
} from '@/lib/group-history-events'

import {
  GroupHistoryForm,
  EMPTY_HISTORY_FORM,
  type HistoryEventOptionState,
  type HistoryFormState,
} from './GroupHistoryForm'
import styles from './groups.module.css'

// ---------------------------------------------------------------------------
// Konstanten & Hilfsdaten
// ---------------------------------------------------------------------------

const COLLAPSE_THRESHOLD = 5

const PROJECT_COUNT_EVENT_THRESHOLDS: Record<string, number> = {
  projects_10: 10,
  projects_50: 50,
  projects_100: 100,
  projects_500: 500,
}

const RELEASE_COUNT_EVENT_THRESHOLDS: Record<string, number> = {
  releases_100: 100,
  releases_500: 500,
  releases_1000: 1000,
  releases_5000: 5000,
  releases_10000: 10000,
}

const EVENT_TYPE_BADGE_VARIANTS = {
  founding: 'success',
  disbanding: 'danger',
  hiatus: 'warning',
  rebranding: 'info',
  milestone: 'neutral',
} as const

function eventTypeBadgeVariant(eventType: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted' {
  return EVENT_TYPE_BADGE_VARIANTS[eventType as keyof typeof EVENT_TYPE_BADGE_VARIANTS] ?? 'muted'
}

function achievementBadgeVariant(eventType: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted' {
  const presentation = getGroupHistoryEventPresentation(eventType)
  if (presentation.tone === 'green') return 'success'
  if (presentation.tone === 'red') return 'danger'
  if (presentation.tone === 'gold' || presentation.tone === 'legendary' || presentation.tone === 'pink') return 'warning'
  if (presentation.tone === 'blue' || presentation.tone === 'violet' || presentation.tone === 'accent') return 'info'
  return eventTypeBadgeVariant(eventType)
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

export function buildInitialHistoryFormState(eventOptions: HistoryEventOptionState[]): HistoryFormState {
  const firstAvailableOption = eventOptions.find((option) => !option.disabled) ?? eventOptions[0]

  return {
    ...EMPTY_HISTORY_FORM,
    eventType: firstAvailableOption?.value ?? EMPTY_HISTORY_FORM.eventType,
    year: firstAvailableOption?.suggestedYear ? String(firstAvailableOption.suggestedYear) : '',
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GroupHistorySectionProps {
  fansubGroupId: number
  foundedYear?: number | null
  hasWebsiteLink?: boolean
  hasFirstProject?: boolean
  hasFirstRelease?: boolean
  qualifiedReleaseCount?: number
  hasCompletedProject?: boolean
  hasCollaboration?: boolean
  completedProjectCount?: number
  authToken?: string
  /**
   * Nur-Anzeige-Modus: blendet alle Bearbeiten-Steuerelemente aus (kein
   * Hinzufügen/Bearbeiten/Löschen). Für künftige öffentliche Flächen, auf
   * denen die Timeline nur gelesen werden darf.
   */
  readOnly?: boolean
}

export function buildHistoryEventOptions(
  entries: GroupHistoryRow[],
  editTarget: GroupHistoryRow | null,
  foundedYear?: number | null,
  hasWebsiteLink = false,
  hasFirstProject = false,
  hasFirstRelease = false,
  hasCompletedProject = false,
  hasCollaboration = false,
  completedProjectCount = 0,
  qualifiedReleaseCount = 0,
): HistoryEventOptionState[] {
  const foundingUsedByAnotherEntry = entries.some(
    (entry) => entry.event_type === 'founding' && entry.id !== editTarget?.id,
  )
  const disbandingUsedByAnotherEntry = entries.some(
    (entry) => entry.event_type === 'disbanding' && entry.id !== editTarget?.id,
  )
  const firstProjectUsedByAnotherEntry = entries.some(
    (entry) => entry.event_type === 'first_project' && entry.id !== editTarget?.id,
  )
  const firstReleaseUsedByAnotherEntry = entries.some(
    (entry) => entry.event_type === 'first_release' && entry.id !== editTarget?.id,
  )
  const projectCompletedUsedByAnotherEntry = entries.some(
    (entry) => entry.event_type === 'project_completed' && entry.id !== editTarget?.id,
  )
  const collaborationUsedByAnotherEntry = entries.some(
    (entry) => entry.event_type === 'collaboration' && entry.id !== editTarget?.id,
  )
  const usedEventTypes = new Set(entries.filter((entry) => entry.id !== editTarget?.id).map((entry) => entry.event_type))
  const hasHiatusEntry = entries.some((entry) => entry.event_type === 'hiatus')
  const websiteLaunchUsedByAnotherEntry = entries.some(
    (entry) => entry.event_type === 'website_launch' && entry.id !== editTarget?.id,
  )
  const hasFirstProjectEntry = entries.some((entry) => entry.event_type === 'first_project')
  const hasFirstReleaseEntry = entries.some((entry) => entry.event_type === 'first_release')
  const fullCatalogUnlocked = hasFirstProjectEntry && hasFirstReleaseEntry

  if (!foundedYear && editTarget === null) {
    const foundingOption = getGroupHistoryEventOptions().find((option) => option.value === 'founding')
    return foundingOption ? [{ ...foundingOption, disabled: true, disabledReason: 'Gründungsjahr fehlt' }] : []
  }

  return getGroupHistoryEventOptions().flatMap((option) => {
    const isStageOption = option.value === 'founding' || option.value === 'first_project' || option.value === 'first_release'
    if (!fullCatalogUnlocked && !isStageOption && editTarget?.event_type !== option.value) {
      return []
    }

    if (option.value === 'founding' && foundingUsedByAnotherEntry) {
      return []
    }

    if (option.value === 'founding' && !foundedYear) {
      return [{ ...option, disabled: true, disabledReason: 'Gründungsjahr fehlt' }]
    }

    if (option.value === 'founding') {
      return [{ ...option, suggestedYear: foundedYear }]
    }

    if (option.value === 'disbanding' && disbandingUsedByAnotherEntry) {
      return []
    }

    if (option.value === 'first_project' && firstProjectUsedByAnotherEntry) {
      return []
    }

    if (option.value === 'first_project' && !hasFirstProject && editTarget?.event_type !== 'first_project') {
      return [{ ...option, disabled: true, disabledReason: 'Ausblick/Rollen fehlen' }]
    }

    if (option.value === 'first_release' && firstReleaseUsedByAnotherEntry) {
      return []
    }

    if (option.value === 'first_release' && !hasFirstRelease && editTarget?.event_type !== 'first_release') {
      return [{ ...option, disabled: true, disabledReason: 'Release/Kara fehlt' }]
    }

    const releaseCountThreshold = RELEASE_COUNT_EVENT_THRESHOLDS[option.value]
    if (releaseCountThreshold) {
      if (usedEventTypes.has(option.value)) {
        return []
      }
      if (qualifiedReleaseCount < releaseCountThreshold && editTarget?.event_type !== option.value) {
        return [{ ...option, disabled: true, disabledReason: `${releaseCountThreshold} Releases erforderlich` }]
      }
    }

    if (option.value === 'project_completed' && projectCompletedUsedByAnotherEntry) {
      return []
    }

    if (option.value === 'project_completed' && !hasCompletedProject && editTarget?.event_type !== 'project_completed') {
      return [{ ...option, disabled: true, disabledReason: 'Release-Beiträge fehlen' }]
    }

    if (option.value === 'collaboration' && collaborationUsedByAnotherEntry) {
      return []
    }

    if (option.value === 'collaboration' && !hasCollaboration && editTarget?.event_type !== 'collaboration') {
      return [{ ...option, disabled: true, disabledReason: 'Kooperation fehlt' }]
    }

    const projectCountThreshold = PROJECT_COUNT_EVENT_THRESHOLDS[option.value]
    if (projectCountThreshold) {
      if (usedEventTypes.has(option.value)) {
        return []
      }
      if (completedProjectCount < projectCountThreshold && editTarget?.event_type !== option.value) {
        return [{ ...option, disabled: true, disabledReason: `${projectCountThreshold} Projekte erforderlich` }]
      }
    }

    if (option.value === 'revival' && !hasHiatusEntry && editTarget?.event_type !== 'revival') {
      return []
    }

    if (option.value === 'website_launch' && websiteLaunchUsedByAnotherEntry) {
      return []
    }

    if (option.value === 'website_launch' && !hasWebsiteLink && editTarget?.event_type !== 'website_launch') {
      return [{ ...option, disabled: true, disabledReason: 'Webseite fehlt' }]
    }

    return [option]
  })
}

function getGroupHistoryEventOptions(): HistoryEventOptionState[] {
  return GROUP_HISTORY_EVENT_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    imageSrc: option.imageSrc,
  }))
}

// ---------------------------------------------------------------------------
// Komponente
// ---------------------------------------------------------------------------

export function GroupHistorySection({ fansubGroupId, foundedYear = null, hasWebsiteLink = false, hasFirstProject = false, hasFirstRelease = false, qualifiedReleaseCount = 0, hasCompletedProject = false, hasCollaboration = false, completedProjectCount = 0, authToken, readOnly = false }: GroupHistorySectionProps) {
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

  const eventOptions = useMemo(
    () => buildHistoryEventOptions(entries, editTarget, foundedYear, hasWebsiteLink, hasFirstProject, hasFirstRelease, hasCompletedProject, hasCollaboration, completedProjectCount, qualifiedReleaseCount),
    [entries, editTarget, foundedYear, hasWebsiteLink, hasFirstProject, hasFirstRelease, hasCompletedProject, hasCollaboration, completedProjectCount, qualifiedReleaseCount],
  )

  const addEventOptions = useMemo(
    () => buildHistoryEventOptions(entries, null, foundedYear, hasWebsiteLink, hasFirstProject, hasFirstRelease, hasCompletedProject, hasCollaboration, completedProjectCount, qualifiedReleaseCount),
    [entries, foundedYear, hasWebsiteLink, hasFirstProject, hasFirstRelease, hasCompletedProject, hasCollaboration, completedProjectCount, qualifiedReleaseCount],
  )

  // ---------------------------------------------------------------------------
  // Formular
  // ---------------------------------------------------------------------------

  const openAddForm = useCallback(() => {
    setEditTarget(null)
    setForm(buildInitialHistoryFormState(addEventOptions))
    setTitleError(null)
    setSaveError(null)
    setIsFormOpen(true)
  }, [addEventOptions])

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
      const selectedEventOption = eventOptions.find((option) => option.value === form.eventType)
      if (!selectedEventOption || selectedEventOption.disabled) {
        setSaveError(selectedEventOption?.disabledReason ?? 'Dieser Meilenstein ist noch nicht freigeschaltet.')
        return
      }
      if (form.eventType === 'website_launch' && !hasWebsiteLink && editTarget?.event_type !== 'website_launch') {
        setSaveError('Webseite fehlt. Bitte zuerst einen Community-Link vom Typ Webseite eintragen.')
        return
      }
      if (form.eventType === 'first_project' && !hasFirstProject && editTarget?.event_type !== 'first_project') {
        setSaveError('Erstes Projekt ist noch nicht vollständig. Bitte Ausblick schreiben und Rollen Übersetzer, Timer und Encoder vergeben.')
        return
      }
      if (form.eventType === 'first_release' && !hasFirstRelease && editTarget?.event_type !== 'first_release') {
        setSaveError('Erstes Release ist noch nicht vollständig. Bitte zuerst ein Kara-Segment und mindestens einen Release-Text oder ein Release-Bild hinterlegen.')
        return
      }
      const releaseCountThreshold = RELEASE_COUNT_EVENT_THRESHOLDS[form.eventType]
      if (releaseCountThreshold && qualifiedReleaseCount < releaseCountThreshold && editTarget?.event_type !== form.eventType) {
        setSaveError('Release-Erfolg ist noch nicht freigeschaltet. Bitte zuerst genügend Releases mit Kara und Gruppenbeitrag abschließen.')
        return
      }
      if (form.eventType === 'project_completed' && !hasCompletedProject && editTarget?.event_type !== 'project_completed') {
        setSaveError('Projekt abgeschlossen ist noch nicht vollständig. Bitte bei jedem Release dieses Projekts mindestens einen Release-Text oder ein Release-Bild der Gruppe hinterlegen.')
        return
      }
      if (form.eventType === 'collaboration' && !hasCollaboration && editTarget?.event_type !== 'collaboration') {
        setSaveError('Kooperation ist noch nicht vollständig. Bitte zuerst eine Release-Version mit mindestens zwei beteiligten Fansubgruppen anlegen.')
        return
      }
      const projectCountThreshold = PROJECT_COUNT_EVENT_THRESHOLDS[form.eventType]
      if (projectCountThreshold && completedProjectCount < projectCountThreshold && editTarget?.event_type !== form.eventType) {
        setSaveError('Projekt-Erfolg ist noch nicht freigeschaltet. Bitte zuerst genügend vollständig bearbeitete Projekte abschließen.')
        return
      }
      if (form.eventType === 'revival' && !entries.some((entry) => entry.event_type === 'hiatus') && editTarget?.event_type !== 'revival') {
        setSaveError('Wiederaufnahme ist noch nicht möglich. Bitte zuerst Pause eintragen.')
        return
      }
      setIsSaving(true)
      try {
        const yearValue = form.year.trim() !== '' ? Number(form.year) : null
        if (yearValue !== null && foundedYear && yearValue < foundedYear) {
          setSaveError('Meilenstein-Jahr darf nicht vor dem Gründungsjahr liegen.')
          return
        }
        if (yearValue !== null && yearValue > new Date().getFullYear()) {
          setSaveError('Meilenstein-Jahr darf nicht in der Zukunft liegen.')
          return
        }
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
    [form, editTarget, entries, eventOptions, fansubGroupId, foundedYear, authToken, hasWebsiteLink, hasFirstProject, hasFirstRelease, qualifiedReleaseCount, hasCompletedProject, hasCollaboration, completedProjectCount, closeForm, showSuccess],
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
  const historyMinYear = foundedYear ?? 1990
  const historyMaxYear = new Date().getFullYear()

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
          eventOptions={eventOptions}
          minYear={historyMinYear}
          maxYear={historyMaxYear}
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
          description="Füge wichtige Ereignisse wie Gründung, Leitungswechsel oder Auflösung hinzu."
        />
      ) : null}

      {!isLoading && !loadError && entries.length > 0 ? (
        <>
          <ul className={styles.historyList}>
            {visibleEntries.map((entry) => {
              const presentation = getGroupHistoryEventPresentation(entry.event_type)
              return (
              <li key={entry.id} className={styles.historyRow}>
                <span className={styles.historyYear}>{entry.year ?? '—'}</span>
                <img src={presentation.imageSrc} alt="" className={styles.historyBadgeImage} />
                <div className={styles.historyContent}>
                  <div className={styles.historyMetaRow}>
                    <Badge variant={achievementBadgeVariant(entry.event_type)}>
                      {presentation.label}
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
              )
            })}
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
