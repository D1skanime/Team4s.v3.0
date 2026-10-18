'use client'

import { FormField } from '@/components/ui/FormField'
import { Textarea } from '@/components/ui/Textarea'
import type { AnimeType } from '@/types/admin'
import type { AnimeStatus, ContentType } from '@/types/anime'

import styles from '../../../admin.module.css'
import createStyles from '../../create/page.module.css'
import workspaceStyles from '../ManualCreate/ManualCreateWorkspace.module.css'
import { AnimeCreateGenreField } from '../CreatePage/AnimeCreateGenreField'
import { AnimeCreateTagField } from '../CreatePage/AnimeCreateTagField'
import type { useAnimePatch } from '../../hooks/useAnimePatch'

/**
 * Task 2 (quick-261018-l5r), reiner Umbau ohne Verhaltensänderung: ausgelagerte "Details"-Sektion
 * der Anime-Bearbeitung (Basisdaten + Genre/Tags/Beschreibung), extrahiert aus
 * AnimeEditWorkspace.tsx, nachdem der Source-Section-/Asset-Search-Split allein noch nicht unter
 * die CLAUDE.md-450-Zeilen-Grenze kam.
 */

const ANIME_TYPES: AnimeType[] = ['tv', 'film', 'ova', 'ona', 'special', 'bonus']
const CONTENT_TYPES: ContentType[] = ['anime', 'hentai']
const ANIME_STATUSES: AnimeStatus[] = ['disabled', 'ongoing', 'done', 'aborted', 'licensed']

type AnimePatch = ReturnType<typeof useAnimePatch>

interface AnimeEditDetailsSectionProps {
  patch: AnimePatch
  reviewMissingFields: string[]
}

export function AnimeEditDetailsSection({ patch, reviewMissingFields }: AnimeEditDetailsSectionProps) {
  return (
    <div className={createStyles.detailsStack}>
      <section className={workspaceStyles.sectionCard}>
        <div className={workspaceStyles.sectionHeader}>
          <p className={workspaceStyles.sectionEyebrow}>Pflichtangaben</p>
          <h2 className={workspaceStyles.sectionTitle}>Basisdaten</h2>
        </div>

        <div className={workspaceStyles.basicDataGrid}>
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

          <div className={workspaceStyles.basicDataRow}>
            <div className={styles.field}>
              <label htmlFor="edit-type">Typ *</label>
              <select id="edit-type" value={patch.values.type} onChange={(event) => patch.setField('type', event.target.value)}>
                {ANIME_TYPES.map((value) => (
                  <option key={value} value={value}>{value}</option>
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
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-status">Status *</label>
              <select id="edit-status" value={patch.values.status} onChange={(event) => patch.setField('status', event.target.value)}>
                {ANIME_STATUSES.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={`${workspaceStyles.basicDataRow} ${workspaceStyles.basicDataRowTwo}`}>
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
          </div>

          <div className={`${workspaceStyles.basicDataRow} ${workspaceStyles.basicDataRowTwo}`}>
            <div className={styles.field}>
              <label htmlFor="edit-title-de">Titel DE</label>
              <input id="edit-title-de" value={patch.values.titleDE} onChange={(event) => patch.setField('titleDE', event.target.value)} />
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-title-en">Titel EN</label>
              <input id="edit-title-en" value={patch.values.titleEN} onChange={(event) => patch.setField('titleEN', event.target.value)} />
            </div>
          </div>
        </div>
      </section>

      <section className={workspaceStyles.sectionCard}>
        <div className={workspaceStyles.sectionHeader}>
          <p className={workspaceStyles.sectionEyebrow}>Metadaten</p>
          <h2 className={workspaceStyles.sectionTitle}>Genre, Tags und Beschreibung</h2>
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

          <FormField
            label="Beschreibung"
            htmlFor="edit-description"
          >
            <Textarea
              id="edit-description"
              className={workspaceStyles.descriptionArea}
              value={patch.values.description}
              onChange={(event) => patch.setField('description', event.target.value)}
            />
          </FormField>
        </div>
      </section>
    </div>
  )
}
