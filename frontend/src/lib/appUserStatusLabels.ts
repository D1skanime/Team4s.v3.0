/**
 * 183-01 (D-01): zentraler deutscher Status-Helfer für app_users.status, extrahiert aus
 * UserDetailPageClient.tsx — ersetzt vier byte-identische Kopien.
 */

/** Übersetzt einen app_users.status-Rohwert in die Badge-Variante; unbekannte Werte fallen auf 'neutral' zurück. */
export function appUserStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'active':
      return 'success'
    case 'pending':
      return 'warning'
    case 'disabled':
      return 'danger'
    default:
      return 'neutral'
  }
}

/** Übersetzt einen app_users.status-Rohwert in sein deutsches Anzeige-Label; unbekannte Werte liefern den Rohwert zurück. */
export function appUserStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Aktiv'
    case 'pending':
      return 'Ausstehend'
    case 'disabled':
      return 'Deaktiviert'
    default:
      return status
  }
}
