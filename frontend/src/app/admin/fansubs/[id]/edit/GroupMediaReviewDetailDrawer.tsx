import type { Dispatch, SetStateAction } from 'react'
import { Archive, Save, X } from 'lucide-react'
import Image from 'next/image'

import { Button, Drawer, FormField, Input, Modal, Select, Textarea } from '@/components/ui'
import {
  FansubGroupMediaCategory,
  FansubGroupMediaItem,
  FansubMediaReviewStatus,
  FansubMediaVisibility,
  resolveApiUrl,
} from '@/lib/api'
import { FANSUB_MEDIA_CATEGORY_OPTIONS } from '@/lib/fansub-labels'

import styles from './GroupMediaReviewSection.module.css'

interface MediaDraft {
  visibility: FansubMediaVisibility
  review_status: FansubMediaReviewStatus
  title: string
  description: string
  alt_text: string
  category: FansubGroupMediaCategory
  sort_order: number
}

const REVIEW_STATUS_OPTIONS: Array<{ value: FansubMediaReviewStatus; label: string }> = [
  { value: 'in_pruefung', label: 'In Prüfung' },
  { value: 'freigegeben', label: 'Freigegeben' },
  { value: 'abgelehnt', label: 'Abgelehnt' },
  { value: 'archiviert', label: 'Archiviert' },
  { value: 'entfernt', label: 'Entfernt' },
]

const VISIBILITY_OPTIONS: Array<{ value: FansubMediaVisibility; label: string }> = [
  { value: 'intern', label: 'Intern' },
  { value: 'oeffentlich', label: 'Öffentlich' },
]

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

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function getDetailImageURL(item: FansubGroupMediaItem): string {
  return item.original_url || item.preview_url || item.thumbnail_url || ''
}

function getMediaDisplayTitle(item: FansubGroupMediaItem): string {
  const title = item.title?.trim()
  if (title) return title

  const date = formatDate(item.created_at)
  const suffix = date ? ` vom ${date}` : ''

  switch (item.category) {
    case 'artwork_fanart':
      return `Artwork${suffix}`
    case 'event_meeting':
      return `Treffen${suffix}`
    case 'forum':
      return `Forenbild${suffix}`
    case 'history_screenshot':
      return `Historischer Screenshot${suffix}`
    case 'irc_chat':
      return `Chatbild${suffix}`
    case 'old_website':
      return `Webseitenbild${suffix}`
    case 'gallery':
      return `Galeriebild${suffix}`
    default:
      return `Gruppenbild${suffix}`
  }
}

function getUploaderLine(item: FansubGroupMediaItem): string {
  const uploader = item.uploaded_by_display_name?.trim() || 'Unbekannt'
  const createdAt = formatDate(item.created_at)
  return createdAt ? `Hochgeladen von ${uploader} am ${createdAt}` : `Hochgeladen von ${uploader}`
}

interface GroupMediaReviewDetailDrawerProps {
  editingItem: FansubGroupMediaItem | null
  drafts: Record<number, MediaDraft>
  saveErrors: Record<number, string>
  saving: Record<number, boolean>
  canUpdate: boolean
  canUpdateOwn: boolean
  canReview: boolean
  failedDetailIds: Record<number, boolean>
  setFailedDetailIds: Dispatch<SetStateAction<Record<number, boolean>>>
  pendingDeleteItem: FansubGroupMediaItem | null
  setPendingDeleteItem: (item: FansubGroupMediaItem | null) => void
  updateDraft: <K extends keyof MediaDraft>(mediaId: number, field: K, value: MediaDraft[K]) => void
  cancelEditing: (item: FansubGroupMediaItem) => void
  handleSave: (item: FansubGroupMediaItem) => void | Promise<void>
  handleDelete: (item: FansubGroupMediaItem) => void | Promise<void>
  canDeleteMediaItem: (item: FansubGroupMediaItem) => boolean
}

