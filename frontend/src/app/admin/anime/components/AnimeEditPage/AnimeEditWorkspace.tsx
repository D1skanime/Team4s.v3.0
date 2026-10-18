'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import {
  applyAdminAnimeMetadataFromJellyfin,
  getAdminAnimeJellyfinContext,
} from '@/lib/api'
import type {
  AdminAnimeAssetKind,
  AdminAnimeJellyfinContext,
  AdminAnimePersistedAssets,
} from '@/types/admin'
import type { AnimeDetail } from '@/types/anime'

import { CreateAssetSearchDialog } from '../../create/CreateAssetSearchDialog'
import { CreateReviewSection } from '../../create/CreateReviewSection'
import { useAnimePatch } from '../../hooks/useAnimePatch'
import { useAnimeEditAssetCropFlow } from '../../hooks/useAnimeEditAssetCropFlow'
import { useAnimeEditAssetRemoval } from '../../hooks/useAnimeEditAssetRemoval'
import { useAnimeEditAssetSearch } from '../../hooks/useAnimeEditAssetSearch'
import { useAnimeEditor } from '../../hooks/useAnimeEditor'
import { useJellyfinIntake } from '../../hooks/useJellyfinIntake'
import {
  cloneJellyfinAssetSlots,
  hydrateManualDraftFromExistingAnime,
  removeJellyfinDraftAsset,
  type JellyfinDraftAssetTarget,
} from '../../hooks/useManualAnimeDraft'
import { buildAniSearchAnimeURL, resolveAniSearchID } from '../../utils/anime-helpers'
import { planAnimeAssetFileSelection } from '../../utils/animeAssetUploadSelection'
import { formatAdminError } from '../../utils/studio-helpers'
import { AnimeEditAssetSection } from './AnimeEditAssetSection'
import { AnimeEditDetailsSection } from './AnimeEditDetailsSection'
import { AnimeEditHeaderBanner } from './AnimeEditHeaderBanner'
import { AnimeEditSourceSection, hasProviderSource } from './AnimeEditSourceSection'
import { SharedAnimeEditorWorkspace } from './SharedAnimeEditorWorkspace'
import { AnimeEditorShell } from '../shared/AnimeEditorShell'

interface AnimeEditWorkspaceProps {
  anime: AnimeDetail & {
    tags?: string[]
    persisted_assets?: Partial<AdminAnimePersistedAssets> | null
  }
  onSaved: (anime: AnimeDetail, message: string) => void
  onError: (message: string) => void
  onRequest?: (request: string | null) => void
  onResponse?: (response: string | null) => void
}

function emptyPersistedAssets(): AdminAnimePersistedAssets {
  return {
    backgrounds: [],
  }
}

