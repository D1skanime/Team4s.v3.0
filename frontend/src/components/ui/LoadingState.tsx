import { classNames } from './classNames'
import ownStyles from './LoadingState.module.css'
import sharedStyles from './ui.module.css'

const styles = new Proxy({} as Record<string, string>, {
  get: (_target, prop: string) => ownStyles[prop as keyof typeof ownStyles] ?? sharedStyles[prop as keyof typeof sharedStyles],
})

export interface LoadingStateProps {
  title?: string
  description?: string
  /** Dezenter Infinite-Scroll-Ladeindikator (D-36) statt eines grossen Zustands-Blocks. */
  compact?: boolean
}

export function LoadingState({
  title = 'Inhalt wird vorbereitet',
  description = 'Die Datenstruktur und die zugehörigen Oberflächen werden geladen.',
  compact = false,
}: LoadingStateProps) {
  return (
    <div className={classNames(styles.stateCard, styles.stateInfo, compact && styles.stateCompact)}>
      <div className={styles.stateIcon} aria-hidden="true">
        <span className={styles.stateSpinner} />
      </div>
      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateDescription}>{description}</p>
    </div>
  )
}
