'use client'

import type { FormEvent, ReactNode, RefObject } from 'react'

import { AnimeStatus, ContentType } from '@/types/anime'
import { AnimeType, GenreToken } from '@/types/admin'

import styles from '../../../admin.module.css'
import { AnimeCreateCoverField } from '../CreatePage/AnimeCreateCoverField'
import { AnimeCreateGenreField } from '../CreatePage/AnimeCreateGenreField'
import { AnimeEditorShell } from '../shared/AnimeEditorShell'
import type { AnimeEditorController } from '../../types/admin-anime-editor'
import { ManualCreatePreview } from './ManualCreatePreview'
import { ManualCreateValidationSummary } from './ManualCreateValidationSummary'

interface ManualCreateWorkspaceProps {
  editor: AnimeEditorController
  title: string
  type: AnimeType
  contentType: ContentType
  status: AnimeStatus
  year: string
  maxEpisodes: string
  titleDE: string
  titleEN: string
  genreDraft: string
  genreTokens: string[]
  description: string
  coverImage: string
  inputRef: RefObject<HTMLInputElement | null>
  genreSuggestions: GenreToken[]
  genreSuggestionsTotal: number
  loadedTokenCount: number
  isLoadingGenres: boolean
  genreError: string | null
  isSubmitting: boolean
  isUploadingCover: boolean
  canLoadMore: boolean
  canResetLimit: boolean
  missingFields: string[]
  titleActions?: ReactNode
  titleHint?: ReactNode
  typeHint?: ReactNode
  draftAssets?: ReactNode
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onTitleChange: (value: string) => void
  onTypeChange: (value: AnimeType) => void
  onContentTypeChange: (value: ContentType) => void
  onStatusChange: (value: AnimeStatus) => void
  onYearChange: (value: string) => void
  onMaxEpisodesChange: (value: string) => void
  onTitleDEChange: (value: string) => void
  onTitleENChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onCoverImageChange: (value: string) => void
  onDraftGenreChange: (value: string) => void
  onAddDraftGenre: () => void
  onRemoveGenreToken: (name: string) => void
  onAddGenreSuggestion: (name: string) => void
  onIncreaseGenreLimit: () => void
  onResetGenreLimit: () => void
  onFileChange: React.ChangeEventHandler<HTMLInputElement>
  onOpenFileDialog: () => void
}

const ANIME_TYPES: AnimeType[] = ['tv', 'film', 'ova', 'ona', 'special', 'bonus']
const CONTENT_TYPES: ContentType[] = ['anime', 'hentai']
const ANIME_STATUSES: AnimeStatus[] = ['disabled', 'ongoing', 'done', 'aborted', 'licensed']

export function ManualCreateWorkspace(props: ManualCreateWorkspaceProps) {
  return (
    <AnimeEditorShell
      editor={props.editor}
      title="Anime erstellen"
      subtitle="Manual Draft mit Vorschau, bevor ein echter Anime-Datensatz gespeichert wird."
    >
      <ManualCreatePreview title={props.title} coverImage={props.coverImage} />
      <ManualCreateValidationSummary missingFields={props.missingFields} />

      <section className={styles.panel}>
        <form id="anime-create-form" className={styles.form} onSubmit={props.onSubmit}>
          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="create-title">Title *</label>
              <div className={styles.inputRow}>
                <input
                  id="create-title"
                  value={props.title}
                  onChange={(event) => props.onTitleChange(event.target.value)}
                  disabled={props.isSubmitting}
                />
                {props.titleActions ? <div className={styles.actions}>{props.titleActions}</div> : null}
              </div>
              {props.titleHint}
            </div>
            <div className={styles.field}>
              <label htmlFor="create-type">Type *</label>
              <select
                id="create-type"
                value={props.type}
                onChange={(event) => props.onTypeChange(event.target.value as AnimeType)}
                disabled={props.isSubmitting}
              >
                {ANIME_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              {props.typeHint}
            </div>
            <div className={styles.field}>
              <label htmlFor="create-content-type">Content Type *</label>
              <select
                id="create-content-type"
                value={props.contentType}
                onChange={(event) => props.onContentTypeChange(event.target.value as ContentType)}
                disabled={props.isSubmitting}
              >
                {CONTENT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="create-status">Status *</label>
              <select
                id="create-status"
                value={props.status}
                onChange={(event) => props.onStatusChange(event.target.value as AnimeStatus)}
                disabled={props.isSubmitting}
              >
                {ANIME_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="create-year">Year</label>
              <input
                id="create-year"
                value={props.year}
                onChange={(event) => props.onYearChange(event.target.value)}
                disabled={props.isSubmitting}
                placeholder="z. B. 2026"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="create-max-episodes">Max Episodes</label>
              <input
                id="create-max-episodes"
                value={props.maxEpisodes}
                onChange={(event) => props.onMaxEpisodesChange(event.target.value)}
                disabled={props.isSubmitting}
                placeholder="z. B. 12"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="create-title-de">Title DE</label>
              <input
                id="create-title-de"
                value={props.titleDE}
                onChange={(event) => props.onTitleDEChange(event.target.value)}
                disabled={props.isSubmitting}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="create-title-en">Title EN</label>
              <input
                id="create-title-en"
                value={props.titleEN}
                onChange={(event) => props.onTitleENChange(event.target.value)}
                disabled={props.isSubmitting}
              />
            </div>
          </div>

          <div className={styles.grid}>
            <AnimeCreateGenreField
              draft={props.genreDraft}
              selectedTokens={props.genreTokens}
              suggestions={props.genreSuggestions}
              suggestionsTotal={props.genreSuggestionsTotal}
              loadedTokenCount={props.loadedTokenCount}
              isLoading={props.isLoadingGenres}
              error={props.genreError}
              isSubmitting={props.isSubmitting}
              canLoadMore={props.canLoadMore}
              canResetLimit={props.canResetLimit}
              onDraftChange={props.onDraftGenreChange}
              onAddDraft={props.onAddDraftGenre}
              onRemoveToken={props.onRemoveGenreToken}
              onAddSuggestion={props.onAddGenreSuggestion}
              onIncreaseLimit={props.onIncreaseGenreLimit}
              onResetLimit={props.onResetGenreLimit}
            />
            <AnimeCreateCoverField
              inputRef={props.inputRef}
              coverImage={props.coverImage}
              isSubmitting={props.isSubmitting}
              isUploading={props.isUploadingCover}
              onCoverImageChange={props.onCoverImageChange}
              onFileChange={props.onFileChange}
              onOpenFileDialog={props.onOpenFileDialog}
            />
            {props.draftAssets}
            <div className={styles.field}>
              <label htmlFor="create-description">Description</label>
              <textarea
                id="create-description"
                value={props.description}
                onChange={(event) => props.onDescriptionChange(event.target.value)}
                disabled={props.isSubmitting}
              />
            </div>
          </div>
        </form>
      </section>
    </AnimeEditorShell>
  )
}
