'use client'

import { KeyboardEvent, useEffect, useRef, useState } from 'react'

import { getAdminGenreTokens } from '@/lib/api'
import { AdminAnimeEditDraftPayload, AnimeType } from '@/types/admin'
import { AnimeDetail, AnimeStatus, ContentType } from '@/types/anime'

import { useAniSearchEditEnrichment } from '../../hooks/useAniSearchEditEnrichment'
import { useAnimePatch } from '../../hooks/useAnimePatch'
import { useAnimeEditor } from '../../hooks/useAnimeEditor'
import { hydrateManualDraftFromAniSearchDraft } from '../../hooks/useManualAnimeDraft'
import { resolveAnimeEditorOwnership } from '../../utils/anime-editor-ownership'
import { AnimeOwnershipBadge } from '../shared/AnimeOwnershipBadge'
import { AnimeEditorShell } from '../shared/AnimeEditorShell'
import { AniSearchEnrichmentSection } from './AniSearchEnrichmentSection'
import { AnimeEditGenreSection } from './AnimeEditGenreSection'
import styles from '../../AdminStudio.module.css'
import workspaceStyles from './AnimeEditWorkspace.module.css'

const ANIME_TYPES: AnimeType[] = ['tv', 'film', 'ova', 'ona', 'special', 'bonus']
const CONTENT_TYPES: ContentType[] = ['anime', 'hentai']
const ANIME_STATUSES: AnimeStatus[] = ['disabled', 'ongoing', 'done', 'aborted', 'licensed']

interface GenreSuggestion {
  name: string
  count: number
}

interface AnimeEditWorkspaceProps {
  anime: AnimeDetail
  authToken: string
  onSaved: (anime: AnimeDetail, message: string) => void
  onError: (message: string) => void
  onRequest?: (request: string | null) => void
  onResponse?: (response: string | null) => void
  onRelationsChanged?: () => void
}

function buildEditDraftPayload(anime: AnimeDetail, patch: ReturnType<typeof useAnimePatch>): AdminAnimeEditDraftPayload {
  return {
    title: patch.values.title.trim() || anime.title || null,
    title_de: patch.values.titleDE.trim() || null,
    title_en: patch.values.titleEN.trim() || null,
    type: (patch.values.type.trim() || anime.type || undefined) as AnimeType | undefined,
    content_type: (patch.values.contentType.trim() || anime.content_type || undefined) as ContentType | undefined,
    status: (patch.values.status.trim() || anime.status || undefined) as AnimeStatus | undefined,
    year: patch.values.year.trim() ? Number(patch.values.year) : anime.year ?? null,
    max_episodes: patch.values.maxEpisodes.trim() ? Number(patch.values.maxEpisodes) : anime.max_episodes ?? null,
    genre: patch.values.genreTokens.length > 0 ? patch.values.genreTokens.join(', ') : null,
    description: patch.values.description.trim() || null,
    cover_image: patch.values.coverImage.trim() || null,
    source: patch.values.source.trim() || anime.source || null,
    folder_name: patch.values.folderName.trim() || anime.folder_name || null,
  }
}

