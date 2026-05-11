'use client'

import type { AdminAnimeAniSearchEditConflictResult } from '@/types/admin'

import styles from '../../AdminStudio.module.css'
import workspaceStyles from './AnimeEditWorkspace.module.css'

const PROTECTED_FIELD_OPTIONS = [
  { key: 'title', label: 'Titel', helper: 'Schützt den Haupttitel vor AniSearch-Overwrite.' },
  { key: 'title_de', label: 'Titel DE', helper: 'Behält die deutsche Titelvariante unverändert.' },
  { key: 'title_en', label: 'Titel EN', helper: 'Behält die englische Titelvariante unverändert.' },
  { key: 'year', label: 'Jahr', helper: 'Lässt das aktuelle Jahr unverändert.' },
  { key: 'max_episodes', label: 'Max. Episoden', helper: 'Überschreibt die Episodenanzahl nicht.' },
  { key: 'description', label: 'Beschreibung', helper: 'Behält die aktuelle Beschreibung im Entwurf.' },
  { key: 'genre', label: 'Genres', helper: 'Übernimmt keine AniSearch-Genres in den Entwurf.' },
] as const

/**
 * Props der AniSearchEnrichmentSection-Komponente.
 * Enthalten die AniSearch-ID, die Liste geschützter Felder,
 * optionale Lade- und Fehlerzustaende sowie Änderungs-Callbacks.
 */
interface AniSearchEnrichmentSectionProps {
  anisearchID: string
  protectedFields: string[]
  isLoading?: boolean
  conflictResult?: AdminAnimeAniSearchEditConflictResult | null
  statusMessage?: string | null
  errorMessage?: string | null
  isSourceLocked?: boolean
  lockedSourceLabel?: string | null
  submitLabel?: string
  onAniSearchIDChange: (value: string) => void
  onProtectedFieldsChange: (fields: string[]) => void
  onSubmit: () => void
}

/**
 * Sektion zum Laden von AniSearch-Daten in den Anime-Entwurf.
 * Rendert ein Eingabefeld für die AniSearch-ID, eine Checkbox-Liste
 * zur Feldschutz-Konfiguration und eine Statusanzeige für
 * Konflikte, Fehler oder Erfolgsmeldungen.
 */
export function AniSearchEnrichmentSection({
  anisearchID,
  protectedFields,
  isLoading = false,
  conflictResult = null,
  statusMessage,
  errorMessage,
  isSourceLocked = false,
  lockedSourceLabel = null,
  submitLabel,
  onAniSearchIDChange,
  onProtectedFieldsChange,
  onSubmit,
}: AniSearchEnrichmentSectionProps) {
  const helperID = 'anisearch-edit-helper'
  const statusID = 'anisearch-edit-status'

  return (
    <section className={`${styles.card} ${workspaceStyles.sectionCard}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>AniSearch Daten laden</h2>
          <p className={styles.sectionMeta}>
            AniSearch überschreibt bestehende Werte, außer du schützt Felder vor dem Laden.
          </p>
        </div>
        <span className={workspaceStyles.statusPill}>{isLoading ? 'Lädt...' : 'Entwurf bleibt lokal'}</span>
      </div>

      <div className={workspaceStyles.aniSearchActionRow}>
        <label className={workspaceStyles.field}>
          <span>AniSearch ID</span>
          <input
            className={styles.input}
            value={anisearchID}
            placeholder="z. B. 12345"
            aria-describedby={`${helperID} ${statusID}`}
            readOnly={isSourceLocked}
            onChange={(event) => onAniSearchIDChange(event.target.value)}
          />
        </label>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          aria-busy={isLoading}
          disabled={isLoading || !anisearchID.trim()}
          onClick={onSubmit}
        >
          {isLoading
            ? 'AniSearch lädt...'
            : submitLabel || (isSourceLocked ? 'AniSearch erneut laden' : 'AniSearch laden')}
        </button>
      </div>

      <p id={helperID} className={workspaceStyles.helperText}>
        {isSourceLocked
          ? lockedSourceLabel || 'Diese AniSearch-Verknüpfung ist bereits fixiert. Du kannst die Daten erneut laden, aber die ID nicht frei umhängen.'
          : 'Vorläufiger Suchtext gilt nicht als geschützter Titel. Nach dem Laden wird der AniSearch-Titel übernommen, bis du das Feld bewusst schützt.'}
      </p>

      <fieldset className={workspaceStyles.protectionFieldset}>
        <legend>Felder schützen</legend>
        <div className={workspaceStyles.protectionGrid}>
          {PROTECTED_FIELD_OPTIONS.map((option) => {
            const checked = protectedFields.includes(option.key)
            return (
              <label key={option.key} className={workspaceStyles.protectionOption}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    if (event.target.checked) {
                      onProtectedFieldsChange([...protectedFields, option.key])
                    } else {
                      onProtectedFieldsChange(protectedFields.filter((field) => field !== option.key))
                    }
                  }}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.helper}</small>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div id={statusID} className={workspaceStyles.aniSearchStatus} aria-live="polite">
        {conflictResult ? (
          <div>
            <p className={workspaceStyles.statusNote}>
              AniSearch ID {conflictResult.anisearch_id} ist bereits mit {conflictResult.existing_title} verknüpft.
            </p>
            <a href={conflictResult.redirect_path} className={`${styles.button} ${styles.buttonSecondary}`}>
              Zum vorhandenen Anime wechseln
            </a>
          </div>
        ) : errorMessage ? (
          <p className={styles.errorBox}>{errorMessage}</p>
        ) : statusMessage ? (
          <p className={workspaceStyles.statusNote}>{statusMessage}</p>
        ) : (
          <div>
            <p className={workspaceStyles.aniSearchEmptyTitle}>Noch keine AniSearch-Daten geladen.</p>
            <p className={workspaceStyles.helperText}>
              Trage eine AniSearch ID ein und lade die Daten, um den Entwurf gezielt zu aktualisieren.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
