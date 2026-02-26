import { FormEvent, useEffect, useRef, useState } from 'react'

import { getAnimeByID, updateAdminAnime } from '@/lib/api'
import { AnimeType } from '@/types/admin'
import { AnimeDetail, AnimeStatus, ContentType } from '@/types/anime'

import { parsePositiveInt } from '../../utils/anime-helpers'
import { useAnimePatch } from '../../hooks/useAnimePatch'
import { AnimeBasicFields } from './AnimeBasicFields'
import { AnimeMetaFields } from './AnimeMetaFields'
import { AnimeCoverField } from './AnimeCoverField'
import styles from '../../../admin.module.css'

const ANIME_TYPES: AnimeType[] = ['tv', 'film', 'ova', 'ona', 'special', 'bonus']
const CONTENT_TYPES: ContentType[] = ['anime', 'hentai']
const ANIME_STATUSES: AnimeStatus[] = ['disabled', 'ongoing', 'done', 'aborted', 'licensed']

interface AnimePatchFormProps {
  anime: AnimeDetail | null
  authToken: string
  onSuccess: (anime: AnimeDetail) => void
  onError: (msg: string) => void
  onRequest?: (request: string | null) => void
  onResponse?: (response: string | null) => void
  onEditorStateChange?: (state: { hasUnsavedChanges: boolean; isSaving: boolean }) => void
  onRegisterSaveAction?: (saveAction: (() => void) | null) => void
}

export function AnimePatchForm({
  anime,
  authToken,
  onSuccess,
  onError,
  onRequest,
  onResponse,
  onEditorStateChange,
  onRegisterSaveAction,
}: AnimePatchFormProps) {
  const [animeIDInput, setAnimeIDInput] = useState('')
  const coverFileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const patch = useAnimePatch(authToken, onSuccess, onError, {
    onRequest,
    onResponse,
  })

  useEffect(() => {
    if (!anime) {
      setAnimeIDInput('')
      return
    }

    setAnimeIDInput(String(anime.id))
    patch.resetFromAnime(anime)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime?.id])

  useEffect(() => {
    onEditorStateChange?.({ hasUnsavedChanges: patch.isDirty, isSaving: patch.isSubmitting })
  }, [onEditorStateChange, patch.isDirty, patch.isSubmitting])

  useEffect(() => {
    onRegisterSaveAction?.(() => {
      formRef.current?.requestSubmit()
    })
    return () => onRegisterSaveAction?.(null)
  }, [onRegisterSaveAction])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onRequest?.(null)
    onResponse?.(null)

    const animeID = parsePositiveInt(animeIDInput) ?? anime?.id ?? null
    if (!animeID) {
      onError('Anime-ID ist ungueltig.')
      return
    }

    await patch.submit(animeID)
  }

  const handleRemoveCover = async () => {
    if (!anime) {
      onError('Bitte zuerst einen Anime-Kontext laden.')
      return
    }
    if (!authToken.trim()) {
      onError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    try {
      await updateAdminAnime(anime.id, { cover_image: null }, authToken)
      const refreshed = await getAnimeByID(anime.id, { include_disabled: true })
      patch.setField('coverImage', '')
      patch.setClearFlag('coverImage', false)
      onSuccess(refreshed.data)
    } catch (error) {
      if (error instanceof Error) onError(error.message)
      else onError('Cover konnte nicht entfernt werden.')
    }
  }

  return (
    <section className={`${styles.panel} ${styles.editPanel}`}>
      <h2>Anime bearbeiten</h2>
      <p className={styles.hint}>
        Inhalte und Metadaten aktualisieren. Ohne ID wird die aktuell geladene Kontext-ID verwendet.
      </p>
      <form ref={formRef} className={styles.form} onSubmit={handleSubmit}>
        <AnimeBasicFields
          animeIDInput={animeIDInput}
          values={patch.values}
          clearFlags={patch.clearFlags}
          isSubmitting={patch.isSubmitting}
          animeTypes={ANIME_TYPES}
          contentTypes={CONTENT_TYPES}
          animeStatuses={ANIME_STATUSES}
          onAnimeIDChange={setAnimeIDInput}
          onFieldChange={(field, value) => patch.setField(field, value)}
          onClearFlagChange={patch.setClearFlag}
        />

        <div className={styles.grid}>
          <AnimeMetaFields
            values={patch.values}
            clearFlags={patch.clearFlags}
            isSubmitting={patch.isSubmitting}
            genreSuggestions={patch.genreSuggestions}
            genreSuggestionsTotal={patch.genreSuggestionsTotal}
            loadedGenreCount={patch.genreTokens.length}
            isLoadingGenreTokens={patch.isLoadingGenreTokens}
            genreTokensError={patch.genreTokensError}
            genreSuggestionLimit={patch.genreSuggestionLimit}
            onFieldChange={(field, value) => patch.setField(field, value)}
            onClearFlagChange={patch.setClearFlag}
            onAddGenreToken={patch.addGenreToken}
            onRemoveGenreToken={patch.removeGenreToken}
            onGenreSuggestionLimitChange={patch.setGenreSuggestionLimit}
          />

          <AnimeCoverField
            values={patch.values}
            clearFlags={patch.clearFlags}
            contextCoverImage={anime?.cover_image}
            isSubmitting={patch.isSubmitting}
            isUploadingCover={patch.isUploadingCover}
            coverFileInputRef={coverFileInputRef}
            onFieldChange={(field, value) => patch.setField(field, value)}
            onClearFlagChange={patch.setClearFlag}
            onUploadFile={async (file) => {
              const animeID = parsePositiveInt(animeIDInput) ?? anime?.id
              await patch.uploadAndSetCover(file, animeID)
            }}
            onRemoveCover={handleRemoveCover}
          />
        </div>

        <div className={styles.actions}>
          <button className={styles.buttonSecondary} type="submit" disabled={patch.isSubmitting || !patch.isDirty}>
            {patch.isSubmitting ? 'Speichern...' : 'Aenderungen speichern'}
          </button>
          {anime ? (
            <button
              className={styles.buttonSecondary}
              type="button"
              disabled={patch.isSubmitting}
              onClick={() => setAnimeIDInput(String(anime.id))}
            >
              Kontext-ID #{anime.id} einsetzen
            </button>
          ) : null}
          {anime ? (
            <button
              className={styles.buttonSecondary}
              type="button"
              disabled={patch.isSubmitting}
              onClick={() => patch.resetFromAnime(anime)}
            >
              Patch-Form aus Kontext neu fuellen
            </button>
          ) : null}
        </div>
      </form>
    </section>
  )
}
