import sharedStyles from '../../../admin.module.css'
import episodeStyles from './EpisodeManager.module.css'

const styles = { ...sharedStyles, ...episodeStyles }

interface EpisodeInlineEditProps {
  clearTitle: boolean
  disabled: boolean
  onToggleClearTitle: (value: boolean) => void
  onSave: () => void
  onCancel: () => void
}

export function EpisodeInlineEdit({ clearTitle, disabled, onToggleClearTitle, onSave, onCancel }: EpisodeInlineEditProps) {
  return (
    <div className={styles.episodeActionsCell}>
      <label className={styles.nullToggle}>
        <input
          type="checkbox"
          checked={clearTitle}
          onChange={(event) => onToggleClearTitle(event.target.checked)}
          disabled={disabled}
        />
        Feld zuruecksetzen
      </label>
      <button className={styles.episodeMiniButton} type="button" disabled={disabled} onClick={onSave}>
        Speichern
      </button>
      <button className={styles.episodeMiniButton} type="button" disabled={disabled} onClick={onCancel}>
        Abbrechen
      </button>
    </div>
  )
}
