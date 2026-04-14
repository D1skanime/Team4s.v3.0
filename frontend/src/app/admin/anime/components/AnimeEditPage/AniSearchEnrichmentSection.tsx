'use client'

import type { AdminAnimeAniSearchEditConflictResult } from '@/types/admin'

import styles from '../../AdminStudio.module.css'
import workspaceStyles from './AnimeEditWorkspace.module.css'

const PROTECTED_FIELD_OPTIONS = [
  { key: 'title', label: 'Titel', helper: 'Schuetzt den Haupttitel vor AniSearch-Overwrite.' },
  { key: 'title_de', label: 'Titel DE', helper: 'Behaelt die deutsche Titelvariante unveraendert.' },
  { key: 'title_en', label: 'Titel EN', helper: 'Behaelt die englische Titelvariante unveraendert.' },
  { key: 'year', label: 'Jahr', helper: 'Laesst das aktuelle Jahr unveraendert.' },
  { key: 'max_episodes', label: 'Max. Episoden', helper: 'Ueberschreibt die Episodenanzahl nicht.' },
  { key: 'description', label: 'Beschreibung', helper: 'Behaelt die aktuelle Beschreibung im Entwurf.' },
  { key: 'genre', label: 'Genres', helper: 'Uebernimmt keine AniSearch-Genres in den Entwurf.' },
] as const

/**
 * Props der AniSearchEnrichmentSection-Komponente.
 * Enthalten die AniSearch-ID, die Liste geschuetzter Felder,
 * optionale Lade- und Fehlerzustaende sowie Aenderungs-Callbacks.
 */
interface AniSearchEnrichmentSectionProps {
  anisearchID: string
  protectedFields: string[]
  isLoading?: boolean
  conflictResult?: AdminAnimeAniSearchEditConflictResult | null
  statusMessage?: string | null
  errorMessage?: string | null
  onAniSearchIDChange: (value: string) => void
  onProtectedFieldsChange: (fields: string[]) => void
  onSubmit: () => void
}

/**
 * Sektion zum Laden von AniSearch-Daten in den Anime-Entwurf.
 * Rendert ein Eingabefeld fuer die AniSearch-ID, eine Checkbox-Liste
 * zur Feldschutz-Konfiguration und eine Statusanzeige fuer
 * Konflikte, Fehler oder Erfolgsmeldungen.
 */
export function AniSearchEnrichmentSection({
  anisearchID,
  protectedFields,
  isLoading = false,
  conflictResult = null,
  statusMessage,
  errorMessage,
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
            AniSearch ueberschreibt bestehende Werte, ausser du schuetzt Felder vor dem Laden.
          </p>
        </div>
        <span className={workspaceStyles.statusPill}>{isLoading ? 'Laedt...' : 'Entwurf bleibt lokal'}</span>
      </div>

      <div className={workspaceStyles.aniSearchActionRow}>
        <label className={workspaceStyles.field}>
          <span>AniSearch ID</span>
          <input
            className={styles.input}
            value={anisearchID}
            placeholder="z. B. 12345"
            aria-describedby={`${helperID} ${statusID}`}
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
          {isLoading ? 'AniSearch laedt...' : 'AniSearch laden'}
        </button>
      </div>

      <p id={helperID} className={workspaceStyles.helperText}>
        Vorlaeufiger Suchtext gilt nicht als geschuetzter Titel. Nach dem Laden wird der AniSearch-Titel uebernommen,
        bis du das Feld bewusst schuetzt.
      </p>

      <fieldset className={workspaceStyles.protectionFieldset}>
        <legend>Felder schuetzen</legend>
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
              AniSearch ID {conflictResult.anisearch_id} ist bereits mit {conflictResult.existing_title} verknuepft.
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
