import { Spinner } from '@/components/ui'

import studioStyles from '../../AdminStudio.module.css'
import { type JellyfinSyncModel, renderStepFeedback } from './jellyfinSyncPanelHelpers'
import styles from './JellyfinSyncPanel.module.css'

interface JellyfinSyncStepSearchProps {
  model: JellyfinSyncModel
  onSearch: () => void
}

/** Assistentenschritt 1: Jellyfin-Serie per Titel suchen. */
export function JellyfinSyncStepSearch({ model, onSearch }: JellyfinSyncStepSearchProps) {
  return (
    <section className={styles.stepPanel}>
      <div className={styles.stepPanelHeader}>
        <span className={styles.stepIndex}>1</span>
        <div className={styles.stepPanelHeading}>
          <h3 className={styles.stepTitle}>Serie suchen</h3>
          <p className={styles.stepHelper}>Gib den Anime-Namen ein und starte die Jellyfin-Suche.</p>
        </div>
      </div>
      <div className={styles.inlineFieldRow}>
        <div className={`${studioStyles.field} ${styles.inlineFieldGrow}`}>
          <label htmlFor="jellyfin-search-query">Anime-Titel in Jellyfin</label>
          <input
            id="jellyfin-search-query"
            className={studioStyles.input}
            value={model.searchQuery}
            onChange={(event) => model.setSearchQuery(event.target.value)}
            disabled={model.isSyncing || model.isSearching || model.isLoadingPreview}
            placeholder="z. B. Naruto"
          />
        </div>
        <button
          className={`${studioStyles.button} ${studioStyles.buttonSecondary}`}
          type="button"
          onClick={onSearch}
          disabled={model.isSyncing || model.isSearching || model.isLoadingPreview}
        >
          {model.isSearching ? (
            <>
              <Spinner size="sm" label="" />
              Suche läuft...
            </>
          ) : (
            'Suchen'
          )}
        </button>
      </div>
      {renderStepFeedback(model.searchFeedback)}
    </section>
  )
}
