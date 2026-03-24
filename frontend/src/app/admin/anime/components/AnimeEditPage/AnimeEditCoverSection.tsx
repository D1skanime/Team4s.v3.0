'use client'

import Image from 'next/image'
import type { ChangeEvent, DragEvent, RefObject } from 'react'

import { handleCoverImgError } from '../../utils/anime-helpers'
import styles from '../../AdminStudio.module.css'
import workspaceStyles from './AnimeEditWorkspace.module.css'

interface AnimeEditCoverSectionProps {
  coverFileInputRef: RefObject<HTMLInputElement | null>
  resolvedCover: string
  isDragOver: boolean
  isSubmitting: boolean
  isUploadingCover: boolean
  onDragOver: (event: DragEvent<HTMLButtonElement>) => void
  onDragLeave: () => void
  onDrop: (event: DragEvent<HTMLButtonElement>) => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onOpenFileDialog: () => void
  onRemoveCover: () => void
}

export function AnimeEditCoverSection({
  coverFileInputRef,
  resolvedCover,
  isDragOver,
  isSubmitting,
  isUploadingCover,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onOpenFileDialog,
  onRemoveCover,
}: AnimeEditCoverSectionProps) {
  return (
    <section className={`${styles.card} ${workspaceStyles.sectionCard}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Cover Management</h2>
          <p className={styles.sectionMeta}>Vorschau, Upload und schnelle Cover-Aktionen in einer klaren Card.</p>
        </div>
      </div>
      <div className={workspaceStyles.coverLayout}>
        <Image
          className={workspaceStyles.coverPreview}
          src={resolvedCover}
          alt="Cover Vorschau"
          width={280}
          height={420}
          unoptimized
          onError={handleCoverImgError}
        />
        <div className={workspaceStyles.uploadColumn}>
          <button
            type="button"
            className={`${workspaceStyles.dropZone} ${isDragOver ? workspaceStyles.dropZoneActive : ''}`}
            onClick={onOpenFileDialog}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <p className={workspaceStyles.dropZoneTitle}>Datei ablegen oder klicken</p>
            <p className={workspaceStyles.dropZoneMeta}>Unterstuetzt: jpg, jpeg, png, webp, gif</p>
          </button>
          <input
            ref={coverFileInputRef}
            className={workspaceStyles.hiddenInput}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
            onChange={onFileChange}
          />
          <div className={styles.actionsRow}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonPrimary}`}
              disabled={isSubmitting || isUploadingCover}
              onClick={onOpenFileDialog}
            >
              {isUploadingCover ? 'Upload laeuft...' : 'Cover hochladen'}
            </button>
            <a className={`${styles.button} ${styles.buttonGhost}`} href={resolvedCover} target="_blank" rel="noreferrer">
              Cover oeffnen
            </a>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonDanger}`}
              disabled={isSubmitting || isUploadingCover}
              onClick={onRemoveCover}
            >
              Cover entfernen
            </button>
          </div>
          <p className={workspaceStyles.helperText}>Lokale Uploads sind fuer das Dev-Setup gedacht und bleiben bewusst nachrangig.</p>
        </div>
      </div>
    </section>
  )
}
