import styles from './ui.module.css'

export interface LoadingStateProps {
  title?: string
  description?: string
}

export function LoadingState({
  title = 'Inhalt wird vorbereitet',
  description = 'Die Datenstruktur und die zugehörigen Oberflächen werden geladen.',
}: LoadingStateProps) {
  return (
    <div className={`${styles.stateCard} ${styles.stateInfo}`}>
      <div className={styles.stateIcon} aria-hidden="true">
        <span className={styles.stateSpinner} />
      </div>
      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateDescription}>{description}</p>
    </div>
  )
}
