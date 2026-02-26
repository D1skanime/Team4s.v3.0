import styles from '../../admin.module.css'

interface MessageToastProps {
  error: string | null
  success: string | null
  onDismiss: () => void
}

export function MessageToast({ error, success, onDismiss }: MessageToastProps) {
  if (!error && !success) {
    return null
  }

  return (
    <>
      {error ? (
        <div className={styles.errorBox} role="alert">
          <div>{error}</div>
          <button className={styles.buttonSecondary} type="button" onClick={onDismiss}>
            Schliessen
          </button>
        </div>
      ) : null}
      {success ? (
        <div className={styles.successBox} role="status">
          <div>{success}</div>
          <button className={styles.buttonSecondary} type="button" onClick={onDismiss}>
            Schliessen
          </button>
        </div>
      ) : null}
    </>
  )
}