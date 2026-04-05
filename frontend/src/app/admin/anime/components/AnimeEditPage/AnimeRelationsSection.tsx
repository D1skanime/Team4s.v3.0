'use client'

import styles from '../../AdminStudio.module.css'
import relationStyles from './AnimeRelationsSection.module.css'
import {
  AdminAnimeRelation,
  AdminAnimeRelationLabel,
  AdminAnimeRelationTarget,
} from '@/types/admin'
import {
  UseAdminAnimeRelationsModel,
  buildRelationsSummary,
  useAdminAnimeRelations,
} from '../../hooks/useAdminAnimeRelations'

const RELATION_LABELS: AdminAnimeRelationLabel[] = [
  'Hauptgeschichte',
  'Nebengeschichte',
  'Fortsetzung',
  'Zusammenfassung',
]

interface AnimeRelationsSectionProps {
  animeID: number
  authToken: string
  defaultOpen?: boolean
  modelOverride?: UseAdminAnimeRelationsModel
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

function formatTargetMeta(target: AdminAnimeRelationTarget): string {
  const segments = [`#${String(target.anime_id).padStart(3, '0')}`, `Typ ${target.type}`]
  if (target.year) {
    segments.push(String(target.year))
  }
  return segments.join(' | ')
}

function formatRelationMeta(relation: AdminAnimeRelation): string {
  const segments = [`#${String(relation.target_anime_id).padStart(3, '0')}`, relation.relation_label, `Typ ${relation.target_type}`]
  if (relation.target_year) {
    segments.push(String(relation.target_year))
  }
  return segments.join(' | ')
}

export function AnimeRelationsSection({
  animeID,
  authToken,
  defaultOpen = false,
  modelOverride,
  onSuccess,
  onError,
}: AnimeRelationsSectionProps) {
  const model = modelOverride ?? useAdminAnimeRelations({ animeID, authToken, onSuccess, onError })

  return (
    <section className={`${styles.card} ${relationStyles.sectionCard}`}>
      <details className={relationStyles.details} open={defaultOpen}>
        <summary className={relationStyles.summary}>
          <div className={relationStyles.summaryTitle}>
            <div>
              <h2 className={styles.sectionTitle}>Relationen</h2>
              <p className={styles.sectionMeta}>Bestehende Anime-Verknuepfungen pflegen, ohne die Edit-Route zu verlassen.</p>
            </div>
            <div className={relationStyles.summaryRow}>
              <span>{buildRelationsSummary(model.relations, model.errorMessage)}</span>
              {model.isLoading ? <span>Lade...</span> : null}
            </div>
          </div>
        </summary>

        <div className={relationStyles.content}>
          <p className={relationStyles.helper}>
            Der ausgewaehlte Typ beschreibt immer das Ziel-Anime aus Sicht des aktuell bearbeiteten Anime.
            Beispiel: <strong>Fortsetzung</strong> bedeutet, dass das Ziel die Fortsetzung dieses Anime ist.
          </p>

          {model.errorMessage ? <p className={relationStyles.errorBox}>{model.errorMessage}</p> : null}

          <div className={relationStyles.grid}>
            <div className={relationStyles.searchBlock}>
              <label className={relationStyles.field}>
                <span>Ziel-Anime suchen</span>
                <input
                  className={styles.input}
                  value={model.query}
                  onChange={(event) => model.setQuery(event.target.value)}
                  placeholder="Titel eingeben"
                />
              </label>

              {model.isSearching ? <p className={relationStyles.emptyState}>Suche laeuft...</p> : null}

              {model.targets.length > 0 ? (
                <div className={relationStyles.results}>
                  {model.targets.map((target) => (
                    <button
                      key={target.anime_id}
                      type="button"
                      className={relationStyles.resultButton}
                      onClick={() => model.selectTarget(target)}
                    >
                      <strong>{target.title}</strong>
                      <div className={relationStyles.resultMeta}>{formatTargetMeta(target)}</div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className={relationStyles.createBlock}>
              <label className={relationStyles.field}>
                <span>Relationstyp</span>
                <select
                  className={styles.select}
                  value={model.relationLabel}
                  onChange={(event) => model.setRelationLabel(event.target.value as AdminAnimeRelationLabel)}
                >
                  {RELATION_LABELS.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              {model.selectedTarget ? (
                <p className={relationStyles.helper}>
                  Ausgewaehlt: <strong>{model.selectedTarget.title}</strong> ({formatTargetMeta(model.selectedTarget)})
                </p>
              ) : (
                <p className={relationStyles.helper}>Noch kein Ziel-Anime ausgewaehlt.</p>
              )}

              {model.inlineError ? <p className={relationStyles.errorBox}>{model.inlineError}</p> : null}

              <div className={relationStyles.actions}>
                <button type="button" className={styles.buttonPrimary} onClick={() => void model.createRelation()} disabled={model.isSaving}>
                  Relation speichern
                </button>
              </div>
            </div>
          </div>

          <div className={relationStyles.listBlock}>
            <h3 className={styles.sectionTitle}>Bestehende Relationen</h3>
            {model.relations.length === 0 ? <p className={relationStyles.emptyState}>Noch keine Relationen vorhanden.</p> : null}

            {model.relations.map((relation) => {
              const isEditing = model.editingTargetID === relation.target_anime_id
              return (
                <div key={relation.target_anime_id} className={relationStyles.relationRow}>
                  <div>
                    <strong>{relation.target_title}</strong>
                    <div className={relationStyles.relationMeta}>{formatRelationMeta(relation)}</div>
                  </div>

                  {isEditing ? (
                    <div className={relationStyles.editingRow}>
                      <select
                        className={styles.select}
                        value={model.editingLabel}
                        onChange={(event) => model.setEditingLabel(event.target.value as AdminAnimeRelationLabel)}
                      >
                        {RELATION_LABELS.map((label) => (
                          <option key={label} value={label}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <button type="button" className={styles.buttonPrimary} onClick={() => void model.saveEditing()} disabled={model.isSaving}>
                        Speichern
                      </button>
                      <button type="button" className={styles.buttonSecondary} onClick={() => model.cancelEditing()}>
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <div className={relationStyles.actions}>
                      <button type="button" className={styles.buttonSecondary} onClick={() => model.startEditing(relation)}>
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        className={styles.buttonSecondary}
                        onClick={() => {
                          if (typeof window === 'undefined' || window.confirm('Relation wirklich loeschen?')) {
                            void model.deleteRelation(relation.target_anime_id)
                          }
                        }}
                      >
                        Loeschen
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </details>
    </section>
  )
}
