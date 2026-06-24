'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Save, Trash2, UploadCloud } from 'lucide-react'
import Image from 'next/image'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  SectionHeader,
  Select,
  Textarea,
  Toolbar,
} from '@/components/ui'
import {
  ApiError,
  FansubGroupMediaCategory,
  FansubGroupMediaItem,
  FansubMediaReviewStatus,
  FansubMediaVisibility,
  deleteFansubGroupMedia,
  listFansubGroupMedia,
  patchFansubMediaReview,
  resolveApiUrl,
  uploadFansubGroupMedia,
} from '@/lib/api'
import type { FansubGroupCapabilities } from '@/types/fansub'

import styles from './GroupMediaReviewSection.module.css'

interface GroupMediaReviewSectionProps {
  fansubId: number
  capabilities: FansubGroupCapabilities
}

interface MediaDraft {
  visibility: FansubMediaVisibility
  review_status: FansubMediaReviewStatus
  title: string
  description: string
  alt_text: string
  category: FansubGroupMediaCategory
  sort_order: number
}

const CATEGORY_OPTIONS: Array<{ value: FansubGroupMediaCategory; label: string }> = [
  { value: 'gallery', label: 'Galerie' },
  { value: 'history_screenshot', label: 'Historische Screenshots' },
  { value: 'old_website', label: 'Alte Webseite' },
  { value: 'forum', label: 'Forum' },
  { value: 'irc_chat', label: 'IRC / Chat' },
  { value: 'event_meeting', label: 'Event / Treffen' },
  { value: 'artwork_fanart', label: 'Artwork / Fanart' },
  { value: 'other', label: 'Sonstiges' },
]

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

function itemToDraft(item: FansubGroupMediaItem): MediaDraft {
  return {
    visibility: item.visibility ?? 'intern',
    review_status: item.review_status ?? 'in_pruefung',
    title: item.title ?? '',
    description: item.description ?? '',
    alt_text: item.alt_text ?? '',
    category: item.category ?? 'other',
    sort_order: item.sort_order ?? 0,
  }
}

export function GroupMediaReviewSection({ fansubId, capabilities }: GroupMediaReviewSectionProps) {
  const canUseMedia =
    capabilities.can_view_group_media ||
    capabilities.can_upload_group_media ||
    capabilities.can_update_group_media ||
    capabilities.can_delete_group_media ||
    capabilities.can_edit_group
  if (!canUseMedia) return null

  return <GroupMediaReviewSectionInner fansubId={fansubId} capabilities={capabilities} />
}

