'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react'

import VideoPlayerModal from '@/app/episodes/[id]/components/VideoPlayerModal'
import { GroupAssetImage, GroupAssetMedia, GroupEpisodeAssets } from '@/types/groupAsset'
import { EpisodeReleaseSummary } from '@/types/group'
import { MediaAsset, MediaAssetType } from '@/types/mediaAsset'

import styles from './GroupAssetsExperience.module.css'

interface GroupAssetsExperienceProps {
  animeID: number
  groupID: number
  episodes: GroupEpisodeAssets[]
  folderFound: boolean
  releaseEpisodes: EpisodeReleaseSummary[]
  errorMessage?: string | null
}

const TYPE_LABELS: Record<MediaAssetType, string> = {
  opening: 'Opening',
  ending: 'Ending',
  karaoke: 'Karaoke',
  insert: 'Insert',
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').trim() || 'http://localhost:8092'

function formatEpisodeNumber(value: number): string {
  return value.toString().padStart(2, '0')
}

function formatDuration(seconds?: number | null): string | null {
  if (typeof seconds !== 'number' || seconds <= 0) {
    return null
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function resolveApiUrl(path?: string | null): string {
  const trimmed = (path || '').trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `${API_BASE_URL}${trimmed}`
}

function toPlayableAsset(asset: GroupAssetMedia): MediaAsset {
  return {
    id: asset.id,
    type: asset.type,
    title: asset.title,
    duration_seconds: asset.duration_seconds,
    thumbnail_url: asset.thumbnail_url ?? null,
    order: asset.order,
    stream_path: asset.stream_path,
  }
}

export function GroupAssetsExperience({
  animeID,
  groupID,
  episodes,
  folderFound,
  releaseEpisodes,
  errorMessage = null,
}: GroupAssetsExperienceProps) {
  const [lightboxImages, setLightboxImages] = useState<GroupAssetImage[]>([])
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [playingAsset, setPlayingAsset] = useState<MediaAsset | null>(null)
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const releaseByEpisode = useMemo(
    () => new Map(releaseEpisodes.map((release) => [release.episode_number, release])),
    [releaseEpisodes],
  )

  const hasEpisodes = episodes.length > 0
  const lightboxOpen = lightboxImages.length > 0
  const activeImage = lightboxImages[activeImageIndex] ?? null
  const episodeCountLabel = useMemo(() => `${episodes.length} Episodenbereiche`, [episodes.length])

  useEffect(() => {
    if (!lightboxOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          setLightboxImages([])
          break
        case 'ArrowLeft':
          event.preventDefault()
          setActiveImageIndex((current) => Math.max(0, current - 1))
          break
        case 'ArrowRight':
          event.preventDefault()
          setActiveImageIndex((current) => Math.min(lightboxImages.length - 1, current + 1))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxImages.length, lightboxOpen])

  const openGallery = (images: GroupAssetImage[], index: number) => {
    setLightboxImages(images)
    setActiveImageIndex(index)
  }

  const openVideo = (asset: GroupAssetMedia) => {
    setPlayingAsset(toPlayableAsset(asset))
    setIsPlayerOpen(true)
  }

  return (
    <>
      <section className={styles.groupAssetsSection} aria-labelledby="group-assets-title">
        <div className={styles.groupAssetsHeader}>
          <div>
            <h2 id="group-assets-title" className={styles.groupAssetsTitle}>
              Episodenuebersicht
            </h2>
            <p className={styles.groupAssetsText}>
              Bilder werden als Galerie angezeigt. Opening, Ending, Karaoke und Inserts erscheinen separat als
              abspielbare Assets.
            </p>
          </div>
          {hasEpisodes ? <p className={styles.groupAssetsMeta}>{episodeCountLabel}</p> : null}
        </div>

        {errorMessage ? <div className={styles.stateBox}>{errorMessage}</div> : null}
        {!errorMessage && !folderFound ? (
          <div className={styles.stateBox}>Fuer diese Gruppenversion wurde noch kein Subgroups-Ordner erkannt.</div>
        ) : null}
        {!errorMessage && folderFound && !hasEpisodes ? (
          <div className={styles.stateBox}>Der Gruppenordner ist vorhanden, enthaelt aber noch keine Episoden-Assets.</div>
        ) : null}

        {episodes.map((episode) => {
          const release = releaseByEpisode.get(episode.episode_number) || null
          const releaseTitle = release?.title?.trim() || `Assets aus ${episode.folder_name}`
          const detailHref =
            release?.episode_id && release.id
              ? `/episodes/${release.episode_id}?releaseId=${release.id}&animeId=${animeID}&groupId=${groupID}`
              : null

          return (
            <article key={episode.episode_number} className={styles.episodeCard}>
              <div className={styles.episodeHeader}>
                <div>
                  <p className={styles.episodeEyebrow}>Episode {formatEpisodeNumber(episode.episode_number)}</p>
                  <h3 className={styles.episodeTitle}>{releaseTitle}</h3>
                </div>
                {detailHref ? (
                  <Link href={detailHref} className={styles.detailsLink}>
                    Details
                  </Link>
                ) : null}
              </div>

              {episode.images.length > 0 ? (
                <div className={styles.galleryBlock}>
                  <div className={styles.blockHeader}>
                    <h4 className={styles.blockTitle}>Bilder</h4>
                    <span className={styles.blockCount}>{episode.images.length}</span>
                  </div>
                  <div className={styles.imageGrid}>
                    {episode.images.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        className={styles.imageButton}
                        onClick={() => openGallery(episode.images, index)}
                        aria-label={`${image.title} gross anzeigen`}
                      >
                        <img src={resolveApiUrl(image.thumbnail_url)} alt={image.title} className={styles.imageThumbnail} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {episode.media_assets.length > 0 ? (
                <div className={styles.mediaBlock}>
                  <div className={styles.blockHeader}>
                    <h4 className={styles.blockTitle}>Weitere Assets</h4>
                    <span className={styles.blockCount}>{episode.media_assets.length}</span>
                  </div>
                  <div className={styles.mediaGrid}>
                    {episode.media_assets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        className={styles.mediaCard}
                        onClick={() => openVideo(asset)}
                        aria-label={`${TYPE_LABELS[asset.type]} ${asset.title} abspielen`}
                      >
                        <div className={styles.mediaThumbWrap}>
                          {asset.thumbnail_url ? (
                            <img src={resolveApiUrl(asset.thumbnail_url)} alt={asset.title} className={styles.mediaThumb} />
                          ) : (
                            <div className={styles.mediaThumbPlaceholder}>Asset</div>
                          )}
                          <span className={styles.playBadge}>
                            <Play size={18} fill="currentColor" />
                          </span>
                        </div>
                        <div className={styles.mediaInfo}>
                          <p className={styles.mediaType}>{TYPE_LABELS[asset.type]}</p>
                          <p className={styles.mediaTitle}>{asset.title}</p>
                          {formatDuration(asset.duration_seconds) ? (
                            <p className={styles.mediaMeta}>{formatDuration(asset.duration_seconds)}</p>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}
      </section>

      {lightboxOpen && activeImage ? (
        <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label="Bildansicht" onClick={() => setLightboxImages([])}>
          <div className={styles.lightboxContent} onClick={(event) => event.stopPropagation()}>
            <img src={resolveApiUrl(activeImage.image_url)} alt={activeImage.title} className={styles.lightboxImage} />
            <button type="button" className={styles.closeButton} onClick={() => setLightboxImages([])} aria-label="Schliessen">
              <X size={22} />
            </button>
            <button
              type="button"
              className={`${styles.navButton} ${styles.navButtonLeft}`}
              onClick={() => setActiveImageIndex((current) => Math.max(0, current - 1))}
              disabled={activeImageIndex === 0}
              aria-label="Vorheriges Bild"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              className={`${styles.navButton} ${styles.navButtonRight}`}
              onClick={() => setActiveImageIndex((current) => Math.min(lightboxImages.length - 1, current + 1))}
              disabled={activeImageIndex >= lightboxImages.length - 1}
              aria-label="Naechstes Bild"
            >
              <ChevronRight size={22} />
            </button>
            <div className={styles.lightboxMeta}>
              <span>{activeImage.title}</span>
              <span>
                {activeImageIndex + 1} / {lightboxImages.length}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <VideoPlayerModal
        key={playingAsset?.id ?? 'closed'}
        isOpen={isPlayerOpen}
        asset={playingAsset}
        onClose={() => {
          setIsPlayerOpen(false)
          setPlayingAsset(null)
        }}
      />
    </>
  )
}