export function AnimeEditWorkspace({
  anime,
  onSaved,
  onError,
  onRequest,
  onResponse,
}: AnimeEditWorkspaceProps) {
  const patch = useAnimePatch(
    (nextAnime) => onSaved(nextAnime, `Anime #${nextAnime.id} wurde gespeichert.`),
    onError,
    { onRequest, onResponse },
  )

  const hydratedState = useMemo(
    () =>
      hydrateManualDraftFromExistingAnime({
        title: anime.title,
        title_de: anime.title_de,
        title_en: anime.title_en,
        type: anime.type,
        content_type: anime.content_type,
        status: anime.status,
        year: anime.year,
        max_episodes: anime.max_episodes,
        genre: anime.genre,
        genres: anime.genres,
        tags: anime.tags,
        description: anime.description,
        cover_image: anime.cover_image,
        source: anime.source,
        folder_name: anime.folder_name,
        persisted_assets: anime.persisted_assets ?? undefined,
      }),
    [anime],
  )

  const [persistedAssets, setPersistedAssets] = useState<AdminAnimePersistedAssets>(
    hydratedState.persistedAssets,
  )
  const [jellyfinContext, setJellyfinContext] = useState<AdminAnimeJellyfinContext | null>(null)
  const [visibleJellyfinAssetSlots, setVisibleJellyfinAssetSlots] = useState<AdminAnimeJellyfinContext['asset_slots'] | null>(null)
  const [hasAdoptedJellyfinSelection, setHasAdoptedJellyfinSelection] = useState(false)
  const [isRefreshingAssets, setIsRefreshingAssets] = useState(false)
  const jellyfinIntake = useJellyfinIntake()

  const editor = useAnimeEditor('edit', {
    isDirty: patch.isDirty,
    canSubmit: patch.isDirty,
    isSubmitting: patch.isSubmitting,
    formID: 'anime-edit-form',
    submitButtonType: 'button',
    submitLabel: patch.isSubmitting ? 'Änderungen werden gespeichert...' : 'Änderungen speichern',
    dirtyStateTitle: 'Ungespeicherte Änderungen',
    dirtyStateMessage: 'Felder wurden angepasst. Speichere, um die Stammdaten zu übernehmen.',
    savedStateTitle: 'Alles gespeichert',
    savedStateMessage: 'Keine ausstehenden Stammdaten-Änderungen.',
    onSubmit: () => {
      void handleSave()
    },
  })

  const refreshAssetContext = useCallback(async () => {
    try {
      setIsRefreshingAssets(true)
      const response = await getAdminAnimeJellyfinContext(anime.id)
      setJellyfinContext(response.data)
      setPersistedAssets(response.data.persisted_assets || emptyPersistedAssets())
      setVisibleJellyfinAssetSlots((current) =>
        current ?? (response.data.asset_slots ? cloneJellyfinAssetSlots(response.data.asset_slots) : null),
      )
    } catch (error) {
      onError(formatAdminError(error, 'Asset-Kontext konnte nicht geladen werden.'))
    } finally {
      setIsRefreshingAssets(false)
    }
  }, [anime.id, onError])

  const assetSearch = useAnimeEditAssetSearch({
    patch,
    animeID: anime.id,
    onError,
    refreshAssetContext,
  })

  const { resetFromAnime } = patch
  const { candidates: jellyfinCandidates, reviewCandidate } = jellyfinIntake

  useEffect(() => {
    resetFromAnime(anime)
    setPersistedAssets(hydratedState.persistedAssets)
    setJellyfinContext(null)
    setVisibleJellyfinAssetSlots(null)
  }, [anime, hydratedState.persistedAssets, resetFromAnime])

  useEffect(() => {
    setVisibleJellyfinAssetSlots(
      jellyfinContext?.asset_slots ? cloneJellyfinAssetSlots(jellyfinContext.asset_slots) : null,
    )
  }, [jellyfinContext?.source, jellyfinContext?.jellyfin_series_id, jellyfinContext?.asset_slots])

  useEffect(() => {
    void refreshAssetContext()
  }, [refreshAssetContext])

  useEffect(() => {
    if (jellyfinCandidates.length === 1) {
      reviewCandidate(jellyfinCandidates[0].jellyfin_series_id)
    }
  }, [jellyfinCandidates, reviewCandidate])

  const reviewMissingFields: string[] = []
  if (!patch.values.title.trim()) reviewMissingFields.push('Titel')
  if (!persistedAssets.cover?.url && !patch.values.coverImage.trim()) {
    reviewMissingFields.push('Cover')
  }
  const adoptedJellyfinPreview = hasAdoptedJellyfinSelection ? jellyfinIntake.previewResult : null

  const handleSave = useCallback(async () => {
    onRequest?.(null)
    onResponse?.(null)

    const patchSaved = await patch.submit(anime.id)
    if (!patchSaved) {
      return
    }

    if (!adoptedJellyfinPreview) {
      return
    }

    try {
      await applyAdminAnimeMetadataFromJellyfin(
        anime.id,
        {
          jellyfin_series_id: adoptedJellyfinPreview.jellyfin_series_id,
          apply_cover: adoptedJellyfinPreview.asset_slots.cover.present,
          apply_banner: adoptedJellyfinPreview.asset_slots.banner.present,
          apply_logo: adoptedJellyfinPreview.asset_slots.logo.present,
          apply_backgrounds: adoptedJellyfinPreview.asset_slots.backgrounds.length > 0,
          apply_background_video: adoptedJellyfinPreview.asset_slots.background_video.present,
        },
      )
      jellyfinIntake.resetReview()
      setHasAdoptedJellyfinSelection(false)
      await refreshAssetContext()
    } catch (error) {
      onError(formatAdminError(error, 'Jellyfin-Assets konnten nicht gespeichert werden.'))
    }
  }, [adoptedJellyfinPreview, anime.id, jellyfinIntake, onError, onRequest, onResponse, patch, refreshAssetContext])

  async function handleAssetFilesSelected(kind: AdminAnimeAssetKind, files: File[]) {
    const plan = planAnimeAssetFileSelection(kind, files)
    if (plan.action === 'noop') return

    if (plan.action === 'replace') {
      await patch.uploadAndLinkAsset(plan.file, plan.kind, anime.id)
      await refreshAssetContext()
      return
    }

    for (const file of plan.files) {
      await patch.uploadAndLinkAsset(file, plan.kind, anime.id)
    }
    await refreshAssetContext()
  }

  const assetCropFlow = useAnimeEditAssetCropFlow({
    persistedAssets,
    onAssetFilesSelected: handleAssetFilesSelected,
    onError,
  })

  const { handleRemoveSingularAsset, handleRemoveBackground } = useAnimeEditAssetRemoval({
    patch,
    animeID: anime.id,
    onError,
    refreshAssetContext,
  })

  const effectiveSource = adoptedJellyfinPreview
    ? `jellyfin:${adoptedJellyfinPreview.jellyfin_series_id}`
    : jellyfinContext?.source || patch.values.source || hydratedState.values.source || ''
  const effectiveFolderPath = adoptedJellyfinPreview?.jellyfin_series_path?.trim()
    || jellyfinContext?.folder_name
    || jellyfinContext?.jellyfin_series_path
    || patch.values.folderName
    || hydratedState.values.folderName
    || ''
  const effectiveJellyfinSeriesID = adoptedJellyfinPreview?.jellyfin_series_id
    || jellyfinContext?.jellyfin_series_id
    || anime.jellyfin_series_id
    || ''
  const hasAniSearchSource = Boolean(
    anime.anisearch_id ||
      hasProviderSource('anisearch:', effectiveSource, anime.source_links),
  )
  const effectiveAniSearchID = resolveAniSearchID(effectiveSource, anime.source_links, anime.anisearch_id)
  const aniSearchURL = effectiveAniSearchID ? buildAniSearchAnimeURL(effectiveAniSearchID) : ''
  const hasJellyfinSource = Boolean(
    effectiveJellyfinSeriesID ||
      hasProviderSource('jellyfin:', effectiveSource, anime.source_links),
  )

  async function handleEditJellyfinSearch() {
    try {
      await jellyfinIntake.search()
      setHasAdoptedJellyfinSelection(false)
    } catch (error) {
      onError(formatAdminError(error, 'Jellyfin-Suche konnte nicht geladen werden.'))
    }
  }

  function handleEditJellyfinSelect(candidateID: string) {
    jellyfinIntake.reviewCandidate(candidateID)
    setHasAdoptedJellyfinSelection(false)
  }

  async function handleEditJellyfinAdopt(candidateID: string) {
    try {
      const preview = await jellyfinIntake.loadPreview(candidateID)
      if (!preview) {
        onError('Jellyfin-Vorschau konnte nicht geladen werden.')
        return
      }

      patch.setField('source', `jellyfin:${preview.jellyfin_series_id}`)
      patch.setField('folderName', preview.jellyfin_series_path?.trim() || '')
      setVisibleJellyfinAssetSlots(cloneJellyfinAssetSlots(preview.asset_slots))
      setHasAdoptedJellyfinSelection(true)
    } catch (error) {
      onError(formatAdminError(error, 'Jellyfin-Quelle konnte nicht übernommen werden.'))
    }
  }

  function handleDiscardEditJellyfinSelection() {
    jellyfinIntake.resetReview()
    setHasAdoptedJellyfinSelection(false)
    patch.setField('source', jellyfinContext?.source || hydratedState.values.source || '')
    patch.setField('folderName', jellyfinContext?.folder_name || hydratedState.values.folderName || '')
    setVisibleJellyfinAssetSlots(
      jellyfinContext?.asset_slots ? cloneJellyfinAssetSlots(jellyfinContext.asset_slots) : null,
    )
  }

  function handleRemoveVisibleJellyfinAsset(target: JellyfinDraftAssetTarget) {
    setVisibleJellyfinAssetSlots((current) => {
      if (!current) return current
      return removeJellyfinDraftAsset(hydratedState.values, current, target).assetSlots
    })
  }

  const sourceSection = (
    <AnimeEditSourceSection
      anime={anime}
      effectiveAniSearchID={effectiveAniSearchID}
      aniSearchURL={aniSearchURL}
      effectiveJellyfinSeriesID={effectiveJellyfinSeriesID}
      effectiveFolderPath={effectiveFolderPath}
      hasJellyfinSource={hasJellyfinSource}
      jellyfinIntake={jellyfinIntake}
      hasAdoptedJellyfinSelection={hasAdoptedJellyfinSelection}
      isSubmitting={patch.isSubmitting}
      onJellyfinSearch={() => {
        void handleEditJellyfinSearch()
      }}
      onJellyfinSelect={handleEditJellyfinSelect}
      onJellyfinAdopt={(id) => {
        void handleEditJellyfinAdopt(id)
      }}
      onDiscardJellyfinSelection={handleDiscardEditJellyfinSelection}
    />
  )

  const assetsSection = (
    <AnimeEditAssetSection
      persistedAssets={persistedAssets}
      jellyfinAssetSlots={visibleJellyfinAssetSlots ?? jellyfinContext?.asset_slots ?? null}
      isBusy={patch.isUploadingCover || isRefreshingAssets || assetSearch.isApplyingAssetCandidates}
      onAssetFilesSelected={assetCropFlow.handleAssetFilesSelected}
      onOpenAssetSearch={(kind) => assetSearch.setActiveAssetSearchKind(kind)}
      onOpenAssetCrop={(kind) => void assetCropFlow.openAssetCrop(kind)}
      canOpenAssetCrop={assetCropFlow.canOpenAssetCrop}
      isFetchingCropSourceFor={assetCropFlow.isFetchingCropSourceFor}
      onRemoveJellyfinAsset={handleRemoveVisibleJellyfinAsset}
      onRemoveCover={() => void handleRemoveSingularAsset('cover')}
      onRemoveBanner={() => void handleRemoveSingularAsset('banner')}
      onRemoveLogo={() => void handleRemoveSingularAsset('logo')}
      onRemoveBackground={(backgroundID) => void handleRemoveBackground(backgroundID)}
      onRemoveBackgroundVideo={() => void handleRemoveSingularAsset('background_video')}
    />
  )

  const detailsSection = (
    <AnimeEditDetailsSection patch={patch} reviewMissingFields={reviewMissingFields} />
  )

  const reviewSection = (
    <CreateReviewSection
      missingFields={reviewMissingFields}
      hasTitle={patch.values.title.trim().length > 0}
      hasCover={Boolean(persistedAssets.cover?.url || patch.values.coverImage.trim())}
      hasAniSearch={hasAniSearchSource}
      hasJellyfin={hasJellyfinSource}
      assetCount={
        (persistedAssets.backgrounds?.length ?? 0) +
        (persistedAssets.banner ? 1 : 0) +
        (persistedAssets.logo ? 1 : 0) +
        (persistedAssets.background_video ? 1 : 0)
      }
      isSubmitting={patch.isSubmitting}
      successMessage={null}
      errorMessage={null}
      submitLabel="Änderungen speichern"
      submittingLabel="Änderungen werden gespeichert…"
      note="Prüfe die Änderungen noch einmal, bevor du den bestehenden Anime aktualisierst."
      hideSubmitButton
      onSubmit={() => {
        void handleSave()
      }}
    />
  )

  const headerContent = (
    <AnimeEditHeaderBanner animeID={anime.id} animeTitle={anime.title} coverImage={anime.cover_image} />
  )

  return (
    <AnimeEditorShell editor={editor}>
      <form id="anime-edit-form" onSubmit={(event: FormEvent) => event.preventDefault()}>
        <SharedAnimeEditorWorkspace
          mode="edit"
          headerTitle="Anime bearbeiten"
          headerIntro=""
          headerContent={headerContent}
          sourceContent={sourceSection}
          assetsContent={assetsSection}
          detailsContent={detailsSection}
          reviewContent={reviewSection}
        />
      </form>

      <CreateAssetSearchDialog
        activeKind={assetSearch.activeAssetSearchKind}
        query={assetSearch.assetSearchQuery}
        candidates={assetSearch.assetSearchCandidates}
        selectedCandidateIDs={assetSearch.assetSearchSelectedIDs}
        errorMessage={assetSearch.assetSearchErrorMessage}
        hasMore={assetSearch.assetSearchHasMore}
        isOpen={assetSearch.activeAssetSearchKind !== null}
        isSearching={assetSearch.isSearchingAssetCandidates}
        isAdopting={assetSearch.isApplyingAssetCandidates}
        onClose={assetSearch.closeAssetSearch}
        onQueryChange={assetSearch.setAssetSearchQuery}
        onSearch={() => {
          void assetSearch.handleAssetCandidateSearch()
        }}
        onLoadMore={() => {
          void assetSearch.handleLoadMoreAssets()
        }}
        onToggleCandidate={assetSearch.toggleAssetCandidateSelection}
        onAdoptSelection={() => {
          void assetSearch.handleAssetCandidateAdoption()
        }}
      />
      {assetCropFlow.cropDialog}
    </AnimeEditorShell>
  )
}
