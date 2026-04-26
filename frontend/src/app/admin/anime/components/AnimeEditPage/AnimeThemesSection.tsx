'use client'

import { useEffect, useState } from 'react'

import { getAnimeByID } from '@/lib/api'
import { AdminAnimeTheme, AdminAnimeThemeSegment } from '@/types/admin'

import styles from '../../AdminStudio.module.css'
import themeStyles from './AnimeThemesSection.module.css'
import { UseAdminAnimeThemesModel, useAdminAnimeThemes } from '../../hooks/useAdminAnimeThemes'

interface AnimeThemesSectionProps {
  animeID: number
  authToken: string
  defaultOpen?: boolean
  modelOverride?: UseAdminAnimeThemesModel
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

interface EpisodeOption {
  id: number
  label: string
}

interface AnimeThemeRowProps {
  animeID: number
  theme: AdminAnimeTheme
  episodes: EpisodeOption[]
  model: UseAdminAnimeThemesModel
}

function buildThemeSummary(themes: AdminAnimeTheme[], errorMessage: string | null): string {
  const countLabel = themes.length === 1 ? '1 Theme' : `${themes.length} Themes`
  if (errorMessage) {
    return `${countLabel} | Fehler vorhanden`
  }

  return countLabel
}

function formatThemeMeta(theme: AdminAnimeTheme): string {
  const parts = [`#${theme.id}`, theme.theme_type_name]
  if (theme.title) {
    parts.push(theme.title)
  }
  return parts.join(' | ')
}

function formatSegmentLabel(segment: AdminAnimeThemeSegment): string {
  const start = segment.start_episode_number ?? 'Start offen'
  const end = segment.end_episode_number ?? 'Ende offen'
  return `${start} bis ${end}`
}

function AnimeThemeRow({ animeID, theme, episodes, model }: AnimeThemeRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [startEpisodeID, setStartEpisodeID] = useState<number | null>(null)
  const [endEpisodeID, setEndEpisodeID] = useState<number | null>(null)
  const isEditing = model.editingThemeID === theme.id
  const loadedSegments = model.segments.get(theme.id) ?? []

  return (
    <details
      className={themeStyles.themeRow}
      onToggle={(event) => {
        const nextOpen = (event.currentTarget as HTMLDetailsElement).open
        setIsOpen(nextOpen)
        if (nextOpen) {
          void model.loadSegments(theme.id)
        }
      }}
    >
      <summary className={themeStyles.summary}>
        <div className={themeStyles.summaryTitle}>
          <div>
            <strong>{theme.title?.trim() || theme.theme_type_name}</strong>
            <div className={themeStyles.themeMeta}>{formatThemeMeta(theme)}</div>
          </div>
          <div className={themeStyles.actions}>
            {!isEditing ? (
              <>
                <button type="button" className={styles.buttonSecondary} onClick={() => model.startEditing(theme)}>
                  Bearbeiten
                </button>
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() => {
                    if (typeof window === 'undefined' || window.confirm('Theme wirklich loeschen?')) {
                      void model.deleteTheme(theme.id)
                    }
                  }}
                >
                  Loeschen
                </button>
              </>
            ) : null}
          </div>
        </div>
      </summary>

      <div className={themeStyles.content}>
        {isEditing ? (
          <div className={themeStyles.editingRow}>
            <select
              className={styles.select}
              value={model.editingTypeID}
              onChange={(event) => model.setEditingTypeID(Number(event.target.value))}
            >
              {model.themeTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <input
              className={styles.input}
              value={model.editingTitle}
              onChange={(event) => model.setEditingTitle(event.target.value)}
              placeholder="Optionaler Titel"
            />
            <button type="button" className={styles.buttonPrimary} onClick={() => void model.saveEditing()} disabled={model.isSaving}>
              Speichern
            </button>
            <button type="button" className={styles.buttonSecondary} onClick={() => model.cancelEditing()}>
              Abbrechen
            </button>
          </div>
        ) : (
          <p className={themeStyles.helper}>
            Theme-Typ <strong>{theme.theme_type_name}</strong> fuer Anime #{animeID}. Segmente nutzen die Episoden-IDs, zeigen aber
            die Episodennummern an.
          </p>
        )}

        <div className={themeStyles.segmentCard}>
          <h3 className={styles.sectionTitle}>Episodenbereiche</h3>
          <div className={themeStyles.episodeSelects}>
            <label className={themeStyles.field}>
              <span>Start-Episode</span>
              <select
                className={styles.select}
                value={startEpisodeID ?? ''}
                onChange={(event) => setStartEpisodeID(event.target.value ? Number(event.target.value) : null)}
              >
                <option value="">Offen</option>
                {episodes.map((episode) => (
                  <option key={`${theme.id}-start-${episode.id}`} value={episode.id}>
                    {episode.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={themeStyles.field}>
              <span>End-Episode</span>
              <select
                className={styles.select}
                value={endEpisodeID ?? ''}
                onChange={(event) => setEndEpisodeID(event.target.value ? Number(event.target.value) : null)}
              >
                <option value="">Offen</option>
                {episodes.map((episode) => (
                  <option key={`${theme.id}-end-${episode.id}`} value={episode.id}>
                    {episode.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={themeStyles.segmentForm}>
            <button
              type="button"
              className={styles.buttonPrimary}
              disabled={model.isSaving}
              onClick={async () => {
                await model.createSegment(theme.id, startEpisodeID, endEpisodeID)
                setStartEpisodeID(null)
                setEndEpisodeID(null)
                if (!isOpen) {
                  void model.loadSegments(theme.id)
                }
              }}
            >
              Episodenbereich hinzufuegen
            </button>
          </div>

          {loadedSegments.length === 0 ? <p className={themeStyles.emptyState}>Noch keine Segmente vorhanden.</p> : null}

          {loadedSegments.length > 0 ? (
            <div className={themeStyles.segmentList}>
              {loadedSegments.map((segment) => (
                <div key={segment.id} className={themeStyles.segmentRow}>
                  <div>
                    <strong>{formatSegmentLabel(segment)}</strong>
                    <div className={themeStyles.segmentMeta}>
                      Start-ID {segment.start_episode_id ?? 'offen'} | Ende-ID {segment.end_episode_id ?? 'offen'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.buttonSecondary}
                    onClick={() => void model.deleteSegment(theme.id, segment.id)}
                  >
                    Loeschen
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </details>
  )
}

export function AnimeThemesSection({
  animeID,
  authToken,
  defaultOpen = false,
  modelOverride,
  onSuccess,
  onError,
}: AnimeThemesSectionProps) {
  const hookModel = useAdminAnimeThemes({ animeID, authToken, onSuccess, onError })
  const model = modelOverride ?? hookModel
  const [episodes, setEpisodes] = useState<EpisodeOption[]>([])

  useEffect(() => {
    let active = true
    getAnimeByID(animeID, { include_disabled: true })
      .then((response) => {
        if (!active) return
        const nextEpisodes = response.data.episodes.map((episode) => ({
          id: episode.id,
          label: `Episode ${episode.episode_number}${episode.title ? ` - ${episode.title}` : ''}`,
        }))
        setEpisodes(nextEpisodes)
      })
      .catch(() => {
        if (active) {
          setEpisodes([])
        }
      })

    return () => {
      active = false
    }
  }, [animeID])

  return (
    <section className={`${styles.card} ${themeStyles.sectionCard}`}>
      <details className={themeStyles.details} open={defaultOpen}>
        <summary className={themeStyles.summary}>
          <div className={themeStyles.summaryTitle}>
            <div>
              <h2 className={styles.sectionTitle}>OP/ED Themes</h2>
              <p className={styles.sectionMeta}>Themes, Typen und Episodenbereiche direkt auf der Edit-Seite pflegen.</p>
            </div>
            <div className={themeStyles.summaryRow}>
              <span>{buildThemeSummary(model.themes, model.errorMessage)}</span>
              {model.isLoading ? <span>Lade...</span> : null}
            </div>
          </div>
        </summary>

        <div className={themeStyles.content}>
          <p className={themeStyles.helper}>
            Theme-Typen kommen aus der Datenbank. Segmente zeigen die Episodennummer fuer die Lesbarkeit, senden an die API aber
            immer die Episode-ID.
          </p>

          {model.errorMessage ? <p className={themeStyles.errorBox}>{model.errorMessage}</p> : null}

          <div className={themeStyles.grid}>
            <div className={themeStyles.createBlock}>
              <label className={themeStyles.field}>
                <span>Theme-Typ</span>
                <select
                  className={styles.select}
                  value={model.newTypeID}
                  onChange={(event) => model.setNewTypeID(Number(event.target.value))}
                >
                  <option value={0}>Bitte waehlen</option>
                  {model.themeTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={themeStyles.field}>
                <span>Optionaler Titel</span>
                <input
                  className={styles.input}
                  value={model.newTitle}
                  onChange={(event) => model.setNewTitle(event.target.value)}
                  placeholder="z. B. Creditless"
                />
              </label>

              {model.inlineError ? <p className={themeStyles.errorBox}>{model.inlineError}</p> : null}

              <div className={themeStyles.actions}>
                <button type="button" className={styles.buttonPrimary} onClick={() => void model.createTheme()} disabled={model.isSaving}>
                  Theme speichern
                </button>
              </div>
            </div>

            <div className={themeStyles.listBlock}>
              <h3 className={styles.sectionTitle}>Bestehende Themes</h3>
              {model.themes.length === 0 ? <p className={themeStyles.emptyState}>Noch keine Themes vorhanden.</p> : null}

              {model.themes.map((theme) => (
                <AnimeThemeRow
                  key={theme.id}
                  animeID={animeID}
                  theme={theme}
                  episodes={episodes}
                  model={model}
                />
              ))}
            </div>
          </div>
        </div>
      </details>
    </section>
  )
}
