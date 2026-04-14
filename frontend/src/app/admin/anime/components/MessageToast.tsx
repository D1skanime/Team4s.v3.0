import styles from '../../admin.module.css'

/**
 * Props der MessageToast-Komponente.
 * Enthalten optionale Fehler- und Erfolgsmeldungen sowie
 * einen Callback zum Schliessen der Meldung.
 */
interface MessageToastProps {
  error: string | null
  success: string | null
  onDismiss: () => void
}

/**
 * Toast-Benachrichtigungskomponente fuer Fehler- und Erfolgsmeldungen.
 * Rendert je eine farblich unterschiedliche Box fuer Fehler (rot)
 * und Erfolg (gruen) mit einem Schliessen-Button.
 * Gibt null zurueck, wenn keine Meldung vorhanden ist.
 */
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