'use client'

import React, { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  deleteAdminAnimeBackgroundAsset,
  deleteAdminAnimeBackgroundVideoAsset,
  deleteAdminAnimeBannerAsset,
  deleteAdminAnimeCoverAsset,
  deleteAdminAnimeLogoAsset,
  getAdminAnimeJellyfinContext,
} from '@/lib/api'
import { searchAdminAnimeCreateAssetCandidates } from '@/lib/api/admin-anime-intake'
import type {
  AdminAnimeAssetKind,
  AdminAnimeJellyfinContext,
  AdminAnimePersistedAssets,
  AdminAnimePersistedBackgroundState,
  AnimeType,
} from '@/types/admin'
import type { AnimeDetail, AnimeStatus, ContentType } from '@/types/anime'

import styles from '../../../admin.module.css'
import createStyles from '../../create/page.module.css'
import workspaceStyles from '../ManualCreate/ManualCreateWorkspace.module.css'
import { AnimeCreateGenreField } from '../CreatePage/AnimeCreateGenreField'
import { AnimeCreateTagField } from '../CreatePage/AnimeCreateTagField'
import { CreateAssetSearchDialog } from '../../create/CreateAssetSearchDialog'
import { CreateJellyfinCard } from '../../create/CreateJellyfinCard'
import { CreateReviewSection } from '../../create/CreateReviewSection'
import { stageRemoteCreateAssetCandidate } from '../../create/createAssetUploadPlan'
import { useAnimePatch } from '../../hooks/useAnimePatch'
import { useAnimeEditor } from '../../hooks/useAnimeEditor'
import { useJellyfinIntake } from '../../hooks/useJellyfinIntake'
import {
  cloneJellyfinAssetSlots,
  hydrateManualDraftFromExistingAnime,
  removeJellyfinDraftAsset,
  type JellyfinDraftAssetTarget,
} from '../../hooks/useManualAnimeDraft'
import { formatAdminError } from '../../utils/studio-helpers'
import { AnimeEditAssetSection } from './AnimeEditAssetSection'
import { SharedAnimeEditorWorkspace } from './SharedAnimeEditorWorkspace'
import { AnimeEditorShell } from '../shared/AnimeEditorShell'

const ANIME_TYPES: AnimeType[] = ['tv', 'film', 'ova', 'ona', 'special', 'bonus']
const CONTENT_TYPES: ContentType[] = ['anime', 'hentai']
const ANIME_STATUSES: AnimeStatus[] = ['disabled', 'ongoing', 'done', 'aborted', 'licensed']

type SearchableAssetKind = Extract<AdminAnimeAssetKind, 'cover' | 'banner' | 'logo' | 'background'>

