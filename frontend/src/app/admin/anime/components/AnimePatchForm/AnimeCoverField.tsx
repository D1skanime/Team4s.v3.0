import { RefObject } from 'react'

import { AnimePatchClearFlags, AnimePatchValues } from '../../types/admin-anime'
import { handleCoverImgError, resolveCoverUrl } from '../../utils/anime-helpers'
import styles from '../../../admin.module.css'

interface AnimeCoverFieldProps {
  values: AnimePatchValues
  clearFlags: AnimePatchClearFlags
  contextCoverImage?: string
  isSubmitting: boolean
  isUploadingCover: boolean
  coverFileInputRef: RefObject<HTMLInputElement>
  onFieldChange: (field: keyof AnimePatchValues, value: string) => void
  onClearFlagChange: (field: keyof AnimePatchClearFlags, value: boolean) => void
  onUploadFile: (file: File) => Promise<void>
  onRemoveCover: () => Promise<void>
}

export function AnimeCoverField({
  values,
  clearFlags,
  contextCoverImage,
  isSubmitting,
  isUploadingCover,
  coverFileInputRef,
  onFieldChange,
  onClearFlagChange,
  onUploadFile,
  onRemoveCover,
}: AnimeCoverFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor="update-cover-image">Cover Image</label>
      <input
        id="update-cover-image"
        value={values.coverImage}
        onChange={(event) => onFieldChange('coverImage', event.target.value)}
        disabled={isSubmitting || isUploadingCover || clearFlags.coverImage}
      />
      <label className={styles.nullToggle}>
        <input
          type="checkbox"
          checked={clearFlags.coverImage}
          onChange={(event) => onClearFlagChange('coverImage', event.target.checked)}
          disabled={isSubmitting || isUploadingCover}
        />
        Wert loeschen (null)
      </label>
      <div className={styles.coverInline}>
        <img
          className={styles.coverPreviewSmall}
          src={resolveCoverUrl(clearFlags.coverImage ? '' : values.coverImage || contextCoverImage)}
          alt="Cover Vorschau"
          loading="lazy"
          onError={handleCoverImgError}
        />
        <div className={styles.actions}>
          <a
            className={styles.buttonSecondary}
            href={resolveCoverUrl(clearFlags.coverImage ? '' : values.coverImage || contextCoverImage)}
            target="_blank"
            rel="noreferrer"
          >
            Cover oeffnen
          </a>
        </div>
        <div className={styles.actions}>
          <input
            ref={coverFileInputRef}
            className={styles.fileInput}
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              try {
                await onUploadFile(file)
              } finally {
                event.target.value = ''
              }
            }}
            disabled={isUploadingCover || isSubmitting}
          />
          <button
            className={styles.buttonSecondary}
            type="button"
            disabled={isUploadingCover || isSubmitting}
            onClick={() => coverFileInputRef.current?.click()}
          >
            {isUploadingCover ? 'Upload...' : 'Cover hochladen (lokal)'}
          </button>
          {contextCoverImage ? (
            <button
              className={styles.buttonSecondary}
              type="button"
              disabled={isUploadingCover || isSubmitting}
              onClick={() => {
                onFieldChange('coverImage', contextCoverImage || '')
                onClearFlagChange('coverImage', false)
              }}
            >
              Kontext-Cover einsetzen
            </button>
          ) : null}
          <button className={styles.buttonSecondary} type="button" disabled={isUploadingCover || isSubmitting} onClick={() => void onRemoveCover()}>
            Cover entfernen
          </button>
        </div>
        <p className={styles.hint}>
          Hinweis: Upload ist fuer lokale Entwicklung gedacht und speichert nach <code>frontend/public/covers</code>.
        </p>
      </div>
    </div>
  )
}