function GroupMediaReviewSectionInner({
  fansubId,
  capabilities,
}: {
  fansubId: number
  capabilities: FansubGroupCapabilities
}) {
  const [mediaItems, setMediaItems] = useState<FansubGroupMediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<number, MediaDraft>>({})
  const [saveErrors, setSaveErrors] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadCategory, setUploadCategory] = useState<FansubGroupMediaCategory>('gallery')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const canUpdate = capabilities.can_update_group_media || capabilities.can_edit_group
  const canUpload = capabilities.can_upload_group_media || capabilities.can_edit_group
  const canDelete = capabilities.can_delete_group_media || capabilities.can_edit_group

  const loadMedia = useCallback(async () => {
    try {
      setIsLoading(true)
      setLoadError(null)
      const items = await listFansubGroupMedia(fansubId, undefined)
      setMediaItems(items)
      setDrafts(Object.fromEntries(items.map((item) => [item.id, itemToDraft(item)])))
    } catch (err) {
      setLoadError(readErrorMessage(err, 'Medien konnten nicht geladen werden.'))
    } finally {
      setIsLoading(false)
    }
  }, [fansubId])

  useEffect(() => {
    void loadMedia()
  }, [loadMedia])

  const selectedFileNames = useMemo(
    () => selectedFiles.map((file) => file.name).join(', '),
    [selectedFiles],
  )

  function updateDraft<K extends keyof MediaDraft>(mediaId: number, field: K, value: MediaDraft[K]) {
    setDrafts((prev) => ({
      ...prev,
      [mediaId]: {
        ...prev[mediaId],
        [field]: value,
      },
    }))
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) return
    setUploadError(null)
    setUploadProgress(0)
    try {
      const response = await uploadFansubGroupMedia({
        fansubID: fansubId,
        files: selectedFiles,
        category: uploadCategory,
        visibilityCode: 'private',
        reviewStatusCode: 'in_review',
        onProgress: setUploadProgress,
      })
      const failed = response.results.filter((result) => result.status === 'failed')
      if (failed.length > 0) {
        setUploadError(failed.map((result) => `${result.client_file_name}: ${result.message ?? 'Upload fehlgeschlagen'}`).join('\n'))
      } else {
        setToast('Medien hochgeladen.')
        setSelectedFiles([])
      }
      await loadMedia()
    } catch (err) {
      setUploadError(readErrorMessage(err, 'Upload fehlgeschlagen.'))
    } finally {
      setUploadProgress(null)
      setTimeout(() => setToast(null), 3500)
    }
  }

  async function handleSave(item: FansubGroupMediaItem) {
    const draft = drafts[item.id]
    if (!draft || !canUpdate) return
    setSaveErrors((prev) => ({ ...prev, [item.id]: '' }))
    setSaving((prev) => ({ ...prev, [item.id]: true }))

    try {
      await patchFansubMediaReview(fansubId, item.id, {
        visibility: draft.visibility,
        review_status: draft.review_status,
        title: draft.title.trim() || null,
        description: draft.description.trim() || null,
        alt_text: draft.alt_text.trim() || null,
        category: draft.category,
        sort_order: draft.sort_order,
      }, undefined)
      setToast('Änderungen gespeichert.')
      await loadMedia()
      setTimeout(() => setToast(null), 3500)
    } catch (err) {
      setSaveErrors((prev) => ({
        ...prev,
        [item.id]: readErrorMessage(err, 'Änderungen konnten nicht gespeichert werden.'),
      }))
    } finally {
      setSaving((prev) => ({ ...prev, [item.id]: false }))
    }
  }

  async function handleDelete(item: FansubGroupMediaItem) {
    if (!canDelete) return
    setSaving((prev) => ({ ...prev, [item.id]: true }))
    try {
      await deleteFansubGroupMedia(fansubId, item.id)
      setToast('Medium entfernt.')
      await loadMedia()
      setTimeout(() => setToast(null), 3500)
    } catch (err) {
      setSaveErrors((prev) => ({
        ...prev,
        [item.id]: readErrorMessage(err, 'Medium konnte nicht entfernt werden.'),
      }))
    } finally {
      setSaving((prev) => ({ ...prev, [item.id]: false }))
    }
  }

  if (isLoading) {
    return <LoadingState title="Medien werden geladen..." description="Gruppenmedien werden abgerufen." />
  }

  if (loadError) {
    return <ErrorState title="Fehler beim Laden" description={loadError} />
  }

  return (
    <Card variant="section" className={styles.reviewSection}>
      <Toolbar
        leading={
          <SectionHeader
            title="Medien prüfen"
            description="Galerie, historische Screenshots und Erinnerungsmedien der Gruppe verwalten."
          />
        }
      />

      {toast ? <p className={styles.toastSuccess} role="status">{toast}</p> : null}

      {canUpload ? (
        <Card variant="nested" className={styles.uploadPanel}>
          <FormField label="Kategorie">
            <Select
              value={uploadCategory}
              onChange={(event) => setUploadCategory(event.target.value as FansubGroupMediaCategory)}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Dateien">
            <Input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => setSelectedFiles(Array.from(event.currentTarget.files ?? []))}
            />
          </FormField>
          {selectedFileNames ? <p className={styles.fileHint}>{selectedFileNames}</p> : null}
          {uploadProgress !== null ? <p className={styles.fileHint}>Upload: {Math.round(uploadProgress)}%</p> : null}
          {uploadError ? <p className={styles.inlineError} role="alert">{uploadError}</p> : null}
          <div className={styles.cardFooterActions}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UploadCloud size={16} />}
              disabled={selectedFiles.length === 0 || uploadProgress !== null}
              onClick={() => void handleUpload()}
            >
              Hochladen
            </Button>
          </div>
        </Card>
      ) : null}

      {mediaItems.length === 0 ? (
        <EmptyState
          title="Keine Medien vorhanden"
          description="Für diese Gruppe sind noch keine Medien angelegt."
        />
      ) : (
        <div className={styles.mediaReviewGrid}>
          {mediaItems.map((item) => {
            const draft = drafts[item.id]
            if (!draft) return null

            return (
              <Card key={item.id} variant="nested" className={styles.mediaCard}>
                {!item.owner_consistent ? (
                  <div className={styles.ownerFlagRow}>
                    <Badge variant="warning">Owner-Zuordnung prüfen</Badge>
                  </div>
                ) : null}

                {item.preview_url ? (
                  <div className={styles.previewFrame}>
                    <Image
                      src={resolveApiUrl(item.preview_url)}
                      alt={draft.alt_text || draft.title || 'Gruppenmedium'}
                      fill
                      sizes="(max-width: 600px) 100vw, 320px"
                      unoptimized
                    />
                  </div>
                ) : null}

                <div className={styles.mediaCardBody}>
                  <div className={styles.metaRow}>
                    <Badge variant="neutral">{CATEGORY_OPTIONS.find((option) => option.value === draft.category)?.label ?? 'Sonstiges'}</Badge>
                    <span>{item.uploaded_by_display_name ?? 'Unbekannt'}</span>
                  </div>

                  <FormField label="Titel">
                    <Input
                      value={draft.title}
                      disabled={!canUpdate}
                      onChange={(event) => updateDraft(item.id, 'title', event.target.value)}
                    />
                  </FormField>

                  <FormField label="Beschreibung">
                    <Textarea
                      value={draft.description}
                      disabled={!canUpdate}
                      rows={3}
                      onChange={(event) => updateDraft(item.id, 'description', event.target.value)}
                    />
                  </FormField>

                  <FormField label="Alternativtext">
                    <Input
                      value={draft.alt_text}
                      disabled={!canUpdate}
                      onChange={(event) => updateDraft(item.id, 'alt_text', event.target.value)}
                    />
                  </FormField>

                  <div className={styles.controlGrid}>
                    <FormField label="Kategorie">
                      <Select
                        value={draft.category}
                        disabled={!canUpdate}
                        onChange={(event) => updateDraft(item.id, 'category', event.target.value as FansubGroupMediaCategory)}
                      >
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </FormField>

                    <FormField label="Sortierung">
                      <Input
                        type="number"
                        min={0}
                        value={draft.sort_order}
                        disabled={!canUpdate}
                        onChange={(event) => updateDraft(item.id, 'sort_order', Number(event.target.value))}
                      />
                    </FormField>
                  </div>

                  <div className={styles.controlGrid}>
                    <FormField label="Sichtbarkeit">
                      <Select
                        value={draft.visibility}
                        disabled={!canUpdate}
                        onChange={(event) => updateDraft(item.id, 'visibility', event.target.value as FansubMediaVisibility)}
                      >
                        <option value="intern">Intern</option>
                        <option value="oeffentlich">Öffentlich</option>
                      </Select>
                    </FormField>

                    <FormField label="Prüfstatus">
                      <Select
                        value={draft.review_status}
                        disabled={!canUpdate}
                        onChange={(event) => updateDraft(item.id, 'review_status', event.target.value as FansubMediaReviewStatus)}
                      >
                        <option value="in_pruefung">In Prüfung</option>
                        <option value="freigegeben">Freigegeben</option>
                        <option value="abgelehnt">Abgelehnt</option>
                        <option value="archiviert">Archiviert</option>
                        <option value="entfernt">Entfernt</option>
                      </Select>
                    </FormField>
                  </div>

                  {saveErrors[item.id] ? <p className={styles.inlineError} role="alert">{saveErrors[item.id]}</p> : null}
                </div>

                <div className={styles.cardFooterActions}>
                  {canDelete ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 size={16} />}
                      disabled={saving[item.id] ?? false}
                      onClick={() => void handleDelete(item)}
                    >
                      Entfernen
                    </Button>
                  ) : null}
                  {canUpdate ? (
                    <Button
                      variant="success"
                      size="sm"
                      leftIcon={<Save size={16} />}
                      disabled={saving[item.id] ?? false}
                      onClick={() => void handleSave(item)}
                    >
                      Änderungen speichern
                    </Button>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </Card>
  )
}
