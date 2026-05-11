import styles from '../../admin.module.css'

/**
 * Props der MessageToast-Komponente.
 * Enthalten optionale Fehler- und Erfolgsmeldungen sowie
 * einen Callback zum Schließen der Meldung.
 */
interface MessageToastProps {
  error: string | null
  success: string | null
  onDismiss: () => void
}

/**
 * Toast-Benachrichtigungskomponente für Fehler- und Erfolgsmeldungen.
 * Rendert je eine farblich unterschiedliche Box für Fehler (rot)
 * und Erfolg (gruen) mit einem Schließen-Button.
 * Gibt null zurück, wenn keine Meldung vorhanden ist.
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
            Schließen
          </button>
        </div>
      ) : null}
      {success ? (
        <div className={styles.successBox} role="status">
          <div>{success}</div>
          <button className={styles.buttonSecondary} type="button" onClick={onDismiss}>
            Schließen
          </button>
        </div>
      ) : null}
    </>
  )
}