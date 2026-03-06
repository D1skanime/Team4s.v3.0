'use client'

import { useEffect, useState } from 'react'
import { Play, Film } from 'lucide-react'

import { ApiError, getReleaseAssets } from '@/lib/api'
import { MediaAsset, MediaAssetType, MediaAssetsByType } from '@/types/mediaAsset'
import VideoPlayerModal from '../VideoPlayerModal'

import styles from './MediaAssetsSection.module.css'

interface MediaAssetsSectionProps {
  releaseId?: number
  assets?: MediaAsset[]
  errorMessage?: string | null
}

const TYPE_LABELS: Record<MediaAssetType, string> = {
  opening: 'Opening',
  ending: 'Ending',
  karaoke: 'Karaoke',
  insert: 'Insert',
}

const TYPE_ICON_CLASSES: Record<MediaAssetType, string> = {
  opening: styles.typeIconOpening,
  ending: styles.typeIconEnding,
  karaoke: styles.typeIconKaraoke,
  insert: styles.typeIconInsert,
}

const INITIAL_VISIBLE_COUNT = 2

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function groupAssetsByType(assets: MediaAsset[]): MediaAssetsByType {
  const grouped: MediaAssetsByType = {
    opening: [],
    ending: [],
    karaoke: [],
    insert: [],
  }

  for (const asset of assets) {
    if (asset.type in grouped) {
      grouped[asset.type].push(asset)
    }
  }

  // Sort by order within each type
  for (const type of Object.keys(grouped) as MediaAssetType[]) {
    grouped[type].sort((a, b) => a.order - b.order)
  }

  return grouped
}

interface AssetTileProps {
  asset: MediaAsset
  onPlay: (asset: MediaAsset) => void
}

function AssetTile({ asset, onPlay }: AssetTileProps) {
  return (
    <div
      className={styles.assetTile}
      onClick={() => onPlay(asset)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onPlay(asset)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${asset.title} abspielen`}
    >
      <div className={styles.thumbnailContainer}>
        {asset.thumbnail_url ? (
          <img src={asset.thumbnail_url} alt={asset.title} className={styles.thumbnail} />
        ) : (
          <div className={styles.thumbnailPlaceholder}>
            <Film size={32} />
          </div>
        )}
        <div className={styles.playButtonOverlay}>
          <Play size={24} fill="currentColor" />
        </div>
      </div>
      <div className={styles.assetInfo}>
        <div className={styles.assetTitle} title={asset.title}>
          {asset.title}
        </div>
        <div className={styles.assetDuration}>
          {typeof asset.duration_seconds === 'number' ? formatDuration(asset.duration_seconds) : 'Dauer unbekannt'}
        </div>
      </div>
    </div>
  )
}

interface TypeGroupProps {
  type: MediaAssetType
  assets: MediaAsset[]
  onPlayAsset: (asset: MediaAsset) => void
}

function TypeGroup({ type, assets, onPlayAsset }: TypeGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (assets.length === 0) {
    return null
  }

  const visibleAssets = isExpanded ? assets : assets.slice(0, INITIAL_VISIBLE_COUNT)
  const remainingCount = assets.length - INITIAL_VISIBLE_COUNT
  const showExpandButton = remainingCount > 0

  const expandButtonId = `expand-${type}`
  const gridId = `grid-${type}`

  return (
    <div className={styles.typeGroup}>
      <div className={styles.typeHeader}>
        <div className={`${styles.typeIcon} ${TYPE_ICON_CLASSES[type]}`}>
          {type === 'opening' && 'OP'}
          {type === 'ending' && 'ED'}
          {type === 'karaoke' && 'K'}
          {type === 'insert' && 'IN'}
        </div>
        <h3 className={styles.typeTitle}>{TYPE_LABELS[type]}</h3>
        <span className={styles.typeCount}>{assets.length}</span>
      </div>
      <div className={styles.assetGrid} id={gridId}>
        {visibleAssets.map((asset) => (
          <AssetTile key={asset.id} asset={asset} onPlay={onPlayAsset} />
        ))}
      </div>
      {showExpandButton && (
        <button
          id={expandButtonId}
          className={styles.expandButton}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls={gridId}
          aria-label={isExpanded ? `${TYPE_LABELS[type]} zuklappen` : `${remainingCount} weitere ${TYPE_LABELS[type]} anzeigen`}
        >
          {isExpanded ? `${TYPE_LABELS[type]} zuklappen` : `+${remainingCount} weitere ${TYPE_LABELS[type]}`}
        </button>
      )}
    </div>
  )
}

export default function MediaAssetsSection({
  releaseId,
  assets: initialAssets,
  errorMessage = null,
}: MediaAssetsSectionProps) {
  const [assets, setAssets] = useState<MediaAsset[]>(initialAssets ?? [])
  const [loading, setLoading] = useState(false)
  const [runtimeError, setRuntimeError] = useState<string | null>(errorMessage)
  const [playingAsset, setPlayingAsset] = useState<MediaAsset | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    setAssets(initialAssets ?? [])
  }, [initialAssets])

  useEffect(() => {
    if (typeof errorMessage === 'string' && errorMessage.trim()) {
      setRuntimeError(errorMessage)
      return
    }

    if (!releaseId || initialAssets) {
      setRuntimeError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setRuntimeError(null)

    void getReleaseAssets(releaseId)
      .then((response) => {
        if (cancelled) {
          return
        }
        setAssets(response.data.assets)
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }
        if (error instanceof ApiError) {
          setRuntimeError(error.message)
          return
        }
        setRuntimeError('Media Assets konnten nicht geladen werden.')
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [errorMessage, initialAssets, releaseId])

  const handlePlayAsset = (asset: MediaAsset) => {
    setPlayingAsset(asset)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setPlayingAsset(null)
  }

  if (runtimeError) {
    return (
      <section className={styles.mediaAssetsSection} aria-labelledby="media-assets-title">
        <h2 id="media-assets-title" className={styles.sectionTitle}>
          Media Assets
        </h2>
        <div className={styles.errorState} role="status">
          {runtimeError}
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section className={styles.mediaAssetsSection} aria-labelledby="media-assets-title" aria-busy="true">
        <h2 id="media-assets-title" className={styles.sectionTitle}>
          Media Assets
        </h2>
        <div className={styles.loadingState}>Media Assets werden geladen...</div>
      </section>
    )
  }

  if (assets.length === 0) {
    return null // Empty state: section completely hidden when no assets
  }

  const groupedAssets = groupAssetsByType(assets)
  const typeOrder: MediaAssetType[] = ['opening', 'ending', 'karaoke', 'insert']

  return (
    <>
      <section className={styles.mediaAssetsSection} aria-labelledby="media-assets-title">
        <h2 id="media-assets-title" className={styles.sectionTitle}>
          Media Assets
        </h2>
        {typeOrder.map((type) => (
          <TypeGroup key={type} type={type} assets={groupedAssets[type]} onPlayAsset={handlePlayAsset} />
        ))}
      </section>

      <VideoPlayerModal
        key={playingAsset?.id ?? 'closed'}
        isOpen={isModalOpen}
        asset={playingAsset}
        onClose={handleCloseModal}
      />
    </>
  )
}
