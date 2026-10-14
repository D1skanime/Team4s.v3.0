'use client'

import { ImageIcon, Trash2 } from 'lucide-react'

import { ReleaseVersionMediaCategory, ReleaseVersionMediaItem } from '@/types/releaseVersionMedia'

import { Button, Drawer, FormField, Input, Textarea, UploadDropzone } from '@/components/ui'
import { ReleaseVersionMediaReplaceControls } from './ReleaseVersionMediaReplaceControls'
import { RELEASE_REVIEW_REJECTION_CATEGORY_LABELS } from '../../../fansubs/releaseReviewPresentation'
import { resolveEditDrawerPrimaryLabel } from './ReleaseVersionMediaSection.helpers'
import styles from './ReleaseVersionMediaSection.module.css'

export interface ReleaseVersionMediaEditDrawerProps {
  selectedItem: ReleaseVersionMediaItem | null
  categoryLabel: (category: ReleaseVersionMediaCategory) => string
  editTitle: string
  editCaption: string
  editCategory: ReleaseVersionMediaCategory
  editPreviewCandidate: boolean
  stagedReplaceFile: File | null
  stagedReplacePreviewURL: string | null
  editError: string | null
  canEditSelectedItem: boolean
  canDeleteSelectedItem: boolean
  canEditPreviewCandidate: boolean
  canManageHighlights: boolean
  isRejectedEditable: boolean
  hasStagedChanges: boolean
  setEditTitle: (value: string) => void
  setEditCaption: (value: string) => void
  setEditCategory: (category: ReleaseVersionMediaCategory) => void
  onClose: () => void
  onSave: () => void
  onDelete: () => void
  onPreviewChange: (item: ReleaseVersionMediaItem, nextValue: boolean) => void
  onReplaceFileSelected: (files: File[]) => void
}

export function ReleaseVersionMediaEditDrawer({
  selectedItem,
  categoryLabel,
  editTitle,
  editCaption,
  editCategory,
  editPreviewCandidate,
  stagedReplaceFile,
  stagedReplacePreviewURL,
  editError,
  canEditSelectedItem,
  canDeleteSelectedItem,
  canEditPreviewCandidate,
  canManageHighlights,
  isRejectedEditable,
  hasStagedChanges,
  setEditTitle,
  setEditCaption,
  setEditCategory,
  onClose,
  onSave,
  onDelete,
  onPreviewChange,
  onReplaceFileSelected,
}: ReleaseVersionMediaEditDrawerProps) {
  return (
    <Drawer
      open={Boolean(selectedItem)}
      onClose={onClose}
      title={canEditSelectedItem ? 'Medium bearbeiten' : 'Medium ansehen'}
      description={selectedItem ? categoryLabel(selectedItem.category) : undefined}
      variant="responsiveSheet"
      footer={
        <>
          <Button
            variant="ghost"
            className={styles.dangerGhost}
            leftIcon={<Trash2 size={16} aria-hidden="true" />}
            onClick={onDelete}
            disabled={!canDeleteSelectedItem}
          >
            Löschen
          </Button>
          <Button
            variant="ghost"
            className={styles.accentButton}
            onClick={onSave}
            disabled={!canEditSelectedItem || (selectedItem?.review_state === 'rejected' && !hasStagedChanges)}
          >
            {resolveEditDrawerPrimaryLabel(selectedItem, hasStagedChanges)}
          </Button>
        </>
      }
    >
      {selectedItem ? (
        <div className={styles.sheetStack}>
          <div className={styles.editPreview}>
            {stagedReplacePreviewURL ? (
              <img draggable={false} src={stagedReplacePreviewURL} alt="" />
            ) : selectedItem.original_url || selectedItem.thumbnail_url ? (
              <img draggable={false} src={selectedItem.original_url ?? selectedItem.thumbnail_url ?? ''} alt="" />
            ) : (
              <ImageIcon size={28} aria-hidden="true" />
            )}
          </div>
          {editError ? <div className={styles.errorBox}>{editError}</div> : null}
          {selectedItem.review_state === 'rejected' ? (
            <div className={styles.statusHint} role="status">
              <strong>
                {RELEASE_REVIEW_REJECTION_CATEGORY_LABELS[selectedItem.rejection_category ?? 'other'] ?? 'Sonstiger Grund'}
              </strong>
              {selectedItem.rejection_reason ? <p>{selectedItem.rejection_reason}</p> : null}
            </div>
          ) : null}
          {isRejectedEditable ? <ReleaseVersionMediaReplaceControls editCategory={editCategory} onCategoryChange={setEditCategory} /> : null}
          {isRejectedEditable ? (
            <FormField label="Datei ersetzen" hint="Ersetzt die aktuell abgelehnte Datei durch eine neue Fassung. Beschreibung und Kategorie kannst du im selben Formular anpassen.">
              <UploadDropzone
                onFilesSelected={onReplaceFileSelected}
                accept="image/*"
                multiple={false}
                density="compact"
                promptLabel="Neue Datei hier hineinziehen oder antippen"
                dropHintLabel={stagedReplaceFile ? `Ausgewählt: ${stagedReplaceFile.name}` : undefined}
              />
            </FormField>
          ) : null}
          <FormField label="Titel" htmlFor="release-media-edit-title">
            <Input id="release-media-edit-title" value={editTitle} maxLength={200}
              onChange={(event) => setEditTitle(event.target.value)} disabled={!canEditSelectedItem} />
          </FormField>
          <FormField label="Beschreibung" htmlFor="release-media-edit-caption">
            <Textarea
              id="release-media-edit-caption"
              value={editCaption}
              onChange={(event) => setEditCaption(event.target.value)}
              placeholder="Kurze Beschreibung ergänzen"
              rows={4}
              disabled={!canEditSelectedItem}
            />
          </FormField>
          {canEditPreviewCandidate ? (
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={editPreviewCandidate}
                onChange={(event) => onPreviewChange(selectedItem, event.target.checked)}
                disabled={!canEditSelectedItem && !canManageHighlights}
              />
              <span>Als Vorschau markieren</span>
            </label>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  )
}