export function AnimeEditWorkspace({
  anime,
  authToken,
  onSaved,
  onError,
  onRequest,
  onResponse,
  onRelationsChanged,
}: AnimeEditWorkspaceProps) {
  const patch = useAnimePatch(
    authToken,
    (nextAnime) => onSaved(nextAnime, `Anime #${nextAnime.id} wurde gespeichert.`),
    onError,
    { onRequest, onResponse },
  )
  const resetFromAnime = patch.resetFromAnime
  const ownership = resolveAnimeEditorOwnership(anime)
  const editor = useAnimeEditor('edit', {
    isDirty: patch.isDirty,
    isSubmitting: patch.isSubmitting,
    onSubmit: () => {
      onRequest?.(null)
      onResponse?.(null)
      void patch.submit(anime.id)
    },
  })

  const genreCloseTimeoutRef = useRef<number | null>(null)

  const [genreResults, setGenreResults] = useState<GenreSuggestion[]>([])
  const [isLoadingGenres, setIsLoadingGenres] = useState(false)
  const [genreError, setGenreError] = useState<string | null>(null)
  const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false)
  const [activeGenreIndex, setActiveGenreIndex] = useState(-1)
  const [genreSearchVersion, setGenreSearchVersion] = useState(0)
  const [aniSearchError, setAniSearchError] = useState<string | null>(null)
  const aniSearch = useAniSearchEditEnrichment({
    animeID: anime.id,
    authToken,
    onRequest,
    onResponse,
  })

  useEffect(() => {
    resetFromAnime(anime)
    setGenreResults([])
    setGenreError(null)
    setIsGenreDropdownOpen(false)
    setActiveGenreIndex(-1)
    setAniSearchError(null)
  }, [anime, resetFromAnime])

  useEffect(() => {
    const query = patch.values.genreDraft.trim()

    if (patch.clearFlags.genre || !query) {
      setGenreResults([])
      setIsLoadingGenres(false)
      setGenreError(null)
      setIsGenreDropdownOpen(false)
      setActiveGenreIndex(-1)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      setIsLoadingGenres(true)
      setGenreError(null)

      getAdminGenreTokens({ query, limit: 20 })
        .then((response) => {
          if (cancelled) return

          const selected = new Set(patch.values.genreTokens.map((token) => token.toLowerCase()))
          const nextResults = response.data.filter((item) => !selected.has(item.name.toLowerCase()))
          setGenreResults(nextResults)
          setIsGenreDropdownOpen(true)
          setActiveGenreIndex(nextResults.length > 0 ? 0 : -1)
        })
        .catch((error) => {
          if (cancelled) return

          setGenreResults([])
          if (error instanceof Error && error.message.trim()) {
            setGenreError(error.message)
          } else {
            setGenreError('Genres konnten nicht geladen werden.')
          }
          setIsGenreDropdownOpen(true)
          setActiveGenreIndex(-1)
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoadingGenres(false)
          }
        })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [genreSearchVersion, patch.clearFlags.genre, patch.values.genreDraft, patch.values.genreTokens])

  useEffect(
    () => () => {
      if (genreCloseTimeoutRef.current !== null) {
        window.clearTimeout(genreCloseTimeoutRef.current)
      }
    },
    [],
  )

  function clearGenreDropdown() {
    setIsGenreDropdownOpen(false)
    setActiveGenreIndex(-1)
  }

  function applyGenreToken(token: string) {
    patch.addGenreToken(token)
    patch.setField('genreDraft', '')
    setGenreResults([])
    setGenreError(null)
    clearGenreDropdown()
  }

  function scheduleDropdownClose() {
    if (genreCloseTimeoutRef.current !== null) {
      window.clearTimeout(genreCloseTimeoutRef.current)
    }

    genreCloseTimeoutRef.current = window.setTimeout(() => {
      clearGenreDropdown()
    }, 120)
  }

  function handleGenreKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && genreResults.length > 0) {
      event.preventDefault()
      setIsGenreDropdownOpen(true)
      setActiveGenreIndex((current) => (current + 1) % genreResults.length)
      return
    }

    if (event.key === 'ArrowUp' && genreResults.length > 0) {
      event.preventDefault()
      setIsGenreDropdownOpen(true)
      setActiveGenreIndex((current) => (current <= 0 ? genreResults.length - 1 : current - 1))
      return
    }

    if (event.key === 'Escape') {
      clearGenreDropdown()
      return
    }

    if (event.key === 'Backspace' && !patch.values.genreDraft.trim() && patch.values.genreTokens.length > 0) {
      patch.removeGenreToken(patch.values.genreTokens[patch.values.genreTokens.length - 1])
      return
    }

    if ((event.key === 'Enter' || event.key === ',') && patch.values.genreDraft.trim()) {
      event.preventDefault()

      if (isGenreDropdownOpen && activeGenreIndex >= 0 && genreResults[activeGenreIndex]) {
        applyGenreToken(genreResults[activeGenreIndex].name)
        return
      }

      applyGenreToken(patch.values.genreDraft)
    }
  }

  async function handleAniSearchSubmit() {
    setAniSearchError(null)

    try {
      const result = await aniSearch.runEnrichment(buildEditDraftPayload(anime, patch))
      const hydratedDraft = hydrateManualDraftFromAniSearchDraft(
        {
          title: patch.values.title,
          type: (patch.values.type || anime.type) as AnimeType,
          contentType: (patch.values.contentType || anime.content_type) as ContentType,
          status: (patch.values.status || anime.status) as AnimeStatus,
          year: patch.values.year,
          maxEpisodes: patch.values.maxEpisodes,
          titleDE: patch.values.titleDE,
          titleEN: patch.values.titleEN,
          genreTokens: patch.values.genreTokens,
          tagTokens: [],
          description: patch.values.description,
          coverImage: patch.values.coverImage,
        },
        {
          title: result.draft.title || undefined,
          title_de: result.draft.title_de || undefined,
          title_en: result.draft.title_en || undefined,
          type: result.draft.type,
          content_type: result.draft.content_type,
          status: result.draft.status,
          year: result.draft.year ?? undefined,
          max_episodes: result.draft.max_episodes ?? undefined,
          genre: result.draft.genre || undefined,
          description: result.draft.description || undefined,
          cover_image: result.draft.cover_image || undefined,
          source: result.source,
          folder_name: result.draft.folder_name || undefined,
        },
        aniSearch.protectedFields,
      )

      patch.setField('title', hydratedDraft.title)
      patch.setField('type', hydratedDraft.type)
      patch.setField('contentType', hydratedDraft.contentType)
      patch.setField('status', hydratedDraft.status)
      patch.setField('year', hydratedDraft.year)
      patch.setField('maxEpisodes', hydratedDraft.maxEpisodes)
      patch.setField('titleDE', hydratedDraft.titleDE)
      patch.setField('titleEN', hydratedDraft.titleEN)
      patch.setField('genreTokens', hydratedDraft.genreTokens)
      patch.setField('description', hydratedDraft.description)
      patch.setField('coverImage', hydratedDraft.coverImage)
      patch.setField('source', result.source)
      patch.setField('folderName', result.draft.folder_name || '')
      patch.setClearFlag('year', false)
      patch.setClearFlag('maxEpisodes', false)
      patch.setClearFlag('titleDE', false)
      patch.setClearFlag('titleEN', false)
      patch.setClearFlag('genre', false)
      patch.setClearFlag('description', false)

      if (result.relations_applied > 0 || result.relations_skipped_existing > 0) {
        onRelationsChanged?.()
      }
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setAniSearchError(error.message)
      } else {
        setAniSearchError(
          'AniSearch konnte nicht geladen werden. Pruefe die ID oder versuche es spaeter erneut. Dein aktueller Entwurf bleibt unveraendert.',
        )
      }
    }
  }

  return (
    <AnimeEditorShell editor={editor} header={<AnimeOwnershipBadge ownership={ownership} />}>
      <section className={`${styles.card} ${workspaceStyles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Basisdaten</h2>
            <p className={styles.sectionMeta}>Titel, Typ, Inhaltstyp und Status des Anime.</p>
          </div>
        </div>
        <div className={workspaceStyles.sectionGrid}>
          <label className={workspaceStyles.field}>
            <span>Anime ID</span>
            <input className={styles.input} value={String(anime.id)} readOnly disabled />
          </label>
          <label className={workspaceStyles.field}>
            <span>Titel</span>
            <input className={styles.input} value={patch.values.title} onChange={(event) => patch.setField('title', event.target.value)} />
          </label>
          <label className={workspaceStyles.field}>
            <span>Type</span>
            <select className={styles.select} value={patch.values.type} onChange={(event) => patch.setField('type', event.target.value)}>
              <option value="">-- unveraendert --</option>
              {ANIME_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className={workspaceStyles.field}>
            <span>Inhaltstyp</span>
            <select
              className={styles.select}
              value={patch.values.contentType}
              onChange={(event) => patch.setField('contentType', event.target.value)}
            >
              <option value="">-- unveraendert --</option>
              {CONTENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className={workspaceStyles.field}>
            <span>Status</span>
            <select className={styles.select} value={patch.values.status} onChange={(event) => patch.setField('status', event.target.value)}>
              <option value="">-- unveraendert --</option>
              {ANIME_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <AniSearchEnrichmentSection
        anisearchID={aniSearch.anisearchID}
        protectedFields={aniSearch.protectedFields}
        isLoading={aniSearch.isLoading}
        statusMessage={aniSearchError ? null : aniSearch.summary?.message || null}
        errorMessage={aniSearchError}
        onAniSearchIDChange={aniSearch.setAniSearchID}
        onProtectedFieldsChange={aniSearch.setProtectedFields}
        onSubmit={() => void handleAniSearchSubmit()}
      />

      <section className={`${styles.card} ${workspaceStyles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Titel und Struktur</h2>
            <p className={styles.sectionMeta}>Jahr, Episodenstruktur und lokalisierte Titel.</p>
          </div>
        </div>
        <div className={workspaceStyles.sectionGrid}>
          <label className={workspaceStyles.field}>
            <span>Jahr</span>
            <input className={styles.input} value={patch.values.year} onChange={(event) => patch.setField('year', event.target.value)} />
          </label>
          <label className={workspaceStyles.field}>
            <span>Max. Episoden</span>
            <input
              className={styles.input}
              value={patch.values.maxEpisodes}
              onChange={(event) => patch.setField('maxEpisodes', event.target.value)}
            />
          </label>
          <label className={workspaceStyles.field}>
            <span>Titel DE</span>
            <input className={styles.input} value={patch.values.titleDE} onChange={(event) => patch.setField('titleDE', event.target.value)} />
          </label>
          <label className={workspaceStyles.field}>
            <span>Titel EN</span>
            <input className={styles.input} value={patch.values.titleEN} onChange={(event) => patch.setField('titleEN', event.target.value)} />
          </label>
        </div>
      </section>

      <AnimeEditGenreSection
        genreTokens={patch.values.genreTokens}
        genreDraft={patch.values.genreDraft}
        isSubmitting={patch.isSubmitting}
        clearGenre={patch.clearFlags.genre}
        genreResults={genreResults}
        isLoadingGenres={isLoadingGenres}
        genreError={genreError}
        isDropdownOpen={isGenreDropdownOpen}
        activeGenreIndex={activeGenreIndex}
        onGenreDraftChange={(value) => patch.setField('genreDraft', value)}
        onGenreKeyDown={handleGenreKeyDown}
        onGenreFocus={() => {
          if (genreResults.length > 0 || isLoadingGenres || genreError) {
            setIsGenreDropdownOpen(true)
          }
        }}
        onGenreBlur={scheduleDropdownClose}
        onRetry={() => setGenreSearchVersion((current) => current + 1)}
        onRemoveToken={patch.removeGenreToken}
        onApplyToken={applyGenreToken}
      />

      <section className={`${styles.card} ${workspaceStyles.sectionCard}`}>
        <div className={workspaceStyles.descriptionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Beschreibung</h2>
            <p className={styles.sectionMeta}>Laengere Beschreibung mit besserer Lesbarkeit und klarer Flaeche.</p>
          </div>
          <p className={workspaceStyles.helperText}>{patch.values.description.length} Zeichen</p>
        </div>
        <textarea
          className={`${styles.textarea} ${workspaceStyles.descriptionArea}`}
          value={patch.values.description}
          onChange={(event) => patch.setField('description', event.target.value)}
          disabled={patch.isSubmitting || patch.clearFlags.description}
        />
      </section>

      <section className={`${styles.card} ${workspaceStyles.sectionCard}`}>
        <details className={styles.developerPanel}>
          <summary>Erweitert / Developer</summary>
          <div className={styles.developerPanelContent}>
            <div className={workspaceStyles.advancedGrid}>
              <label className={workspaceStyles.checkItem}><input type="checkbox" checked={patch.clearFlags.year} onChange={(event) => patch.setClearFlag('year', event.target.checked)} />Jahr leeren</label>
              <label className={workspaceStyles.checkItem}><input type="checkbox" checked={patch.clearFlags.maxEpisodes} onChange={(event) => patch.setClearFlag('maxEpisodes', event.target.checked)} />Max. Episoden leeren</label>
              <label className={workspaceStyles.checkItem}><input type="checkbox" checked={patch.clearFlags.titleDE} onChange={(event) => patch.setClearFlag('titleDE', event.target.checked)} />Titel DE leeren</label>
              <label className={workspaceStyles.checkItem}><input type="checkbox" checked={patch.clearFlags.titleEN} onChange={(event) => patch.setClearFlag('titleEN', event.target.checked)} />Titel EN leeren</label>
              <label className={workspaceStyles.checkItem}><input type="checkbox" checked={patch.clearFlags.genre} onChange={(event) => patch.setClearFlag('genre', event.target.checked)} />Genres leeren</label>
              <label className={workspaceStyles.checkItem}><input type="checkbox" checked={patch.clearFlags.description} onChange={(event) => patch.setClearFlag('description', event.target.checked)} />Beschreibung leeren</label>
              <label className={workspaceStyles.checkItem}><input type="checkbox" checked={patch.clearFlags.coverImage} onChange={(event) => patch.setClearFlag('coverImage', event.target.checked)} />Cover leeren</label>
            </div>
            <div className={styles.actionsRow}>
              <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => patch.resetFromAnime(anime)}>
                Patch-Form aus Kontext neu fuellen
              </button>
            </div>
          </div>
        </details>
      </section>

    </AnimeEditorShell>
  )
}