export function GroupMediaReviewDetailDrawer({
  editingItem,
  drafts,
  saveErrors,
  saving,
  canUpdate,
  canUpdateOwn,
  canReview,
  failedDetailIds,
  setFailedDetailIds,
  pendingDeleteItem,
  setPendingDeleteItem,
  updateDraft,
  cancelEditing,
  handleSave,
  handleDelete,
  canDeleteMediaItem,
}: GroupMediaReviewDetailDrawerProps) {
  return (
    <>
      <Drawer
        open={editingItem !== null}
        onClose={() => {
          if (editingItem) cancelEditing(editingItem)
        }}
        title={editingItem ? getMediaDisplayTitle(editingItem) : 'Medium bearbeiten'}
        description={editingItem ? getUploaderLine(editingItem) : undefined}
        footer={
          editingItem ? (
            <div className={styles.drawerActions}>
              <Button
                variant="ghost"
                size="sm"
                className={styles.drawerCancelButton}
                leftIcon={<X size={16} />}
                disabled={saving[editingItem.id] ?? false}
                onClick={() => cancelEditing(editingItem)}
              >
                {canUpdate || (canUpdateOwn && editingItem.uploaded_by_current_user) ? 'Abbrechen' : 'Schließen'}
              </Button>
              {canUpdate || (canUpdateOwn && editingItem.uploaded_by_current_user) ? (
                <Button
                  variant="success"
                  size="sm"
                  leftIcon={<Save size={16} />}
                  disabled={saving[editingItem.id] ?? false}
                  onClick={() => void handleSave(editingItem)}
                >
                  Änderungen speichern
                </Button>
              ) : null}
            </div>
          ) : null
        }
      >
        {editingItem ? (
          <div className={styles.drawerDetail}>
            {(() => {
              const draft = drafts[editingItem.id] ?? itemToDraft(editingItem)
              const persisted = itemToDraft(editingItem)
              const detailImageURL = getDetailImageURL(editingItem)
              const displayTitle = getMediaDisplayTitle(editingItem)

              return (
                <>
                  <div className={styles.detailPreviewFrame}>
                    {detailImageURL && !failedDetailIds[editingItem.id] ? (
                      <Image
                        src={resolveApiUrl(detailImageURL)}
                        alt={persisted.alt_text || displayTitle}
                        fill
                        sizes="(max-width: 700px) 100vw, 720px"
                        unoptimized
                        loading="lazy"
                        onError={() => setFailedDetailIds((prev) => ({ ...prev, [editingItem.id]: true }))}
                      />
                    ) : (
                      <span>Keine große Vorschau</span>
                    )}
                  </div>

                  <div className={styles.detailGrid}>
                    <FormField label="Titel">
                      <Input
                        value={draft.title}
                        disabled={!(canUpdate || (canUpdateOwn && editingItem.uploaded_by_current_user))}
                        onChange={(event) => updateDraft(editingItem.id, 'title', event.target.value)}
                      />
                    </FormField>

                    <FormField label="Alternativtext">
                      <Input
                        value={draft.alt_text}
                        disabled={!(canUpdate || (canUpdateOwn && editingItem.uploaded_by_current_user))}
                        onChange={(event) => updateDraft(editingItem.id, 'alt_text', event.target.value)}
                      />
                    </FormField>
                  </div>

                  <FormField label="Beschreibung">
                    <Textarea
                      className={styles.descriptionTextarea}
                      value={draft.description}
                      disabled={!(canUpdate || (canUpdateOwn && editingItem.uploaded_by_current_user))}
                      rows={4}
                      onChange={(event) => updateDraft(editingItem.id, 'description', event.target.value)}
                    />
                  </FormField>

                  <div className={styles.detailGrid}>
                    <FormField label="Kategorie">
                      <Select
                        value={draft.category}
                        disabled={!canUpdate}
                        onChange={(event) => updateDraft(editingItem.id, 'category', event.target.value as FansubGroupMediaCategory)}
                      >
                        {FANSUB_MEDIA_CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </FormField>
                  </div>

                  <div className={styles.detailGrid}>
                    <FormField label="Sichtbarkeit">
                      <Select
                        value={draft.visibility}
                        disabled={!canUpdate}
                        onChange={(event) => updateDraft(editingItem.id, 'visibility', event.target.value as FansubMediaVisibility)}
                      >
                        {VISIBILITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </FormField>

                    <FormField label="Prüfstatus">
                      <Select
                        value={draft.review_status}
                        disabled={!canReview}
                        onChange={(event) => updateDraft(editingItem.id, 'review_status', event.target.value as FansubMediaReviewStatus)}
                      >
                        {REVIEW_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </FormField>
                  </div>

                  {saveErrors[editingItem.id] ? <p className={styles.inlineError} role="alert">{saveErrors[editingItem.id]}</p> : null}

                  {canDeleteMediaItem(editingItem) ? (
                    <div className={styles.dangerZone}>
                      <div className={styles.dangerZoneText}>
                        <strong>Aus Gruppenmedien entfernen</strong>
                        <p>Entfernt die Zuordnung aus dieser Gruppenverwaltung. Datei und Asset werden nicht endgültig gelöscht.</p>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<Archive size={16} />}
                        disabled={saving[editingItem.id] ?? false}
                        onClick={() => setPendingDeleteItem(editingItem)}
                      >
                        Aus Gruppenmedien entfernen
                      </Button>
                    </div>
                  ) : null}
                </>
              )
            })()}
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={pendingDeleteItem !== null}
        onClose={() => {
          if (!pendingDeleteItem || saving[pendingDeleteItem.id]) return
          setPendingDeleteItem(null)
        }}
        title="Medium aus Gruppenmedien entfernen"
        description="Die Zuordnung wird aus der Gruppenverwaltung entfernt. Datei und Asset werden nicht endgültig gelöscht."
        footer={
          <div className={styles.modalActions}>
            <Button
              variant="secondary"
              size="sm"
              disabled={pendingDeleteItem ? saving[pendingDeleteItem.id] ?? false : false}
              onClick={() => setPendingDeleteItem(null)}
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Archive size={16} />}
              loading={pendingDeleteItem ? saving[pendingDeleteItem.id] ?? false : false}
              onClick={() => {
                if (pendingDeleteItem) void handleDelete(pendingDeleteItem)
              }}
            >
              Aus Gruppenmedien entfernen
            </Button>
          </div>
        }
      >
        <p className={styles.modalText}>
          {pendingDeleteItem ? `${getMediaDisplayTitle(pendingDeleteItem)} wird aus den Gruppenmedien entfernt.` : ''}
        </p>
      </Modal>
    </>
  )
}
