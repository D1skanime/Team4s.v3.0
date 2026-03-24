'use client'

import Image from 'next/image'
import type { ChangeEvent, RefObject } from 'react'

import { handleCoverImgError, resolveCoverUrl } from '../../utils/anime-helpers'
import styles from '../../../admin.module.css'

interface AnimeCreateCoverFieldProps {
  inputRef: RefObject<HTMLInputElement | null>
  coverImage: string
  isSubmitting: boolean
  isUploading: boolean
  onCoverImageChange: (value: string) => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onOpenFileDialog: () => void
}

export function AnimeCreateCoverField({
  inputRef,
  coverImage,
  isSubmitting,
  isUploading,
  onCoverImageChange,
  onFileChange,
  onOpenFileDialog,
}: AnimeCreateCoverFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor="create-cover-image">Cover Image</label>
      <input
        id="create-cover-image"
        value={coverImage}
        onChange={(event) => onCoverImageChange(event.target.value)}
        disabled={isSubmitting || isUploading}
        placeholder="dateiname.jpg"
      />
      <div className={styles.coverInline}>
        <Image
          className={styles.coverPreviewSmall}
          src={resolveCoverUrl(coverImage)}
          alt=""
          width={88}
          height={132}
          unoptimized
          onError={handleCoverImgError}
        />
        <div className={styles.actions}>
          <a className={styles.buttonSecondary} href={resolveCoverUrl(coverImage)} target="_blank" rel="noreferrer">
            Cover oeffnen
          </a>
        </div>
        <div className={styles.actions}>
          <input
            ref={inputRef}
            className={styles.fileInput}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            disabled={isUploading || isSubmitting}
          />
          <button className={styles.buttonSecondary} type="button" disabled={isUploading || isSubmitting} onClick={onOpenFileDialog}>
            {isUploading ? 'Upload...' : 'Cover hochladen (lokal)'}
          </button>
        </div>
        <p className={styles.hint}>
          Hinweis: Upload ist fuer lokale Entwicklung gedacht und speichert nach <code>frontend/public/covers</code>.
        </p>
      </div>
    </div>
  )
}
