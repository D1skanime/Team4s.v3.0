/**
 * 183-02 (D-03): zentraler deutscher Status-Helfer für claim.claim_status, vereint die breite
 * Alias-Abdeckung aus UserClaimsTab.tsx mit der Wortwahl „Genehmigt" aus ClaimsClient.tsx —
 * ersetzt beide lokalen Kopien.
 */

/** Übersetzt einen Claim-Status-Rohwert in sein deutsches Anzeige-Label; unbekannte Werte liefern den Rohwert zurück. */
export function claimStatusLabel(status: string): string {
  switch (status) {
    case 'active':
    case 'verified':
      return 'Genehmigt'
    case 'open':
    case 'pending':
      return 'Offen'
    case 'rejected':
    case 'denied':
      return 'Abgelehnt'
    default:
      return status
  }
}

/** Ordnet einen Claim-Status-Rohwert der passenden Badge-Variante zu; unbekannte Werte liefern 'neutral'. */
export function claimStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'active':
    case 'verified':
      return 'success'
    case 'open':
    case 'pending':
      return 'warning'
    case 'rejected':
    case 'denied':
      return 'danger'
    default:
      return 'neutral'
  }
}
