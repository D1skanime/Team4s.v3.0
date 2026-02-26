import { AnimeType } from '@/types/admin'
import { AnimeStatus, ContentType } from '@/types/anime'

import { AnimePatchClearFlags, AnimePatchValues } from '../../types/admin-anime'
import styles from '../../../admin.module.css'

interface AnimeBasicFieldsProps {
  animeIDInput: string
  values: AnimePatchValues
  clearFlags: AnimePatchClearFlags
  isSubmitting: boolean
  animeTypes: AnimeType[]
  contentTypes: ContentType[]
  animeStatuses: AnimeStatus[]
  onAnimeIDChange: (value: string) => void
  onFieldChange: (field: keyof AnimePatchValues, value: string) => void
  onClearFlagChange: (field: keyof AnimePatchClearFlags, value: boolean) => void
}

export function AnimeBasicFields({
  animeIDInput,
  values,
  clearFlags,
  isSubmitting,
  animeTypes,
  contentTypes,
  animeStatuses,
  onAnimeIDChange,
  onFieldChange,
  onClearFlagChange,
}: AnimeBasicFieldsProps) {
  return (
    <>
      <div className={styles.gridTwo}>
        <div className={styles.field}>
          <label htmlFor="update-anime-id">Anime ID *</label>
          <input
            id="update-anime-id"
            value={animeIDInput}
            onChange={(event) => onAnimeIDChange(event.target.value)}
            disabled={isSubmitting}
            placeholder="z. B. 13394"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="update-title">Title</label>
          <input
            id="update-title"
            value={values.title}
            onChange={(event) => onFieldChange('title', event.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="update-type">Type</label>
          <select
            id="update-type"
            value={values.type}
            onChange={(event) => onFieldChange('type', event.target.value)}
            disabled={isSubmitting}
          >
            <option value="">-- unveraendert --</option>
            {animeTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="update-content-type">Content Type</label>
          <select
            id="update-content-type"
            value={values.contentType}
            onChange={(event) => onFieldChange('contentType', event.target.value)}
            disabled={isSubmitting}
          >
            <option value="">-- unveraendert --</option>
            {contentTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="update-status">Status</label>
          <select
            id="update-status"
            value={values.status}
            onChange={(event) => onFieldChange('status', event.target.value)}
            disabled={isSubmitting}
          >
            <option value="">-- unveraendert --</option>
            {animeStatuses.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.gridTwo}>
        <div className={styles.field}>
          <label htmlFor="update-year">Year</label>
          <input
            id="update-year"
            value={values.year}
            onChange={(event) => onFieldChange('year', event.target.value)}
            disabled={isSubmitting || clearFlags.year}
          />
          <label className={styles.nullToggle}>
            <input
              type="checkbox"
              checked={clearFlags.year}
              onChange={(event) => onClearFlagChange('year', event.target.checked)}
              disabled={isSubmitting}
            />
            Wert loeschen (null)
          </label>
        </div>
        <div className={styles.field}>
          <label htmlFor="update-max-episodes">Max Episodes</label>
          <input
            id="update-max-episodes"
            value={values.maxEpisodes}
            onChange={(event) => onFieldChange('maxEpisodes', event.target.value)}
            disabled={isSubmitting || clearFlags.maxEpisodes}
          />
          <label className={styles.nullToggle}>
            <input
              type="checkbox"
              checked={clearFlags.maxEpisodes}
              onChange={(event) => onClearFlagChange('maxEpisodes', event.target.checked)}
              disabled={isSubmitting}
            />
            Wert loeschen (null)
          </label>
        </div>
        <div className={styles.field}>
          <label htmlFor="update-title-de">Title DE</label>
          <input
            id="update-title-de"
            value={values.titleDE}
            onChange={(event) => onFieldChange('titleDE', event.target.value)}
            disabled={isSubmitting || clearFlags.titleDE}
          />
          <label className={styles.nullToggle}>
            <input
              type="checkbox"
              checked={clearFlags.titleDE}
              onChange={(event) => onClearFlagChange('titleDE', event.target.checked)}
              disabled={isSubmitting}
            />
            Wert loeschen (null)
          </label>
        </div>
        <div className={styles.field}>
          <label htmlFor="update-title-en">Title EN</label>
          <input
            id="update-title-en"
            value={values.titleEN}
            onChange={(event) => onFieldChange('titleEN', event.target.value)}
            disabled={isSubmitting || clearFlags.titleEN}
          />
          <label className={styles.nullToggle}>
            <input
              type="checkbox"
              checked={clearFlags.titleEN}
              onChange={(event) => onClearFlagChange('titleEN', event.target.checked)}
              disabled={isSubmitting}
            />
            Wert loeschen (null)
          </label>
        </div>
      </div>
    </>
  )
}
