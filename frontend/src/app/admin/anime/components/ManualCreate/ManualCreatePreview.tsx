'use client'

import Image from 'next/image'

import styles from '../../../admin.module.css'
import { resolveCoverUrl, handleCoverImgError } from '../../utils/anime-helpers'

interface ManualCreatePreviewProps {
  title: string
  coverImage: string
}

export function ManualCreatePreview({ title, coverImage }: ManualCreatePreviewProps) {
  const previewTitle = title.trim() || 'Unbenannter Anime-Entwurf'
  const previewCover = coverImage.trim()

  return (
    <section className={styles.panel}>
      <h2>Vorschau vor dem Speichern</h2>
      <p className={styles.hint}>Der Anime wird erst beim finalen Speichern angelegt.</p>
      <div className={styles.coverRow}>
        <Image
          className={styles.coverPreview}
          src={resolveCoverUrl(previewCover)}
          alt=""
          width={140}
          height={210}
          unoptimized
          onError={handleCoverImgError}
        />
        <div className={styles.coverMeta}>
          <strong>{previewTitle}</strong>
          <span>{previewCover ? previewCover : 'Noch kein Cover ausgewaehlt'}</span>
        </div>
      </div>
    </section>
  )
}