interface AnimeEditWorkspaceProps {
  anime: AnimeDetail & {
    tags?: string[]
    persisted_assets?: Partial<AdminAnimePersistedAssets> | null
  }
  authToken: string
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

function formatSourceKindLabel(kind?: 'manual' | 'jellyfin'): string {
  if (kind === 'jellyfin') return 'Jellyfin'
  return 'Manuell'
}

export function AnimeEditWorkspace({
  anime,
  authToken,
  onSaved,
  onError,
  onRequest,
  onResponse,
}: AnimeEditWorkspaceProps) {
  const patch = useAnimePatch(
    authToken,
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
  const [activeAssetSearchKind, setActiveAssetSearchKind] = useState<SearchableAssetKind | null>(null)
  const [assetSearchQuery, setAssetSearchQuery] = useState('')
  const [assetSearchCandidates, setAssetSearchCandidates] = useState<
    Awaited<ReturnType<typeof searchAdminAnimeCreateAssetCandidates>>['data']
  >([])
  const [assetSearchSelectedIDs, setAssetSearchSelectedIDs] = useState<string[]>([])
  const [assetSearchErrorMessage, setAssetSearchErrorMessage] = useState<string | null>(null)
  const [assetSearchHasMore, setAssetSearchHasMore] = useState(false)
  const [assetSearchPage, setAssetSearchPage] = useState(1)
  const [isSearchingAssetCandidates, setIsSearchingAssetCandidates] = useState(false)
  const [isApplyingAssetCandidates, setIsApplyingAssetCandidates] = useState(false)
  const jellyfinIntake = useJellyfinIntake(authToken)

  const coverFileInputRef = useRef<HTMLInputElement | null>(null)
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null)
  const logoFileInputRef = useRef<HTMLInputElement | null>(null)
  const backgroundFileInputRef = useRef<HTMLInputElement | null>(null)
  const backgroundVideoFileInputRef = useRef<HTMLInputElement | null>(null)

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
      onRequest?.(null)
      onResponse?.(null)
      void patch.submit(anime.id)
    },
  })

  const refreshAssetContext = useCallback(async () => {
    try {
      setIsRefreshingAssets(true)
      const response = await getAdminAnimeJellyfinContext(anime.id, authToken)
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
  }, [anime.id, authToken, onError])

  useEffect(() => {
    patch.resetFromAnime(anime)
    setPersistedAssets(hydratedState.persistedAssets)
    setJellyfinContext(null)
    setVisibleJellyfinAssetSlots(null)
  }, [anime, hydratedState.persistedAssets, patch.resetFromAnime])

  useEffect(() => {
    setVisibleJellyfinAssetSlots(
      jellyfinContext?.asset_slots ? cloneJellyfinAssetSlots(jellyfinContext.asset_slots) : null,
    )
  }, [jellyfinContext?.source, jellyfinContext?.jellyfin_series_id])

  useEffect(() => {
    void refreshAssetContext()
  }, [refreshAssetContext])

  useEffect(() => {
    if (jellyfinIntake.candidates.length === 1) {
      jellyfinIntake.reviewCandidate(jellyfinIntake.candidates[0].jellyfin_series_id)
    }
  }, [jellyfinIntake.candidates, jellyfinIntake.reviewCandidate])

  const reviewMissingFields: string[] = []
  if (!patch.values.title.trim()) reviewMissingFields.push('Titel')
  if (!persistedAssets.cover?.url && !patch.values.coverImage.trim()) {
    reviewMissingFields.push('Cover')
  }

  function openAssetFileDialog(kind: AdminAnimeAssetKind) {
    const refs: Record<AdminAnimeAssetKind, React.RefObject<HTMLInputElement | null>> = {
      cover: coverFileInputRef,
      banner: bannerFileInputRef,
      logo: logoFileInputRef,
      background: backgroundFileInputRef,
      background_video: backgroundVideoFileInputRef,
    }
    refs[kind].current?.click()
  }

  function closeAssetSearch() {
    setActiveAssetSearchKind(null)
    setAssetSearchCandidates([])
    setAssetSearchSelectedIDs([])
    setAssetSearchErrorMessage(null)
    setAssetSearchHasMore(false)
    setAssetSearchPage(1)
  }

  async function handleAssetFileChange(kind: AdminAnimeAssetKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    await patch.uploadAndLinkAsset(file, kind, anime.id)
    await refreshAssetContext()
  }

  async function handleRemoveSingularAsset(kind: 'cover' | 'banner' | 'logo' | 'background_video') {
    try {
      switch (kind) {
        case 'cover':
          await deleteAdminAnimeCoverAsset(anime.id, authToken)
          patch.setClearFlag('coverImage', true)
          patch.setField('coverImage', '')
          break
        case 'banner':
          await deleteAdminAnimeBannerAsset(anime.id, authToken)
          break
        case 'logo':
          await deleteAdminAnimeLogoAsset(anime.id, authToken)
          break
        case 'background_video':
          await deleteAdminAnimeBackgroundVideoAsset(anime.id, authToken)
          break
      }
      await refreshAssetContext()
    } catch (error) {
      onError(formatAdminError(error, 'Asset konnte nicht entfernt werden.'))
    }
  }

  async function handleRemoveBackground(backgroundID: number) {
    try {
      await deleteAdminAnimeBackgroundAsset(anime.id, backgroundID, authToken)
      await refreshAssetContext()
    } catch (error) {
      onError(formatAdminError(error, 'Background konnte nicht entfernt werden.'))
    }
  }

  async function handleAssetCandidateSearch() {
    if (!activeAssetSearchKind) {
      setAssetSearchErrorMessage('Bitte zuerst einen Asset-Slot waehlen.')
      return
    }
    if (!assetSearchQuery.trim()) {
      setAssetSearchErrorMessage('Bitte zuerst einen Suchbegriff eingeben.')
      return
    }

    try {
      setIsSearchingAssetCandidates(true)
      setAssetSearchErrorMessage(null)
      const response = await searchAdminAnimeCreateAssetCandidates(
        {
          asset_kind: activeAssetSearchKind,
          query: assetSearchQuery.trim(),
          limit: activeAssetSearchKind === 'background' ? 12 : 8,
          page: 1,
        },
        authToken,
      )
      setAssetSearchPage(1)
      setAssetSearchCandidates(response.data)
      setAssetSearchSelectedIDs([])
      setAssetSearchHasMore(response.data.length >= (activeAssetSearchKind === 'background' ? 12 : 8))
    } catch (error) {
      onError(formatAdminError(error, 'Asset-Suche fehlgeschlagen.'))
    } finally {
      setIsSearchingAssetCandidates(false)
    }
  }

  async function handleLoadMoreAssets() {
    if (!activeAssetSearchKind || isSearchingAssetCandidates) return

    try {
      setIsSearchingAssetCandidates(true)
      const nextPage = assetSearchPage + 1
      const limit = activeAssetSearchKind === 'background' ? 12 : 8
      const response = await searchAdminAnimeCreateAssetCandidates(
        {
          asset_kind: activeAssetSearchKind,
          query: assetSearchQuery.trim(),
          limit,
          page: nextPage,
        },
        authToken,
      )
      setAssetSearchPage(nextPage)
      setAssetSearchCandidates((current) => [...current, ...response.data])
      setAssetSearchHasMore(response.data.length >= limit)
    } catch (error) {
      onError(formatAdminError(error, 'Weitere Assets konnten nicht geladen werden.'))
    } finally {
      setIsSearchingAssetCandidates(false)
    }
  }

  function toggleAssetCandidateSelection(candidateID: string) {
    if (activeAssetSearchKind === 'background') {
      setAssetSearchSelectedIDs((current) =>
        current.includes(candidateID)
          ? current.filter((id) => id !== candidateID)
          : [...current, candidateID],
      )
      return
    }
    setAssetSearchSelectedIDs((current) => (current[0] === candidateID ? [] : [candidateID]))
  }

  async function handleAssetCandidateAdoption() {
    if (!activeAssetSearchKind) return
    const selected = assetSearchCandidates.filter((candidate) =>
      assetSearchSelectedIDs.includes(candidate.id),
    )
    if (selected.length === 0) {
      setAssetSearchErrorMessage('Bitte zuerst mindestens ein Asset auswaehlen.')
      return
    }

    try {
      setIsApplyingAssetCandidates(true)
      for (const candidate of selected) {
        const staged = await stageRemoteCreateAssetCandidate(candidate)
        await patch.uploadAndLinkAsset(staged.file, activeAssetSearchKind, anime.id)
      }
      await refreshAssetContext()
      closeAssetSearch()
    } catch (error) {
      onError(formatAdminError(error, 'Ausgewaehlte Assets konnten nicht uebernommen werden.'))
    } finally {
      setIsApplyingAssetCandidates(false)
    }
  }

  const effectiveSource = jellyfinContext?.source || patch.values.source || hydratedState.values.source || ''
  const effectiveFolderPath =
    jellyfinContext?.folder_name ||
    jellyfinContext?.jellyfin_series_path ||
    patch.values.folderName ||
    hydratedState.values.folderName ||
    ''
  const effectiveJellyfinSeriesID = jellyfinContext?.jellyfin_series_id || anime.jellyfin_series_id || ''
  const effectiveSourceKind = formatSourceKindLabel(jellyfinContext?.source_kind)
  const isLinkedToJellyfin = Boolean(jellyfinContext?.linked)
  const coverSourceLabel =
    jellyfinContext?.cover.current_source === 'provider'
      ? 'Jellyfin'
      : jellyfinContext?.cover.current_source === 'manual'
        ? 'Manuell'
        : ''

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
  }

  function handleRemoveVisibleJellyfinAsset(target: JellyfinDraftAssetTarget) {
    setVisibleJellyfinAssetSlots((current) => {
      if (!current) return current
      return removeJellyfinDraftAsset(hydratedState.values, current, target).assetSlots
    })
  }

  const sourceSection = (
    <div className={createStyles.providerGrid}>
      <section className={workspaceStyles.sectionCard}>
        <div className={workspaceStyles.sectionHeader}>
          <p className={workspaceStyles.sectionEyebrow}>Identität</p>
          <h2 className={workspaceStyles.sectionTitle}>Bestehender Anime</h2>
          <p className={workspaceStyles.sectionText}>
            Edit verwendet denselben Arbeitsraum wie Create, aber auf Basis eines bestehenden Datensatzes.
          </p>
        </div>

        <div className={styles.gridTwo}>
          <div className={styles.field}>
            <label htmlFor="edit-anime-id">Anime ID</label>
            <input id="edit-anime-id" value={String(anime.id)} readOnly />
          </div>
          <div className={styles.field}>
            <label htmlFor="edit-source">Quelle</label>
            <input id="edit-source" value={effectiveSource || 'Manuell'} readOnly />
          </div>
          <div className={styles.field}>
            <label htmlFor="edit-source-kind">Quelltyp</label>
            <input id="edit-source-kind" value={effectiveSourceKind} readOnly />
          </div>
          <div className={styles.field}>
            <label htmlFor="edit-link-status">Jellyfin-Link</label>
            <input id="edit-link-status" value={isLinkedToJellyfin ? 'Verknüpft' : 'Nicht verknüpft'} readOnly />
          </div>
          <div className={styles.field}>
            <label htmlFor="edit-jellyfin-item-id">Jellyfin Item ID</label>
            <input
              id="edit-jellyfin-item-id"
              value={effectiveJellyfinSeriesID}
              placeholder="Noch keine Jellyfin-Serie verknüpft"
              readOnly
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="edit-cover-source">Cover-Quelle</label>
            <input
              id="edit-cover-source"
              value={coverSourceLabel}
              placeholder="Noch keine Kontextinfo geladen"
              readOnly
            />
          </div>
          <div className={`${styles.field} ${createStyles.folderPathField}`}>
            <label htmlFor="edit-folder-path">Ordnerpfad</label>
            <input
              id="edit-folder-path"
              className={createStyles.folderPathInput}
              value={effectiveFolderPath}
              placeholder="Noch kein Jellyfin-Ordner verknüpft"
              readOnly
            />
          </div>
        </div>
      </section>

      <section className={workspaceStyles.sectionCard}>
        <div className={workspaceStyles.sectionHeader}>
          <p className={workspaceStyles.sectionEyebrow}>Jellyfin</p>
          <h2 className={workspaceStyles.sectionTitle}>Jellyfin auswählen</h2>
          <p className={workspaceStyles.sectionText}>
            Verwende hier denselben einfachen Jellyfin-Flow wie beim Erstellen: suchen, passenden Ordner übernehmen, dann speichern.
          </p>
        </div>
        <CreateJellyfinCard
          query={jellyfinIntake.query}
          candidates={jellyfinIntake.candidates}
          currentAnimeID={anime.id}
          selectedCandidateID={jellyfinIntake.reviewState.selectedCandidate?.jellyfin_series_id}
          hasAdoptedAssets={hasAdoptedJellyfinSelection}
          isSearching={jellyfinIntake.isSearching}
          isLoadingPreview={jellyfinIntake.isLoadingPreview}
          canSearch={jellyfinIntake.query.trim().length >= 2}
          isSubmitting={patch.isSubmitting}
          showResults={jellyfinIntake.candidates.length > 0 || jellyfinIntake.reviewState.mode !== 'idle'}
          onQueryChange={jellyfinIntake.setQuery}
          onSearch={() => {
            void handleEditJellyfinSearch()
          }}
          onSelectCandidate={handleEditJellyfinSelect}
          onAdoptCandidate={(id) => {
            void handleEditJellyfinAdopt(id)
          }}
          onDiscard={handleDiscardEditJellyfinSelection}
        />
      </section>
    </div>
  )

  const assetsSection = (
    <>
      <AnimeEditAssetSection
        persistedAssets={persistedAssets}
        jellyfinAssetSlots={visibleJellyfinAssetSlots ?? jellyfinContext?.asset_slots ?? null}
        isBusy={patch.isUploadingCover || isRefreshingAssets || isApplyingAssetCandidates}
        onOpenFileDialog={openAssetFileDialog}
        onOpenAssetSearch={(kind) => setActiveAssetSearchKind(kind)}
        onRemoveJellyfinAsset={handleRemoveVisibleJellyfinAsset}
        onRemoveCover={() => void handleRemoveSingularAsset('cover')}
        onRemoveBanner={() => void handleRemoveSingularAsset('banner')}
        onRemoveLogo={() => void handleRemoveSingularAsset('logo')}
        onRemoveBackground={(backgroundID) => void handleRemoveBackground(backgroundID)}
        onRemoveBackgroundVideo={() => void handleRemoveSingularAsset('background_video')}
      />

      <input
        ref={coverFileInputRef}
        className={styles.fileInput}
        type="file"
        accept="image/*"
        onChange={(event) => void handleAssetFileChange('cover', event)}
      />
      <input
        ref={bannerFileInputRef}
        className={styles.fileInput}
        type="file"
        accept="image/*"
        onChange={(event) => void handleAssetFileChange('banner', event)}
      />
      <input
        ref={logoFileInputRef}
        className={styles.fileInput}
        type="file"
        accept="image/*"
        onChange={(event) => void handleAssetFileChange('logo', event)}
      />
      <input
        ref={backgroundFileInputRef}
        className={styles.fileInput}
        type="file"
        accept="image/*"
        onChange={(event) => void handleAssetFileChange('background', event)}
      />
      <input
        ref={backgroundVideoFileInputRef}
        className={styles.fileInput}
        type="file"
        accept="video/*"
        onChange={(event) => void handleAssetFileChange('background_video', event)}
      />
    </>
  )

  const detailsSection = (
    <div className={createStyles.detailsStack}>
      <section className={workspaceStyles.sectionCard}>
        <div className={workspaceStyles.sectionHeader}>
          <p className={workspaceStyles.sectionEyebrow}>Pflichtangaben</p>
          <h2 className={workspaceStyles.sectionTitle}>Basisdaten</h2>
          <p className={workspaceStyles.sectionText}>
            Dieselbe Kernstruktur wie im Create-Flow, jetzt fuer bestehende Anime.
          </p>
        </div>

        <div className={styles.gridTwo}>
          <div className={`${styles.field} ${workspaceStyles.titleField}`}>
            <label htmlFor="edit-title">Titel *</label>
            <div className={workspaceStyles.fieldMeta}>
              <input
                id="edit-title"
                className={`${workspaceStyles.titleFieldInput} ${
                  reviewMissingFields.includes('Titel') ? workspaceStyles.inputInvalid : ''
                }`}
                value={patch.values.title}
                onChange={(event) => patch.setField('title', event.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="edit-type">Typ *</label>
            <select id="edit-type" value={patch.values.type} onChange={(event) => patch.setField('type', event.target.value)}>
              {ANIME_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="edit-content-type">Inhaltstyp *</label>
            <select
              id="edit-content-type"
              value={patch.values.contentType}
              onChange={(event) => patch.setField('contentType', event.target.value)}
            >
              {CONTENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="edit-status">Status *</label>
            <select id="edit-status" value={patch.values.status} onChange={(event) => patch.setField('status', event.target.value)}>
              {ANIME_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="edit-year">Jahr</label>
            <input id="edit-year" value={patch.values.year} onChange={(event) => patch.setField('year', event.target.value)} />
          </div>

          <div className={styles.field}>
            <label htmlFor="edit-max-episodes">Maximale Episoden</label>
            <input
              id="edit-max-episodes"
              value={patch.values.maxEpisodes}
              onChange={(event) => patch.setField('maxEpisodes', event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="edit-title-de">Titel DE</label>
            <input id="edit-title-de" value={patch.values.titleDE} onChange={(event) => patch.setField('titleDE', event.target.value)} />
          </div>

          <div className={styles.field}>
            <label htmlFor="edit-title-en">Titel EN</label>
            <input id="edit-title-en" value={patch.values.titleEN} onChange={(event) => patch.setField('titleEN', event.target.value)} />
          </div>
        </div>
      </section>

      <section className={workspaceStyles.sectionCard}>
        <div className={workspaceStyles.sectionHeader}>
          <p className={workspaceStyles.sectionEyebrow}>Metadaten</p>
          <h2 className={workspaceStyles.sectionTitle}>Genre, Tags und Beschreibung</h2>
          <p className={workspaceStyles.sectionText}>
            Diese Sektion folgt jetzt dem Create-Flow statt dem alten abgespeckten Edit-Formular.
          </p>
        </div>

        <div className={styles.grid}>
          <AnimeCreateGenreField
            draft={patch.values.genreDraft}
            selectedTokens={patch.values.genreTokens}
            suggestions={patch.genreSuggestions}
            suggestionsTotal={patch.genreSuggestionsTotal}
            loadedTokenCount={patch.genreTokens.length}
            isLoading={patch.isLoadingGenreTokens}
            error={patch.genreTokensError}
            isSubmitting={patch.isSubmitting}
            canLoadMore={patch.genreSuggestionLimit < 1000}
            canResetLimit={patch.genreSuggestionLimit > 40}
            onDraftChange={(value) => patch.setField('genreDraft', value)}
            onAddDraft={() => {
              patch.addGenreToken(patch.values.genreDraft)
              patch.setField('genreDraft', '')
            }}
            onRemoveToken={patch.removeGenreToken}
            onAddSuggestion={patch.addGenreToken}
            onIncreaseLimit={() => patch.setGenreSuggestionLimit(patch.genreSuggestionLimit + 40)}
            onResetLimit={() => patch.setGenreSuggestionLimit(40)}
          />

          <AnimeCreateTagField
            draft={patch.values.tagDraft}
            selectedTokens={patch.values.tagTokens}
            suggestions={patch.tagSuggestions}
            suggestionsTotal={patch.tagSuggestionsTotal}
            loadedTokenCount={patch.tagTokens.length}
            isLoading={patch.isLoadingTagTokens}
            error={patch.tagTokensError}
            isSubmitting={patch.isSubmitting}
            canLoadMore={patch.tagSuggestionLimit < 1000}
            canResetLimit={patch.tagSuggestionLimit > 40}
            onDraftChange={(value) => patch.setField('tagDraft', value)}
            onAddDraft={() => {
              patch.addTagToken(patch.values.tagDraft)
              patch.setField('tagDraft', '')
            }}
            onRemoveToken={patch.removeTagToken}
            onAddSuggestion={patch.addTagToken}
            onIncreaseLimit={() => patch.setTagSuggestionLimit(patch.tagSuggestionLimit + 40)}
            onResetLimit={() => patch.setTagSuggestionLimit(40)}
          />

          <div className={`${styles.field} ${workspaceStyles.descriptionField}`}>
            <label htmlFor="edit-description">Beschreibung</label>
            <textarea
              id="edit-description"
              className={workspaceStyles.descriptionArea}
              value={patch.values.description}
              onChange={(event) => patch.setField('description', event.target.value)}
            />
            <p className={workspaceStyles.fieldNote}>
              Kurz, eindeutig und ohne Prozess-Text.
            </p>
          </div>
        </div>
      </section>
    </div>
  )

  const reviewSection = (
    <CreateReviewSection
      missingFields={reviewMissingFields}
      hasTitle={patch.values.title.trim().length > 0}
      hasCover={Boolean(persistedAssets.cover?.url || patch.values.coverImage.trim())}
      hasAniSearch={Boolean((patch.values.source || hydratedState.values.source).startsWith('anisearch:'))}
      hasJellyfin={Boolean((patch.values.source || hydratedState.values.source).startsWith('jellyfin:'))}
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
        void patch.submit(anime.id)
      }}
    />
  )

  return (
    <AnimeEditorShell editor={editor}>
      <form id="anime-edit-form" onSubmit={(event: FormEvent) => event.preventDefault()}>
        <SharedAnimeEditorWorkspace
          mode="edit"
          headerTitle="Anime bearbeiten"
          headerIntro="Create-Flow als Basis, aber mit direktem Bearbeiten bestehender Daten und Assets."
          sourceContent={sourceSection}
          assetsContent={assetsSection}
          detailsContent={detailsSection}
          reviewContent={reviewSection}
        />
      </form>

      <CreateAssetSearchDialog
        activeKind={activeAssetSearchKind}
        query={assetSearchQuery}
        candidates={assetSearchCandidates}
        selectedCandidateIDs={assetSearchSelectedIDs}
        errorMessage={assetSearchErrorMessage}
        hasMore={assetSearchHasMore}
        isOpen={activeAssetSearchKind !== null}
        isSearching={isSearchingAssetCandidates}
        isAdopting={isApplyingAssetCandidates}
        onClose={closeAssetSearch}
        onQueryChange={setAssetSearchQuery}
        onSearch={() => {
          void handleAssetCandidateSearch()
        }}
        onLoadMore={() => {
          void handleLoadMoreAssets()
        }}
        onToggleCandidate={toggleAssetCandidateSelection}
        onAdoptSelection={() => {
          void handleAssetCandidateAdoption()
        }}
      />
    </AnimeEditorShell>
  )
}
