import type { AdminJellyfinSeriesSearchItem } from '@/types/admin'

import studioStyles from '../../AdminStudio.module.css'
import { formatSeriesOption, type JellyfinSyncModel } from './jellyfinSyncPanelHelpers'
import styles from './JellyfinSyncPanel.styles'

interface JellyfinSyncStepSeriesProps {
  model: JellyfinSyncModel
  selectedSeriesID: string
  selectedSeries: AdminJellyfinSeriesSearchItem | null
  hasSearchResults: boolean
  showSearchEmptyState: boolean
}

/** Assistentenschritt 2: aus den Suchtreffern die passende Jellyfin-Serie wählen. */
export function JellyfinSyncStepSeries({
  model,
  selectedSeriesID,
  selectedSeries,
  hasSearchResults,
  showSearchEmptyState,
}: JellyfinSyncStepSeriesProps) {
  return (
    <section className={styles.stepPanel}>
      <div className={styles.stepPanelHeader}>
        <span className={styles.stepIndex}>2</span>
        <div className={styles.stepPanelHeading}>
          <h3 className={styles.stepTitle}>Treffer wählen</h3>
          <p className={styles.stepHelper}>Wähle den passenden Treffer. Bei genau einem Treffer passiert das automatisch.</p>
        </div>
      </div>
      <div className={studioStyles.field}>
        <label htmlFor="jellyfin-series-select">Passende Jellyfin-Serie</label>
        {showSearchEmptyState ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>
              Keine Jellyfin-Serien für diesen Suchbegriff gefunden. Versuche einen anderen Titel oder Ordnernamen.
            </p>
          </div>
        ) : (
          <select
            id="jellyfin-series-select"
            className={studioStyles.select}
            value={selectedSeriesID}
            onChange={(event) => {
              model.selectSeries(event.target.value)
            }}
            disabled={model.isSyncing || model.isSearching || model.isLoadingPreview || !hasSearchResults}
          >
            <option value="">{hasSearchResults ? '-- Treffer auswählen --' : '-- Zuerst nach Serie suchen --'}</option>
            {model.seriesOptions.map((item) => (
              <option key={item.jellyfin_series_id} value={item.jellyfin_series_id}>
                {formatSeriesOption(item)}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedSeries ? (
        <div className={styles.previewBox}>
          <p className={styles.previewEyebrow}>Ausgewählter Treffer</p>
          <p className={styles.previewTitle}>
            {selectedSeries.name}
            {selectedSeries.production_year ? ` (${selectedSeries.production_year})` : ''}
          </p>
          <p className={styles.metaLine}>{selectedSeries.path?.trim() || '(ohne Pfad)'}</p>
        </div>
      ) : (
        <p className={styles.metaLine}>Noch kein Treffer ausgewählt.</p>
      )}
    </section>
  )
}
