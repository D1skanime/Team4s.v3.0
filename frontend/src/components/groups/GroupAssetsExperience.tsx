'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Play } from 'lucide-react'

import VideoPlayerModal from '@/app/episodes/[id]/components/VideoPlayerModal'
import { FansubMediaLightbox } from '@/components/fansubs/FansubMediaLightbox'
import { GroupAssetImage, GroupAssetMedia, GroupAssetMediaType, GroupEpisodeAssets } from '@/types/groupAsset'
import { MediaAsset } from '@/types/mediaAsset'
import { resolvePublicApiUrl } from '@/lib/publicApiUrl'

import { toGroupAssetLightboxItem } from './groupAssetMediaMapping'
import styles from './GroupAssetsExperience.module.css'

interface GroupAssetsExperienceProps {
  animeID: number
  groupID: number
  episodes: GroupEpisodeAssets[]
  errorMessage?: string | null
}

const TYPE_LABELS: Record<GroupAssetMediaType, string> = {
  opening: 'Opening',
  ending: 'Ending',
  karaoke: 'Karaoke',
  insert: 'Insert',
}

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
  return resolvePublicApiUrl(path)
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
  errorMessage = null,
}: GroupAssetsExperienceProps) {
  const [openGallery, setOpenGallery] = useState<{ images: GroupAssetImage[]; index: number } | null>(null)
  const [playingAsset, setPlayingAsset] = useState<MediaAsset | null>(null)
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)

  const hasEpisodes = episodes.length > 0
  const episodeCountLabel = useMemo(() => `${episodes.length} Episodenbereiche`, [episodes.length])

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
              Episodenübersicht
            </h2>
            <p className={styles.groupAssetsText}>
              Bilder werden als Galerie angezeigt. Opening, Ending, Karaoke und Inserts erscheinen separat als
              abspielbare Assets.
            </p>
          </div>
          {hasEpisodes ? <p className={styles.groupAssetsMeta}>{episodeCountLabel}</p> : null}
        </div>

        {errorMessage ? <div className={styles.stateBox}>Medien konnten gerade nicht geladen werden.</div> : null}

        {episodes.map((episode) => {
          const releaseTitle = episode.title?.trim() || `Assets aus ${episode.folder_name}`
          const detailHref =
            episode.episode_id && episode.release_id
              ? `/episodes/${episode.episode_id}?releaseId=${episode.release_id}&animeId=${animeID}&groupId=${groupID}`
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
                        onClick={() => setOpenGallery({ images: episode.images, index })}
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

      <FansubMediaLightbox
        media={openGallery ? openGallery.images.map(toGroupAssetLightboxItem) : []}
        index={openGallery ? openGallery.index : null}
        onClose={() => setOpenGallery(null)}
        onNavigate={(index) => setOpenGallery((current) => (current ? { ...current, index } : null))}
      />

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
