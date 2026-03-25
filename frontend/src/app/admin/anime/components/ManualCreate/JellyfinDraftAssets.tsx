'use client'

import styles from '../../../admin.module.css'
import type { AdminJellyfinIntakeAssetSlots } from '@/types/admin'
import { resolveJellyfinIntakeAssetUrl } from '../../utils/jellyfin-intake-assets'

type JellyfinDraftAssetKind = keyof AdminJellyfinIntakeAssetSlots

interface JellyfinDraftAssetsProps {
  animeTitle: string
  assetSlots: AdminJellyfinIntakeAssetSlots
  onRemoveAsset: (kind: JellyfinDraftAssetKind) => void
}

function slotLabel(kind: JellyfinDraftAssetKind): string {
  switch (kind) {
    case 'cover':
      return 'Poster'
    case 'logo':
      return 'Logo'
    case 'banner':
      return 'Banner'
    case 'background':
      return 'Background'
    case 'background_video':
      return 'Background-Video'
  }
}

function missingSlotLabel(kind: JellyfinDraftAssetKind): string {
  switch (kind) {
    case 'cover':
      return 'Kein Jellyfin-Poster gefunden'
    case 'logo':
      return 'Kein Jellyfin-Logo gefunden'
    case 'banner':
      return 'Kein Jellyfin-Banner gefunden'
    case 'background':
      return 'Kein Jellyfin-Background gefunden'
    case 'background_video':
      return 'Kein Jellyfin-Background-Video gefunden'
  }
}

function renderAssetPreview(animeTitle: string, kind: JellyfinDraftAssetKind, url?: string) {
  const resolvedUrl = resolveJellyfinIntakeAssetUrl(url)
  if (!resolvedUrl) {
    return <p className={styles.hint}>{missingSlotLabel(kind)}</p>
  }

  if (kind === 'background_video') {
    return (
      <div className={styles.details}>
        <strong>{slotLabel(kind)}</strong>
        <p className={styles.hint}>Jellyfin-Quelle fuer {animeTitle}</p>
        <a className={styles.buttonSecondary} href={resolvedUrl} target="_blank" rel="noreferrer">
          Videoquelle oeffnen
        </a>
      </div>
    )
  }

  return (
    <div className={styles.coverInline}>
      <img
        className={styles.coverPreviewSmall}
        src={resolvedUrl}
        alt={`${slotLabel(kind)} von Jellyfin fuer ${animeTitle}`}
      />
      <p className={styles.hint}>Jellyfin-Quelle fuer {animeTitle}</p>
    </div>
  )
}

export function JellyfinDraftAssets({ animeTitle, assetSlots, onRemoveAsset }: JellyfinDraftAssetsProps) {
  const kinds: JellyfinDraftAssetKind[] = ['cover', 'logo', 'banner', 'background', 'background_video']

  return (
    <section className={styles.panel}>
      <h2>Jellyfin-Medien im Entwurf</h2>
      <p className={styles.hint}>
        Diese Vorschau bleibt unverbindlich. Erst die zentrale Save-Bar legt wirklich einen Anime an.
      </p>
      <div className={styles.gridTwo}>
        {kinds.map((kind) => {
          const slot = assetSlots[kind]
          return (
            <div key={kind} className={styles.details}>
              <strong>{slotLabel(kind)}</strong>
              {slot.present ? renderAssetPreview(animeTitle, kind, slot.url) : <p className={styles.hint}>{missingSlotLabel(kind)}</p>}
              <div className={styles.actions}>
                <button
                  className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
                  type="button"
                  disabled={!slot.present}
                  onClick={() => onRemoveAsset(kind)}
                >
                  Aus Entwurf entfernen
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
